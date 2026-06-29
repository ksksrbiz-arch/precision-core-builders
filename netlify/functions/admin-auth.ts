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
import { getAdminEmailSet } from "./_utils/adminEmails";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { withGuards } from "./_lib/http";
import { sha256Hex, timingSafeEqualStr } from "./_lib/crypto";

/**
 * Hash both strings with SHA-256 before comparing so the timing-safe check
 * never leaks information about input length or content via timing.
 */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqualStr(sha256Hex(a), sha256Hex(b));
}

export const handler = withGuards(
  { methods: ["POST"], auth: "none" },
  async ({ event, json, error }) => {
    // Rate limit: 5 attempts per minute per IP
    const ip = getClientIp(event.headers);
    const rl = checkRateLimit(`admin-auth:${ip}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return error(
        429,
        "Too many login attempts. Please wait a minute and try again.",
        rateLimitHeaders(rl)
      );
    }

    let email: string;
    let password: string;
    try {
      const body = JSON.parse(event.body ?? "{}");
      email = (body.email ?? "").trim().toLowerCase();
      password = body.password ?? "";
    } catch {
      return error(400, "Invalid request body");
    }

    const adminEmails = getAdminEmailSet();
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";
    const sessionToken = process.env.ADMIN_SESSION_TOKEN ?? "";

    if (!adminPassword || !sessionToken) {
      console.error(
        "[admin-auth] ADMIN_PASSWORD or ADMIN_SESSION_TOKEN not set"
      );
      return error(
        503,
        "Admin credentials not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_TOKEN in Netlify environment variables."
      );
    }

    // Use timing-safe comparison to prevent timing-based enumeration attacks
    const emailOk = Array.from(adminEmails).some(adminEmail =>
      safeEqual(email, adminEmail)
    );
    const passwordOk = safeEqual(password, adminPassword);

    if (!emailOk || !passwordOk) {
      return error(401, "Incorrect email or password.");
    }

    return json(200, { token: sessionToken });
  }
);
