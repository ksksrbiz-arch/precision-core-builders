/**
 * Data-access layer for the `schedule_items` domain.
 *
 * Holds the Supabase query chains previously embedded in scheduleRouter so the
 * router keeps only validation + shaping. Query shapes (columns, filters,
 * ordering, snake_case field mapping) are preserved exactly.
 */
import { data, unwrapOne, unwrapVoid } from "./repository";

export async function listScheduleItems(projectId: number) {
  const { data: rows, error } = await data
    .from("schedule_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("planned_start");
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function createScheduleItem(values: Record<string, unknown>) {
  return unwrapOne(
    await data.from("schedule_items").insert(values).select().single()
  );
}

export async function updateScheduleItem(
  id: number,
  values: Record<string, unknown>
) {
  return unwrapOne(
    await data
      .from("schedule_items")
      .update(values)
      .eq("id", id)
      .select()
      .single()
  );
}

export async function deleteScheduleItem(id: number) {
  return unwrapVoid(await data.from("schedule_items").delete().eq("id", id));
}

export async function getWeatherSensitiveItems(input: {
  projectId: number;
  startDate: string;
  endDate: string;
}) {
  const { data: rows, error } = await data
    .from("schedule_items")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("weather_sensitive", true)
    .neq("status", "complete")
    .gte("planned_start", input.startDate)
    .lte("planned_end", input.endDate);
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function updateScheduleItemOrder(
  id: number,
  order: number,
  projectId: number
) {
  await data
    .from("schedule_items")
    .update({ sort_order: order })
    .eq("id", id)
    .eq("project_id", projectId);
}
