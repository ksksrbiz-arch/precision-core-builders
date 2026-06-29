import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createEstimate,
  deleteEstimate,
  getClientIdForUser,
  getEstimateById,
  listEstimates,
  listEstimatesForClient,
  markEstimateApproved,
  markEstimateSent,
} from "../_data/estimatesRepo";
import { z } from "zod";

export const estimatesRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(50).optional(),
        projectId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => listEstimates(input)),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => getEstimateById(input.id)),

  // Protected: only authenticated users (admin saving AI estimates, portal approvals, etc.)
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        clientId: z.number().int().positive().optional(),
        squareFootage: z.number().positive().optional(),
        projectType: z.string().max(100).optional(),
        complexity: z.enum(["low", "medium", "high"]).optional(),
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
      })
    )
    .mutation(async ({ input }) => createEstimate(input)),

  markSent: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => markEstimateSent(input.id)),

  markApproved: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => markEstimateApproved(input.id)),

  /** Portal: list estimates/invoices for the authenticated client */
  listForClient: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Find client record for this user
      const client = await getClientIdForUser(ctx.user.id);

      if (!client) return { data: [], total: 0 };

      return listEstimatesForClient({
        clientId: client.id,
        projectId: input.projectId,
      });
    }),

  approve: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => markEstimateApproved(input.id)),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deleteEstimate(input.id)),
});
