/**
 * Auth guard utilities for Netlify Functions.
 *
 * This is a thin adapter over the canonical bearer-token verifier in
 * `server/_core/auth/verifyToken.ts`. The three-path verification logic
 * (opaque admin session token → dev bypass token → Supabase JWT) lives there
 * as the single source of truth; this module only maps the canonical
 * `VerifiedUser` onto the `AuthUser` shape that Netlify Functions and
 * `withGuards` already depend on, and keeps the header-based signatures those
 * callers use.
 *
 * Behaviour is preserved:
 *   - Same resolution order and env-var lookups. `verifyToken` resolves
 *     Supabase via `getSupabaseAdmin()`, which reads the identical
 *     `SUPABASE_URL ?? VITE_SUPABASE_URL` and
 *     `SUPABASE_SECRET_KEY ?? SUPABASE_SERVICE_ROLE_KEY` pair this module used
 *     directly before, so connectivity is unchanged.
 *   - Same returned id/email/role values for every path (admin session →
 *     id "admin"; dev bypass → id "dev-admin-local"; JWT → the Supabase user
 *     id), which downstream rate-limit keys (`vision:${user.id}`, etc.) rely on.
 *   - Same 401/403 status codes.
 * The canonical `VerifiedUser.name` field is intentionally dropped in the
 * mapping so the public `AuthUser` shape is unchanged.
 *
 * Dev Mode: When NODE_ENV !== 'production' and the token is the well-known
 * dev bypass token, a mock admin user is returned so functions work without a
 * live Supabase connection.
 */

import {
  extractBearer,
  verifyToken,
  verifyAdminToken,
  type VerifyResult,
} from "../../../server/_core/auth/verifyToken";

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; statusCode: 401 | 403; message: string };

/** Map a canonical VerifyResult onto the AuthUser-shaped AuthResult. */
function toAuthResult(result: VerifyResult): AuthResult {
  if (!result.ok) {
    return {
      ok: false,
      statusCode: result.statusCode,
      message: result.message,
    };
  }
  const { id, email, role } = result.user;
  return { ok: true, user: { id, email, role } };
}

/**
 * Extract and verify a Supabase Bearer JWT (or admin / dev token) from the
 * Authorization header. Returns the verified user record, or a structured
 * error result.
 *
 * @example
 * const auth = await verifyAuth(event.headers);
 * if (!auth.ok) {
 *   return { statusCode: auth.statusCode, headers, body: JSON.stringify({ error: auth.message }) };
 * }
 * const { user } = auth;
 */
export async function verifyAuth(
  headers: Record<string, string | undefined>
): Promise<AuthResult> {
  const result = await verifyToken(extractBearer(headers));
  return toAuthResult(result);
}

/**
 * Like `verifyAuth`, but also enforces `role === 'admin'`.
 * Returns 403 if the user is authenticated but not an admin.
 */
export async function verifyAdmin(
  headers: Record<string, string | undefined>
): Promise<AuthResult> {
  const result = await verifyAdminToken(extractBearer(headers));
  return toAuthResult(result);
}
