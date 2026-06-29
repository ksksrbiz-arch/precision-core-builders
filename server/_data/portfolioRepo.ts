/**
 * portfolioRepo — data-access for the `portfolio_projects` table.
 *
 * Routers own validation + snake_case mapping of optional fields; the Supabase
 * query chains live here and MUST match the previous inline behaviour exactly
 * (columns, filters, ordering).
 */
import { data } from "./repository";

export const portfolioRepo = {
  async listPublished() {
    const { data: rows, error } = await data
      .from("portfolio_projects")
      .select(
        "id,title,slug,category,short_description,location,completion_year,square_footage,cover_image_url,featured,sort_order"
      )
      .eq("published", true)
      .order("sort_order")
      .order("completion_year", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  },

  async getBySlug(slug: string) {
    const { data: row, error } = await data
      .from("portfolio_projects")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async listAdmin() {
    const { data: rows, error } = await data
      .from("portfolio_projects")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  },

  async create(values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("portfolio_projects")
      .insert(values)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async update(id: number, values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("portfolio_projects")
      .update(values)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async delete(id: number) {
    const { error } = await data
      .from("portfolio_projects")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};
