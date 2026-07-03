/**
 * Supabase browser client.
 * Uses VITE_-prefixed env vars — safe to expose client-side.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/**
 * True when real Supabase credentials are present. Features that depend on
 * a live Supabase backend (auth, realtime) should check this first and
 * no-op when false so the app remains usable in dev-bypass mode.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY " +
      "(or legacy VITE_SUPABASE_ANON_KEY) not set. " +
      "Auth and realtime will be disabled until these are added to Netlify environment variables."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use PKCE flow so the code verifier is stored locally when a magic link
      // is requested.  Modern Supabase projects default to PKCE server-side;
      // without this the client sends no challenge and the code exchange will
      // fail when the link is opened in a different browser (e.g. the email
      // app opens it in Chrome while the app ran in Safari).
      // detectSessionInUrl still handles implicit-flow (#hash) redirects for
      // older projects, so this setting is backwards-compatible.
      flowType: "pkce",
    },
  }
);

/** Get the current JWT access token for tRPC Authorization header. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
