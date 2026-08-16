import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  computeIsShortage,
  createMaterial,
  createMaterials,
  deleteMaterial,
  getMaterialQuantities,
  listMaterials,
  listMaterialsForProject,
  setMaterialShortage,
  updateMaterial,
} from "../_data/materialsRepo";
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
  vendorSku: z.string().max(100).optional(),
  vendorUrl: z.string().url().optional(),
  poNumber: z.string().max(100).optional(),
  orderedAt: z.string().datetime().optional(),
  expectedDelivery: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
  phaseNeeded: z.string().max(100).optional(),
  notes: z.string().optional(),
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

  /** Bulk-create materials (e.g. import names from an estimate). Max 50. */
  createMany: adminProcedure
    .input(
      z.object({
        items: z.array(MaterialInput).min(1).max(50),
      })
    )
    .mutation(async ({ input }) => createMaterials(input.items)),

  update: adminProcedure
    .input(
      z
        .object({ id: z.number().int().positive() })
        .merge(MaterialInput.partial())
    )
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
        const finalNeeded = quantityNeeded ?? current?.quantity_needed;
        const finalOrdered = quantityOrdered ?? current?.quantity_ordered ?? 0;
        shortagePatch = {
          is_shortage: computeIsShortage(finalNeeded, finalOrdered),
        };
      }

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
        ...(vendorId !== undefined && { vendor_id: vendorId }),
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
