/**
 * getAuthHeader — build the Authorization header for authenticated API calls,
 * ALWAYS using a fresh token.
 *
 * Every direct `fetch` to an authenticated Netlify Function (AI copilot, vision,
 * estimator, search, voice-to-report, usage, portal assistant) must use this
 * instead of a cached `accessToken` captured from `useAuth`. Supabase access
 * tokens are short-lived JWTs that the supabase-js client rotates in the
 * background; a value held in React state goes stale, and the server then
 * rejects it with "Invalid or expired token". `supabase.auth.getSession()`
 * (via `getAccessToken`) returns the current, auto-refreshed token at call time.
 *
 * Precedence mirrors the tRPC client (see `client/src/main.tsx`):
 *   1. Dev bypass token   (VITE_DEV_MODE + localStorage flag)
 *   2. Admin session token (stored by the admin-auth function)
 *   3. Live Supabase JWT   (fetched fresh, auto-refreshed)
 */
import { getAccessToken } from "@/lib/supabase";
import {
  DEV_BYPASS_KEY,
  getStoredAdminSessionToken,
} from "@/_core/hooks/useAuth";

export async function getAuthHeader(): Promise<Record<string, string>> {
  // 1. Dev bypass.
  if (
    import.meta.env.VITE_DEV_MODE === "true" &&
    localStorage.getItem(DEV_BYPASS_KEY) === "true"
  ) {
    return { Authorization: "Bearer dev-admin-token" };
  }

  // 2. Opaque admin session token (no expiry — safe to use as stored).
  const adminToken = getStoredAdminSessionToken();
  if (adminToken) {
    return { Authorization: `Bearer ${adminToken}` };
  }

  // 3. Live Supabase JWT — fetched fresh so it is never expired.
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
