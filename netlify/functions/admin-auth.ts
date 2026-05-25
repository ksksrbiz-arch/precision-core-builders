/**
 * Admin authentication — simple email/password check against env vars.
 * No database or Supabase required.
 *
 * Required env vars (set in Netlify dashboard, server-side only):
 *   ADMIN_EMAIL(S)      — optional extra admin emails
 *   ADMIN_PASSWORD      — shared fallback admin password
 *   ADMIN_SESSION_TOKEN — a random secret string returned as the session token
 *
 * On success returns { token: ADMIN_SESSION_TOKEN }.
 * The client stores the token in localStorage and sends it as a Bearer token
 * on subsequent API calls.
 */
import type { Handler } from "@netlify/functions";
import { timingSafeEqual, createHash } from "crypto";
import { getAdminEmailSet } from "./_utils/adminEmails";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";

/**
 * Hash both strings with SHA-256 before comparing so `timingSafeEqual`
 * never leaks information about input length or content via timing.
 */
function safeEqual(a: string, b: string): boolean {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Rate limit: 5 attempts per minute per IP
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`admin-auth:${ip}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "Too many login attempts. Please wait a minute and try again.",
      }),
    };
  }

  let email: string;
  let password: string;
  try {
    const body = JSON.parse(event.body ?? "{}");
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  const adminEmails = getAdminEmailSet();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const sessionToken = process.env.ADMIN_SESSION_TOKEN ?? "";

  if (!adminPassword || !sessionToken) {
    console.error(
      "[admin-auth] ADMIN_PASSWORD or ADMIN_SESSION_TOKEN not set"
    );
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          "Admin credentials not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_TOKEN in Netlify environment variables.",
      }),
    };
  }

  // Use timing-safe comparison to prevent timing-based enumeration attacks
  const emailOk = Array.from(adminEmails).some(adminEmail =>
    safeEqual(email, adminEmail)
  );
  const passwordOk = safeEqual(password, adminPassword);

  if (!emailOk || !passwordOk) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Incorrect email or password." }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ token: sessionToken }),
  };
};
