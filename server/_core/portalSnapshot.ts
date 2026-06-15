/**
 * Client portal snapshot — a STRICTLY client-scoped, client-safe view used to
 * ground the portal assistant. Unlike the admin opsSnapshot, this:
 *   - includes ONLY projects belonging to the authenticated client
 *     (clients.user_id = userId) that have client_portal_enabled = true,
 *   - includes ONLY client-facing fields and rows (published field reports,
 *     client-visible ledger entries, the client's finish selections),
 *   - NEVER exposes internal data: actual cost / margins, vendor pricing,
 *     leads, estimates' internal reasoning, or any other client's data.
 */
import { db } from "../db";

type Row = Record<string, unknown>;

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

export type PortalSnapshot = {
  text: string;
  /** True when the client has at least one portal-enabled project. */
  hasProjects: boolean;
};

/**
 * Build a client-safe snapshot for the authenticated portal user.
 */
export async function buildPortalSnapshot(
  userId: string
): Promise<PortalSnapshot> {
  if (!db) {
    return {
      text: "CLIENT PROJECT DATA: (unavailable)",
      hasProjects: false,
    };
  }

  // 1. Resolve the client rows owned by this user.
  const clientRows = await safeSelect(() =>
    db.from("clients").select("id,name").eq("user_id", userId)
  );
  const clientIds = clientRows.map(c => c.id as number);
  if (clientIds.length === 0) {
    return { text: "CLIENT PROJECT DATA: (no projects)", hasProjects: false };
  }

  // 2. Their portal-enabled projects only.
  const projects = await safeSelect(() =>
    db
      .from("projects")
      .select(
        "id,name,status,project_type,city,state,contracted_budget,completion_percent,estimated_start_date,estimated_end_date,actual_start_date"
      )
      .in("client_id", clientIds)
      .eq("client_portal_enabled", true)
      .order("created_at", { ascending: false })
      .limit(10)
  );
  const projectIds = projects.map(p => p.id as number);
  if (projectIds.length === 0) {
    return { text: "CLIENT PROJECT DATA: (no projects)", hasProjects: false };
  }

  const projectName = new Map<number, string>(
    projects.map(p => [p.id as number, String(p.name ?? `#${p.id}`)])
  );

  // 3. Client-facing related data, all scoped to their project ids.
  const [schedule, reports, finishes, ledger] = await Promise.all([
    safeSelect(() =>
      db
        .from("schedule_items")
        .select("project_id,title,task_type,status,planned_start,planned_end")
        .in("project_id", projectIds)
        .order("planned_start", { ascending: true })
        .limit(40)
    ),
    safeSelect(() =>
      db
        .from("field_reports")
        .select("project_id,report_date,summary,published_at")
        .in("project_id", projectIds)
        .eq("published_to_client", true)
        .order("report_date", { ascending: false })
        .limit(10)
    ),
    safeSelect(() =>
      db
        .from("finish_selections")
        .select(
          "project_id,room,category,item_name,brand,color_name,unit_price,total_cost,budget_delta,client_approved"
        )
        .in("project_id", projectIds)
        .limit(40)
    ),
    safeSelect(() =>
      db
        .from("ledger_entries")
        .select(
          "project_id,entry_type,title,description,amount_delta,created_at"
        )
        .in("project_id", projectIds)
        .eq("visible_to_client", true)
        .order("created_at", { ascending: false })
        .limit(20)
    ),
  ]);

  const snapshot = {
    today: new Date().toISOString().slice(0, 10),
    projects: projects.map(p => ({
      name: p.name,
      status: p.status,
      type: p.project_type,
      location: [p.city, p.state].filter(Boolean).join(", ") || null,
      contractedBudget: num(p.contracted_budget) || null,
      percentComplete: p.completion_percent,
      start: shortDate(p.estimated_start_date),
      targetCompletion: shortDate(p.estimated_end_date),
      startedOn: shortDate(p.actual_start_date),
    })),
    schedule: schedule.map(s => ({
      task: s.title,
      project: projectName.get(s.project_id as number) ?? null,
      phase: s.task_type,
      status: s.status,
      start: shortDate(s.planned_start),
      end: shortDate(s.planned_end),
    })),
    recentUpdates: reports.map(r => ({
      project: projectName.get(r.project_id as number) ?? null,
      date: shortDate(r.report_date),
      summary: r.summary,
    })),
    finishSelections: finishes.map(f => ({
      project: projectName.get(f.project_id as number) ?? null,
      room: f.room,
      category: f.category,
      item: f.item_name,
      brand: f.brand,
      color: f.color_name,
      unitPrice: num(f.unit_price) || null,
      totalCost: num(f.total_cost) || null,
      budgetImpact: num(f.budget_delta) || null,
      approved: f.client_approved,
    })),
    decisionLog: ledger.map(l => ({
      project: projectName.get(l.project_id as number) ?? null,
      type: l.entry_type,
      title: l.title,
      detail: l.description,
      budgetImpact: num(l.amount_delta) || null,
      date: shortDate(l.created_at),
    })),
  };

  return {
    text: `CLIENT PROJECT DATA (JSON):\n${JSON.stringify(snapshot)}`,
    hasProjects: true,
  };
}
