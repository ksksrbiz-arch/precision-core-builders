/**
 * Data-access layer for the `estimates` table (and its related reads).
 *
 * Query shapes (tables, `select(...)` strings, filters, ordering, ranges, and
 * snake_case insert/update mapping) are preserved exactly from the original
 * estimatesRouter — this is a structural refactor, not a behaviour change.
 */
import { data, paginate, unwrapList, unwrapVoid } from "./repository";

export type ListEstimatesParams = {
  page?: number;
  pageSize?: number;
  projectId?: number;
};

export async function listEstimates(params: ListEstimatesParams) {
  const { from, to } = paginate(params);
  let q = data
    .from("estimates")
    .select("*, clients(id,name,email), projects(id,name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (params.projectId) q = q.eq("project_id", params.projectId);
  return unwrapList(await q);
}

export async function getEstimateById(id: number) {
  const { data: row, error } = await data
    .from("estimates")
    .select("*, clients(id,name,email), projects(id,name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export type CreateEstimateInput = {
  projectId?: number;
  clientId?: number;
  squareFootage?: number;
  projectType?: string;
  complexity?: "low" | "medium" | "high";
  materials?: string[];
  location?: string;
  additionalNotes?: string;
  estimatedLow?: number;
  estimatedMid?: number;
  estimatedHigh?: number;
  laborCost?: number;
  materialsCost?: number;
  permitsCost?: number;
  contingency?: number;
  aiReasoning?: string;
};

export async function createEstimate(input: CreateEstimateInput) {
  const { data: row, error } = await data
    .from("estimates")
    .insert({
      project_id: input.projectId,
      client_id: input.clientId,
      square_footage: input.squareFootage,
      project_type: input.projectType,
      complexity: input.complexity,
      materials: input.materials ? JSON.stringify(input.materials) : null,
      location: input.location,
      additional_notes: input.additionalNotes,
      estimated_low: input.estimatedLow,
      estimated_mid: input.estimatedMid,
      estimated_high: input.estimatedHigh,
      labor_cost: input.laborCost,
      materials_cost: input.materialsCost,
      permits_cost: input.permitsCost,
      contingency: input.contingency,
      ai_reasoning: input.aiReasoning,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function markEstimateSent(id: number) {
  const { data: row, error } = await data
    .from("estimates")
    .update({ sent_to_client: true, sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function markEstimateApproved(id: number) {
  const { data: row, error } = await data
    .from("estimates")
    .update({
      approved_by_client: true,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

/** Find the client record owned by a given auth user. */
export async function getClientIdForUser(userId: string) {
  const { data: client } = await data
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return client;
}

export async function listEstimatesForClient(params: {
  clientId: number;
  projectId?: number;
}) {
  let q = data
    .from("estimates")
    .select("*, projects(id,name,status,progress_percent)", {
      count: "exact",
    })
    .eq("client_id", params.clientId)
    .order("created_at", { ascending: false });
  if (params.projectId) q = q.eq("project_id", params.projectId);
  return unwrapList(await q);
}

export async function deleteEstimate(id: number) {
  return unwrapVoid(await data.from("estimates").delete().eq("id", id));
}
