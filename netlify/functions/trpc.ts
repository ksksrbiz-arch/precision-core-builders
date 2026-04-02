/**
 * tRPC Netlify Function — serves all tRPC procedures as a single serverless endpoint.
 * Maps Netlify Function event → Express-like req/res for the existing context adapter.
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";
import type {
  SessionUser,
  TrpcContext,
  UserRole,
} from "../../server/_core/context";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUser(token: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;

    const u = data.user;
    let role: UserRole = "user";
    try {
      const { data: profile } = await admin
        .from("users")
        .select("role")
        .eq("id", u.id)
        .single();
      if (profile?.role === "admin") role = "admin";
    } catch {
      role = (u.user_metadata?.role as UserRole) ?? "user";
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

export const handler: Handler = async event => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Build a standard Request from the Netlify event.
  // event.rawUrl preserves the original /api/trpc/... path even after redirect.
  // Fall back to constructing from path + querystring.
  const host = event.headers.host ?? "localhost";
  const rawUrl =
    event.rawUrl ??
    `https://${host}${event.path}${event.rawQuery ? `?${event.rawQuery}` : ""}`;
  // Ensure the URL starts with the tRPC endpoint prefix
  const url = rawUrl.includes("/api/trpc")
    ? rawUrl
    : rawUrl.replace("/.netlify/functions/trpc", "/api/trpc");

  const request = new Request(url, {
    method: event.httpMethod,
    headers: event.headers as Record<string, string>,
    body: event.httpMethod !== "GET" ? event.body : undefined,
  });

  // Resolve auth from Authorization header
  const authHeader = event.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const user = await resolveUser(token);

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: (): TrpcContext => ({
      req: { headers: event.headers } as any,
      res: {} as any,
      user,
    }),
  });

  // Convert fetch Response to Netlify handler response
  const body = await response.text();
  const responseHeaders: Record<string, string> = { ...headers };
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body,
  };
};
