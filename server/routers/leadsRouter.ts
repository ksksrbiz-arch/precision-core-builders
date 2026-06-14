import { db } from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";

const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const leadsRouter = router({
  // Admin-only: the lead prioritization board is an internal operations tool.
  list: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }))
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("leads")
        .select(
          "id,name,project_type,budget,location,timeline,message,score,priority,reasoning,suggested_action,estimated_value,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(input.limit ?? 50);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        projectType: z.string().max(120).optional(),
        budget: z.string().max(120).optional(),
        location: z.string().max(200).optional(),
        timeline: z.string().max(120).optional(),
        message: z.string().optional(),
        score: z.number().int().min(0).max(100),
        priority: PriorityEnum,
        reasoning: z.string().optional(),
        suggestedAction: z.string().optional(),
        estimatedValue: z.number().nonnegative().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await db
        .from("leads")
        .insert({
          name: input.name,
          project_type: input.projectType,
          budget: input.budget,
          location: input.location,
          timeline: input.timeline,
          message: input.message,
          score: input.score,
          priority: input.priority,
          reasoning: input.reasoning,
          suggested_action: input.suggestedAction,
          estimated_value: input.estimatedValue ?? null,
          scored_by: ctx.user!.id,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db.from("leads").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  // Clear the whole board (single-admin operations tool).
  clear: adminProcedure.mutation(async () => {
    const { error } = await db.from("leads").delete().gte("id", 0);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
