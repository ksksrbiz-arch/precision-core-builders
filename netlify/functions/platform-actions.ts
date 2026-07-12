/**
 * platform-actions — MCP-style executable operations for the Setup Wizard.
 * Provides admin tools to run migrations, seed data, test endpoints, etc.
 *
 * POST /api/platform-actions
 * Body: { action: string, params?: object, adminToken: string }
 */
import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import { verifyAdminToken } from "../../server/_core/auth/verifyToken";
import { timingSafeEqualStr } from "./_lib/crypto";

type ActionResult = {
  success: boolean;
  action: string;
  message: string;
  data?: unknown;
  durationMs: number;
};

// ─── Available Actions ───────────────────────────────────────────────────────

type ActionHandler = (
  params?: Record<string, unknown>
) => Promise<Omit<ActionResult, "action" | "durationMs">>;

type SupabaseActionError = {
  message: string;
  code?: string;
};

type TableCheckResult = {
  exists: boolean;
  count: number;
  error?: string;
};

const NO_ROWS_SUPABASE_ERROR_CODE = "PGRST116";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function throwIfActionError(
  action: string,
  operation: string,
  error: SupabaseActionError | null
) {
  if (error) {
    throw new Error(
      `${action}: ${operation} failed${error.code ? ` (${error.code})` : ""}: ${error.message}`
    );
  }
}

function getSupabase() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase not configured");
  return client;
}

// ─── Action: Seed Demo Data ──────────────────────────────────────────────────

const seedDemoData: ActionHandler = async () => {
  const supabase = getSupabase();

  // Check if demo data already exists
  const { data: existing, error: existingErr } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "Demo: Miller Residence Remodel")
    .limit(1);
  throwIfActionError("seed-demo-data", "project lookup", existingErr);

  if (existing && existing.length > 0) {
    return {
      success: true,
      message: "Demo data already exists (skipped seeding)",
      data: { alreadySeeded: true },
    };
  }

  // Create demo client
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      name: "Demo Client - The Millers",
      email: "demo@example.com",
      phone: "541-555-0100",
      address: "123 Demo Lane, Eugene, OR 97401",
      notes: "Demo client for testing the platform",
    })
    .select()
    .single();

  if (clientErr) throw new Error(`Client insert failed: ${clientErr.message}`);

  // Create demo project
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .insert({
      name: "Demo: Miller Residence Remodel",
      client_id: client.id,
      status: "in_progress",
      description: "Kitchen and bathroom remodel with custom cabinetry",
      address: "123 Demo Lane, Eugene, OR 97401",
      start_date: new Date().toISOString().split("T")[0],
      estimated_completion: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      budget: 75000,
    })
    .select()
    .single();

  if (projErr) throw new Error(`Project insert failed: ${projErr.message}`);

  // Create demo field report
  const { error: reportErr } = await supabase.from("field_reports").insert({
    project_id: project.id,
    report_date: new Date().toISOString().split("T")[0],
    weather: "Partly cloudy, 62°F",
    summary:
      "Demo field report - Completed framing inspection, passed. Starting drywall tomorrow.",
    hours_worked: 8,
    crew_size: 3,
    materials_used: "2x4 lumber, drywall sheets, screws",
    issues: null,
  });

  if (reportErr)
    throw new Error(`Field report insert failed: ${reportErr.message}`);

  // Create demo materials
  const { error: matErr } = await supabase.from("materials").insert([
    {
      project_id: project.id,
      name: "Kitchen Cabinets - Custom Oak",
      quantity: 12,
      unit: "units",
      unit_cost: 450,
      status: "ordered",
      vendor: "Oregon Cabinet Works",
      expected_delivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
    {
      project_id: project.id,
      name: "Quartz Countertop",
      quantity: 45,
      unit: "sq ft",
      unit_cost: 85,
      status: "pending",
      vendor: "Pacific Stone Supply",
    },
  ]);

  if (matErr) throw new Error(`Materials insert failed: ${matErr.message}`);

  return {
    success: true,
    message: "Demo data seeded successfully",
    data: {
      clientId: client.id,
      projectId: project.id,
      projectName: project.name,
    },
  };
};

// ─── Action: Clear Demo Data ─────────────────────────────────────────────────

