/**
 * Operational data snapshot — a bounded, summarized view of current business
 * state used to ground AI features (Ops Co-pilot, daily briefing) without
 * embeddings. Field lists are intentionally narrow to keep token usage low and
 * avoid leaking unnecessary PII.
 */
import { db } from "../db";

type Row = Record<string, unknown>;

export type OpsRollups = {
  projectCount: number;
  totalContracted: number;
  totalActualCost: number;
  projectsOverBudget: string[];
  overdueTasks: string[];
  openLeads: number;
  materialShortages: number;
};

export type WeatherSensitiveTask = {
  task: string;
  project: string | null;
  start: string | null;
  end: string | null;
};

export type OpsSnapshot = {
  /** A prompt-ready context block (JSON) describing current operations. */
  text: string;
  rollups: OpsRollups;
  /** Upcoming weather-sensitive / outdoor tasks, for weather correlation. */
  weatherSensitiveUpcoming: WeatherSensitiveTask[];
};

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

const EMPTY_ROLLUPS: OpsRollups = {
  projectCount: 0,
  totalContracted: 0,
  totalActualCost: 0,
  projectsOverBudget: [],
  overdueTasks: [],
  openLeads: 0,
  materialShortages: 0,
};

/**
 * Build a bounded snapshot of current operations from the service-role DB.
 */
export async function buildOpsSnapshot(): Promise<OpsSnapshot> {
  if (!db) {
    return {
      text: "OPERATIONAL DATA SNAPSHOT: (database not configured — no data available)",
      rollups: EMPTY_ROLLUPS,
      weatherSensitiveUpcoming: [],
    };
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

  const weatherSensitiveUpcoming: WeatherSensitiveTask[] = schedule
    .filter(s => s.weather_sensitive === true || s.is_outdoor === true)
    .slice(0, 20)
    .map(s => ({
      task: String(s.title ?? ""),
      project: projectName.get(s.project_id as number) ?? null,
      start: shortDate(s.planned_start),
      end: shortDate(s.planned_end),
    }));

  const rollups: OpsRollups = {
    projectCount: projects.length,
    totalContracted: Math.round(totalContracted),
    totalActualCost: Math.round(totalActual),
    projectsOverBudget: overBudget,
    overdueTasks: overdue,
    openLeads: leads.length,
    materialShortages: shortages.length,
  };

  const snapshot = {
    today: todayIso,
    rollups,
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

  return {
    text: `OPERATIONAL DATA SNAPSHOT (JSON):\n${JSON.stringify(snapshot)}`,
    rollups,
    weatherSensitiveUpcoming,
  };
}
