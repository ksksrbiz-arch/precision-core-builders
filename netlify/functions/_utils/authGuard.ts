/**
 * Auth guard utilities for Netlify Functions.
 *
 * Centralises the JWT verification pattern that was previously duplicated
 * across individual function files.  All functions that require an
 * authenticated user should call `verifyAuth()` at the top of their handler.
 *
 * Dev Mode: When NODE_ENV !== 'production' and the token is the well-known
 * dev bypass token, returns a mock admin user so functions work without a
 * live Supabase connection.
 */

import { createClient } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; statusCode: 401 | 403; message: string };

/** The shared dev bypass token — must match the client-side constant. */
const DEV_ADMIN_TOKEN = "dev-admin-token";

/** Mock admin user returned in dev bypass mode. */
const DEV_ADMIN_USER: AuthUser = {
  id: "dev-admin-local",
  email: "dev@precisioncorebuilders.com",
  role: "admin",
};

/** Lazily-constructed Supabase admin client (service role). */
function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured"
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Return the configured admin session token, or null if not set.
 * This token is set as ADMIN_SESSION_TOKEN in Netlify env vars and returned
 * by the admin-auth function after a successful credential check.
 */
function getAdminSessionToken(): string | null {
  return process.env.ADMIN_SESSION_TOKEN ?? null;
}

/**
 * Extract and verify a Supabase Bearer JWT from the Authorization header.
 * Returns the verified user record, or a structured error result.
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
  const authHeader = headers["authorization"] ?? headers["Authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      message: "Missing authorization token",
    };
  }

  // Admin session token — set by the admin-auth function, no DB required.
  const adminSessionToken = getAdminSessionToken();
  if (adminSessionToken && token === adminSessionToken) {
    return {
      ok: true,
      user: {
        id: "admin",
        email: process.env.ADMIN_EMAIL ?? "admin@precisioncorebuilders.com",
        role: "admin" as const,
      },
    };
  }

  // Dev bypass — only valid outside production
  if (token === DEV_ADMIN_TOKEN && process.env.NODE_ENV !== "production") {
    return { ok: true, user: DEV_ADMIN_USER };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return {
        ok: false,
        statusCode: 401,
        message: "Invalid or expired token",
      };
    }

    const u = data.user;

    // Look up role in public.users table first; fall back to metadata.
    let role: "admin" | "user" = "user";
    try {
      const { data: profile, error: profileErr } = await supabase
        .from("users")
        .select("role")
        .eq("id", u.id)
        .maybeSingle();
      if (
        !profileErr &&
        profile?.role &&
        (profile.role === "admin" || profile.role === "user")
      ) {
        role = profile.role;
      } else {
        role = (u.user_metadata?.role as "admin" | "user") ?? "user";
      }
    } catch {
      role = (u.user_metadata?.role as "admin" | "user") ?? "user";
    }

    return {
      ok: true,
      user: { id: u.id, email: u.email ?? "", role },
    };
  } catch (err) {
    console.error("[authGuard] verifyAuth error:", err);
    return { ok: false, statusCode: 401, message: "Authentication failed" };
  }
}

/**
 * Like `verifyAuth`, but also enforces `role === 'admin'`.
 * Returns 403 if the user is authenticated but not an admin.
 */
export async function verifyAdmin(
  headers: Record<string, string | undefined>
): Promise<AuthResult> {
  const result = await verifyAuth(headers);
  if (!result.ok) return result;

  if (result.user.role !== "admin") {
    return { ok: false, statusCode: 403, message: "Admin access required" };
  }

  return result;
}
