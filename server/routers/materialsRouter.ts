import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  computeIsShortage,
  createMaterial,
  createMaterials,
  deleteMaterial,
  getMaterialQuantities,
  listMaterialVendorIds,
  listMaterials,
  listMaterialsForProject,
  setMaterialShortage,
  setMaterialVendors,
  updateMaterial,
} from "../_data/materialsRepo";
import { appendLedgerEntry } from "../_data/ledgerRepo";
import { authorUuid } from "../_core/identity";
import { z } from "zod";

const MaterialInput = z.object({
  projectId: z.number().int().positive().optional(),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  unit: z.string().max(50).optional(),
  quantityNeeded: z.number().positive().optional(),
  quantityOrdered: z.number().nonnegative().optional(),
  quantityReceived: z.number().nonnegative().optional(),
  unitPriceCurrent: z.number().positive().optional(),
  unitPriceBudgeted: z.number().positive().optional(),
  vendorId: z.number().int().positive().optional(),
  vendorName: z.string().max(200).optional(),
  /** Multi-vendor catalog links (first entry becomes primary). */
  vendorIds: z.array(z.number().int().positive()).max(20).optional(),
  vendorSku: z.string().max(100).optional(),
  vendorUrl: z.string().url().optional(),
  poNumber: z.string().max(100).optional(),
  orderedAt: z.string().datetime().optional(),
  expectedDelivery: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
  phaseNeeded: z.string().max(100).optional(),
  notes: z.string().optional(),
});

/**
 * Update: `undefined` = leave unchanged, `null` = clear. Quantities/prices and
 * free-text columns are clearable so the edit form can blank them; a material
 * always keeps a name and (when set) its project.
 */
const MaterialUpdateInput = z
  .object({ id: z.number().int().positive() })
  .merge(MaterialInput.partial())
  .extend({
    description: z.string().nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    unit: z.string().max(50).nullable().optional(),
    quantityNeeded: z.number().positive().nullable().optional(),
    quantityOrdered: z.number().nonnegative().nullable().optional(),
    quantityReceived: z.number().nonnegative().nullable().optional(),
    unitPriceCurrent: z.number().positive().nullable().optional(),
    unitPriceBudgeted: z.number().positive().nullable().optional(),
    vendorName: z.string().max(200).nullable().optional(),
    vendorSku: z.string().max(100).nullable().optional(),
    vendorUrl: z.string().url().nullable().optional(),
    poNumber: z.string().max(100).nullable().optional(),
    orderedAt: z.string().datetime().nullable().optional(),
    expectedDelivery: z.string().datetime().nullable().optional(),
    receivedAt: z.string().datetime().nullable().optional(),
    phaseNeeded: z.string().max(100).nullable().optional(),
    notes: z.string().nullable().optional(),
  });

