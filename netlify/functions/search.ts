/**
 * LLM-Powered Operational Search — POST /api/search
 * Semantic search across projects, clients, field reports, materials,
 * and schedule items using Claude for intent extraction + Supabase full-text search.
 */
import { invokeLLM } from "../../server/_core/llm";
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

interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
}

async function searchProjects(
  keywords: string[],
  filters: Record<string, string | null>
): Promise<SearchResult[]> {
  const safeKeyword = sanitizeKeyword(keywords[0] ?? "");
  if (!safeKeyword) return [];
  let q = db
    .from("projects")
    .select("id,name,status,address,city,estimated_budget,contracted_budget")
    .or(`name.ilike.%${safeKeyword}%,address.ilike.%${safeKeyword}%`)
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
  const safeKeyword = sanitizeKeyword(keywords[0] ?? "");
  if (!safeKeyword) return [];
  const { data } = await db
    .from("clients")
    .select("id,name,email,phone,city")
    .or(`name.ilike.%${safeKeyword}%,email.ilike.%${safeKeyword}%`)
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
  const safeKeyword = sanitizeKeyword(keywords[0] ?? "");
  if (!safeKeyword) return [];
  const { data } = await db
    .from("field_reports")
    .select("id,project_id,report_date,summary,transcription")
    .or(`summary.ilike.%${safeKeyword}%,transcription.ilike.%${safeKeyword}%`)
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
  const safeKeyword = sanitizeKeyword(keywords[0] ?? "");
  if (!safeKeyword) return [];
  const { data } = await db
    .from("materials")
    .select(
      "id,name,category,vendor_name,quantity_needed,quantity_on_hand,unit,unit_price_current"
    )
    .or(
      `name.ilike.%${safeKeyword}%,category.ilike.%${safeKeyword}%,vendor_name.ilike.%${safeKeyword}%`
    )
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
  const safeKeyword = sanitizeKeyword(keywords[0] ?? "");
  if (!safeKeyword) return [];
  const { data } = await db
    .from("schedule_items")
    .select("id,project_id,title,task_type,status,planned_start_date")
    .or(`title.ilike.%${safeKeyword}%,task_type.ilike.%${safeKeyword}%`)
    .order("planned_start_date", { ascending: true })
    .limit(5);
  return (data ?? []).map((s: any) => ({
    type: "schedule_item",
    id: s.id,
    title: s.title,
    subtitle: [s.task_type, s.status?.replace(/_/g, " ")]
      .filter(Boolean)
      .join(" · "),
    href: `/admin/schedule`,
    meta: s.planned_start_date
      ? new Date(s.planned_start_date).toLocaleDateString()
      : undefined,
  }));
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
      if (!query || query.trim().length < 2) {
        return error(400, "Query must be at least 2 characters.");
      }

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
        intent = JSON.parse(raw.text);
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
      if (entities.includes("materials"))
        searches.push(searchMaterials(keywords));
      if (entities.includes("schedule_items"))
        searches.push(searchSchedule(keywords));

      const resultSets = await Promise.allSettled(searches);
      const results: SearchResult[] = resultSets
        .filter(
          (r): r is PromiseFulfilledResult<SearchResult[]> =>
            r.status === "fulfilled"
        )
        .flatMap(r => r.value);

      return json(200, {
        results,
        summary: intent.summary,
        total: results.length,
      });
    } catch (err) {
      console.error("[search]", err);
      return error(500, String(err));
    }
  }
);
