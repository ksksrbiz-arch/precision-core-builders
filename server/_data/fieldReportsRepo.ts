/**
 * Data-access layer for the `field_reports` domain.
 *
 * Holds the Supabase query chains previously embedded in fieldReportsRouter so
 * the router keeps only validation, authorization and shaping. Query shapes
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

export type ListFieldReportsInput = {
  projectId?: number;
  page?: number;
  pageSize?: number;
};

export async function listFieldReports(input: ListFieldReportsInput) {
  const { from, to } = paginate(input);
  let q = data
    .from("field_reports")
    .select("*, projects(id,name)", { count: "exact" })
    .order("report_date", { ascending: false })
    .range(from, to);
  if (input.projectId) q = q.eq("project_id", input.projectId);
  return unwrapList(await q);
}

export async function getFieldReportById(id: number) {
  return unwrapOne(
    await data
      .from("field_reports")
      .select("*, projects(id,name,client_id,clients(user_id))")
      .eq("id", id)
      .single()
  );
}

export async function createFieldReport(values: Record<string, unknown>) {
  return unwrapOne(
    await data.from("field_reports").insert(values).select().single()
  );
}

export async function updateFieldReport(
  id: number,
  values: Record<string, unknown>
) {
  return unwrapOne(
    await data
      .from("field_reports")
      .update(values)
      .eq("id", id)
      .select()
      .single()
  );
}

export async function publishFieldReport(id: number) {
  return unwrapOne(
    await data
      .from("field_reports")
      .update({
        published_to_client: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()
  );
}

export async function unpublishFieldReport(id: number) {
  return unwrapOne(
    await data
      .from("field_reports")
      .update({
        published_to_client: false,
        published_at: null,
      })
      .eq("id", id)
      .select()
      .single()
  );
}

export async function getFieldReportProjectId(id: number) {
  return data.from("field_reports").select("project_id").eq("id", id).single();
}

/** Fetch just the photo columns needed to run / persist vision tagging. */
export async function getFieldReportPhotos(id: number) {
  return unwrapOne(
    await data
      .from("field_reports")
      .select("id,photo_urls,photo_tags")
      .eq("id", id)
      .single()
  );
}

/** Persist the AI vision tags (JSON string) for a report's photos. */
export async function saveFieldReportPhotoTags(id: number, photoTags: string) {
  return unwrapOne(
    await data
      .from("field_reports")
      .update({ photo_tags: photoTags })
      .eq("id", id)
      .select()
      .single()
  );
}

export async function deleteFieldReport(id: number) {
  return unwrapVoid(await data.from("field_reports").delete().eq("id", id));
}

export async function listPublishedFieldReports(projectId: number) {
  const { data: rows, error } = await data
    .from("field_reports")
    .select("id,report_date,summary,tasks_completed,published_at,photo_urls")
    .eq("project_id", projectId)
    .eq("published_to_client", true)
    .order("report_date", { ascending: false });
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function getWeeklyStatsRows() {
  const { data: rows } = await data
    .from("field_reports")
    .select("report_date,published_to_client,issues_flagged")
    .order("report_date", { ascending: true })
    .gte(
      "report_date",
      new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString()
    );
  return rows ?? [];
}
