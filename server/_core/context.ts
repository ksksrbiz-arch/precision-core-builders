/**
 * tRPC context — verifies Supabase JWT from Authorization header.
 * Works for both local dev (Express) and Netlify Functions.
 *
 * Dev Mode: When NODE_ENV !== 'production' and the incoming token is the
 * well-known dev bypass token, returns a mock admin user so the admin
 * dashboard can be used without a live Supabase connection.
 */
import { createClient } from "@supabase/supabase-js";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type UserRole = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type TrpcContext = {
  req?: CreateExpressContextOptions["req"];
  res?: CreateExpressContextOptions["res"];
  user: SessionUser | null;
};

/** The shared dev bypass token — matches the client-side constant. */
const DEV_ADMIN_TOKEN = "dev-admin-token";

/** Supabase admin client — used server-side only to verify JWTs. */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Extract and verify the Supabase JWT from the Authorization header.
 * Returns the authenticated user or null for public routes.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const authHeader = opts.req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { req: opts.req, res: opts.res, user: null };
  }

  // Dev bypass — only valid outside production
  if (token === DEV_ADMIN_TOKEN && process.env.NODE_ENV !== "production") {
    return {
      req: opts.req,
      res: opts.res,
      user: {
        id: "dev-admin-local",
        email: "dev@precisioncorebuilders.com",
        name: "Dev Admin",
        role: "admin",
      },
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Supabase not configured — dev mode, skip verification
    return { req: opts.req, res: opts.res, user: null };
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      return { req: opts.req, res: opts.res, user: null };
    }

    const u = data.user;
    // Check role in public.users table first, fall back to metadata
    let role: UserRole = "user";
    try {
      const { data: profile, error: profileErr } = await admin
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
        role = (u.user_metadata?.role as UserRole) ?? "user";
      }
    } catch {
      role = (u.user_metadata?.role as UserRole) ?? "user";
    }

    return {
      req: opts.req,
      res: opts.res,
      user: {
        id: u.id,
        email: u.email ?? "",
        name:
          u.user_metadata?.name ??
          u.user_metadata?.full_name ??
          u.email?.split("@")[0] ??
          null,
        role,
      },
    };
  } catch {
    return { req: opts.req, res: opts.res, user: null };
  }
}
