/**
 * LLM-Powered Operational Search — POST /api/search
 * Semantic search across projects, clients, field reports, materials,
 * and schedule items using Claude for intent extraction + Supabase full-text search.
 */
import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import { db } from "../../server/db";

const SEARCH_INTENT_PROMPT = `You are a search assistant for Precision Core Builders, a construction management platform.
Given a natural-language query, extract the search intent and return JSON:
{
  "entities": ["projects"|"clients"|"field_reports"|"materials"|"schedule_items"],
  "keywords": ["word1", "word2"],
  "filters": {
    "status": "lead"|"contracted"|"in_progress"|"complete"|null,
    "dateRange": "today"|"this_week"|"this_month"|null,
    "category": "string or null"
  },
  "summary": "one-sentence description of what to search for"
}
Return only valid JSON.`;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
}

async function searchProjects(keywords: string[], filters: Record<string, string | null>): Promise<SearchResult[]> {
  const term = keywords.join(" | ");
  let q = db
    .from("projects")
    .select("id,name,status,address,city,estimated_budget,contracted_budget")
    .order("created_at", { ascending: false })
    .limit(5);
  if (term) q = q.or(`name.ilike.%${keywords[0]}%,address.ilike.%${keywords[0]}%`);
  if (filters.status) q = q.eq("status", filters.status);
  const { data } = await q;
  return (data ?? []).map((p: any) => ({
    type: "project",
    id: p.id,
    title: p.name,
    subtitle: [p.city, p.status?.replace(/_/g, " ")].filter(Boolean).join(" · "),
    href: `/admin/projects/${p.id}`,
    meta: p.contracted_budget ? `$${Number(p.contracted_budget).toLocaleString()}` : undefined,
  }));
}

async function searchClients(keywords: string[]): Promise<SearchResult[]> {
  if (!keywords.length) return [];
  const { data } = await db
    .from("clients")
    .select("id,name,email,phone,city")
    .or(`name.ilike.%${keywords[0]}%,email.ilike.%${keywords[0]}%`)
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
  if (!keywords.length) return [];
  const { data } = await db
    .from("field_reports")
    .select("id,project_id,report_date,summary,transcription")
    .or(`summary.ilike.%${keywords[0]}%,transcription.ilike.%${keywords[0]}%`)
    .order("report_date", { ascending: false })
    .limit(5);
  return (data ?? []).map((r: any) => ({
    type: "field_report",
    id: r.id,
    title: `Field Report — ${new Date(r.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    subtitle: r.summary ? r.summary.slice(0, 100) + (r.summary.length > 100 ? "…" : "") : "No summary",
    href: `/admin/field-reports`,
  }));
}

async function searchMaterials(keywords: string[]): Promise<SearchResult[]> {
  if (!keywords.length) return [];
  const { data } = await db
    .from("materials")
    .select("id,name,category,vendor_name,quantity_needed,quantity_on_hand,unit,unit_price_current")
    .or(`name.ilike.%${keywords[0]}%,category.ilike.%${keywords[0]}%,vendor_name.ilike.%${keywords[0]}%`)
    .limit(5);
  return (data ?? []).map((m: any) => ({
    type: "material",
    id: m.id,
    title: m.name,
    subtitle: [m.category, m.vendor_name].filter(Boolean).join(" · "),
    href: `/admin/materials`,
    meta: m.unit_price_current ? `$${Number(m.unit_price_current).toFixed(2)}/${m.unit ?? "unit"}` : undefined,
  }));
}

async function searchSchedule(keywords: string[]): Promise<SearchResult[]> {
  if (!keywords.length) return [];
  const { data } = await db
    .from("schedule_items")
    .select("id,project_id,title,task_type,status,planned_start_date")
    .or(`title.ilike.%${keywords[0]}%,task_type.ilike.%${keywords[0]}%`)
    .order("planned_start_date", { ascending: true })
    .limit(5);
  return (data ?? []).map((s: any) => ({
    type: "schedule_item",
    id: s.id,
    title: s.title,
    subtitle: [s.task_type, s.status?.replace(/_/g, " ")].filter(Boolean).join(" · "),
    href: `/admin/schedule`,
    meta: s.planned_start_date ? new Date(s.planned_start_date).toLocaleDateString() : undefined,
  }));
}

export const handler: Handler = async event => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "" };

  try {
    const { query } = JSON.parse(event.body ?? "{}") as { query?: string };
    if (!query || query.trim().length < 2) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Query must be at least 2 characters." }) };
    }

    // Extract intent via LLM
    let intent: { entities: string[]; keywords: string[]; filters: Record<string, string | null>; summary: string };
    try {
      const raw = await invokeLLM({
        messages: [
          { role: "system", content: SEARCH_INTENT_PROMPT },
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
        entities: ["projects", "clients", "field_reports", "materials", "schedule_items"],
        keywords: query.split(/\s+/).slice(0, 3),
        filters: {},
        summary: query,
      };
    }

    const entities = intent.entities?.length ? intent.entities : ["projects", "clients", "field_reports", "materials"];
    const keywords = intent.keywords?.length ? intent.keywords : [query];

    // Run parallel searches across requested entities
    const searches: Promise<SearchResult[]>[] = [];
    if (entities.includes("projects")) searches.push(searchProjects(keywords, intent.filters ?? {}));
    if (entities.includes("clients")) searches.push(searchClients(keywords));
    if (entities.includes("field_reports")) searches.push(searchFieldReports(keywords));
    if (entities.includes("materials")) searches.push(searchMaterials(keywords));
    if (entities.includes("schedule_items")) searches.push(searchSchedule(keywords));

    const resultSets = await Promise.allSettled(searches);
    const results: SearchResult[] = resultSets
      .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === "fulfilled")
      .flatMap(r => r.value);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ results, summary: intent.summary, total: results.length }),
    };
  } catch (err) {
    console.error("[search]", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
