/**
 * finishCatalogRepo — data-access for the `finish_catalog_items` table.
 *
 * Mirrors portfolioRepo.ts exactly: routers own validation + snake_case
 * mapping of optional fields, the Supabase query chains live here.
 */
import { data } from "./repository";

export const finishCatalogRepo = {
  async listPublished() {
    const { data: rows, error } = await data
      .from("finish_catalog_items")
      .select(
        "id,name,slug,category,brand,description,price_tier,image_url,featured,sort_order"
      )
      .eq("published", true)
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  },

  async getBySlug(slug: string) {
    const { data: row, error } = await data
      .from("finish_catalog_items")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async listAdmin() {
    const { data: rows, error } = await data
      .from("finish_catalog_items")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  },

  async create(values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("finish_catalog_items")
      .insert(values)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async update(id: number, values: Record<string, unknown>) {
    const { data: row, error } = await data
      .from("finish_catalog_items")
      .update(values)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async delete(id: number) {
    const { error } = await data
      .from("finish_catalog_items")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};
