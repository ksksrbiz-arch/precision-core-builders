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
  /** Primary vendor (mirrors materials.vendor_id for PO/search compat). */
  vendorId?: number;
  vendorName?: string;
  /** Full multi-vendor set written to material_vendors junction. */
  vendorIds?: number[];
  vendorSku?: string;
  vendorUrl?: string;
  poNumber?: string;
  orderedAt?: string;
  expectedDelivery?: string;
  receivedAt?: string;
  phaseNeeded?: string;
  notes?: string;
};

/**
 * Replace the material_vendors rows for a material.
 * First id in `vendorIds` is marked is_primary.
 */
export async function setMaterialVendors(
  materialId: number,
  vendorIds: number[]
) {
  const unique = [
    ...new Set(vendorIds.filter(id => Number.isFinite(id) && id > 0)),
  ];
  // Clear existing links then insert the new set.
  const { error: delError } = await data
    .from("material_vendors")
    .delete()
    .eq("material_id", materialId);
  if (delError) throw new Error(delError.message);
  if (unique.length === 0) return [];

  const rows = unique.map((vendorId, idx) => ({
    material_id: materialId,
    vendor_id: vendorId,
    is_primary: idx === 0,
  }));
  const { data: created, error } = await data
    .from("material_vendors")
    .insert(rows)
    .select();
  if (error) throw new Error(error.message);
  return created ?? [];
}

/** List vendor ids linked to a material (primary first). */
export async function listMaterialVendorIds(
  materialId: number
): Promise<number[]> {
  const { data: rows, error } = await data
    .from("material_vendors")
    .select("vendor_id, is_primary")
    .eq("material_id", materialId)
    .order("is_primary", { ascending: false });
  if (error) throw new Error(error.message);
  return (rows ?? []).map((r: { vendor_id: number }) => r.vendor_id);
}

export async function createMaterial(input: CreateMaterialInput) {
  // Prefer explicit vendorIds[0] as primary when provided.
  const primaryVendorId =
    input.vendorIds && input.vendorIds.length > 0
      ? input.vendorIds[0]
      : input.vendorId;

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
      vendor_id: primaryVendorId,
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

  const junctionIds =
    input.vendorIds && input.vendorIds.length > 0
      ? input.vendorIds
      : primaryVendorId
        ? [primaryVendorId]
        : [];
  if (junctionIds.length > 0 && row?.id) {
    await setMaterialVendors(row.id as number, junctionIds);
  }

  return row;
}

/** Bulk insert materials (used by "Import from estimate"). Returns created rows. */
export async function createMaterials(inputs: CreateMaterialInput[]) {
  if (inputs.length === 0) return [];
  const rows = inputs.map(input => ({
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
  }));
  const { data: created, error } = await data
    .from("materials")
    .insert(rows)
    .select();
  if (error) throw new Error(error.message);
  return created ?? [];
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