export const materialsRouter = router({
  // Admin-only: exposes internal pricing (unit_price_current /
  // unit_price_budgeted) and vendor cost/SKU across every project. Previously
  // protectedProcedure with projectId optional, so any logged-in client could
  // dump the entire materials table. No portal page consumes this.
  list: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        shortagesOnly: z.boolean().optional(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      })
    )
    .query(async ({ input }) => listMaterials(input)),

  create: adminProcedure
    .input(MaterialInput)
    .mutation(async ({ input }) => createMaterial(input)),

  /** Vendor ids linked to a material (primary first). */
  listVendorIds: adminProcedure
    .input(z.object({ materialId: z.number().int().positive() }))
    .query(async ({ input }) => listMaterialVendorIds(input.materialId)),

  /** Replace the multi-vendor set for a material. */
  setVendors: adminProcedure
    .input(
      z.object({
        materialId: z.number().int().positive(),
        vendorIds: z.array(z.number().int().positive()).max(20),
      })
    )
    .mutation(async ({ input }) => {
      const links = await setMaterialVendors(input.materialId, input.vendorIds);
      // Keep materials.vendor_id in sync with the primary (first) vendor.
      if (input.vendorIds.length > 0) {
        await updateMaterial(input.materialId, {
          vendor_id: input.vendorIds[0],
        });
      } else {
        await updateMaterial(input.materialId, { vendor_id: null });
      }
      return links;
    }),

  /** Bulk-create materials (e.g. import names from an estimate). Max 50. */
  createMany: adminProcedure
    .input(
      z.object({
        items: z.array(MaterialInput).min(1).max(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const created = await createMaterials(input.items);

      // Field-report → materials push (or any bulk shortage import) shows on ledger.
      try {
        const authorId = authorUuid(ctx.user);
        const byProject = new Map<number, string[]>();
        for (const item of input.items) {
          if (!item.projectId) continue;
          const list = byProject.get(item.projectId) ?? [];
          list.push(item.name);
          byProject.set(item.projectId, list);
        }
        for (const [projectId, names] of byProject) {
          const fromField = input.items.some(
            i =>
              i.projectId === projectId &&
              typeof i.notes === "string" &&
              i.notes.toLowerCase().includes("field report")
          );
          await appendLedgerEntry({
            projectId,
            authorId,
            entryType: "note",
            title: fromField
              ? `Field shortages synced (${names.length})`
              : `Materials imported (${names.length})`,
            description:
              names.slice(0, 12).join(", ") +
              (names.length > 12 ? ` (+${names.length - 12} more)` : ""),
            visibleToClient: true,
          });
        }
      } catch (err) {
        console.warn("[ledger] materials createMany append failed:", err);
      }

      return created;
    }),

  update: adminProcedure
    .input(MaterialUpdateInput)
    .mutation(async ({ input }) => {
      const {
        id,
        projectId,
        quantityNeeded,
        quantityOrdered,
        quantityReceived,
        unitPriceCurrent,
        unitPriceBudgeted,
        vendorId,
        vendorName,
        vendorIds,
        vendorSku,
        vendorUrl,
        poNumber,
        orderedAt,
        expectedDelivery,
        receivedAt,
        phaseNeeded,
        ...rest
      } = input;

      // Recompute the shortage flag when either quantity changes. Fetch the
      // current row so we can fill in whichever side wasn't provided.
      let shortagePatch: { is_shortage?: boolean } = {};
      if (quantityNeeded !== undefined || quantityOrdered !== undefined) {
        const current = await getMaterialQuantities(id);
        // `null` means "cleared", so only fall back to the stored value when the
        // caller didn't touch the field at all (`??` would resurrect it).
        const finalNeeded =
          quantityNeeded !== undefined
            ? quantityNeeded
            : current?.quantity_needed;
        const finalOrdered =
          (quantityOrdered !== undefined
            ? quantityOrdered
            : current?.quantity_ordered) ?? 0;
        shortagePatch = {
          is_shortage: computeIsShortage(finalNeeded, finalOrdered),
        };
      }

      // Sync junction table when vendorIds provided; first id is primary.
      if (vendorIds !== undefined) {
        await setMaterialVendors(id, vendorIds);
      }
      const primaryFromIds =
        vendorIds && vendorIds.length > 0 ? vendorIds[0] : undefined;

      return updateMaterial(id, {
        ...rest,
        ...shortagePatch,
        ...(projectId !== undefined && { project_id: projectId }),
        ...(quantityNeeded !== undefined && {
          quantity_needed: quantityNeeded,
        }),
        ...(quantityOrdered !== undefined && {
          quantity_ordered: quantityOrdered,
        }),
        ...(quantityReceived !== undefined && {
          quantity_received: quantityReceived,
        }),
        ...(unitPriceCurrent !== undefined && {
          unit_price_current: unitPriceCurrent,
        }),
        ...(unitPriceBudgeted !== undefined && {
          unit_price_budgeted: unitPriceBudgeted,
        }),
        ...((primaryFromIds ?? vendorId) !== undefined && {
          vendor_id: primaryFromIds ?? vendorId,
        }),
        // An emptied vendor set also clears the primary vendor link.
        ...(vendorIds !== undefined &&
          vendorIds.length === 0 &&
          vendorId === undefined && { vendor_id: null }),
        ...(vendorName !== undefined && { vendor_name: vendorName }),
        ...(vendorSku !== undefined && { vendor_sku: vendorSku }),
        ...(vendorUrl !== undefined && { vendor_url: vendorUrl }),
        ...(poNumber !== undefined && { po_number: poNumber }),
        ...(orderedAt !== undefined && { ordered_at: orderedAt }),
        ...(expectedDelivery !== undefined && {
          expected_delivery: expectedDelivery,
        }),
        ...(receivedAt !== undefined && { received_at: receivedAt }),
        ...(phaseNeeded !== undefined && { phase_needed: phaseNeeded }),
      });
    }),

  checkShortages: adminProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const all = await listMaterialsForProject(input.projectId);
      const shortages = all.filter(m =>
        computeIsShortage(m.quantity_needed, m.quantity_ordered)
      );
      // Reconcile the flag for every material so resolved shortages are also
      // cleared (not just newly-detected ones marked true).
      const shortageIds = new Set(shortages.map(m => m.id));
      await Promise.all(
        all
          .filter(m => Boolean(m.is_shortage) !== shortageIds.has(m.id))
          .map(m => setMaterialShortage(m.id, shortageIds.has(m.id)))
      );
      return { shortages: shortages.length, items: shortages };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deleteMaterial(input.id)),
});
