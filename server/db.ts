/**
 * Supabase server-side client + query helpers for all 12 tables.
 * Uses service role key — never expose client-side.
 */
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

function createSupabaseAdmin() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) return null as never;
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const db = createSupabaseAdmin();

// ─── Pagination helper ────────────────────────────────────────
export type PaginationInput = { page?: number; pageSize?: number };
export function paginate({ page = 1, pageSize = 20 }: PaginationInput) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}
