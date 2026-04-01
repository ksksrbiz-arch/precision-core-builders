/**
 * Supabase database client.
 * Phase 1: client is defined but not connected (no keys yet).
 * Phase 2: provide SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Netlify env.
 *
 * The service-role client bypasses Row Level Security for server-side ops.
 * Never expose this key client-side.
 */
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

function createSupabaseAdmin() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    // Return null-safe proxy in Phase 1 — no DB calls are made yet.
    return null as unknown as ReturnType<typeof createClient>;
  }
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const db = createSupabaseAdmin();
