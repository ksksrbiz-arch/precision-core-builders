/**
 * AI Draft — POST /api/ai-draft
 *
 * Eric-facing, admin-only drafting assistant for the two comms he writes most
 * often day-to-day, generated from a project's LIVE data (no manual retyping):
 *
 *   - kind "client-update": a warm, client-ready project progress update he can
 *     copy and send. Returns { draft }.
 *   - kind "sub-briefing": schedule + safety lines that prefill the crew
 *     dispatch dialog. Returns { scheduleDetails, safetyNotes }.
 *
 * Reads private business data via the service-role DB, so it requires an
 * authenticated admin. Groq-first via the free-tier LLM router.
 */
import { invokeLLM, parseLlmJson } from "../../server/_core/llm";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import { withGuards } from "./_lib/http";
import { PROMPTS, isLLMConfigError } from "./_lib/llm/prompts";

type DraftKind = "client-update" | "sub-briefing";

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const shortDate = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

type ProjectContext = {
  name: string;
  status: string | null;
  type: string | null;
  city: string | null;
  address: string | null;
  percentComplete: number | null;
  contractedBudget: number | null;
  upcomingSchedule: Array<{
    task: string;
    type: string | null;
    status: string | null;
    weatherSensitive: boolean;
    start: string | null;
    end: string | null;
  }>;
  recentReports: Array<{ date: string | null; summary: string | null }>;
  recentLedger: Array<{ type: string | null; title: string | null }>;
};

/**
 * Build a bounded, prompt-ready snapshot of a single project. Returns null when
 * the project can't be found (or the DB isn't configured).
 */
async function loadProjectContext(
  projectId: number
): Promise<ProjectContext | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: project } = await db
    .from("projects")
    .select(
      "id,name,status,project_type,city,address,completion_percent,contracted_budget"
    )
    .eq("id", projectId)
    .single();
  if (!project) return null;

  const [{ data: schedule }, { data: reports }, { data: ledger }] =
    await Promise.all([
      db
        .from("schedule_items")
        .select(
          "title,task_type,status,weather_sensitive,planned_start,planned_end"
        )
        .eq("project_id", projectId)
        .neq("status", "complete")
        .order("planned_start", { ascending: true })
        .limit(12),
      db
        .from("field_reports")
        .select("report_date,summary")
        .eq("project_id", projectId)
        .order("report_date", { ascending: false })
        .limit(4),
      db
        .from("ledger_entries")
        .select("entry_type,title")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  return {
    name: String(project.name ?? `#${projectId}`),
    status: (project.status as string) ?? null,
    type: (project.project_type as string) ?? null,
    city: (project.city as string) ?? null,
    address: (project.address as string) ?? null,
    percentComplete: (project.completion_percent as number) ?? null,
    contractedBudget: num(project.contracted_budget) || null,
    upcomingSchedule: (schedule ?? []).map(s => ({
      task: String(s.title ?? ""),
      type: (s.task_type as string) ?? null,
      status: (s.status as string) ?? null,
      weatherSensitive: s.weather_sensitive === true,
      start: shortDate(s.planned_start),
      end: shortDate(s.planned_end),
    })),
    recentReports: (reports ?? []).map(r => ({
      date: shortDate(r.report_date),
      summary: (r.summary as string) ?? null,
    })),
    recentLedger: (ledger ?? []).map(l => ({
      type: (l.entry_type as string) ?? null,
      title: (l.title as string) ?? null,
    })),
  };
}

export const handler = withGuards(
  {
    methods: ["POST"],
    auth: "admin",
    rateLimit: {
      key: ({ user }) => `ai-draft:${user?.id}`,
      maxRequests: 30,
      windowMs: 60_000,
    },
  },
  async ({ event, json, error }) => {
    let body: {
      kind?: DraftKind;
      projectId?: number;
      trade?: string;
      instruction?: string;
    };
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return error(400, "Invalid JSON body");
    }

    const { kind, projectId, trade, instruction } = body;

    if (kind !== "client-update" && kind !== "sub-briefing") {
      return error(
        400,
        'Invalid "kind". Expected "client-update" or "sub-briefing".'
      );
    }
    if (!projectId || !Number.isInteger(projectId) || projectId <= 0) {
      return error(400, "A valid projectId is required.");
    }

    let context: ProjectContext | null;
    try {
      context = await loadProjectContext(projectId);
    } catch (err) {
      console.error("[ai-draft] context load failed:", err);
      return error(500, "Could not load project data. Please try again.");
    }
    if (!context) {
      return error(404, "Project not found.");
    }

    try {
      if (kind === "client-update") {
        const steer = instruction?.trim()
          ? `\n\nSTEER FROM ERIC: ${instruction.trim()}`
          : "";
        const result = await invokeLLM({
          feature: "ai-draft:client-update",
          messages: [
            { role: "system", content: PROMPTS.clientUpdate },
            {
              role: "user",
              content: `PROJECT DATA (JSON):\n${JSON.stringify(context)}${steer}`,
            },
          ],
          maxTokens: 500,
          temperature: 0.4,
        });
        return json(200, {
          draft: result.text.trim(),
          model: result.model,
          provider: result.provider,
        });
      }

      // sub-briefing
      const tradeLine = trade?.trim()
        ? `\n\nTARGET TRADE: ${trade.trim()} — focus on schedule items relevant to this trade.`
        : "";
      const result = await invokeLLM({
        feature: "ai-draft:sub-briefing",
        messages: [
          { role: "system", content: PROMPTS.subBriefing },
          {
            role: "user",
            content: `PROJECT DATA (JSON):\n${JSON.stringify(context)}${tradeLine}`,
          },
        ],
        jsonMode: true,
        maxTokens: 300,
        temperature: 0.3,
      });

      let parsed: { scheduleDetails?: string; safetyNotes?: string };
      try {
        parsed = parseLlmJson(result.text);
      } catch (parseErr) {
        console.error("[ai-draft] JSON parse failed:", parseErr);
        return error(
          502,
          "The AI returned an unexpected response format. Please try again."
        );
      }

      return json(200, {
        scheduleDetails:
          typeof parsed.scheduleDetails === "string"
            ? parsed.scheduleDetails
            : "See project schedule",
        safetyNotes:
          typeof parsed.safetyNotes === "string" ? parsed.safetyNotes : "",
        model: result.model,
        provider: result.provider,
      });
    } catch (err) {
      console.error("[ai-draft]", err);
      if (isLLMConfigError(err)) {
        return error(
          503,
          "AI is not configured yet. Add a free GROQ_API_KEY to enable drafting."
        );
      }
      return error(500, "Drafting failed. Please try again.");
    }
  }
);
