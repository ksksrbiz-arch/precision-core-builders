/**
 * Shared Supabase admin client for Netlify Functions.
 * Uses service_role key — NEVER expose to the browser.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  _admin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}
