/**
 * AI Ops Co-pilot — POST /api/ai-copilot
 *
 * An admin-only conversational assistant that answers natural-language
 * questions over Eric's REAL operational data (projects, estimates, schedule,
 * ledger, leads, materials, field reports). Rather than embeddings, it injects
 * a compact, bounded snapshot of the current business state as context — fast,
 * accurate, and free-tier friendly for a single firm's data volume.
 *
 * Reads private business data via the service-role DB, so it requires an
 * authenticated admin (verifyAdmin).
 */
import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import { db } from "../../server/db";
import { verifyAdmin } from "./_utils/authGuard";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";

const SYSTEM_PROMPT = `You are the Ops Co-pilot for Precision Core Builders, the private command-center assistant for owner Eric Tadlock (CCB #246527), a master builder in Eugene, OR.

You answer questions about his live operations using ONLY the OPERATIONAL DATA SNAPSHOT provided below. Rules:
- Be concise and decisive — Eric is busy. Lead with the answer, then brief supporting detail.
- Proactively surface risk: projects over budget (actual_cost vs contracted_budget), tasks behind schedule (planned_end in the past, status not complete), weather-sensitive work, material shortages, and high-priority leads to call.
- When asked "what should I do", give a short prioritized action list.
- Format money as US dollars (e.g. $12,500). Reference projects/clients by name.
- If the snapshot lacks the data needed to answer, say so plainly — never invent numbers, dates, names, or statuses.
- Today's date is provided in the snapshot; use it for "overdue", "this week", etc.`;

type Row = Record<string, unknown>;

/** Run a Supabase select, returning [] on any error so one bad query never
 *  breaks the whole snapshot. */