const clearDemoData: ActionHandler = async () => {
  const supabase = getSupabase();

  // Find demo project
  const { data: projects, error: projectsErr } = await supabase
    .from("projects")
    .select("id, client_id")
    .like("name", "Demo:%");
  throwIfActionError("clear-demo-data", "project lookup", projectsErr);

  if (!projects || projects.length === 0) {
    return {
      success: true,
      message: "No demo data found to clear",
    };
  }

  const projectIds = projects.map(p => p.id);
  const clientIds = [
    ...new Set(projects.map(p => p.client_id).filter(Boolean)),
  ];

  // Delete in order (respecting foreign keys)
  const { error: fieldReportsDeleteErr } = await supabase
    .from("field_reports")
    .delete()
    .in("project_id", projectIds);
  throwIfActionError(
    "clear-demo-data",
    "field report cleanup",
    fieldReportsDeleteErr
  );
  const { error: materialsDeleteErr } = await supabase
    .from("materials")
    .delete()
    .in("project_id", projectIds);
  throwIfActionError(
    "clear-demo-data",
    "materials cleanup",
    materialsDeleteErr
  );
  const { error: billingDeleteErr } = await supabase
    .from("billing_events")
    .delete()
    .in("project_id", projectIds);
  throwIfActionError("clear-demo-data", "billing cleanup", billingDeleteErr);
  const { error: projectsDeleteErr } = await supabase
    .from("projects")
    .delete()
    .in("id", projectIds);
  throwIfActionError("clear-demo-data", "project cleanup", projectsDeleteErr);

  // Delete demo clients
  if (clientIds.length > 0) {
    const { error: clientsDeleteErr } = await supabase
      .from("clients")
      .delete()
      .in("id", clientIds);
    throwIfActionError("clear-demo-data", "client cleanup", clientsDeleteErr);
  }

  return {
    success: true,
    message: `Cleared ${projects.length} demo project(s) and related data`,
    data: {
      projectsDeleted: projects.length,
      clientsDeleted: clientIds.length,
    },
  };
};

// ─── Action: Run Database Health Check ───────────────────────────────────────

const checkDatabaseIntegrity: ActionHandler = async () => {
  const supabase = getSupabase();

  const checks: Record<string, TableCheckResult> = {};
  const tables = [
    "profiles",
    "projects",
    "clients",
    "field_reports",
    "materials",
    "billing_events",
    "sub_contractors",
  ];

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    checks[table] = {
      exists: !error || error.code === NO_ROWS_SUPABASE_ERROR_CODE,
      count: count ?? 0,
      ...(error ? { error: error.message } : {}),
    };
  }

  const missing = Object.entries(checks)
    .filter(([, v]) => !v.exists)
    .map(([k]) => k);

  return {
    success: missing.length === 0,
    message:
      missing.length === 0
        ? `All ${tables.length} tables healthy`
        : `Missing tables: ${missing.join(", ")}`,
    data: checks,
  };
};

// ─── Action: Test AI Endpoint ────────────────────────────────────────────────

const testAIEndpoint: ActionHandler = async () => {
  // Exercise the same LLM router the app actually uses (free-tier: Groq
  // primary, OpenRouter fallback) rather than a deprecated provider —
  // otherwise this check can report failure while the real AI features work
  // fine. invokeLLM throws a clear error when no key is set.
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a construction assistant. Respond briefly.",
      },
      {
        role: "user",
        content: "Say 'AI system operational' and nothing else.",
      },
    ],
    maxTokens: 50,
    temperature: 0.1,
  });

  return {
    success: true,
    message: `AI endpoint responding (${result.model})`,
    data: { response: result.text.slice(0, 100), model: result.model },
  };
};

// ─── Action: Test Weather API ────────────────────────────────────────────────

const testWeatherAPI: ActionHandler = async () => {
  const key = process.env.OPENWEATHERMAP_API_KEY;
  if (!key) throw new Error("OpenWeatherMap API key not configured");

  const lat = 44.0521;
  const lon = -123.0868;

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=imperial`
  );

  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    main?: { temp?: number; humidity?: number };
    weather?: Array<{ main?: string; description?: string }>;
    wind?: { speed?: number };
  };

  return {
    success: true,
    message: `Eugene OR: ${data.weather?.[0]?.description}, ${Math.round(data.main?.temp ?? 0)}°F`,
    data: {
      temperature: data.main?.temp,
      humidity: data.main?.humidity,
      conditions: data.weather?.[0]?.main,
      windSpeed: data.wind?.speed,
    },
  };
};

// ─── Action: Get Platform Stats ──────────────────────────────────────────────

const getPlatformStats: ActionHandler = async () => {
  const supabase = getSupabase();

  const [projects, clients, reports, billing] = await Promise.all([
    supabase.from("projects").select("id, status", { count: "exact" }),
    supabase.from("clients").select("id", { count: "exact" }),
    supabase.from("field_reports").select("id", { count: "exact" }),
    // Billing lives in `billing_events` (Stripe webhook records) — there is no
    // `invoices` table. Amounts are stored in cents.
    supabase
      .from("billing_events")
      .select("id, event_type, amount_cents", { count: "exact" }),
  ]);
  throwIfActionError("get-stats", "projects query", projects.error);
  throwIfActionError("get-stats", "clients query", clients.error);
  throwIfActionError("get-stats", "field reports query", reports.error);
  throwIfActionError("get-stats", "billing query", billing.error);

  const activeProjects =
    projects.data?.filter(p => p.status === "in_progress").length ?? 0;
  const totalInvoiced =
    (billing.data?.reduce((sum, e) => sum + (e.amount_cents || 0), 0) ?? 0) /
    100;
  const paidInvoices =
    billing.data?.filter(e => (e.event_type ?? "").includes("paid")).length ??
    0;

  return {
    success: true,
    message: "Platform statistics retrieved",
    data: {
      projects: {
        total: projects.count ?? 0,
        active: activeProjects,
      },
      clients: {
        total: clients.count ?? 0,
      },
      fieldReports: {
        total: reports.count ?? 0,
      },
      invoices: {
        total: billing.count ?? 0,
        paid: paidInvoices,
        totalAmount: totalInvoiced,
      },
    },
  };
};

// ─── Action: Create Admin Profile ────────────────────────────────────────────

const createAdminProfile: ActionHandler = async params => {
  const supabase = getSupabase();

  const email = params?.email as string;
  const fullName = params?.fullName as string;

  if (!email) throw new Error("Email is required");

  // Check if profile exists
  const { data: existing, error: existingErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .limit(1);
  throwIfActionError("create-admin", "profile lookup", existingErr);

  if (existing && existing.length > 0) {
    return {
      success: true,
      message: `Profile already exists for ${email}`,
      data: { profileId: existing[0].id, alreadyExists: true },
    };
  }

  // Create profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      email,
      full_name: fullName || "Admin User",
      role: "admin",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create profile: ${error.message}`);

  return {
    success: true,
    message: `Admin profile created for ${email}`,
    data: { profileId: profile.id },
  };
};

