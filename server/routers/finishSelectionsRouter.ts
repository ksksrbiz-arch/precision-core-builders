import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { assertProjectAccess } from "../_core/access";
import {
  adminApproveFinishSelection,
  clientApproveFinishSelection,
  createFinishSelection,
  deleteFinishSelection,
  getFinishSelectionProjectId,
  insertClientSelection,
  listFinishSelectionBudgetFields,
  listFinishSelections,
} from "../_data/finishSelectionsRepo";
import { TRPCError } from "@trpc/server";
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
    .query(async ({ input, ctx }) => {
      await assertProjectAccess(ctx, input.projectId);
      return listFinishSelections(input.projectId);
    }),

  create: adminProcedure
    .input(SelectionInput)
    .mutation(async ({ input }) => createFinishSelection(input)),

  clientApprove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      // A client may only approve selections on their own project.
      const projectId = await getFinishSelectionProjectId(input.id);
      if (!projectId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Selection not found.",
        });
      }
      await assertProjectAccess(ctx, projectId);
      return clientApproveFinishSelection(input.id);
    }),

  adminApprove: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => adminApproveFinishSelection(input.id)),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deleteFinishSelection(input.id)),

  calcBudgetImpact: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertProjectAccess(ctx, input.projectId);
      const items = await listFinishSelectionBudgetFields(input.projectId);
      const totalDelta = items.reduce(
        (sum, s) => sum + Number(s.budget_delta ?? 0),
        0
      );
      const approvedDelta = items
        .filter(s => s.client_approved && s.eric_approved)
        .reduce((sum, s) => sum + Number(s.budget_delta ?? 0), 0);
      const pendingApproval = items.filter(
        s => !s.client_approved || !s.eric_approved
      ).length;
      return {
        totalDelta,
        approvedDelta,
        pendingApproval,
        total: items.length,
      };
    }),

  select: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        category: z.string().max(100).optional(),
        selection: z.string().min(1).max(300),
        budgetImpact: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Scope the write to the caller's own project and attribute it to their
      // client row (previously any client could inject into any project with a
      // null client_id).
      const project = await assertProjectAccess(ctx, input.projectId);
      return insertClientSelection({
        projectId: input.projectId,
        selection: input.selection,
        category: input.category,
        budgetImpact: input.budgetImpact,
        clientId: project?.clients?.id ?? null,
      });
    }),
});
