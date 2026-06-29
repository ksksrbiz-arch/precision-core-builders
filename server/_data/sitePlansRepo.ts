/**
 * sitePlansRepo — data-access for the `site_plans` table (Excalidraw canvases).
 *
 * Routers own validation + snake_case mapping; the Supabase query chains live
 * here and MUST match the previous inline behaviour exactly, including the
 * per-method error message wording.
 */
import { data } from "./repository";

export const sitePlansRepo = {
  async list(projectId?: number) {
    let q = data
      .from("site_plans")
      .select(
        "id,name,project_id,author_id,thumbnail_data_url,created_at,updated_at"
      )
      .order("updated_at", { ascending: false });
    if (projectId) q = q.eq("project_id", projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(`Failed to fetch site plans: ${error.message}`);
    return rows ?? [];
  },

  async getById(id: number) {
    const { data: row, error } = await data
      .from("site_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (error)
      throw new Error(
        `Failed to fetch site plan with ID ${id}: ${error.message}`
      );
    return row;
  },

  async create(values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("site_plans")
      .insert(values)
      .select()
      .single();
    if (error) throw new Error(`Failed to create site plan: ${error.message}`);
    return row;
  },

  async update(id: number, values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("site_plans")
      .update(values)
      .eq("id", id)
      .select()
      .single();
    if (error)
      throw new Error(
        `Failed to update site plan with ID ${id}: ${error.message}`
      );
    return row;
  },

  async delete(id: number) {
    const { error } = await data.from("site_plans").delete().eq("id", id);
    if (error)
      throw new Error(
        `Failed to delete site plan with ID ${id}: ${error.message}`
      );
    return { success: true };
  },
};
