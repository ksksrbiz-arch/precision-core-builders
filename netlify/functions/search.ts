/**
 * Operational Search — POST /api/search
 * Ranked search across projects, clients, field reports, materials, and
 * schedule items.
 *
 * Primary path: Postgres full-text search via the `search_all` RPC
 * (drizzle/migrations/0006_search_fts.sql) — stemming, multi-word AND, and
 * ts_rank relevance ordering. If that RPC is unavailable (migration not yet
 * applied, or any error) the handler transparently falls back to the original
 * LLM intent extraction + PostgREST ILIKE implementation, so behavior never
 * regresses.
 */
import { invokeLLM, parseLlmJson } from "../../server/_core/llm";
import { db } from "../../server/db";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";
import { withGuards } from "./_lib/http";
import { PROMPTS } from "./_lib/llm/prompts";

/**
 * Strips characters that are special in PostgREST ilike patterns to prevent
 * query manipulation via LLM-generated keywords.
 * Allows alphanumeric, spaces, hyphens, and apostrophes only.
 */
function sanitizeKeyword(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9 '\-]/g, "")
    .slice(0, 50)
    .trim();
}

/**
 * Builds a PostgREST `.or()` filter that matches ANY of the extracted
 * keywords against ANY of the given columns via ILIKE. Keywords are
 * sanitized and capped so a noisy LLM response can't explode the query.
 * Returns null when no usable keyword remains (callers should short-circuit).
 */
function buildIlikeOrFilter(
  columns: string[],
  keywords: string[]
): string | null {
  const safeKeywords = keywords
    .map(sanitizeKeyword)
    .filter(Boolean)
    .slice(0, 5);
  if (safeKeywords.length === 0) return null;
  const clauses: string[] = [];
  for (const keyword of safeKeywords) {
    for (const column of columns) {
      clauses.push(`${column}.ilike.%${keyword}%`);
    }
  }
  return clauses.join(",");
}

interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
}

// ─── FTS (primary) path ───────────────────────────────────────────────
// Ranked Postgres full-text search via the `search_all` RPC (see
// drizzle/migrations/0006_search_fts.sql). If the function/indexes aren't
// present the RPC errors and the handler falls back to the ILIKE path below,
// so behavior is identical until the migration is applied.

/** Uniform row shape returned by the `search_all(q)` Postgres function. */
interface FtsRow {
  entity: string;
  id: number;
  title: string;
  subtitle: string;
  rank: number;
  created_at: string;
}

/** Maps a `search_all` entity to the frontend `type` + detail-page href. */
const FTS_ENTITY_ROUTE: Record<
  string,
  { type: string; href: (id: number) => string }
> = {
  project: { type: "project", href: id => `/admin/projects/${id}` },
  client: { type: "client", href: id => `/admin/clients/${id}` },
  field_report: { type: "field_report", href: () => `/admin/field-reports` },
  material: { type: "material", href: () => `/admin/materials` },
  schedule_item: { type: "schedule_item", href: () => `/admin/schedule` },
};

/**
 * Primary search path: calls the `search_all` RPC for ranked FTS. Rows come
 * back already ordered by rank descending with title/subtitle pre-formatted to
 * match the ILIKE path, so mapping is a straight projection into SearchResult.
 * Throws on any RPC error so the caller can fall back to ILIKE.
 */
async function searchViaFts(query: string): Promise<SearchResult[]> {
  const { data, error } = await db.rpc("search_all", { q: query });
  if (error) throw error;
  const rows = (data ?? []) as FtsRow[];
  return rows.flatMap(row => {
    const route = FTS_ENTITY_ROUTE[row.entity];
    if (!route) return [];
    return [
      {
        type: route.type,
        id: row.id,
        title: row.title,
        subtitle: row.subtitle ?? "",
        href: route.href(row.id),
      },
    ];
  });
}

