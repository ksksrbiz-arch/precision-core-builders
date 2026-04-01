import { db } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

const SelectionInput = z.object({
  projectId: z.number().int().positive(),
  clientId: z.number().int().positive().optional(),
  room: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  itemName: z.string().min(1).max(300),
  brand: z.string().max(200).optional(),
  sku: z.string().max(100).optional(),
  colorName: z.string().max(200).optional(),
  imageUrl: z.string().url().optional(),
  unitPrice: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  totalCost: z.number().positive().optional(),
  allowance: z.number().positive().optional(),
  budgetDelta: z.number().optional(),
  notes: z.string().optional(),
});

export const finishSelectionsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db.from("finish_selections")
        .select("*")
        .eq("project_id", input.projectId)
        .order("room").order("category");
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: adminProcedure
    .input(SelectionInput)
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("finish_selections").insert({
        project_id: input.projectId, client_id: input.clientId,
        room: input.room, category: input.category,
        item_name: input.itemName, brand: input.brand, sku: input.sku,
        color_name: input.colorName, image_url: input.imageUrl,
        unit_price: input.unitPrice, quantity: input.quantity,
        total_cost: input.totalCost, allowance: input.allowance,
        budget_delta: input.budgetDelta, notes: input.notes,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  clientApprove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("finish_selections")
        .update({ client_approved: true, client_approved_at: new Date().toISOString() })
        .eq("id", input.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  adminApprove: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("finish_selections")
        .update({ eric_approved: true })
        .eq("id", input.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db.from("finish_selections").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
