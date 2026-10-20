/**
 * leadsRepo — data-access for the `pcb_leads` table (migration 0016; the plain
 * `leads` table in production is a legacy one with a different shape).
 *
 * Holds the Supabase query chains for the lead prioritization board. Routers
 * own validation + shaping; queries (columns, filters, ordering) live here and
 * MUST match the previous inline behaviour exactly.
 */
import { data } from "./repository";

export type LeadInsert = {
  name: string;
  project_type?: string;
  budget?: string;
  location?: string;
  timeline?: string;
  message?: string;
  score: number;
  priority: "low" | "medium" | "high" | "urgent";
  reasoning?: string;
  suggested_action?: string;
  estimated_value: number | null;
  scored_by: string | null;
};

export const leadsRepo = {
  async list(limit: number) {
    const { data: rows, error } = await data
      .from("pcb_leads")
      .select(
        "id,name,project_type,budget,location,timeline,message,score,priority,reasoning,suggested_action,estimated_value,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  },

  async create(values: LeadInsert) {
    const { data: row, error } = await data
      .from("pcb_leads")
      .insert(values)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  },

  async delete(id: number) {
    const { error } = await data.from("pcb_leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  async clear() {
    const { error } = await data.from("pcb_leads").delete().gte("id", 0);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};