async function searchProjects(
  keywords: string[],
  filters: Record<string, string | null>
): Promise<SearchResult[]> {
  const orFilter = buildIlikeOrFilter(["name", "address"], keywords);
  if (!orFilter) return [];
  let q = db
    .from("projects")
    .select("id,name,status,address,city,estimated_budget,contracted_budget")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(5);
  if (filters.status) q = q.eq("status", filters.status);
  const { data } = await q;
  return (data ?? []).map((p: any) => ({
    type: "project",
    id: p.id,
    title: p.name,
    subtitle: [p.city, p.status?.replace(/_/g, " ")]
      .filter(Boolean)
      .join(" · "),
    href: `/admin/projects/${p.id}`,
    meta: p.contracted_budget
      ? `$${Number(p.contracted_budget).toLocaleString()}`
      : undefined,
  }));
}

async function searchClients(keywords: string[]): Promise<SearchResult[]> {
  const orFilter = buildIlikeOrFilter(["name", "email"], keywords);
  if (!orFilter) return [];
  const { data } = await db
    .from("clients")
    .select("id,name,email,phone,city")
    .or(orFilter)
    .limit(5);
  return (data ?? []).map((c: any) => ({
    type: "client",
    id: c.id,
    title: c.name,
    subtitle: [c.email, c.city].filter(Boolean).join(" · "),
    href: `/admin/clients/${c.id}`,
  }));
}

