/**
 * Canonical Supabase admin (service-role) client factory.
 *
 * Previously every Netlify Function and several server modules hand-rolled their
 * own `createClient(...)` with slightly different env lookups. This is the single
 * source of truth: call `getSupabaseAdmin()` (nullable) for best-effort access or
 * `requireSupabaseAdmin()` when a configured client is mandatory.
 *
 * The client is memoised per (url, key) pair so repeated calls within a single
 * function invocation reuse one connection. Env vars are read at call time so
 * tests can override `process.env` between cases.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: { cacheKey: string; client: SupabaseClient } | null = null;

function readConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "";
  return { url, key };
}

/**
 * Return a memoised service-role Supabase client, or `null` when Supabase is
 * not configured (local dev without secrets). Callers that can degrade
 * gracefully should branch on `null`.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const { url, key } = readConfig();
  if (!url || !key) return null;

  const cacheKey = `${url}::${key}`;
  if (cached && cached.cacheKey === cacheKey) return cached.client;

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  cached = { cacheKey, client };
  return client;
}

/**
 * Like `getSupabaseAdmin` but throws when Supabase is not configured. Use in
 * code paths that cannot proceed without a database connection.
 */
export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is not configured"
    );
  }
  return client;
}

/** True when service-role Supabase credentials are present. */
export function isSupabaseConfigured(): boolean {
  const { url, key } = readConfig();
  return Boolean(url && key);
}
