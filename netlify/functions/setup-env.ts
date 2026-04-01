/**
 * setup-env — Admin-only function that writes a single environment variable
 * to the Netlify site via the Netlify API and optionally triggers a redeploy.
 *
 * POST /api/setup-env
 * Body: { key: string, value: string, adminToken: string }
 *
 * adminToken must match SETUP_ADMIN_TOKEN env var (set to any secret string
 * in Netlify dashboard → Site config → Environment variables).
 * Falls back to a well-known default so Eric can use it immediately before
 * setting his own token.
 */
import type { Handler } from "@netlify/functions";

// Allowed keys that Eric is permitted to self-configure
const ALLOWED_KEYS = new Set([
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "N8N_WEBHOOK_URL",
  "VITE_GOOGLE_MAPS_API_KEY",
  "VITE_FRONTEND_FORGE_API_KEY",
]);

const NETLIFY_TOKEN  = process.env.NETLIFY_AUTH_TOKEN  ?? "nfp_pbha9Q3PzNZkMdbXaVwThW6X9wzaxjvF0ff7";
const NETLIFY_SITE_ID   = process.env.NETLIFY_SITE_ID   ?? "9fd4c5ea-1f55-4aad-a29e-7258c7b53a39";
const NETLIFY_ACCOUNT_ID = process.env.NETLIFY_ACCOUNT_ID ?? "694fb6af96fad85b752f7fa6";
// Simple admin guard — Eric sets this once and uses it in the wizard
const ADMIN_TOKEN = process.env.SETUP_ADMIN_TOKEN ?? "precision-core-setup-2024";

export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: "" };

  try {
    const { key, value, adminToken } = JSON.parse(event.body ?? "{}");

    // Auth check
    if (!adminToken || adminToken !== ADMIN_TOKEN) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid admin token" }) };
    }

    // Key allowlist guard
    if (!ALLOWED_KEYS.has(key)) {
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ error: `Key "${key}" is not in the allowed setup list.` }),
      };
    }

    if (!value?.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "value cannot be empty" }) };
    }

    const base = `https://api.netlify.com/api/v1/accounts/${NETLIFY_ACCOUNT_ID}/env`;
    const qs   = `?site_id=${NETLIFY_SITE_ID}`;
    const authH = { "Authorization": `Bearer ${NETLIFY_TOKEN}`, "Content-Type": "application/json" };

    // Try PATCH first (update), fall back to POST (create)
    let res = await fetch(`${base}/${key}${qs}`, {
      method: "PATCH",
      headers: authH,
      body: JSON.stringify({ scopes: ["functions", "builds", "runtime"], value, context: "all" }),
    });

    if (res.status === 404) {
      res = await fetch(`${base}${qs}`, {
        method: "POST",
        headers: authH,
        body: JSON.stringify([{
          key,
          scopes: ["functions", "builds", "runtime", "post_processing"],
          values: [{ context: "all", value }],
        }]),
      });
    }

    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err?.message ?? `Netlify API ${res.status}`);
    }

    // Trigger a new deploy so the key is live immediately
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/builds`,
      { method: "POST", headers: authH, body: JSON.stringify({ clear_cache: false }) }
    );
    const deployed = deployRes.ok;

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, key, deployed }),
    };
  } catch (err) {
    console.error("[setup-env]", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
