import { adminProcedure, router } from "../_core/trpc";
import {
  applyPurchaseOrderReceipt,
  deletePurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrderLines,
  getPurchaseOrderStatus,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
} from "../_data/purchaseOrdersRepo";
import { planReceipt, remainingReceipts } from "../../shared/poReceipt";
import { TRPCError } from "@trpc/server";
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

type RouterCtx = { user: Parameters<typeof authorUuid>[0] };

/** Best-effort milestone on the project ledger; never fails the PO action. */
async function appendPoMilestone(
  ctx: RouterCtx,
  id: number,
  updated: unknown,
  label: string,
  describe: (poNumber: string) => string
) {
  try {
    const row = updated as {
      project_id?: number;
      projectId?: number;
      po_number?: string;
      poNumber?: string;
    } | null;
    const projectId = row?.project_id ?? row?.projectId;
    if (!projectId) return;
    const poNumber = row?.po_number ?? row?.poNumber ?? `#${id}`;
    await appendLedgerEntry({
      projectId: Number(projectId),
      authorId: authorUuid(ctx.user),
      // No amount is recorded for these events, so they are milestones (they
      // used to be typed "cost_adjustment" — a cost entry with no cost).
      entryType: "milestone",
      title: `PO ${poNumber} → ${label}`,
      description: describe(poNumber),
      visibleToClient: true,
    });
  } catch (err) {
    console.warn("[ledger] PO milestone append failed:", err);
  }
}

function appendReceiptMilestone(
  ctx: RouterCtx,
  id: number,
  updated: unknown,
  status: "partial" | "received"
) {
  return appendPoMilestone(ctx, id, updated, status, poNumber =>
    status === "received"
      ? `Purchase order ${poNumber} fully received; inventory quantities updated.`
      : `Purchase order ${poNumber} partially received; inventory updated with the quantities that arrived.`
  );
}

export const purchaseOrdersRouter = router({
  list: adminProcedure
    .input(
      z.object({ projectId: z.number().int().positive().optional() }).optional()
    )
    .query(async ({ input }) => listPurchaseOrders(input ?? {})),

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => getPurchaseOrderById(input.id)),

  /**
   * Record what actually arrived on a PO. Quantities are per line and
   * cumulative across receipts; inventory is bumped by exactly what is entered,
   * and the PO becomes `received` only once every line is complete (else
   * `partial`). This replaces picking "partial" from the status menu, which
   * had no quantity input and applied the full line.
   */
  receive: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        lines: z
          .array(
            z.object({
              itemId: z.number().int().positive(),
              quantity: z.number().positive().max(1_000_000),
            })
          )
          .min(1)
          .max(200),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const status = await getPurchaseOrderStatus(input.id);
      if (status === "cancelled" || status === "draft") {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            status === "draft"
              ? "Issue the purchase order before receiving against it."
              : "A cancelled purchase order can't be received against.",
        });
      }
      const current = await getPurchaseOrderLines(input.id);
      const plan = planReceipt(current, input.lines);
      if (!plan.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: plan.error });
      }
      const updated = await applyPurchaseOrderReceipt(
        input.id,
        plan.lines,
        plan.status
      );
      await appendReceiptMilestone(ctx, input.id, updated, plan.status);
      return updated;
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: PurchaseOrderStatus,
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.status === "partial") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Use Receive to record a partial delivery — enter what actually arrived.",
        });
      }

      // Idempotent: re-selecting the current status must not re-apply a receipt
      // or write a duplicate ledger entry.
      const previous = await getPurchaseOrderStatus(input.id);
      if (previous === input.status) {
        return getPurchaseOrderById(input.id);
      }
      if (
        (previous === "partial" || previous === "received") &&
        (input.status === "draft" || input.status === "issued")
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Goods have already been received against this order, so it can't go back to " +
            `${input.status}. Cancel it instead if the remainder won't arrive.`,
        });
      }

      let updated;
      if (input.status === "received") {
        // "Received" = everything still outstanding arrived. Apply exactly the
        // remaining quantities (nothing already received is counted twice).
        const current = await getPurchaseOrderLines(input.id);
        const outstanding = remainingReceipts(current);
        if (outstanding.length === 0) {
          updated = await updatePurchaseOrderStatus(input.id, "received");
        } else {
          const plan = planReceipt(current, outstanding);
          if (!plan.ok) {
            throw new TRPCError({ code: "BAD_REQUEST", message: plan.error });
          }
          updated = await applyPurchaseOrderReceipt(
            input.id,
            plan.lines,
            "received"
          );
        }
        await appendReceiptMilestone(ctx, input.id, updated, "received");
        return updated;
      }

      updated = await updatePurchaseOrderStatus(input.id, input.status);

      // Issue events land on the Core Values ledger for the project.
      if (input.status === "issued") {
        await appendPoMilestone(
          ctx,
          input.id,
          updated,
          "issued",
          poNumber => `Purchase order ${poNumber} issued to vendor.`
        );
      }

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deletePurchaseOrder(input.id)),
});
