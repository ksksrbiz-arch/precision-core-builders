/**
 * Data-access layer for the `purchase_orders` / `purchase_order_items` domain.
 *
 * Purchase orders are vendor-bucketed snapshots generated from material
 * shortages. Vendor is a plain name string on the PO (no vendor-catalog
 * entity). The router owns validation + shaping; the Supabase query chains
 * (tables, `select(...)` strings, filters, ordering, snake_case mapping) live
 * here.
 */
import { requireSupabaseAdmin } from "../_core/supabase";
import { unwrapList, unwrapOne, unwrapVoid } from "./repository";

export type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "partial"
  | "received"
  | "cancelled";

export type CreatePurchaseOrderInput = {
  projectId: number;
  poNumber: string;
  vendorName: string;
  status?: PurchaseOrderStatus;
  subtotal?: number | null;
  notes?: string | null;
  createdBy?: string | null;
};

export type CreatePurchaseOrderItemInput = {
  materialId?: number | null;
  description: string;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

/**
 * Insert a purchase order plus its line items. Best-effort item mapping keeps
 * the PO row even if it has no items. Returns the created PO with its items.
 */
export async function createPurchaseOrder(
  po: CreatePurchaseOrderInput,
  items: CreatePurchaseOrderItemInput[]
) {
  const db = requireSupabaseAdmin();
  const created = unwrapOne(
    await db
      .from("purchase_orders")
      .insert({
        project_id: po.projectId,
        po_number: po.poNumber,
        vendor_name: po.vendorName,
        status: po.status ?? "draft",
        subtotal: po.subtotal,
        notes: po.notes,
        created_by: po.createdBy,
      })
      .select()
      .single()
  );

  let createdItems: unknown[] = [];
  if (items.length > 0) {
    const { data: itemRows } = unwrapList(
      await db
        .from("purchase_order_items")
        .insert(
          items.map(it => ({
            purchase_order_id: created.id,
            material_id: it.materialId,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            line_total: it.lineTotal,
          }))
        )
        .select()
    );
    createdItems = itemRows;
  }

  return { ...created, items: createdItems };
}

export async function listPurchaseOrders(params: { projectId?: number } = {}) {
  const db = requireSupabaseAdmin();
  let q = db
    .from("purchase_orders")
    .select("*, projects(id,name)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (params.projectId) q = q.eq("project_id", params.projectId);
  return unwrapList(await q);
}

export async function getPurchaseOrderById(id: number) {
  const db = requireSupabaseAdmin();
  return unwrapOne(
    await db
      .from("purchase_orders")
      .select(
        "*, projects(id,name), purchase_order_items(*, materials(id,name,unit))"
      )
      .eq("id", id)
      .single()
  );
}

export async function updatePurchaseOrderStatus(
  id: number,
  status: PurchaseOrderStatus
) {
  const db = requireSupabaseAdmin();
  return unwrapOne(
    await db
      .from("purchase_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
  );
}

export async function deletePurchaseOrder(id: number) {
  const db = requireSupabaseAdmin();
  return unwrapVoid(await db.from("purchase_orders").delete().eq("id", id));
}
