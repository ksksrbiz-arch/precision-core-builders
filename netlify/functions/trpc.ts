/**
 * tRPC Netlify Function — serves all /api/trpc/* requests in production.
 *
 * In local dev, the Express server (server/_core/index.ts) handles /api/trpc.
 * On Netlify, this function takes over via the redirect rule:
 *   /api/* → /.netlify/functions/:splat
 *
 * Uses @trpc/server/adapters/fetch which converts Netlify's event into a
 * standard Fetch API Request and returns a standard Fetch API Response.
 */
import type { Handler } from "@netlify/functions";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createClient } from "@supabase/supabase-js";
import { appRouter } from "../../server/routers";
import type { TrpcContext, SessionUser } from "../../server/_core/context";

// ─── Auth context helper ─────────────────────────────────────────────────────

/** Known dev bypass token — only trusted outside production. */
const DEV_ADMIN_TOKEN = "dev-admin-token";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUser(token: string | null): Promise<SessionUser | null> {
  if (!token) return null;

  // Admin session token — set via ADMIN_SESSION_TOKEN env var, no DB required.
  const adminSessionToken = process.env.ADMIN_SESSION_TOKEN ?? "";
  if (adminSessionToken && token === adminSessionToken) {
    return {
      id: "admin",
      email: process.env.ADMIN_EMAIL ?? "admin@precisioncorebuilders.com",
      name: "Eric Tadlock",
      role: "admin",
    };
  }

  // Dev bypass — never trusted in production.
  if (token === DEV_ADMIN_TOKEN && process.env.NODE_ENV !== "production") {
    return {
      id: "dev-admin-local",
      email: "dev@precisioncorebuilders.com",
      name: "Dev Admin",
      role: "admin",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;

    const u = data.user;

    // Prefer role from public.users table; fall back to JWT metadata.
    let role: "admin" | "user" = "user";
    try {
      const { data: profile } = await admin
        .from("users")
        .select("role")
        .eq("id", u.id)
        .single();
      if (profile?.role === "admin") role = "admin";
    } catch {
      role = (u.user_metadata?.role as "admin" | "user") ?? "user";
    }

    return {
      id: u.id,
      email: u.email ?? "",
      name:
        u.user_metadata?.name ??
        u.user_metadata?.full_name ??
        u.email?.split("@")[0] ??
        null,
      role,
    };
  } catch {
    return null;
  }
}

// ─── Netlify → Fetch Request conversion ──────────────────────────────────────

function netlifyEventToRequest(event: Parameters<Handler>[0]): Request {
  const protocol =
    event.headers["x-forwarded-proto"] ??
    event.headers["x-forwarded-protocol"] ??
    "https";
  const host = event.headers["host"] ?? "localhost";
  const url = `${protocol}://${host}${event.rawUrl ?? event.path}`;

  const body =
    event.body == null
      ? undefined
      : event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;

  return new Request(url, {
    method: event.httpMethod,
    headers: event.headers as Record<string, string>,
    body:
      event.httpMethod !== "GET" && event.httpMethod !== "HEAD"
        ? body
        : undefined,
  });
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async event => {
  const request = netlifyEventToRequest(event);

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async ({ req }): Promise<TrpcContext> => {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      const user = await resolveUser(token);
      return { user };
    },
    onError({ error, path }) {
      // Surface server-side errors in Netlify Function logs.
      console.error(`[tRPC] Error on /${path ?? "unknown"}:`, error.message);
    },
  });

  const body = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body,
  };
};
