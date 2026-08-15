/**
 * Canonical bearer-token verification.
 *
 * This is the single implementation of the JWT/admin-token verification logic
 * that was previously duplicated across `server/_core/context.ts`,
 * `netlify/functions/trpc.ts`, and `netlify/functions/_utils/authGuard.ts`.
 *
 * Resolution order (highest precedence first):
 *   1. ADMIN_SESSION_TOKEN  — opaque admin token issued by `admin-auth`, no DB.
 *   2. Dev bypass token     — only honoured when NODE_ENV !== 'production'.
 *   3. Supabase JWT         — verified via `auth.getUser`, role resolved from
 *                             `public.users` then falling back to JWT metadata.
 *
 * Callers map the structured result onto their own semantics — e.g. the tRPC
 * context treats any failure as an anonymous (public) request, while Netlify
 * function guards return the supplied status code.
 */
import { getSupabaseAdmin } from "../supabase";

export type VerifiedRole = "admin" | "user";

export type VerifiedUser = {
  id: string;
  email: string;
  name: string | null;
  role: VerifiedRole;
};

export type VerifyResult =
  | { ok: true; user: VerifiedUser }
  | { ok: false; statusCode: 401 | 403; message: string };

/**
 * The shared dev bypass token — matches the client-side constant.
 *
 * IMPORTANT: this is a public string (it's baked into the client JS bundle,
 * readable via view-source on any deployed environment). It must NEVER be
 * the sole gate on the bypass — see the ALLOW_DEV_ADMIN_BYPASS check below.
 */
export const DEV_ADMIN_TOKEN = "dev-admin-token";

/** Extract a `Bearer <token>` value from a headers map (case-insensitive). */
export function extractBearer(
  headers: Record<string, string | undefined>
): string | null {
  const header = headers["authorization"] ?? headers["Authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function resolveMetadataRole(u: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}): VerifiedRole {
  const role =
    (u.app_metadata?.role as VerifiedRole | undefined) ??
    (u.user_metadata?.role as VerifiedRole | undefined);
  return role === "admin" ? "admin" : "user";
}

/**
 * Verify a bearer token and return the authenticated user, or a structured
 * error result. A `null`/empty token yields a 401.
 */
export async function verifyToken(token: string | null): Promise<VerifyResult> {
  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      message: "Missing authorization token",
    };
  }

  // 1. Opaque admin session token — no Supabase round-trip required.
  const adminSessionToken = process.env.ADMIN_SESSION_TOKEN ?? null;
  if (adminSessionToken && token === adminSessionToken) {
    return {
      ok: true,
      user: {
        id: "admin",
        email: process.env.ADMIN_EMAIL ?? "admin@precisioncorebuilders.com",
        name: "Eric Tadlock",
        role: "admin",
      },
    };
  }

  // 2. Dev bypass — never allowed unless BOTH:
  //    (a) NODE_ENV !== 'production' — belt.
  //    (b) ALLOW_DEV_ADMIN_BYPASS is explicitly set — suspenders.
  //
  // (a) alone is NOT sufficient: Netlify sets NODE_ENV=development for
  // deploy-preview and branch-deploy contexts (see netlify.toml), and every
  // PR/branch push gets a public preview URL. Since DEV_ADMIN_TOKEN is a
  // public string visible in the client bundle on any deployed environment
  // (previews included), gating on NODE_ENV alone means anyone who finds a
  // preview URL gets full admin access.
  //
  // ALLOW_DEV_ADMIN_BYPASS must be set in a developer's own local .env (see
  // .env.example) and must NEVER be added to Netlify's site environment
  // variables for any deploy context — that's what keeps this off on every
  // Netlify-hosted URL (production, deploy-preview, branch-deploy) while
  // still working for `pnpm dev` on a developer's own machine.
  if (
    token === DEV_ADMIN_TOKEN &&
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_ADMIN_BYPASS === "true"
  ) {
    return {
      ok: true,
      user: {
        id: "dev-admin-local",
        email: "dev@precisioncorebuilders.com",
        name: "Dev Admin",
        role: "admin",
      },
    };
  }

  // 3. Supabase JWT.
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      statusCode: 401,
      message: "Authentication is not configured",
    };
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      return {
        ok: false,
        statusCode: 401,
        message: "Invalid or expired token",
      };
    }

    const u = data.user;
    let role: VerifiedRole = "user";
    try {
      const { data: profile, error: profileErr } = await admin
        .from("users")
        .select("role")
        .eq("id", u.id)
        .maybeSingle();
      if (
        !profileErr &&
        (profile?.role === "admin" || profile?.role === "user")
      ) {
        role = profile.role;
      } else {
        role = resolveMetadataRole(u);
      }
    } catch {
      role = resolveMetadataRole(u);
    }

    return {
      ok: true,
      user: {
        id: u.id,
        email: u.email ?? "",
        name:
          (u.user_metadata?.name as string | undefined) ??
          (u.user_metadata?.full_name as string | undefined) ??
          u.email?.split("@")[0] ??
          null,
        role,
      },
    };
  } catch (err) {
    console.error("[verifyToken]", err);
    return { ok: false, statusCode: 401, message: "Authentication failed" };
  }
}

/** Like `verifyToken`, but additionally requires `role === 'admin'`. */
export async function verifyAdminToken(
  token: string | null
): Promise<VerifyResult> {
  const result = await verifyToken(token);
  if (!result.ok) return result;
  if (result.user.role !== "admin") {
    return { ok: false, statusCode: 403, message: "Admin access required" };
  }
  return result;
}