async function safeSelect(
  build: () => PromiseLike<{ data: Row[] | null; error: unknown }>
): Promise<Row[]> {
  try {
    const { data, error } = await build();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const shortDate = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/**
 * Build a bounded snapshot of current operations. Field lists are intentionally
 * narrow to keep token usage low and avoid leaking unnecessary PII.
 */
async function buildSnapshot(): Promise<string> {
  if (!db) {
    return "OPERATIONAL DATA SNAPSHOT: (database not configured — no data available)";
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const [projects, estimates, schedule, ledger, leads, shortages, reports] =
    await Promise.all([
      safeSelect(() =>
        db
          .from("projects")
          .select(
            "id,name,status,project_type,city,estimated_budget,contracted_budget,actual_cost,completion_percent,estimated_start_date,estimated_end_date"
          )
          .order("updated_at", { ascending: false })
          .limit(40)
      ),
      safeSelect(() =>
        db
          .from("estimates")
          .select(
            "id,project_id,project_type,estimated_low,estimated_mid,estimated_high,sent_to_client,approved_by_client,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(15)
      ),
      safeSelect(() =>
        db
          .from("schedule_items")
          .select(
            "id,project_id,title,task_type,status,weather_sensitive,is_outdoor,planned_start,planned_end"
          )
          .neq("status", "complete")
          .order("planned_start", { ascending: true })
          .limit(50)
      ),
      safeSelect(() =>
        db
          .from("ledger_entries")
          .select("id,project_id,entry_type,title,amount_delta,created_at")
          .order("created_at", { ascending: false })
          .limit(20)
      ),
      safeSelect(() =>
        db
          .from("leads")
          .select(
            "id,name,project_type,budget,location,timeline,score,priority,estimated_value,suggested_action,created_at"
          )
          .order("score", { ascending: false })
          .limit(20)
      ),
      safeSelect(() =>
        db
          .from("materials")
          .select(
            "id,project_id,name,category,quantity_needed,quantity_received,vendor_name,expected_delivery"
          )
          .eq("is_shortage", true)
          .limit(25)
      ),
      safeSelect(() =>
        db
          .from("field_reports")
          .select(
            "id,project_id,report_date,summary,issues_flagged,published_to_client"
          )
          .order("report_date", { ascending: false })
          .limit(10)
      ),
    ]);

  const projectName = new Map<number, string>(
    projects.map(p => [p.id as number, String(p.name ?? `#${p.id}`)])
  );

  // Derived rollups so the model doesn't have to do arithmetic.
  let totalContracted = 0;
  let totalActual = 0;
  const overBudget: string[] = [];
  for (const p of projects) {
    const contracted = num(p.contracted_budget);
    const actual = num(p.actual_cost);
    totalContracted += contracted;
    totalActual += actual;
    if (contracted > 0 && actual > contracted) {
      overBudget.push(
        `${p.name} (actual $${Math.round(actual).toLocaleString()} > contracted $${Math.round(contracted).toLocaleString()})`
      );
    }
  }

  const overdue = schedule
    .filter(s => {
      const end = shortDate(s.planned_end);
      return end !== null && end < todayIso;
    })
    .map(s => `${s.title} [${projectName.get(s.project_id as number) ?? "?"}]`);

  const snapshot = {
    today: todayIso,
    rollups: {
      projectCount: projects.length,
      totalContracted: Math.round(totalContracted),
      totalActualCost: Math.round(totalActual),
      projectsOverBudget: overBudget,
      overdueTasks: overdue,
      openLeads: leads.length,
      materialShortages: shortages.length,
    },
    projects: projects.map(p => ({
      name: p.name,
      status: p.status,
      type: p.project_type,
      city: p.city,
      estimatedBudget: num(p.estimated_budget) || null,
      contractedBudget: num(p.contracted_budget) || null,
      actualCost: num(p.actual_cost) || null,
      percentComplete: p.completion_percent,
      start: shortDate(p.estimated_start_date),
      end: shortDate(p.estimated_end_date),
    })),
    upcomingSchedule: schedule.slice(0, 30).map(s => ({
      task: s.title,
      project: projectName.get(s.project_id as number) ?? null,
      status: s.status,
      weatherSensitive: s.weather_sensitive,
      start: shortDate(s.planned_start),
      end: shortDate(s.planned_end),
    })),
    recentEstimates: estimates.map(e => ({
      project: projectName.get(e.project_id as number) ?? null,
      type: e.project_type,
      low: num(e.estimated_low) || null,
      mid: num(e.estimated_mid) || null,
      high: num(e.estimated_high) || null,
      sentToClient: e.sent_to_client,
      approved: e.approved_by_client,
      created: shortDate(e.created_at),
    })),
    recentLedger: ledger.map(l => ({
      project: projectName.get(l.project_id as number) ?? null,
      type: l.entry_type,
      title: l.title,
      amountDelta: num(l.amount_delta) || null,
      date: shortDate(l.created_at),
    })),
    leads: leads.map(l => ({
      name: l.name,
      type: l.project_type,
      budget: l.budget,
      location: l.location,
      timeline: l.timeline,
      score: l.score,
      priority: l.priority,
      estimatedValue: num(l.estimated_value) || null,
      suggestedAction: l.suggested_action,
    })),
    materialShortages: shortages.map(m => ({
      material: m.name,
      project: projectName.get(m.project_id as number) ?? null,
      category: m.category,
      vendor: m.vendor_name,
      expectedDelivery: shortDate(m.expected_delivery),
    })),
    recentFieldReports: reports.map(r => ({
      project: projectName.get(r.project_id as number) ?? null,
      date: shortDate(r.report_date),
      summary: r.summary,
      issues: r.issues_flagged,
      published: r.published_to_client,
    })),
  };

  return `OPERATIONAL DATA SNAPSHOT (JSON):\n${JSON.stringify(snapshot)}`;
}

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST")
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };

  // Exposes the full private dataset — admin only.
  const auth = await verifyAdmin(event.headers);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.message }),
    };
  }

  // Rate limit: 20 questions per minute per admin.
  const rl = checkRateLimit(`ai-copilot:${auth.user.id}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "Too many requests. Please slow down.",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? "{}") as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };
    const messages = (body.messages ?? [])
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-12); // keep the last few turns to bound tokens

    if (!messages.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No messages provided." }),
      };
    }

    const snapshot = await buildSnapshot();

    const result = await invokeLLM({
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n${snapshot}` },
        ...messages,
      ],
      maxTokens: 900,
      temperature: 0.3,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text: result.text,
        model: result.model,
        provider: result.provider,
      }),
    };
  } catch (err) {
    console.error("[ai-copilot]", err);
    const isConfigError =
      err instanceof Error && err.message.includes("No LLM API key configured");
    return {
      statusCode: isConfigError ? 503 : 500,
      headers,
      body: JSON.stringify({
        error: isConfigError
          ? "AI is not configured yet. Add a free GROQ_API_KEY or GOOGLE_AI_API_KEY."
          : "Co-pilot is temporarily unavailable. Please try again.",
      }),
    };
  }
};
