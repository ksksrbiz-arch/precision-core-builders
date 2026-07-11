/**
 * Data-access layer for the `materials` table.
 *
 * Query shapes (tables, `select(...)` strings, filters, ordering, ranges, and
 * snake_case insert/update mapping) are preserved exactly from the original
 * materialsRouter — this is a structural refactor, not a behaviour change.
 */
import { data, paginate, unwrapList, unwrapVoid } from "./repository";

/**
 * A material is "short" when more is needed than has been ordered. We persist
 * this as the indexed `is_shortage` column (used by the shortages-only filter
 * and the dashboard stat) and keep it current on every write — previously it
 * was only ever set to true by PO generation / checkShortages and never
 * cleared, so the flag drifted out of sync with reality.
 */
export function computeIsShortage(
  needed: number | string | null | undefined,
  ordered: number | string | null | undefined
): boolean {
  const n = needed == null ? null : Number(needed);
  if (n == null || Number.isNaN(n)) return false;
  return (ordered == null ? 0 : Number(ordered)) < n;
}

export async function listMaterials(params: {
  projectId?: number;
  shortagesOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { from, to } = paginate(params);
  let q = data
    .from("materials")
    .select("*, projects(id,name), vendors(id,name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (params.projectId) q = q.eq("project_id", params.projectId);
  if (params.shortagesOnly) q = q.eq("is_shortage", true);
  return unwrapList(await q);
}

export type CreateMaterialInput = {
  projectId?: number;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  quantityNeeded?: number;
  quantityOrdered?: number;
  quantityReceived?: number;
  unitPriceCurrent?: number;
  unitPriceBudgeted?: number;
  vendorId?: number;
  vendorName?: string;
  vendorSku?: string;
  vendorUrl?: string;
  poNumber?: string;
  orderedAt?: string;
  expectedDelivery?: string;
  receivedAt?: string;
  phaseNeeded?: string;
  notes?: string;
};

export async function createMaterial(input: CreateMaterialInput) {
  const { data: row, error } = await data
    .from("materials")
    .insert({
      project_id: input.projectId,
      name: input.name,
      description: input.description,
      category: input.category,
      unit: input.unit,
      quantity_needed: input.quantityNeeded,
      quantity_ordered: input.quantityOrdered ?? 0,
      quantity_received: input.quantityReceived ?? 0,
      unit_price_current: input.unitPriceCurrent,
      unit_price_budgeted: input.unitPriceBudgeted,
      vendor_id: input.vendorId,
      vendor_name: input.vendorName,
      vendor_sku: input.vendorSku,
      vendor_url: input.vendorUrl,
      po_number: input.poNumber,
      ordered_at: input.orderedAt,
      expected_delivery: input.expectedDelivery,
      received_at: input.receivedAt,
      phase_needed: input.phaseNeeded,
      notes: input.notes,
      is_shortage: computeIsShortage(
        input.quantityNeeded,
        input.quantityOrdered ?? 0
      ),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

/** Read the current quantities for a material, used to recompute shortage. */
export async function getMaterialQuantities(id: number) {
  const { data: current } = await data
    .from("materials")
    .select("quantity_needed, quantity_ordered")
    .eq("id", id)
    .single();
  return current;
}

export async function updateMaterial(
  id: number,
  patch: Record<string, unknown>
) {
  const { data: row, error } = await data
    .from("materials")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function listMaterialsForProject(projectId: number) {
  const { data: materials } = await data
    .from("materials")
    .select("*")
    .eq("project_id", projectId);
  return materials ?? [];
}

export async function setMaterialShortage(id: number, isShortage: boolean) {
  return data
    .from("materials")
    .update({ is_shortage: isShortage })
    .eq("id", id);
}

export async function deleteMaterial(id: number) {
  return unwrapVoid(await data.from("materials").delete().eq("id", id));
}
