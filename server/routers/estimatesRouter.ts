import { db, paginate } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const estimatesRouter = router({
  list: adminProcedure
    .input(z.object({
      page: z.number().int().positive().optional(),
      pageSize: z.number().int().min(1).max(50).optional(),
      projectId: z.number().int().positive().optional(),
    }))
    .query(async ({ input }) => {
      const { from, to } = paginate(input);
      let q = db.from("estimates")
        .select("*, clients(id,name,email), projects(id,name)", { count: "exact" })
        .order("created_at", { ascending: false }).range(from, to);
      if (input.projectId) q = q.eq("project_id", input.projectId);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db.from("estimates")
        .select("*, clients(id,name,email), projects(id,name)")
        .eq("id", input.id).single();
      if (error) throw new Error(error.message);
      return data;
    }),

  create: publicProcedure
    .input(z.object({
      projectId: z.number().int().positive().optional(),
      clientId: z.number().int().positive().optional(),
      squareFootage: z.number().positive().optional(),
      projectType: z.string().max(100).optional(),
      complexity: z.enum(["low","medium","high"]).optional(),
      materials: z.array(z.string()).optional(),
      location: z.string().max(200).optional(),
      additionalNotes: z.string().optional(),
      estimatedLow: z.number().positive().optional(),
      estimatedMid: z.number().positive().optional(),
      estimatedHigh: z.number().positive().optional(),
      laborCost: z.number().positive().optional(),
      materialsCost: z.number().positive().optional(),
      permitsCost: z.number().positive().optional(),
      contingency: z.number().positive().optional(),
      aiReasoning: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("estimates").insert({
        project_id: input.projectId,
        client_id: input.clientId,
        square_footage: input.squareFootage,
        project_type: input.projectType,
        complexity: input.complexity,
        materials: input.materials ? JSON.stringify(input.materials) : null,
        location: input.location,
        additional_notes: input.additionalNotes,
        estimated_low: input.estimatedLow,
        estimated_mid: input.estimatedMid,
        estimated_high: input.estimatedHigh,
        labor_cost: input.laborCost,
        materials_cost: input.materialsCost,
        permits_cost: input.permitsCost,
        contingency: input.contingency,
        ai_reasoning: input.aiReasoning,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  markSent: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("estimates")
        .update({ sent_to_client: true, sent_at: new Date().toISOString() })
        .eq("id", input.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  markApproved: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { data, error } = await db.from("estimates")
        .update({ approved_by_client: true, approved_at: new Date().toISOString() })
        .eq("id", input.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db.from("estimates").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
