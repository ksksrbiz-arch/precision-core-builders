/**
 * ProfitabilityView — portfolio-wide profitability overview.
 *
 * A dedicated admin page that surfaces the same server-side profit/margin math
 * that backs the Analytics page (`projects.profitabilitySummary`, the single
 * source of truth) in a focused, table-first layout: portfolio totals up top,
 * then a per-project breakdown with margin, variance, and on-budget status.
 */
import { AdminPageHeader } from "@/components/AdminPageHeader";
import DashboardLayout from "@/components/DashboardLayout";
import { QueryError } from "@/components/QueryError";
import { SkeletonCard } from "@/components/Skeletons";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { TrendingUp } from "lucide-react";

// Null-aware USD formatter. A real $0 renders as "$0" (not an em dash); only
// null/undefined/NaN fall back to "—".
const fmt = (n?: number) => formatCurrency(n);

// One decimal place, matching the Analytics page's margin display.
const pct = (n?: number) => formatPercent(n, 1);

// Margin health colour, matching the thresholds used on the Analytics page.
const marginClass = (basis: number, marginPct: number) =>
  basis <= 0
    ? "text-muted-foreground"
    : marginPct >= 20
      ? "text-green-400"
      : marginPct >= 10
        ? "text-amber-400"
        : "text-red-400";

function KPITile({
  label,
  value,
  sub,
  valueClass = "",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-card border border-border/60 p-4">
      <p
        className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {label}
      </p>
      <p
        className={`text-xl font-bold ${valueClass}`}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ProfitabilityView() {
  const { data, isLoading, isError, refetch } =
    trpc.projects.profitabilitySummary.useQuery();

  // Live updates: contracted/estimated budget edits on any project, or a new
  // cost_adjustment ledger entry (actual cost is derived from the ledger,
  // not a project column), refresh the portfolio-wide margin math shown here.
  useRealtimeTable({
    table: "projects",
    onUpdate: () => refetch(),
  });
  useRealtimeTable({
    table: "ledger_entries",
    onUpdate: () => refetch(),
  });

  const projects = (data?.projects ?? [])
    .filter(p => p.hasData)
    .sort((a, b) => b.contracted - a.contracted);
  const totals = data?.totals;
  const totalVariance = (data?.projects ?? []).reduce(
    (sum, p) => sum + p.variance,
    0
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p
            className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Phase 5 Analytics
          </p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Profitability
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-0.5">
            Contracted value, projected cost, and margin across every project.
          </p>
        </div>

        {isLoading ? (
          <SkeletonCard count={4} />
        ) : isError ? (
          <QueryError
            message="We couldn't load profitability data. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : projects.length === 0 ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <TrendingUp className="h-8 w-8 text-primary/50 mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">
              No profitability data yet
            </p>
            <p className="text-sm text-muted-foreground font-light">
              Add contracted budgets and log actual costs on your projects to
              track margin and variance here.
            </p>
          </div>
        ) : (
          <>
            {/* Portfolio totals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPITile
                label="Total Contracted"
                value={fmt(totals?.contracted)}
                sub="Across all projects"
              />
              <KPITile
                label="Projected Cost"
                value={fmt(totals?.actualCost)}
                sub="Actual costs logged"
              />
              <KPITile
                label="Portfolio Margin"
                value={pct(totals?.marginPct)}
                sub={fmt(totals?.profit) + " profit"}
                valueClass={marginClass(
                  totals?.basis ?? 0,
                  totals?.marginPct ?? 0
                )}
              />
              <KPITile
                label="Total Variance"
                value={fmt(totalVariance)}
                sub={totalVariance > 0 ? "Over estimate" : "Within estimate"}
                valueClass={
                  totalVariance > 0 ? "text-red-400" : "text-foreground"
                }
              />
            </div>

            {/* Per-project table */}
            <div className="bg-card border border-border/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2
                  className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Project Profitability
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/70 border-b border-border/40">
                      <th className="text-left font-medium py-2 pr-3">
                        Project
                      </th>
                      <th className="text-right font-medium py-2 px-3">
                        Contracted
                      </th>
                      <th className="text-right font-medium py-2 px-3">
                        Projected Cost
                      </th>
                      <th className="text-right font-medium py-2 px-3">
                        Margin
                      </th>
                      <th className="text-right font-medium py-2 px-3">
                        Variance
                      </th>
                      <th className="text-right font-medium py-2 pl-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => {
                      const onBudget = p.profit >= 0;
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border/20 last:border-0"
                        >
                          <td className="py-2 pr-3 truncate" title={p.name}>
                            {p.name}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                            {fmt(p.contracted)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                            {fmt(p.actualCost)}
                          </td>
                          <td
                            className={`py-2 px-3 text-right tabular-nums font-medium ${marginClass(
                              p.basis,
                              p.marginPct
                            )}`}
                          >
                            {p.basis > 0 ? pct(p.marginPct) : "—"}
                          </td>
                          <td
                            className={`py-2 px-3 text-right tabular-nums ${
                              p.variance > 0
                                ? "text-red-400"
                                : "text-foreground"
                            }`}
                          >
                            {p.variance > 0 ? "+" : ""}
                            {fmt(p.variance)}
                          </td>
                          <td className="py-2 pl-3 text-right">
                            <Badge
                              variant="outline"
                              className={
                                onBudget
                                  ? "border-green-400/40 text-green-400"
                                  : "border-red-400/40 text-red-400"
                              }
                            >
                              {onBudget ? "On Budget" : "Over Budget"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border/40 font-semibold">
                      <td className="py-2 pr-3">Portfolio</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {fmt(totals?.contracted)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {fmt(totals?.actualCost)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right tabular-nums ${marginClass(
                          totals?.basis ?? 0,
                          totals?.marginPct ?? 0
                        )}`}
                      >
                        {pct(totals?.marginPct)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right tabular-nums ${
                          totalVariance > 0 ? "text-red-400" : "text-foreground"
                        }`}
                      >
                        {totalVariance > 0 ? "+" : ""}
                        {fmt(totalVariance)}
                      </td>
                      <td className="py-2 pl-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