// ─── Action: Test Voice Endpoint ─────────────────────────────────────────────

const testVoiceEndpoint: ActionHandler = async () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // OpenAI is legacy/optional — free-tier Groq Whisper handles voice. A
    // missing key is not a setup failure, so report success with a skipped
    // note instead of throwing.
    return {
      success: true,
      message:
        "OpenAI not configured — free-tier transcription (Groq Whisper) is active. OpenAI is optional/legacy.",
      data: { skipped: true, reason: "OPENAI_API_KEY not set" },
    };
  }

  // Just verify key format and model access
  const res = await fetch("https://api.openai.com/v1/models/whisper-1", {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      return {
        success: true,
        message: "OpenAI key valid (Whisper model available on request)",
        data: { model: "whisper-1", status: "available" },
      };
    }
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  return {
    success: true,
    message: "OpenAI Whisper API accessible",
    data: { model: "whisper-1", status: "ready" },
  };
};

// ─── Action: Verify Stripe Connection ────────────────────────────────────────

const verifyStripeConnection: ActionHandler = async () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return {
      success: false,
      message: "Stripe not configured (optional feature)",
      data: { configured: false },
    };
  }

  const res = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    throw new Error(`Stripe API error: ${res.status}`);
  }

  const account = (await res.json()) as {
    id?: string;
    email?: string;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    business_profile?: { name?: string };
  };

  return {
    success: true,
    message: `Stripe connected: ${account.business_profile?.name || account.email || account.id}`,
    data: {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      mode: key.includes("_test_") ? "test" : "live",
    },
  };
};

// ─── Action Registry ─────────────────────────────────────────────────────────

const ACTIONS: Record<string, ActionHandler> = {
  "seed-demo-data": seedDemoData,
  "clear-demo-data": clearDemoData,
  "check-database": checkDatabaseIntegrity,
  "test-ai": testAIEndpoint,
  "test-weather": testWeatherAPI,
  "test-voice": testVoiceEndpoint,
  "verify-stripe": verifyStripeConnection,
  "get-stats": getPlatformStats,
  "create-admin": createAdminProfile,
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body: {
    action?: string;
    params?: Record<string, unknown>;
    adminToken?: string;
  };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  // Auth — a valid admin session (Supabase JWT / admin session token / dev
  // bypass) authorizes these actions, exactly like the rest of the admin app.
  // These actions are destructive (clear/seed demo data, create-admin), so we
  // still accept the dedicated SETUP_ADMIN_TOKEN as a bootstrap fallback and
  // never fall back to a hardcoded constant baked into source.
  const verified = await verifyAdminToken(body.adminToken ?? null);
  if (!verified.ok) {
    const expectedToken = process.env.SETUP_ADMIN_TOKEN;
    if (
      !expectedToken ||
      !body.adminToken ||
      !timingSafeEqualStr(body.adminToken, expectedToken)
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Admin authentication required" }),
      };
    }
  }

  const action = body.action;
  if (typeof action !== "string" || !ACTIONS[action]) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `Unknown action: ${action}`,
        availableActions: Object.keys(ACTIONS),
      }),
    };
  }

  const start = Date.now();
  try {
    const result = await ACTIONS[action](body.params);
    const response: ActionResult = {
      ...result,
      action,
      durationMs: Date.now() - start,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const response: ActionResult = {
      success: false,
      action,
      message: getErrorMessage(err),
      durationMs: Date.now() - start,
    };

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(response),
    };
  }
};