async function searchFieldReports(keywords: string[]): Promise<SearchResult[]> {
  const orFilter = buildIlikeOrFilter(["summary", "transcription"], keywords);
  if (!orFilter) return [];
  const { data } = await db
    .from("field_reports")
    .select("id,project_id,report_date,summary,transcription")
    .or(orFilter)
    .order("report_date", { ascending: false })
    .limit(5);
  return (data ?? []).map((r: any) => ({
    type: "field_report",
    id: r.id,
    title: `Field Report — ${new Date(r.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    subtitle: r.summary
      ? r.summary.slice(0, 100) + (r.summary.length > 100 ? "…" : "")
      : "No summary",
    href: `/admin/field-reports`,
  }));
}

async function searchMaterials(keywords: string[]): Promise<SearchResult[]> {
  const orFilter = buildIlikeOrFilter(
    ["name", "category", "vendor_name"],
    keywords
  );
  if (!orFilter) return [];
  const { data } = await db
    .from("materials")
    .select(
      "id,name,category,vendor_name,quantity_needed,quantity_on_hand,unit,unit_price_current"
    )
    .or(orFilter)
    .limit(5);
  return (data ?? []).map((m: any) => ({
    type: "material",
    id: m.id,
    title: m.name,
    subtitle: [m.category, m.vendor_name].filter(Boolean).join(" · "),
    href: `/admin/materials`,
    meta: m.unit_price_current
      ? `$${Number(m.unit_price_current).toFixed(2)}/${m.unit ?? "unit"}`
      : undefined,
  }));
}

async function searchSchedule(keywords: string[]): Promise<SearchResult[]> {
  const orFilter = buildIlikeOrFilter(["title", "task_type"], keywords);
  if (!orFilter) return [];
  const { data } = await db
    .from("schedule_items")
    .select("id,project_id,title,task_type,status,planned_start")
    .or(orFilter)
    .order("planned_start", { ascending: true })
    .limit(5);
  return (data ?? []).map((s: any) => ({
    type: "schedule_item",
    id: s.id,
    title: s.title,
    subtitle: [s.task_type, s.status?.replace(/_/g, " ")]
      .filter(Boolean)
      .join(" · "),
    href: `/admin/schedule`,
    meta: s.planned_start
      ? new Date(s.planned_start).toLocaleDateString()
      : undefined,
  }));
}

// ─── ILIKE (fallback) path ────────────────────────────────────────────
/**
 * Legacy search path: LLM intent extraction + per-entity PostgREST ILIKE
 * matching. Used verbatim as the fallback whenever the FTS RPC is unavailable
 * (function/indexes not yet applied, or any RPC error), so search behavior is
 * identical to before this feature until the migration is in place.
 */
async function ilikeSearch(
  query: string
): Promise<{ results: SearchResult[]; summary: string }> {
  // Extract intent via LLM
  let intent: {
    entities: string[];
    keywords: string[];
    filters: Record<string, string | null>;
    summary: string;
  };
  try {
    const raw = await invokeLLM({
      feature: "search",
      messages: [
        { role: "system", content: PROMPTS.searchIntent },
        { role: "user", content: query },
      ],
      jsonMode: true,
      maxTokens: 300,
      temperature: 0,
    });
    intent = parseLlmJson(raw.text);
  } catch {
    // Fallback: treat entire query as keyword search across all entities
    intent = {
      entities: [
        "projects",
        "clients",
        "field_reports",
        "materials",
        "schedule_items",
      ],
      keywords: query.split(/\s+/).slice(0, 3),
      filters: {},
      summary: query,
    };
  }

  const entities = intent.entities?.length
    ? intent.entities
    : ["projects", "clients", "field_reports", "materials"];
  const keywords = intent.keywords?.length ? intent.keywords : [query];

  // Run parallel searches across requested entities
  const searches: Promise<SearchResult[]>[] = [];
  if (entities.includes("projects"))
    searches.push(searchProjects(keywords, intent.filters ?? {}));
  if (entities.includes("clients")) searches.push(searchClients(keywords));
  if (entities.includes("field_reports"))
    searches.push(searchFieldReports(keywords));
  if (entities.includes("materials")) searches.push(searchMaterials(keywords));
  if (entities.includes("schedule_items"))
    searches.push(searchSchedule(keywords));

  const resultSets = await Promise.allSettled(searches);
  const results: SearchResult[] = resultSets
    .filter(
      (r): r is PromiseFulfilledResult<SearchResult[]> =>
        r.status === "fulfilled"
    )
    .flatMap(r => r.value);

  return { results, summary: intent.summary };
}

export const handler = withGuards(
  // Operational search reads private business data (clients, budgets, field
  // reports, vendor pricing) via the service-role DB — require an authenticated
  // user. Without this guard the endpoint leaks the entire dataset.
  { methods: ["POST"], auth: "user" },
  async ({ event, user, json, error }) => {
    // Rate limit: 30 searches per minute per authenticated user.
    const rl = checkRateLimit(`search:${user!.id}`, {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return error(
        429,
        "Search limit reached. Please wait a moment and try again.",
        rateLimitHeaders(rl)
      );
    }

    try {
      const { query } = JSON.parse(event.body ?? "{}") as { query?: string };
      if (!query || typeof query !== "string" || query.trim().length < 2) {
        return error(400, "Query must be at least 2 characters.");
      }
      if (query.length > 500) {
        return error(400, "Query is too long (max 500 characters).");
      }

      // Primary path: ranked Postgres full-text search via the `search_all`
      // RPC. websearch_to_tsquery already handles multi-word / phrase /
      // negation, so the raw query is passed straight through (no LLM intent
      // extraction needed here).
      try {
        const results = await searchViaFts(query);
        return json(200, {
          results,
          summary: query,
          total: results.length,
        });
      } catch (ftsErr) {
        // FTS objects not present (PGRST202 / 42883) or any RPC failure:
        // degrade to the original LLM + ILIKE implementation so search never
        // regresses before the migration is applied.
        console.warn(
          "[search] FTS unavailable, falling back to ILIKE:",
          ftsErr
        );
      }

      const { results, summary } = await ilikeSearch(query);
      return json(200, {
        results,
        summary,
        total: results.length,
      });
    } catch (err) {
      console.error("[search]", err);
      return error(500, "Search is temporarily unavailable. Please try again.");
    }
  }
);
