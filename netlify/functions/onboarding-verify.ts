/**
 * onboarding-verify — Tests a provided API key against its upstream service
 * WITHOUT writing it to Netlify env vars. Used mid-wizard to give Eric
 * a green checkmark before he commits a key.
 *
 * POST /api/onboarding-verify
 * Body: {
 *   onboardingToken: string,
 *   service: 'groq' | 'openweather' | 'stripe' | 'n8n' | 'supabase' | 'elevenlabs' | 'cloudflare_ai',
 *   credentials: Record<string, string>
 * }
 *
 * Response: { ok: boolean, service: string, message: string, details?: any }
 */
import type { Handler } from "@netlify/functions";
import { timingSafeEqualStr } from "./_lib/crypto";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { z } from "zod";

const verifyRequestSchema = z.object({
  onboardingToken: z.string().min(1),
  service: z.enum([
    "groq",
    "openweather",
    "stripe",
    "n8n",
    "supabase",
    "elevenlabs",
    "cloudflare_ai",
  ]),
  // Credential values are third-party API keys/secrets — bound the size so a
  // malformed request can't be used to smuggle megabytes of junk through.
  credentials: z.record(z.string(), z.string().max(2_000)),
});

const ONBOARDING_TOKEN = process.env.ONBOARDING_TOKEN ?? "";

async function verifyGroq(apiKey: string) {
  // Groq is OpenAI-compatible; listing models is a cheap, read-only auth check.
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res.status === 401) return { ok: false, message: "Invalid API key" };
  if (res.status === 429)
    return {
      ok: true,
      message: "Key is valid (rate limit hit — that's fine)",
    };
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    return {
      ok: false,
      message: err.error?.message ?? `Groq returned ${res.status}`,
    };
  }
  return { ok: true, message: "Groq key verified — AI features ready" };
}

