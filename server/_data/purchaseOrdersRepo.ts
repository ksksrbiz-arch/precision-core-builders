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
import type { LineReceipt, PoLine } from "../../shared/poReceipt";
import { unwrapList, unwrapOne, unwrapVoid } from "./repository";

export type PurchaseOrderStatus =
  "draft" | "issued" | "partial" | "received" | "cancelled";

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

/** Current status of a PO (throws when it doesn't exist). */
export async function getPurchaseOrderStatus(
  id: number
): Promise<PurchaseOrderStatus> {
  const db = requireSupabaseAdmin();
  const row = unwrapOne(
    await db.from("purchase_orders").select("status").eq("id", id).single()
  );
  return row.status as PurchaseOrderStatus;
}

/**
 * Update PO status only. Receiving goods is NOT a status change: it goes
 * through `applyPurchaseOrderReceipt`, which records per-line quantities and
 * bumps inventory by what actually arrived.
 */
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

/** The lines of a PO in the shape the receipt planner works on. */
export async function getPurchaseOrderLines(poId: number): Promise<PoLine[]> {
  const db = requireSupabaseAdmin();
  const { data: rows, error } = await db
    .from("purchase_order_items")
    .select("id, material_id, quantity, quantity_received")
    .eq("purchase_order_id", poId)
    .order("id");
  if (error) throw new Error(error.message);
  return (rows ?? []).map(r => ({
    id: r.id as number,
    materialId: (r.material_id as number | null) ?? null,
    quantity: r.quantity == null ? null : Number(r.quantity),
    quantityReceived: Number(r.quantity_received ?? 0),
  }));
}

/**
 * Apply a planned receipt: bump each line's cumulative received quantity, add
 * the quantity that arrived to the linked material's inventory (recomputing
 * its shortage flag), and set the PO status (`partial` / `received`).
 */
export async function applyPurchaseOrderReceipt(
  poId: number,
  receipts: readonly LineReceipt[],
  status: "partial" | "received"
) {
  const db = requireSupabaseAdmin();

  for (const r of receipts) {
    await unwrapVoid(
      await db
        .from("purchase_order_items")
        .update({ quantity_received: r.newReceived })
        .eq("id", r.itemId)
        .eq("purchase_order_id", poId)
    );
    if (r.materialId)
      await bumpMaterialReceived(r.materialId, r.delta, r.complete);
  }

  return updatePurchaseOrderStatus(poId, status);
}

/** Add `delta` to a material's received quantity and recompute is_shortage. */
async function bumpMaterialReceived(
  materialId: number,
  delta: number,
  lineComplete: boolean
) {
  const db = requireSupabaseAdmin();
  const { data: mat, error } = await db
    .from("materials")
    .select(
      "id, quantity_needed, quantity_ordered, quantity_received, received_at"
    )
    .eq("id", materialId)
    .single();
  if (error || !mat) return;

  const nextReceived = Number(mat.quantity_received ?? 0) + delta;
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
      received_at: lineComplete
        ? new Date().toISOString()
        : ((mat as { received_at?: string | null }).received_at ?? null),
      updated_at: new Date().toISOString(),
    })
    .eq("id", materialId);
}

export async function deletePurchaseOrder(id: number) {
  const db = requireSupabaseAdmin();
  return unwrapVoid(await db.from("purchase_orders").delete().eq("id", id));
}
