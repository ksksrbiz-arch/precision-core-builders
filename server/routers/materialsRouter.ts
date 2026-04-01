import { db, paginate } from "../db";
import { adminProcedure, router } from "../_core/trpc";
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
  list: adminProcedure
    .input(z.object({
      projectId: z.number().int().positive().optional(),
      shortagesOnly: z.boolean().optional(),
      page: z.number().int().positive().optional(),
      pageSize: z.number().int().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const { from, to } = paginate(input);
      let q = db.from("materials")
        .select("*, projects(id,name)", { count: "exact" })
        .order("created_at", { ascending: false }).range(from, to);
      if (input.projectId) q = q.eq("project_id", input.projectId);
      if (input.shortagesOnly) q = q.eq("is_shortage", true);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  create: adminProcedure
    .input(MaterialInput)
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("materials").insert({
        project_id: input.projectId,
        name: input.name, description: input.description,
        category: input.category, unit: input.unit,
        quantity_needed: input.quantityNeeded,
        quantity_ordered: input.quantityOrdered ?? 0,
        quantity_received: input.quantityReceived ?? 0,
        unit_price_current: input.unitPriceCurrent,
        unit_price_budgeted: input.unitPriceBudgeted,
        vendor_name: input.vendorName, vendor_sku: input.vendorSku,
        vendor_url: input.vendorUrl, po_number: input.poNumber,
        ordered_at: input.orderedAt, expected_delivery: input.expectedDelivery,
        received_at: input.receivedAt, phase_needed: input.phaseNeeded,
        notes: input.notes,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: adminProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(MaterialInput.partial()))
    .mutation(async ({ input }) => {
      const { id, projectId, quantityNeeded, quantityOrdered, quantityReceived,
              unitPriceCurrent, unitPriceBudgeted, vendorName, vendorSku,
              vendorUrl, poNumber, orderedAt, expectedDelivery, receivedAt,
              phaseNeeded, ...rest } = input;
      const { data, error } = await db.from("materials").update({
        ...rest,
        ...(projectId !== undefined && { project_id: projectId }),
        ...(quantityNeeded !== undefined && { quantity_needed: quantityNeeded }),
        ...(quantityOrdered !== undefined && { quantity_ordered: quantityOrdered }),
        ...(quantityReceived !== undefined && { quantity_received: quantityReceived }),
        ...(unitPriceCurrent !== undefined && { unit_price_current: unitPriceCurrent }),
        ...(unitPriceBudgeted !== undefined && { unit_price_budgeted: unitPriceBudgeted }),
        ...(vendorName !== undefined && { vendor_name: vendorName }),
        ...(vendorSku !== undefined && { vendor_sku: vendorSku }),
        ...(vendorUrl !== undefined && { vendor_url: vendorUrl }),
        ...(poNumber !== undefined && { po_number: poNumber }),
        ...(orderedAt !== undefined && { ordered_at: orderedAt }),
        ...(expectedDelivery !== undefined && { expected_delivery: expectedDelivery }),
        ...(receivedAt !== undefined && { received_at: receivedAt }),
        ...(phaseNeeded !== undefined && { phase_needed: phaseNeeded }),
      }).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  checkShortages: adminProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { data: materials } = await db.from("materials")
        .select("*").eq("project_id", input.projectId);
      const shortages = (materials ?? []).filter(m =>
        m.quantity_needed && m.quantity_ordered < m.quantity_needed
      );
      // Mark shortages
      for (const m of shortages) {
        await db.from("materials").update({ is_shortage: true }).eq("id", m.id);
      }
      return { shortages: shortages.length, items: shortages };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db.from("materials").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
