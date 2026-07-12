/**
 * platform-health — Comprehensive health check endpoint that tests all
 * platform integrations and returns detailed status for the Setup Wizard.
 *
 * GET /api/platform-health?adminToken=xxx
 *
 * Returns status of: Supabase, Groq, OpenRouter, LLM routing, Weather API,
 * Stripe, n8n.
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { resolveProviderOrder } from "../../server/_core/llm";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import { verifyAdminToken } from "../../server/_core/auth/verifyToken";
import { timingSafeEqualStr } from "./_lib/crypto";

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
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      id: "supabase",
      name: "Supabase Database",
      status: "not_configured",
      message:
        "SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY not set",
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

async function checkGroq(): Promise<ServiceStatus> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      id: "groq",
      name: "Groq (Free, Fast LLM)",
      status: "not_configured",
      message:
        "GROQ_API_KEY not set. Free key (no card): https://console.groq.com/keys",
    };
  }
  if (!key.startsWith("gsk_")) {
    return {
      id: "groq",
      name: "Groq (Free, Fast LLM)",
      status: "error",
      message: "Invalid key format (should start with gsk_)",
    };
  }
  return {
    id: "groq",
    name: "Groq (Free, Fast LLM)",
    status: "healthy",
    message: "Free tier configured (ultra-fast inference)",
    details: { keyLength: key.length },
  };
}

async function checkOpenRouter(): Promise<ServiceStatus> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      id: "openrouter",
      name: "OpenRouter (Multi-Model Routing)",
      status: "not_configured",
      message:
        "OPENROUTER_API_KEY not set. Get one: https://openrouter.ai/keys",
    };
  }
  if (!key.startsWith("sk-or-")) {
    return {
      id: "openrouter",
      name: "OpenRouter (Multi-Model Routing)",
      status: "error",
      message: "Invalid key format (should start with sk-or-)",
    };
  }
  return {
    id: "openrouter",
    name: "OpenRouter (Multi-Model Routing)",
    status: "healthy",
    message: "Configured (400+ models, free + paid)",
    details: { keyLength: key.length },
  };
}

/**
 * Summarizes the active LLM fallback chain so the owner can see, at a glance,
 * which providers will actually be used and in what order.
 */
async function checkLLMRouting(): Promise<ServiceStatus> {
  const order = resolveProviderOrder();
  if (order.length === 0) {
    return {
      id: "llm_routing",
      name: "AI Routing (Free-First Fallback)",
      status: "not_configured",
      message:
        "No LLM provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY (both free).",
    };
  }
  const usingFreeFirst = ["groq", "openrouter"].includes(order[0]);
  return {
    id: "llm_routing",
    name: "AI Routing (Free-First Fallback)",
    status: "healthy",
    message: `Active order: ${order.join(" → ")}${
      usingFreeFirst ? " (free-first)" : ""
    }`,
    details: { order, primary: order[0] },
  };
}

async function checkFreePayments(): Promise<ServiceStatus> {
  const paypal = process.env.PAYPAL_ME_USERNAME;
  const venmo = process.env.VENMO_USERNAME;
  const zelle = process.env.ZELLE_HANDLE;
  const configured = [
    paypal && "PayPal.me",
    venmo && "Venmo",
    zelle && "Zelle",
  ].filter(Boolean) as string[];

  if (configured.length === 0) {
    return {
      id: "free_payments",
      name: "Free Payment Links (PayPal/Venmo/Zelle)",
      status: "not_configured",
      message:
        "No free payment handles set. Configure VITE_PAYPAL_ME_USERNAME, VITE_VENMO_USERNAME, or VITE_ZELLE_HANDLE.",
    };
  }

  return {
    id: "free_payments",
    name: "Free Payment Links (PayPal/Venmo/Zelle)",
    status: "healthy",
    message: `Active: ${configured.join(", ")}`,
    details: { providers: configured },
  };
}

async function checkOpenAI(): Promise<ServiceStatus> {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    // OpenAI is now a legacy/optional transcription provider. Free-tier Groq
    // Whisper covers transcription, so a missing OPENAI_API_KEY is expected and
    // must not surface as degraded/failed.
    return {
      id: "openai",
      name: "OpenAI (Whisper, legacy)",
      status: "not_configured",
      message:
        "OpenAI not used — free-tier transcription active (Groq Whisper)",
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
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      id: "db_tables",
      name: "Database Schema",
      status: "not_configured",
      message: "Supabase credentials not set",
    };
  }

  const start = Date.now();
  try {
    // Check for critical tables
    const tables = [
      "profiles",
      "projects",
      "clients",
      "field_reports",
      "materials",
      "billing_events",
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

  // Auth — accept the token from the Authorization header (preferred) or the
  // query string (legacy). Ungated for signed-in admins: a valid Supabase admin
  // JWT / admin session token / dev bypass authorizes the health check, exactly
  // like the rest of the admin app. The dedicated SETUP_ADMIN_TOKEN remains an
  // optional fallback for pre-login bootstrap or external uptime monitoring.
  const authHeader =
    event.headers?.authorization ?? event.headers?.Authorization ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const adminToken = bearerToken ?? event.queryStringParameters?.adminToken;

  const verified = await verifyAdminToken(adminToken ?? null);
  if (!verified.ok) {
    const expectedToken = process.env.SETUP_ADMIN_TOKEN;
    if (
      !expectedToken ||
      !adminToken ||
      !timingSafeEqualStr(adminToken, expectedToken)
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Admin authentication required" }),
      };
    }
  }

  // Run all checks in parallel
  const [
    supabase,
    groqAI,
    openrouterAI,
    llmRouting,
    weather,
    stripe,
    freePayments,
    n8n,
    openai,
    dbTables,
  ] = await Promise.all([
    checkSupabase(),
    checkGroq(),
    checkOpenRouter(),
    checkLLMRouting(),
    checkWeather(),
    checkStripe(),
    checkFreePayments(),
    checkN8n(),
    checkOpenAI(),
    checkDatabaseTables(),
  ]);

  const services: ServiceStatus[] = [
    supabase,
    dbTables,
    llmRouting,
    groqAI,
    openrouterAI,
    openai,
    weather,
    freePayments,
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
        : notConfigured > 4
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
