/**
 * AI Usage / Cost Governance — GET /api/ai-usage
 *
 * Returns aggregated LLM usage (calls + tokens) over a recent window, broken
 * down by provider, feature, day, and free-vs-paid. Admin-only: this is an
 * internal operations metric.
 */
import { db } from "../../server/db";
import { withGuards } from "./_lib/http";

/** Providers billed per-token. Everything else runs on a free tier. */
const PAID_PROVIDERS = new Set(["anthropic"]);

type UsageRow = {
  feature: string | null;
  provider: string | null;
  total_tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: string;
};

export const handler = withGuards(
  { methods: ["GET"], auth: "admin" },
  async ({ event, json }) => {
    if (!db) {
      return json(200, {
        configured: false,
        totals: { calls: 0, totalTokens: 0 },
        byProvider: [],
        byFeature: [],
        daily: [],
        freeVsPaid: { freeCalls: 0, paidCalls: 0 },
      });
    }

    const days = Math.min(
      Math.max(
        parseInt(event.queryStringParameters?.days ?? "30", 10) || 30,
        1
      ),
      90
    );
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    let rows: UsageRow[] = [];
    try {
      const { data, error } = await db
        .from("ai_usage")
        .select(
          "feature,provider,total_tokens,prompt_tokens,completion_tokens,created_at"
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10_000);
      if (error) throw error;
      rows = (data ?? []) as UsageRow[];
    } catch (err) {
      console.error("[ai-usage]", err);
      return json(200, {
        configured: false,
        error:
          "Usage table not available yet. Run the 0005_ai_usage migration.",
        totals: { calls: 0, totalTokens: 0 },
        byProvider: [],
        byFeature: [],
        daily: [],
        freeVsPaid: { freeCalls: 0, paidCalls: 0 },
      });
    }

    const byProvider = new Map<
      string,
      { calls: number; totalTokens: number }
    >();
    const byFeature = new Map<string, { calls: number; totalTokens: number }>();
    const byDay = new Map<string, { calls: number; totalTokens: number }>();
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let freeCalls = 0;
    let paidCalls = 0;

    const bump = (
      map: Map<string, { calls: number; totalTokens: number }>,
      key: string,
      tokens: number
    ) => {
      const cur = map.get(key) ?? { calls: 0, totalTokens: 0 };
      cur.calls += 1;
      cur.totalTokens += tokens;
      map.set(key, cur);
    };

    for (const r of rows) {
      const tokens = r.total_tokens ?? 0;
      totalTokens += tokens;
      promptTokens += r.prompt_tokens ?? 0;
      completionTokens += r.completion_tokens ?? 0;
      const provider = r.provider ?? "unknown";
      bump(byProvider, provider, tokens);
      bump(byFeature, r.feature ?? "unknown", tokens);
      bump(byDay, r.created_at.slice(0, 10), tokens);
      if (PAID_PROVIDERS.has(provider)) paidCalls++;
      else freeCalls++;
    }

    const toSorted = (
      map: Map<string, { calls: number; totalTokens: number }>
    ) =>
      Array.from(map.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.totalTokens - a.totalTokens);

    return json(200, {
      configured: true,
      windowDays: days,
      totals: {
        calls: rows.length,
        totalTokens,
        promptTokens,
        completionTokens,
      },
      byProvider: toSorted(byProvider),
      byFeature: toSorted(byFeature),
      daily: Array.from(byDay.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      freeVsPaid: { freeCalls, paidCalls },
    });
  }
);
