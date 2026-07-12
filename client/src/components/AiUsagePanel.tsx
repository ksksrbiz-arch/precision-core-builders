/**
 * AiUsagePanel — AI usage / cost governance dashboard.
 * Reads /api/ai-usage (admin) and shows totals, free-vs-paid split, and
 * per-provider / per-feature breakdowns so spend stays visible.
 */
import { getAuthHeader } from "@/lib/authHeader";
import { Brain, Cpu, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Bucket = { key: string; calls: number; totalTokens: number };
type UsageData = {
  configured: boolean;
  error?: string;
  windowDays?: number;
  totals?: { calls: number; totalTokens: number };
  byProvider?: Bucket[];
  byFeature?: Bucket[];
  freeVsPaid?: { freeCalls: number; paidCalls: number };
};

const fmt = (n: number) => n.toLocaleString();

export default function AiUsagePanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai-usage?days=30", {
          headers: await getAuthHeader(),
        });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ configured: false, error: "Failed to load" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCalls = data?.totals?.calls ?? 0;
  const free = data?.freeVsPaid?.freeCalls ?? 0;
  const paid = data?.freeVsPaid?.paidCalls ?? 0;
  const freePct = totalCalls > 0 ? Math.round((free / totalCalls) * 100) : 0;

  return (
    <div className="bg-card border border-border/60 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-primary" />
        <h3
          className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          AI Usage · Last {data?.windowDays ?? 30} Days
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data?.configured || totalCalls === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center text-sm text-muted-foreground gap-1">
          <Cpu className="h-5 w-5 opacity-50" />
          <p>
            {data?.error ??
              "No AI usage recorded yet. Usage appears here once the assistant is used."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Headline numbers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {fmt(totalCalls)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Calls
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {fmt(data?.totals?.totalTokens ?? 0)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Tokens
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-green-500">
                {freePct}%
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                On free tier
              </p>
            </div>
          </div>

          {/* Free vs paid bar */}
          <div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="bg-green-500"
                style={{ width: `${freePct}%` }}
                title={`${free} free calls`}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${100 - freePct}%` }}
                title={`${paid} paid calls`}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>{fmt(free)} free</span>
              <span>{fmt(paid)} paid</span>
            </div>
          </div>

          {/* Breakdowns */}
          <div className="grid sm:grid-cols-2 gap-5">
            <Breakdown title="By provider" items={data?.byProvider ?? []} />
            <Breakdown title="By feature" items={data?.byFeature ?? []} />
          </div>
        </div>
      )}
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: Bucket[] }) {
  const max = Math.max(1, ...items.map(i => i.totalTokens));
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <div className="space-y-2">
        {items.slice(0, 6).map(item => (
          <div key={item.key}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="truncate">{item.key}</span>
              <span className="text-muted-foreground tabular-nums ml-2">
                {fmt(item.totalTokens)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary/70"
                style={{ width: `${(item.totalTokens / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">No data.</p>
        )}
      </div>
    </div>
  );
}
