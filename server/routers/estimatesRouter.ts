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
  updateEstimate,
} from "../_data/estimatesRepo";
import { z } from "zod";

/** Shared editable fields for authoring/editing an estimate (all optional). */
const EstimateFields = z.object({
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
  // A cost line can legitimately be $0 (no permits needed, no contingency);
  // `.positive()` rejected 0, so the editor couldn't save such an estimate.
  laborCost: z.number().nonnegative().optional(),
  materialsCost: z.number().nonnegative().optional(),
  permitsCost: z.number().nonnegative().optional(),
  contingency: z.number().nonnegative().optional(),
  aiReasoning: z.string().optional(),
});

/**
 * Update: `undefined` = leave unchanged, `null` = clear. Every editable column
 * is clearable (the editor's blank inputs used to be sent as `undefined`, so
 * emptying a field silently kept the old value).
 */
const EstimateUpdateFields = z.object({
  projectId: EstimateFields.shape.projectId.nullable(),
  clientId: EstimateFields.shape.clientId.nullable(),
  squareFootage: EstimateFields.shape.squareFootage.nullable(),
  projectType: EstimateFields.shape.projectType.nullable(),
  complexity: EstimateFields.shape.complexity.nullable(),
  materials: EstimateFields.shape.materials.nullable(),
  location: EstimateFields.shape.location.nullable(),
  additionalNotes: EstimateFields.shape.additionalNotes.nullable(),
  estimatedLow: EstimateFields.shape.estimatedLow.nullable(),
  estimatedMid: EstimateFields.shape.estimatedMid.nullable(),
  estimatedHigh: EstimateFields.shape.estimatedHigh.nullable(),
  laborCost: EstimateFields.shape.laborCost.nullable(),
  materialsCost: EstimateFields.shape.materialsCost.nullable(),
  permitsCost: EstimateFields.shape.permitsCost.nullable(),
  contingency: EstimateFields.shape.contingency.nullable(),
  aiReasoning: EstimateFields.shape.aiReasoning.nullable(),
});

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

  // Admin: author a new estimate from the admin editor. The public estimator
  // persists via the estimate-project Netlify function (service role), not this
  // mutation, so gating this to admins does not affect the lead-gen wizard.
  create: adminProcedure
    .input(EstimateFields)
    .mutation(async ({ input }) => createEstimate(input)),

  // Admin: edit an existing estimate. Same optional fields as `create` plus the
  // required target `id`.
  update: adminProcedure
    .input(
      z.object({ id: z.number().int().positive() }).merge(EstimateUpdateFields)
    )
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      return updateEstimate(id, fields);
    }),

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