async function verifyOpenWeather(apiKey: string) {
  // Eugene, OR coordinates
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=44.0521&lon=-123.0868&appid=${apiKey}`
  );
  if (res.status === 401)
    return {
      ok: false,
      message: "Invalid API key (may take 10 min to activate after creation)",
    };
  if (!res.ok)
    return { ok: false, message: `OpenWeatherMap returned ${res.status}` };
  const data = (await res.json()) as {
    name?: string;
    main?: { temp?: number };
  };
  return {
    ok: true,
    message: `Weather key verified — Eugene currently ${
      data.main?.temp
        ? Math.round(((data.main.temp - 273.15) * 9) / 5 + 32)
        : "??"
    }°F`,
  };
}

async function verifyStripe(secretKey: string) {
  const res = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (res.status === 401)
    return { ok: false, message: "Invalid Stripe secret key" };
  if (!res.ok) return { ok: false, message: `Stripe returned ${res.status}` };
  const data = (await res.json()) as {
    business_profile?: { name?: string };
    charges_enabled?: boolean;
  };
  const mode = secretKey.startsWith("sk_test_") ? "TEST mode" : "LIVE mode";
  return {
    ok: true,
    message: `Stripe ${mode} verified — ${
      data.business_profile?.name ?? "account"
    } (charges ${data.charges_enabled ? "enabled" : "NOT enabled"})`,
  };
}

async function verifyN8n(webhookUrl: string) {
  try {
    new URL(webhookUrl); // format check
  } catch {
    return { ok: false, message: "Not a valid URL" };
  }
  // n8n webhooks don't have a standard ping endpoint; do a lenient OPTIONS
  try {
    const res = await fetch(webhookUrl, { method: "OPTIONS" });
    if (res.status >= 500)
      return { ok: false, message: `n8n returned ${res.status}` };
    return {
      ok: true,
      message: "n8n webhook URL reachable (actual workflow runs on POST)",
    };
  } catch (err) {
    return {
      ok: false,
      message: `Couldn't reach webhook: ${
        err instanceof Error ? err.message : "unknown"
      }`,
    };
  }
}

async function verifySupabase(url: string, anonKey: string) {
  try {
    new URL(url);
  } catch {
    return { ok: false, message: "SUPABASE_URL is not a valid URL" };
  }
  // Hit the auth settings endpoint — public, cheap, validates anon key + URL pair
  const res = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (res.status === 401)
    return { ok: false, message: "Invalid anon key for this URL" };
  if (!res.ok) return { ok: false, message: `Supabase returned ${res.status}` };
  return { ok: true, message: "Supabase URL + anon key verified" };
}

async function verifyElevenLabs(apiKey: string) {
  const res = await fetch("https://api.elevenlabs.io/v1/user", {
    headers: { "xi-api-key": apiKey },
  });
  if (res.status === 401)
    return { ok: false, message: "Invalid ElevenLabs API key" };
  if (!res.ok)
    return { ok: false, message: `ElevenLabs returned ${res.status}` };
  const data = (await res.json()) as {
    subscription?: { tier?: string; character_count?: number };
  };
  return {
    ok: true,
    message: `ElevenLabs verified — tier: ${data.subscription?.tier ?? "free"}`,
  };
}

async function verifyCloudflareAI(accountId: string, token: string) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "hi", max_tokens: 5 }),
    }
  );
  if (res.status === 401 || res.status === 403)
    return { ok: false, message: "Invalid Cloudflare token or account ID" };
  if (!res.ok)
    return { ok: false, message: `Cloudflare returned ${res.status}` };
  return {
    ok: true,
    message: "Cloudflare Workers AI verified — free-tier fallback ready",
  };
}

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

  try {
    // Rate limit: 5 attempts per minute per IP — this endpoint checks a
    // shared secret token, so it's a brute-force target without this.
    const ip = getClientIp(event.headers);
    const rl = checkRateLimit(`onboarding-verify:${ip}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, ...rateLimitHeaders(rl) },
        body: JSON.stringify({
          error: "Too many attempts. Please wait a minute and try again.",
        }),
      };
    }

    if (!ONBOARDING_TOKEN) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: "ONBOARDING_TOKEN not configured" }),
      };
    }

    const rawBody = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
    const rawToken =
      typeof rawBody.onboardingToken === "string"
        ? rawBody.onboardingToken
        : "";

    // Auth check happens before schema validation of the rest of the body —
    // we don't want to leak "your service field is malformed" to a caller
    // who doesn't even have a valid token.
    if (
      !rawToken ||
      rawToken.length !== ONBOARDING_TOKEN.length ||
      !timingSafeEqualStr(rawToken, ONBOARDING_TOKEN)
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid onboarding token" }),
      };
    }

    const parsed = verifyRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Invalid request: ${parsed.error.issues.map(i => `${i.path.join(".")} ${i.message}`).join("; ")}`,
        }),
      };
    }
    const { service, credentials } = parsed.data;

    let result: { ok: boolean; message: string };
    switch (service) {
      case "groq":
        result = await verifyGroq(credentials.GROQ_API_KEY ?? "");
        break;
      case "openweather":
        result = await verifyOpenWeather(
          credentials.OPENWEATHERMAP_API_KEY ?? ""
        );
        break;
      case "stripe":
        result = await verifyStripe(credentials.STRIPE_SECRET_KEY ?? "");
        break;
      case "n8n":
        result = await verifyN8n(credentials.N8N_WEBHOOK_URL ?? "");
        break;
      case "supabase":
        result = await verifySupabase(
          credentials.SUPABASE_URL ?? "",
          credentials.SUPABASE_PUBLISHABLE_KEY ??
            credentials.SUPABASE_ANON_KEY ??
            ""
        );
        break;
      case "elevenlabs":
        result = await verifyElevenLabs(credentials.ELEVENLABS_API_KEY ?? "");
        break;
      case "cloudflare_ai":
        result = await verifyCloudflareAI(
          credentials.CLOUDFLARE_ACCOUNT_ID ?? "",
          credentials.CLOUDFLARE_WORKERS_AI_TOKEN ?? ""
        );
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown service: ${service}` }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...result, service }),
    };
  } catch (err) {
    console.error("[onboarding-verify]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Verification failed to run. Please try again.",
      }),
    };
  }
};
