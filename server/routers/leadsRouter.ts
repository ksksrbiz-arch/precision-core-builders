import { leadsRepo } from "../_data/leadsRepo";
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";

const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const leadsRouter = router({
  // Admin-only: the lead prioritization board is an internal operations tool.
  list: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }))
    .query(async ({ input }) => {
      return leadsRepo.list(input.limit ?? 50);
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
      return leadsRepo.create({
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
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return leadsRepo.delete(input.id);
    }),

  // Clear the whole board (single-admin operations tool).
  clear: adminProcedure.mutation(async () => {
    return leadsRepo.clear();
  }),
});
