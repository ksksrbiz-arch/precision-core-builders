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

/**
 * Update PO status. When moving to `received` or `partial`, apply line-item
 * quantities to linked materials' quantity_received and recompute is_shortage
 * so inventory + the shortages dashboard stay in sync.
 */
export async function updatePurchaseOrderStatus(
  id: number,
  status: PurchaseOrderStatus
) {
  const db = requireSupabaseAdmin();
  const updated = unwrapOne(
    await db
      .from("purchase_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
  );

  if (status === "received" || status === "partial") {
    await applyReceiptToMaterials(id, status === "received");
  }

  return updated;
}

/**
 * For each PO line with a material_id, bump quantity_received.
 * - full=true (received): received becomes max(current, line qty)
 * - full=false (partial): received += line qty
 */
async function applyReceiptToMaterials(poId: number, full: boolean) {
  const db = requireSupabaseAdmin();
  const { data: items, error } = await db
    .from("purchase_order_items")
    .select("material_id, quantity")
    .eq("purchase_order_id", poId);
  if (error) throw new Error(error.message);
  if (!items?.length) return;

  for (const item of items) {
    const materialId = item.material_id as number | null;
    if (!materialId) continue;
    const lineQty = Number(item.quantity ?? 0);
    if (!Number.isFinite(lineQty) || lineQty <= 0) continue;

    const { data: mat, error: matErr } = await db
      .from("materials")
      .select(
        "id, quantity_needed, quantity_ordered, quantity_received, received_at"
      )
      .eq("id", materialId)
      .single();
    if (matErr || !mat) continue;

    const currentReceived = Number(mat.quantity_received ?? 0);
    const nextReceived = full
      ? Math.max(currentReceived, lineQty)
      : currentReceived + lineQty;
    const needed =
      mat.quantity_needed == null ? null : Number(mat.quantity_needed);
    const ordered = Number(mat.quantity_ordered ?? 0);
    const covered = Math.max(ordered, nextReceived);
    const isShortage =
      needed == null || Number.isNaN(needed) ? false : covered < needed;

    await db
      .from("materials")
      .update({
        quantity_received: nextReceived,
        is_shortage: isShortage,
        received_at: full
          ? new Date().toISOString()
          : ((mat as { received_at?: string | null }).received_at ?? null),
        updated_at: new Date().toISOString(),
      })
      .eq("id", materialId);
  }
}

export async function deletePurchaseOrder(id: number) {
  const db = requireSupabaseAdmin();
  return unwrapVoid(await db.from("purchase_orders").delete().eq("id", id));
}
