/**
 * Data-access layer for the `projects` domain.
 *
 * Holds the Supabase query chains previously embedded in projectsRouter so the
 * router keeps only validation, authorization and shaping. Query shapes
 * (columns, embedded relations, filters, ordering, snake_case field mapping)
 * are preserved exactly.
 */
import {
  data,
  paginate,
  unwrapList,
  unwrapOne,
  unwrapVoid,
} from "./repository";

export type ListProjectsInput = {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
};

export async function listProjects(input: ListProjectsInput) {
  const { from, to } = paginate(input);
  let q = data
    .from("projects")
    .select("*, clients(id,name,email,phone)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (input.status) q = q.eq("status", input.status);
  if (input.search) q = q.ilike("name", `%${input.search}%`);
  return unwrapList(await q);
}

export async function getMyProject(userId: string) {
  const { data: row, error } = await data
    .from("projects")
    .select("*, clients!inner(id,name,email,phone,user_id)")
    .eq("client_portal_enabled", true)
    .eq("clients.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return row ?? null;
}

export async function getProjectById(id: number) {
  return unwrapOne(
    await data
      .from("projects")
      .select("*, clients(id,name,email,phone,user_id)")
      .eq("id", id)
      .single()
  );
}

export async function createProject(values: Record<string, unknown>) {
  return unwrapOne(
    await data.from("projects").insert(values).select().single()
  );
}

export async function updateProject(
  id: number,
  values: Record<string, unknown>
) {
  return unwrapOne(
    await data.from("projects").update(values).eq("id", id).select().single()
  );
}

export async function getProjectRow(id: number) {
  const { data: row } = await data
    .from("projects")
    .select()
    .eq("id", id)
    .single();
  return row;
}

export async function updateProjectProgress(
  id: number,
  updates: Record<string, unknown>
) {
  return unwrapOne(
    await data.from("projects").update(updates).eq("id", id).select().single()
  );
}

export async function deleteProject(id: number) {
  return unwrapVoid(await data.from("projects").delete().eq("id", id));
}

export async function getProjectsStats() {
  const { data: rows } = await data
    .from("projects")
    .select("status, estimated_budget, actual_cost, contracted_budget");
  return rows ?? [];
}

export async function getProfitabilitySources(id: number) {
  return Promise.all([
    data
      .from("projects")
      .select(
        "id,name,estimated_budget,contracted_budget,actual_cost,completion_percent,status"
      )
      .eq("id", id)
      .single(),
    data
      .from("materials")
      .select("unit_price_current,quantity_needed")
      .eq("project_id", id),
    data
      .from("ledger_entries")
      .select("amount_delta,entry_type")
      .eq("project_id", id),
  ]);
}

/**
 * Portfolio-level profitability source rows: every project's budget/cost
 * columns in a single query for a whole-portfolio rollup. Kept separate from
 * `getProfitabilitySources` (which is per-project and also pulls materials +
 * ledger detail) so the summary stays a cheap single round-trip.
 */
export async function getPortfolioProfitability() {
  return unwrapList(
    await data
      .from("projects")
      .select("id,name,status,estimated_budget,contracted_budget,actual_cost")
  ).data;
}
