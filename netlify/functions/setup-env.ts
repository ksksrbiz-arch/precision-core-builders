/**
 * setup-env — Admin-only function that writes a single environment variable
 * to the Netlify site via the Netlify API and optionally triggers a redeploy.
 *
 * POST /api/setup-env
 * Body: { key: string, value: string, adminToken: string }
 *
 * adminToken must match SETUP_ADMIN_TOKEN env var (set to any secret string
 * in Netlify dashboard → Site config → Environment variables).
 * This endpoint is create-only and will not overwrite existing keys that are
 * already configured in the Netlify dashboard.
 */
import type { Handler } from "@netlify/functions";
import { timingSafeEqual as _tse } from "node:crypto";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";

/** Timing-safe string comparison to prevent side-channel attacks */
function timingSafeEqual(a: string, b: string): boolean {
  try {
    return _tse(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

// Allowed keys that Eric is permitted to self-configure
const ALLOWED_KEYS = new Set([
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "N8N_WEBHOOK_URL",
  "VITE_GOOGLE_MAPS_API_KEY",
  "VITE_FRONTEND_FORGE_API_KEY",
]);

const NETLIFY_TOKEN = process.env.NETLIFY_AUTH_TOKEN ?? "";
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID ?? "";
const NETLIFY_ACCOUNT_ID = process.env.NETLIFY_ACCOUNT_ID ?? "";
// Admin guard — Eric MUST set SETUP_ADMIN_TOKEN in Netlify env vars
const ADMIN_TOKEN = process.env.SETUP_ADMIN_TOKEN ?? "";

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers, body: "" };

  const ip = getClientIp(event.headers as Record<string, string | undefined>);
  const rl = checkRateLimit(`setup-env:${ip}`, {
    maxRequests: 10,
    windowMs: 5 * 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({ error: "Too Many Requests" }),
    };
  }

  try {
    // Validate required env vars are set (no hardcoded fallbacks)
    if (!NETLIFY_TOKEN || !NETLIFY_SITE_ID || !NETLIFY_ACCOUNT_ID) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error:
            "Setup function not configured. Set NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID, and NETLIFY_ACCOUNT_ID in Netlify environment variables.",
        }),
      };
    }
    if (!ADMIN_TOKEN) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error:
            "SETUP_ADMIN_TOKEN not configured. Set a strong secret in Netlify environment variables before using the Setup Wizard.",
        }),
      };
    }

    const { key, value, adminToken } = JSON.parse(event.body ?? "{}");

    // Auth check — timing-safe comparison to prevent timing attacks
    if (
      !adminToken ||
      typeof adminToken !== "string" ||
      adminToken.length !== ADMIN_TOKEN.length ||
      !timingSafeEqual(adminToken, ADMIN_TOKEN)
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid admin token" }),
      };
    }

    // Key allowlist guard
    if (!ALLOWED_KEYS.has(key)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Key "${key}" is not in the allowed setup list.`,
        }),
      };
    }

    if (!value?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "value cannot be empty" }),
      };
    }

    const base = `https://api.netlify.com/api/v1/accounts/${NETLIFY_ACCOUNT_ID}/env`;
    const qs = `?site_id=${NETLIFY_SITE_ID}`;
    const authH = {
      Authorization: `Bearer ${NETLIFY_TOKEN}`,
      "Content-Type": "application/json",
    };

    // VITE_* variables are embedded by Vite at build time and must NOT be
    // attached to functions — keeping them build-scoped helps stay under
    // Netlify's 4 KB per-function environment-variable limit.
    const isViteVar = key.startsWith("VITE_");
    const varScopes = isViteVar
      ? ["builds"]
      : ["functions", "builds", "runtime"];

    // Create-only behavior: do not overwrite keys that already exist in
    // Netlify dashboard.
    const existingRes = await fetch(`${base}/${key}${qs}`, {
      method: "GET",
      headers: authH,
    });

    if (existingRes.status === 200) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: `Key "${key}" already exists in Netlify and will not be overwritten by setup-env.`,
        }),
      };
    }

    if (existingRes.status !== 404) {
      console.error(
        "[setup-env] netlify API could not check existing key",
        existingRes.status,
        key
      );
      throw new Error(`Netlify API ${existingRes.status}`);
    }

    const res = await fetch(`${base}${qs}`, {
      method: "POST",
      headers: authH,
      body: JSON.stringify([
        {
          key,
          scopes: isViteVar
            ? ["builds"]
            : ["functions", "builds", "runtime", "post_processing"],
          values: [{ context: "all", value }],
        },
      ]),
    });

    if (!res.ok) {
      // Drop the raw upstream message — it can echo the value back in some
      // error paths. Surface only the status code to the caller.
      console.error(
        "[setup-env] netlify API rejected key write",
        res.status,
        key
      );
      throw new Error(`Netlify API ${res.status}`);
    }

    // Trigger a new deploy so the key is live immediately
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/builds`,
      {
        method: "POST",
        headers: authH,
        body: JSON.stringify({ clear_cache: false }),
      }
    );
    const deployed = deployRes.ok;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, key, deployed }),
    };
  } catch (err) {
    // Log the full error server-side; return only a generic message to the
    // client so we never leak the value or upstream details.
    console.error("[setup-env]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal error writing environment variable",
      }),
    };
  }
};
