/**
 * Supabase browser client.
 * Supports both the new publishable key format (sb_publishable_*)
 * and the legacy anon JWT — whichever is present in env vars.
 *
 * Env vars (Netlify dashboard + .env.local for dev):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY   ← preferred (new format)
 *   VITE_SUPABASE_ANON_KEY          ← fallback (legacy JWT)
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

// Prefer new publishable key; fall back to legacy anon JWT
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Add these to Netlify environment variables or .env.local."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/** Get the current JWT access token for server-side Authorization headers. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
