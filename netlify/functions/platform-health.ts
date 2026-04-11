/**
 * platform-health — Comprehensive health check endpoint that tests all
 * platform integrations and returns detailed status for the Setup Wizard.
 *
 * GET /api/platform-health?adminToken=xxx
 *
 * Returns status of: Supabase, Cloudflare AI, Weather API, Stripe, n8n
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

type ServiceStatus = {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "error" | "not_configured";
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
};

async function checkSupabase(): Promise<ServiceStatus> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      id: "supabase",
      name: "Supabase Database",
      status: "not_configured",
      message: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set",
    };
  }

  const start = Date.now();
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows, which is fine
      throw error;
    }

    return {
      id: "supabase",
      name: "Supabase Database",
      status: "healthy",
      message: "Connected, profiles table accessible",
      latencyMs: Date.now() - start,
      details: { rowsReturned: data?.length ?? 0 },
    };
  } catch (err) {
    return {
      id: "supabase",
      name: "Supabase Database",
      status: "error",
      message: String(err),
      latencyMs: Date.now() - start,
    };
  }
}

async function checkCloudflareAI(): Promise<ServiceStatus> {
  const token = process.env.CF_API_TOKEN;
  const accountId = process.env.CF_ACCOUNT_ID;

  if (!token || !accountId) {
    return {
      id: "cloudflare_ai",
      name: "Cloudflare Workers AI",
      status: "not_configured",
      message: "CF_API_TOKEN or CF_ACCOUNT_ID not set",
    };
  }

  const start = Date.now();
  try {
    // Simple test call to the AI
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 10,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
    }

    const data = (await res.json()) as any;
    const hasResponse = data?.result?.response || data?.response;

    return {
      id: "cloudflare_ai",
      name: "Cloudflare Workers AI",
      status: hasResponse ? "healthy" : "degraded",
      message: hasResponse
        ? "AI responding normally"
        : "AI returned empty response",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      id: "cloudflare_ai",
      name: "Cloudflare Workers AI",
      status: "error",
      message: String(err),
      latencyMs: Date.now() - start,
    };
  }
}

async function checkAnthropicAI(): Promise<ServiceStatus> {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return {
      id: "anthropic_ai",
      name: "Anthropic Claude (Fallback)",
      status: "not_configured",
      message: "ANTHROPIC_API_KEY not set",
    };
  }

  // Just verify the key format, don't make a real call to save quota
  if (!key.startsWith("sk-ant-")) {
    return {
      id: "anthropic_ai",
      name: "Anthropic Claude (Fallback)",
      status: "error",
      message: "Invalid key format (should start with sk-ant-)",
    };
  }

  return {
    id: "anthropic_ai",
    name: "Anthropic Claude (Fallback)",
    status: "healthy",
    message: "API key configured (format valid)",
    details: { keyPrefix: key.slice(0, 10) + "..." },
  };
}

async function checkWeather(): Promise<ServiceStatus> {
  const key = process.env.OPENWEATHERMAP_API_KEY;

  if (!key) {
    return {
      id: "weather",
      name: "OpenWeatherMap",
      status: "not_configured",
      message: "OPENWEATHERMAP_API_KEY not set",
    };
  }

  const start = Date.now();
  try {
    // Eugene, OR coordinates
    const lat = 44.0521;
    const lon = -123.0868;
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=imperial`
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;

    return {
      id: "weather",
      name: "OpenWeatherMap",
      status: "healthy",
      message: `Eugene OR: ${data.weather?.[0]?.description ?? "unknown"}, ${Math.round(data.main?.temp ?? 0)}°F`,
      latencyMs: Date.now() - start,
      details: {
        temp: data.main?.temp,
        conditions: data.weather?.[0]?.main,
      },
    };
  } catch (err) {
    return {
      id: "weather",
      name: "OpenWeatherMap",
      status: "error",
      message: String(err),
      latencyMs: Date.now() - start,
    };
  }
}

async function checkStripe(): Promise<ServiceStatus> {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    return {
      id: "stripe",
      name: "Stripe Payments",
      status: "not_configured",
      message: "STRIPE_SECRET_KEY not set (optional)",
    };
  }

  const start = Date.now();
  try {
    // Just verify the key works by fetching account
    const res = await fetch("https://api.stripe.com/v1/account", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (!res.ok) {
      const data = (await res.json()) as any;
      throw new Error(data.error?.message ?? `HTTP ${res.status}`);
    }

    const account = (await res.json()) as any;
    const isTest = key.includes("_test_");

    return {
      id: "stripe",
      name: "Stripe Payments",
      status: "healthy",
      message: `${isTest ? "Test mode" : "Live mode"}: ${account.business_profile?.name ?? account.email ?? "Connected"}`,
      latencyMs: Date.now() - start,
      details: {
        mode: isTest ? "test" : "live",
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
    };
  } catch (err) {
    return {
      id: "stripe",
      name: "Stripe Payments",
      status: "error",
      message: String(err),
      latencyMs: Date.now() - start,
    };
  }
}

async function checkN8n(): Promise<ServiceStatus> {
  const url = process.env.N8N_WEBHOOK_URL;

  if (!url) {
    return {
      id: "n8n",
      name: "n8n Automation",
      status: "not_configured",
      message: "N8N_WEBHOOK_URL not set (optional)",
    };
  }

  // Just validate URL format — can't test webhook without triggering it
  try {
    new URL(url);
    return {
      id: "n8n",
      name: "n8n Automation",
      status: "healthy",
      message: "Webhook URL configured",
      details: { url: url.replace(/\/[^\/]+$/, "/***") },
    };
  } catch {
    return {
      id: "n8n",
      name: "n8n Automation",
      status: "error",
      message: "Invalid webhook URL format",
    };
  }
}

async function checkOpenAI(): Promise<ServiceStatus> {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return {
      id: "openai",
      name: "OpenAI (Whisper)",
      status: "not_configured",
      message: "OPENAI_API_KEY not set",
    };
  }

  // Just validate key format
  if (!key.startsWith("sk-")) {
    return {
      id: "openai",
      name: "OpenAI (Whisper)",
      status: "error",
      message: "Invalid key format (should start with sk-)",
    };
  }

  return {
    id: "openai",
    name: "OpenAI (Whisper)",
    status: "healthy",
    message: "API key configured (format valid)",
    details: { keyPrefix: key.slice(0, 12) + "..." },
  };
}

async function checkDatabaseTables(): Promise<ServiceStatus> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return {
      id: "db_tables",
      name: "Database Schema",
      status: "not_configured",
      message: "Supabase credentials not set",
    };
  }

  const start = Date.now();
  try {
    const supabase = createClient(url, key);

    // Check for critical tables
    const tables = [
      "profiles",
      "projects",
      "clients",
      "field_reports",
      "materials",
      "invoices",
    ];
    const results: Record<string, boolean> = {};

    for (const table of tables) {
      const { error } = await supabase.from(table).select("id").limit(1);
      // PGRST116 = no rows (table exists but empty) - that's fine
      // 42P01 = table doesn't exist
      results[table] = !error || error.code === "PGRST116";
    }

    const missing = Object.entries(results)
      .filter(([, exists]) => !exists)
      .map(([name]) => name);

    if (missing.length > 0) {
      return {
        id: "db_tables",
        name: "Database Schema",
        status: "degraded",
        message: `Missing tables: ${missing.join(", ")}`,
        latencyMs: Date.now() - start,
        details: results,
      };
    }

    return {
      id: "db_tables",
      name: "Database Schema",
      status: "healthy",
      message: `All ${tables.length} core tables present`,
      latencyMs: Date.now() - start,
      details: results,
    };
  } catch (err) {
    return {
      id: "db_tables",
      name: "Database Schema",
      status: "error",
      message: String(err),
      latencyMs: Date.now() - start,
    };
  }
}

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: "" };
  }

  // Auth check - allow bootstrap token for initial setup
  const adminToken = event.queryStringParameters?.adminToken;
  const expectedToken = process.env.SETUP_ADMIN_TOKEN;
  const bootstrapToken = "pcb-bootstrap-2026"; // Fallback for initial setup

  if (!expectedToken && !adminToken) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          "SETUP_ADMIN_TOKEN not configured. Use bootstrap token for initial setup.",
        hint: "Use adminToken=pcb-bootstrap-2026 for first-time setup",
      }),
    };
  }

  // Accept either the configured token or bootstrap token
  const validToken = expectedToken || bootstrapToken;
  if (!adminToken || !timingSafeEqual(adminToken, validToken)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Invalid admin token" }),
    };
  }

  // Run all checks in parallel
  const [
    supabase,
    cloudflareAI,
    anthropicAI,
    weather,
    stripe,
    n8n,
    openai,
    dbTables,
  ] = await Promise.all([
    checkSupabase(),
    checkCloudflareAI(),
    checkAnthropicAI(),
    checkWeather(),
    checkStripe(),
    checkN8n(),
    checkOpenAI(),
    checkDatabaseTables(),
  ]);

  const services: ServiceStatus[] = [
    supabase,
    dbTables,
    cloudflareAI,
    anthropicAI,
    openai,
    weather,
    stripe,
    n8n,
  ];

  const healthy = services.filter(s => s.status === "healthy").length;
  const degraded = services.filter(s => s.status === "degraded").length;
  const errors = services.filter(s => s.status === "error").length;
  const notConfigured = services.filter(
    s => s.status === "not_configured"
  ).length;

  const overallStatus =
    errors > 0
      ? "error"
      : degraded > 0
        ? "degraded"
        : notConfigured > 2
          ? "setup_required"
          : "healthy";

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: overallStatus,
      summary: {
        healthy,
        degraded,
        errors,
        notConfigured,
        total: services.length,
      },
      services,
      timestamp: new Date().toISOString(),
    }),
  };
};
