import { adminProcedure, router } from "../_core/trpc";
import {
  deletePurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrderStatus,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
} from "../_data/purchaseOrdersRepo";
import { appendLedgerEntry } from "../_data/ledgerRepo";
import { authorUuid } from "../_core/identity";
import { z } from "zod";

const PurchaseOrderStatus = z.enum([
  "draft",
  "issued",
  "partial",
  "received",
  "cancelled",
]);

export const purchaseOrdersRouter = router({
  list: adminProcedure
    .input(
      z.object({ projectId: z.number().int().positive().optional() }).optional()
    )
    .query(async ({ input }) => listPurchaseOrders(input ?? {})),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => getPurchaseOrderById(input.id)),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: PurchaseOrderStatus,
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Idempotent: re-selecting the current status must not re-apply a receipt
      // (a "partial" receipt ADDS the line quantity each time, so a double click
      // used to double-count inventory) or write a duplicate ledger entry.
      const previous = await getPurchaseOrderStatus(input.id);
      if (previous === input.status) {
        return getPurchaseOrderById(input.id);
      }

      const updated = await updatePurchaseOrderStatus(input.id, input.status);

      // Receipt / issue events land on the Core Values ledger for the project.
      if (
        input.status === "received" ||
        input.status === "partial" ||
        input.status === "issued"
      ) {
        try {
          const authorId = authorUuid(ctx.user);
          const projectId =
            (updated as { project_id?: number } | null)?.project_id ??
            (updated as { projectId?: number } | null)?.projectId;
          if (projectId) {
            const poNumber =
              (updated as { po_number?: string } | null)?.po_number ??
              (updated as { poNumber?: string } | null)?.poNumber ??
              `#${input.id}`;
            await appendLedgerEntry({
              projectId: Number(projectId),
              authorId,
              // No amount is recorded for these events, so they are milestones.
              // They used to be typed "cost_adjustment" — a cost entry with no
              // cost, shown to the client as a spend adjustment.
              entryType: "milestone",
              title: `PO ${poNumber} → ${input.status}`,
              description:
                input.status === "received"
                  ? `Purchase order ${poNumber} marked received; inventory quantities updated.`
                  : input.status === "partial"
                    ? `Purchase order ${poNumber} partially received; inventory updated.`
                    : `Purchase order ${poNumber} issued to vendor.`,
              visibleToClient: true,
            });
          }
        } catch (err) {
          console.warn("[ledger] PO status append failed:", err);
        }
      }

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deletePurchaseOrder(input.id)),
});
