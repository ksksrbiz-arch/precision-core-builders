/**
 * onboarding-provision — Batch-writes multiple environment variables
 * and triggers a single redeploy. Designed for the Onboarding Wizard
 * flow where Eric finalizes a phase (e.g., "Anthropic + OpenWeatherMap
 * keys collected") and we commit the batch atomically.
 *
 * POST /api/onboarding-provision
 * Body: {
 *   onboardingToken: string,      // matches ONBOARDING_TOKEN env var
 *   phase: string,                 // 'ai' | 'weather' | 'stripe' | 'n8n' | 'final'
 *   vars: Record<string, string>,  // { KEY: value, ... }
 *   triggerDeploy: boolean         // default true on final phase, false mid-flow
 * }
 *
 * Response: {
 *   ok: true,
 *   written: string[],
 *   skippedExisting: string[],
 *   deployId?: string
 * }
 *
 * This endpoint is create-only and never overwrites existing keys already
 * configured in Netlify dashboard.
 *
 * Security:
 * - Token-gated with timing-safe comparison (same as setup-env)
 * - Allowlist-gated per phase (can't write arbitrary keys)
 * - Rate-limited per IP via the shared sliding-window limiter
 *   (10 req / 5 min). Defense-in-depth on top of the token gate.
 */
import type { Handler } from "@netlify/functions";
import { timingSafeEqual as _tse } from "node:crypto";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";

function timingSafeEqual(a: string, b: string): boolean {
  try {
    return _tse(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

// Per-phase allowlists. Each phase corresponds to a wizard step.
const PHASE_ALLOWLIST: Record<string, Set<string>> = {
  ai: new Set([
    "ANTHROPIC_API_KEY",
    "CLOUDFLARE_WORKERS_AI_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
  ]),
  weather: new Set(["OPENWEATHERMAP_API_KEY"]),
  supabase: new Set([
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
  ]),
  stripe: new Set([
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "VITE_STRIPE_PUBLISHABLE_KEY",
  ]),
  n8n: new Set(["N8N_WEBHOOK_URL", "N8N_WEBHOOK_SECRET"]),
  voice: new Set(["ELEVENLABS_API_KEY"]),
};

const NETLIFY_TOKEN = process.env.NETLIFY_AUTH_TOKEN ?? "";
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID ?? "";
const NETLIFY_ACCOUNT_ID = process.env.NETLIFY_ACCOUNT_ID ?? "";
const ONBOARDING_TOKEN = process.env.ONBOARDING_TOKEN ?? "";

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers, body: "" };

  // Rate-limit by IP before doing any auth or parsing work.
  const ip = getClientIp(event.headers as Record<string, string | undefined>);
  const rl = checkRateLimit(`onboarding-provision:${ip}`, {
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
    // Config sanity check
    if (!NETLIFY_TOKEN || !NETLIFY_SITE_ID || !NETLIFY_ACCOUNT_ID) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error:
            "Provisioning function not configured. Contact Keith — NETLIFY_* vars missing.",
        }),
      };
    }
    if (!ONBOARDING_TOKEN) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error:
            "ONBOARDING_TOKEN not set. Set this env var in Netlify before sending Eric the wizard link.",
        }),
      };
    }

    const {
      onboardingToken,
      phase,
      vars,
      triggerDeploy = false,
    } = JSON.parse(event.body ?? "{}") as {
      onboardingToken?: string;
      phase?: string;
      vars?: Record<string, string>;
      triggerDeploy?: boolean;
    };

    // Auth
    if (
      !onboardingToken ||
      typeof onboardingToken !== "string" ||
      onboardingToken.length !== ONBOARDING_TOKEN.length ||
      !timingSafeEqual(onboardingToken, ONBOARDING_TOKEN)
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid onboarding token" }),
      };
    }

    // Phase validation
    if (!phase || !PHASE_ALLOWLIST[phase]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Unknown phase "${phase}". Valid: ${Object.keys(
            PHASE_ALLOWLIST
          ).join(", ")}`,
        }),
      };
    }

    // Payload validation
    if (!vars || typeof vars !== "object" || Object.keys(vars).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "vars object is empty" }),
      };
    }

    // Allowlist each key for this phase
    const allowlist = PHASE_ALLOWLIST[phase];
    const rejected = Object.keys(vars).filter(k => !allowlist.has(k));
    if (rejected.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Keys not allowed in phase "${phase}": ${rejected.join(", ")}`,
        }),
      };
    }

    // Value sanity — no empty strings, reasonable length bounds
    for (const [k, v] of Object.entries(vars)) {
      if (typeof v !== "string" || v.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Value for ${k} is empty` }),
        };
      }
      if (v.length > 2048) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Value for ${k} exceeds 2048 chars` }),
        };
      }
    }

    // Write each var to Netlify (PATCH then POST fallback)
    const base = `https://api.netlify.com/api/v1/accounts/${NETLIFY_ACCOUNT_ID}/env`;
    const qs = `?site_id=${NETLIFY_SITE_ID}`;
    const authH = {
      Authorization: `Bearer ${NETLIFY_TOKEN}`,
      "Content-Type": "application/json",
    };

    const written: string[] = [];
    const skippedExisting: string[] = [];
    const failed: Array<{ key: string; error: string }> = [];

    for (const [key, value] of Object.entries(vars)) {
      // VITE_* variables are embedded by Vite at build time and must NOT be
      // attached to functions — keeping them build-scoped helps stay under
      // Netlify's 4 KB per-function environment-variable limit.
      const isViteVar = key.startsWith("VITE_");
      try {
        // Create-only behavior: skip keys that already exist.
        const existingRes = await fetch(`${base}/${key}${qs}`, {
          method: "GET",
          headers: authH,
        });

        if (existingRes.status === 200) {
          skippedExisting.push(key);
          continue;
        }

        if (existingRes.status !== 404) {
          failed.push({
            key,
            error: `Failed to check existing key "${key}": Netlify API ${existingRes.status}`,
          });
          continue;
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
          // Don't surface upstream error bodies — they can echo the value
          // back. Log server-side and return only a status code.
          console.error(
            "[onboarding-provision] netlify rejected key",
            res.status,
            key
          );
          failed.push({ key, error: `Netlify ${res.status}` });
          continue;
        }

        written.push(key);
      } catch (err) {
        failed.push({
          key,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    // Optional redeploy (batched — only trigger once per phase completion)
    let deployId: string | undefined;
    if (triggerDeploy && written.length > 0) {
      const deployRes = await fetch(
        `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/builds`,
        {
          method: "POST",
          headers: authH,
          body: JSON.stringify({
            clear_cache: false,
          }),
        }
      );
      if (deployRes.ok) {
        const deploy = (await deployRes.json()) as { id?: string };
        deployId = deploy.id;
      }
    }

    return {
      statusCode: failed.length > 0 ? 207 : 200,
      headers,
      body: JSON.stringify({
        ok: failed.length === 0,
        phase,
        written,
        skippedExisting,
        failed,
        deployId,
      }),
    };
  } catch (err) {
    console.error("[onboarding-provision]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal error provisioning environment",
      }),
    };
  }
};
