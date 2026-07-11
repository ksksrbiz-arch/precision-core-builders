import { adminProcedure, router } from "../_core/trpc";
import {
  deletePurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
} from "../_data/purchaseOrdersRepo";
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
    .mutation(async ({ input }) =>
      updatePurchaseOrderStatus(input.id, input.status)
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => deletePurchaseOrder(input.id)),
});
