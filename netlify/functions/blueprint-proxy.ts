/**
 * Netlify Function: blueprint-proxy
 *
 * Endpoint: /.netlify/functions/blueprint-proxy?path=/v1/projects
 *
 * Authenticated proxy to the blueprint.am API so that access tokens never
 * leak to the browser.  The caller must be an authenticated PCB user with
 * a connected Blueprint account.
 *
 * Request:
 *   GET/POST  /api/blueprint-proxy?path=<blueprint-path>
 *   Headers:  Authorization: Bearer <PCB-supabase-jwt>
 *   Body:     forwarded verbatim on POST/PUT/PATCH/DELETE
 *
 * Response:  Blueprint API response body (JSON passthrough), or error JSON.
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "../../server/_core/env";
import { decryptSecret } from "../../server/_core/crypto";
import { verifyAuth } from "./_utils/authGuard";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";

/** Paths a user is allowed to proxy (simple allowlist — expand as needed). */
const ALLOWED_PATH_PATTERNS: RegExp[] = [
  /^\/v1\/projects(\/[^\s]*)?$/,
  /^\/v1\/designs(\/[^\s]*)?$/,
  /^\/v1\/me$/,
];

function pathIsAllowed(path: string): boolean {
  return ALLOWED_PATH_PATTERNS.some(re => re.test(path));
}

function db() {
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  // Rate-limit by IP first (cheap) before hitting auth.
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`bp-proxy:${ip}`, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({ error: "Too many requests" }),
    };
  }

  const auth = await verifyAuth(event.headers);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.message }),
    };
  }

  const path = event.queryStringParameters?.path ?? "";
  if (!path.startsWith("/") || !pathIsAllowed(path)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Disallowed or missing `path`" }),
    };
  }

  // Load the caller's Blueprint connection.
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "Server not configured" }),
    };
  }
  const supa = db();
  const { data: conn, error: connErr } = await supa
    .from("blueprint_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (connErr) {
    console.error("[blueprint-proxy] load error:", connErr.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to load connection" }),
    };
  }
  if (!conn) {
    return {
      statusCode: 412,
      headers,
      body: JSON.stringify({ error: "Blueprint account not connected" }),
    };
  }

  // Resolve the credential (OAuth access token or API key).
  let authHeaderValue: string | null = null;
  try {
    if (conn.auth_method === "oauth" && conn.access_token_enc) {
      if (conn.expires_at && new Date(conn.expires_at).getTime() < Date.now()) {
        // Token-refresh could be added here by calling the Blueprint token
        // endpoint with `refresh_token` grant.  For now, signal expiry.
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: "Blueprint token expired" }),
        };
      }
      const token = decryptSecret(conn.access_token_enc);
      authHeaderValue = `Bearer ${token}`;
    } else if (conn.auth_method === "api_key" && conn.api_key_enc) {
      const key = decryptSecret(conn.api_key_enc);
      authHeaderValue = `Bearer ${key}`;
    }
  } catch (err) {
    console.error("[blueprint-proxy] decrypt error:", err);
  }
  if (!authHeaderValue) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Blueprint credentials unavailable" }),
    };
  }

  // Forward the request to the Blueprint API.
  const upstreamUrl = `${ENV.blueprintApiBaseUrl}${path}`;
  const forwardHeaders: Record<string, string> = {
    Authorization: authHeaderValue,
    Accept: "application/json",
    "User-Agent": "PrecisionCoreBuilders/1.0",
  };
  const method = event.httpMethod;
  const hasBody =
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE";
  if (hasBody && event.body) {
    forwardHeaders["Content-Type"] =
      event.headers["content-type"] ?? "application/json";
  }

  try {
    const resp = await fetch(upstreamUrl, {
      method,
      headers: forwardHeaders,
      body: hasBody ? (event.body ?? undefined) : undefined,
    });
    const text = await resp.text();
    return {
      statusCode: resp.status,
      headers: {
        ...headers,
        "Content-Type": resp.headers.get("content-type") ?? "application/json",
      },
      body: text,
    };
  } catch (err) {
    console.error("[blueprint-proxy] upstream error:", err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Blueprint API unreachable" }),
    };
  }
};
