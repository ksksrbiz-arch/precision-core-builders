/**
 * Data-access layer for the `finish_selections` table.
 *
 * Query shapes (tables, `select(...)` strings, filters, ordering, and
 * snake_case insert/update mapping) are preserved exactly from the original
 * finishSelectionsRouter — this is a structural refactor, not a behaviour
 * change.
 */
import { data, unwrapVoid } from "./repository";

export async function listFinishSelections(projectId: number) {
  const { data: rows, error } = await data
    .from("finish_selections")
    .select("*")
    .eq("project_id", projectId)
    .order("room")
    .order("category");
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export type CreateFinishSelectionInput = {
  projectId: number;
  clientId?: number;
  room?: string;
  category?: string;
  itemName: string;
  brand?: string;
  sku?: string;
  colorName?: string;
  imageUrl?: string;
  unitPrice?: number;
  quantity?: number;
  totalCost?: number;
  allowance?: number;
  budgetDelta?: number;
  notes?: string;
};

export async function createFinishSelection(input: CreateFinishSelectionInput) {
  const { data: row, error } = await data
    .from("finish_selections")
    .insert({
      project_id: input.projectId,
      client_id: input.clientId,
      room: input.room,
      category: input.category,
      item_name: input.itemName,
      brand: input.brand,
      sku: input.sku,
      color_name: input.colorName,
      image_url: input.imageUrl,
      unit_price: input.unitPrice,
      quantity: input.quantity,
      total_cost: input.totalCost,
      allowance: input.allowance,
      budget_delta: input.budgetDelta,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

/** The project a finish selection belongs to (for ownership checks). */
export async function getFinishSelectionProjectId(
  id: number
): Promise<number | null> {
  const { data: row, error } = await data
    .from("finish_selections")
    .select("project_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (row?.project_id as number | undefined) ?? null;
}

export async function clientApproveFinishSelection(id: number) {
  const { data: row, error } = await data
    .from("finish_selections")
    .update({
      client_approved: true,
      client_approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function adminApproveFinishSelection(id: number) {
  const { data: row, error } = await data
    .from("finish_selections")
    .update({ eric_approved: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function deleteFinishSelection(id: number) {
  return unwrapVoid(await data.from("finish_selections").delete().eq("id", id));
}

/** Budget-impact fields for every selection on a project. */
export async function listFinishSelectionBudgetFields(projectId: number) {
  const { data: rows, error } = await data
    .from("finish_selections")
    .select("budget_delta,client_approved,eric_approved,room,category")
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  return rows ?? [];
}

/** Lightweight client-portal selection insert (mirrors the original `select`). */
export async function insertClientSelection(input: {
  projectId: number;
  selection: string;
  category?: string;
  budgetImpact?: number;
  clientId?: number | null;
}) {
  const { data: row, error } = await data
    .from("finish_selections")
    .insert({
      project_id: input.projectId,
      item_name: input.selection,
      category: input.category,
      budget_delta: input.budgetImpact,
      client_id: input.clientId ?? null,
      // Client-initiated choice is already their approval.
      client_approved: true,
      client_approved_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}
