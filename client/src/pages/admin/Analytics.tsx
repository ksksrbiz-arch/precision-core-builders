/**
 * Analytics — Portfolio-wide profitability, field report trends, and lead pipeline.
 * Phase 5: Owner Command Center analytics expansion.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import AiUsagePanel from "@/components/AiUsagePanel";
import ProfitabilityTable from "@/components/ProfitabilityTable";
import { QueryError } from "@/components/QueryError";
import { SkeletonDashboard } from "@/components/Skeletons";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import { formatCompactCurrency, formatPercent } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";

/**
 * Shared chart palette — the single source of truth for Recharts series and
 * axis colors on BOTH admin dashboards (this page and the Command Center,
 * which imports these). Values mirror the theme tokens in
 * `client/src/index.css` so `/admin` and `/admin/analytics` read as one
 * system rather than two different accent schemes.
 */
export const CHART_COLORS = {
  /** `--primary` gold — the headline series. */
  primary: "#C8A84B",
  /** `--muted-foreground` — neutral series and every axis tick. */
  neutral: "#7A7060",
  positive: "#6B8E23",
  info: "#5B7FA6",
  warning: "#D4A574",
  /** `--destructive`. */
  danger: "#C0392B",
} as const;

/** Project-status colors, identical on both dashboards. */
export const STATUS_COLORS = {
  lead: CHART_COLORS.neutral,
  contracted: CHART_COLORS.primary,
  active: CHART_COLORS.positive,
  complete: CHART_COLORS.info,
} as const;

/** Recharts `<Tooltip contentStyle>` chrome, shared by both dashboards. */
export const CHART_TOOLTIP_STYLE = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 0,
  fontSize: 11,
} as const;

/** Categorical cycle for per-project series. */
const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.positive,
  CHART_COLORS.info,
  CHART_COLORS.danger,
  CHART_COLORS.neutral,
  CHART_COLORS.warning,
];
const PROJECT_NAME_MAX_LEN = 20;

// Shared compact-money formatter for KPI tiles and chart axis/tooltip labels.
const fmt = (n: number | null | undefined) => formatCompactCurrency(n);

function KPICard({
  label,
  value,
  sub,
  trend,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}) {
  return (
    <div className="bg-card border border-border/60 p-5">
      <p
        className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {label}
      </p>
      <div className="flex items-end gap-2">
        <p
          className={`text-2xl font-bold ${color}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {value}
        </p>
        {trend === "up" && (
          <TrendingUp className="h-4 w-4 text-green-400 mb-1" />
        )}
        {trend === "down" && (
          <TrendingDown className="h-4 w-4 text-red-400 mb-1" />
        )}
      </div>
      {sub && (
        <p className="text-xs text-muted-foreground mt-0.5 font-light">{sub}</p>
      )}
    </div>
  );
}

export default function Analytics() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = trpc.projects.stats.useQuery();
  const {
    data: allProjects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = trpc.projects.list.useQuery({ pageSize: 100 });
  const {
    data: profitability,
    isLoading: profitabilityLoading,
    isError: profitabilityError,
    refetch: refetchProfitability,
  } = trpc.projects.profitabilitySummary.useQuery();
  const {
    data: weeklyReports,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
  } = trpc.fieldReports.weeklyStats.useQuery();
  const {
    data: shortages,
    isLoading: shortagesLoading,
    isError: shortagesError,
    refetch: refetchShortages,
  } = trpc.materials.list.useQuery({
    shortagesOnly: true,
    pageSize: 100,
  });

  // The page is one composite dashboard: hold every chart back until all five
  // feeds have resolved, otherwise Recharts renders empty axes that then jump.
  const isLoading =
    statsLoading ||
    projectsLoading ||
    profitabilityLoading ||
    reportsLoading ||
    shortagesLoading;
  const isError =
    statsError ||
    projectsError ||
    reportsError ||
    shortagesError ||
    profitabilityError;
  const retryAll = () => {
    void refetchStats();
    void refetchProjects();
    void refetchProfitability();
    void refetchReports();
    void refetchShortages();
  };

  // Live updates: project changes refresh portfolio-wide analytics. A new
  // cost_adjustment ledger entry moves totalActual/profitability too, since
  // actual cost is derived from the ledger rather than a projects column.
  useRealtimeTable({
    table: "projects",
    onUpdate: () => utils.projects.invalidate(),
  });
  useRealtimeTable({
    table: "ledger_entries",
    onUpdate: () => utils.projects.invalidate(),
  });

  const totalEstimated = stats?.totalEstimated ?? 0;
  const totalActual = stats?.totalActual ?? 0;
  // Source the headline margin from the same server profitability summary that
  // backs the ProfitabilityTable below (contracted-or-estimate basis), so the
  // two margin figures on this page never disagree. Fall back to the
  // estimated-basis calc only until that query resolves.
  const grossMargin =
    profitability?.totals?.marginPct ??
    (totalEstimated > 0 && totalActual > 0
      ? ((totalEstimated - totalActual) / totalEstimated) * 100
      : null);

  // Pipeline by status
  const statusData = stats
    ? [
        {
          name: "Leads",
          value: stats.byStatus.lead,
          fill: STATUS_COLORS.lead,
        },
        {
          name: "Contracted",
          value: stats.byStatus.contracted,
          fill: STATUS_COLORS.contracted,
        },
        {
          name: "Active",
          value: stats.byStatus.active,
          fill: STATUS_COLORS.active,
        },
        {
          name: "Complete",
          value: stats.byStatus.complete,
          fill: STATUS_COLORS.complete,
        },
      ].filter(d => d.value > 0)
    : [];

  // Per-project budget list. Actual cost comes from the server profitability
  // summary (derived from ledger cost_adjustment entries), not the raw
  // projects.list row — that column is no longer kept in sync.
  const projectsWithBudget = (profitability?.projects ?? [])
    .filter(p => p.estimated > 0)
    .sort((a, b) => b.estimated - a.estimated)
    .slice(0, 10)
    .map((p, i) => ({
      name:
        p.name.length > PROJECT_NAME_MAX_LEN
          ? p.name.slice(0, PROJECT_NAME_MAX_LEN) + "…"
          : p.name,
      estimated: p.estimated,
      actual: p.actualCost,
      fill: COLORS[i % COLORS.length],
    }));

  // Per-project margin, from the server profitability summary (single source
  // of truth for the profit/margin math).
  const marginByProject = (profitability?.projects ?? [])
    .filter(p => p.hasData && p.basis > 0)
    .sort((a, b) => b.contracted - a.contracted)
    .slice(0, 10)
    .map(p => ({
      name:
        p.name.length > PROJECT_NAME_MAX_LEN
          ? p.name.slice(0, PROJECT_NAME_MAX_LEN) + "…"
          : p.name,
      profit: p.profit,
      margin: p.marginPct,
      fill:
        p.marginPct >= 20
          ? CHART_COLORS.positive
          : p.marginPct >= 10
            ? CHART_COLORS.warning
            : CHART_COLORS.danger,
    }));

  const totalReports = weeklyReports?.reduce((s, w) => s + w.reports, 0) ?? 0;
  const totalIssues = weeklyReports?.reduce((s, w) => s + w.issues, 0) ?? 0;

  // Nothing recorded anywhere yet — every chart below would be an empty frame.
  const isEmpty =
    (stats?.total ?? 0) === 0 &&
    !weeklyReports?.length &&
    (shortages?.total ?? 0) === 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <AdminPageHeader
          eyebrow="Phase 5 Analytics"
          title="Portfolio Analytics"
          description="Profitability, pipeline, and operational trends across all projects."
        />

        {isLoading ? (
          <SkeletonDashboard />
        ) : isError ? (
          <QueryError
            message="We couldn't load portfolio analytics. Check your connection and try again."
            onRetry={retryAll}
          />
        ) : isEmpty ? (
          <Empty className="bg-card border border-border/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 />
              </EmptyMedia>
              <EmptyTitle>No analytics yet</EmptyTitle>
              <EmptyDescription>
                Analytics build from your projects, field reports, and material
                records. Add a project to start tracking margin and pipeline.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => setLocation("/admin/projects/new")}
                className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <FileText className="h-3.5 w-3.5" /> Create Your First Project
              </button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {/* Portfolio KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPICard
                label="Total Projects"
                value={stats?.total ?? "—"}
                sub="All time"
              />
              <KPICard
                label="Revenue Pipeline"
                value={fmt(totalEstimated)}
                sub="Across all projects"
                trend={totalEstimated > 0 ? "up" : "neutral"}
              />
              <KPICard
                label="Reported Costs"
                value={fmt(totalActual)}
                sub="Actual costs logged"
              />
              <KPICard
                label="Gross Margin"
                value={
                  grossMargin !== null ? formatPercent(grossMargin, 1) : "—"
                }
                sub={
                  grossMargin !== null
                    ? grossMargin >= 20
                      ? "Healthy portfolio"
                      : grossMargin >= 10
                        ? "Thin — review costs"
                        : "At risk"
                    : "Log actual costs"
                }
                trend={
                  grossMargin === null
                    ? "neutral"
                    : grossMargin >= 20
                      ? "up"
                      : "down"
                }
                color={
                  grossMargin === null
                    ? "text-foreground"
                    : grossMargin >= 20
                      ? "text-green-400"
                      : grossMargin >= 10
                        ? "text-amber-400"
                        : "text-red-400"
                }
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPICard
                label="Active Projects"
                value={stats?.byStatus.active ?? "—"}
                sub="In progress"
              />
              <KPICard
                label="Material Shortages"
                value={shortages?.total ?? 0}
                sub="Need re-order"
                trend={(shortages?.total ?? 0) > 0 ? "down" : "neutral"}
                color={
                  (shortages?.total ?? 0) > 0
                    ? "text-amber-400"
                    : "text-foreground"
                }
              />
              <KPICard
                label="Reports (8 Weeks)"
                value={totalReports}
                sub="Field reports filed"
                trend={totalReports > 0 ? "up" : "neutral"}
              />
              <KPICard
                label="Issues Reported"
                value={totalIssues}
                sub="Reports with issues"
                trend={totalIssues > 3 ? "down" : "neutral"}
                color={totalIssues > 3 ? "text-amber-400" : "text-foreground"}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Pipeline breakdown */}
              <div className="bg-card border border-border/60 p-5">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Project Pipeline
                </p>
                {statusData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                    No project data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Field report activity */}
              <div className="bg-card border border-border/60 p-5">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Field Report Activity (8 Weeks)
                </p>
                {!weeklyReports?.length ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                    No report data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyReports} barSize={14}>
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 9, fill: CHART_COLORS.neutral }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar
                        dataKey="reports"
                        name="Reports"
                        fill={CHART_COLORS.primary}
                        radius={[2, 2, 0, 0]}
                      />
                      <Bar
                        dataKey="issues"
                        name="Issues"
                        fill={CHART_COLORS.danger}
                        radius={[2, 2, 0, 0]}
                        opacity={0.7}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Budget vs Actual per project */}
            {projectsWithBudget.length > 0 && (
              <div className="bg-card border border-border/60 p-5 mb-6">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Budget vs. Actual by Project (Top 10)
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={projectsWithBudget}
                    layout="vertical"
                    barSize={12}
                    margin={{ left: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 9, fill: CHART_COLORS.neutral }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => fmt(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 9, fill: CHART_COLORS.neutral }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(v: number) => fmt(v)}
                    />
                    <Bar
                      dataKey="estimated"
                      name="Estimated"
                      fill={CHART_COLORS.primary}
                      radius={[0, 2, 2, 0]}
                      opacity={0.6}
                    />
                    <Bar
                      dataKey="actual"
                      name="Actual"
                      fill={CHART_COLORS.positive}
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Margin by project */}
            {marginByProject.length > 0 && (
              <div className="bg-card border border-border/60 p-5 mb-6">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Margin by Project (Top 10)
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={marginByProject}
                    layout="vertical"
                    barSize={12}
                    margin={{ left: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 9, fill: CHART_COLORS.neutral }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v.toFixed(0)}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 9, fill: CHART_COLORS.neutral }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number, name) =>
                        name === "margin"
                          ? [`${value.toFixed(1)}%`, "Margin"]
                          : [formatCompactCurrency(value), "Profit"]
                      }
                    />
                    <Bar dataKey="margin" name="margin" radius={[0, 2, 2, 0]}>
                      {marginByProject.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-project profitability */}
            <ProfitabilityTable
              projects={profitability?.projects ?? []}
              totals={
                profitability?.totals ?? {
                  contracted: 0,
                  estimated: 0,
                  actualCost: 0,
                  profit: 0,
                  basis: 0,
                  marginPct: 0,
                }
              }
            />

            {/* Material shortages table */}
            {(shortages?.data ?? []).length > 0 && (
              <div className="bg-card border border-amber-400/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-400"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Active Material Shortages
                  </p>
                </div>
                <div className="space-y-2">
                  {(shortages?.data ?? []).slice(0, 5).map((m: any) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 border border-border/40"
                    >
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.vendor_name ?? "Unknown vendor"} ·{" "}
                          {m.quantity_received ?? 0}/{m.quantity_needed ?? "?"}{" "}
                          {m.unit ?? "units"}
                        </p>
                      </div>
                      <button
                        onClick={() => setLocation("/admin/materials")}
                        aria-label={`Order more ${m.name}`}
                        className="text-[10px] text-primary border border-primary/30 px-3 py-1 hover:bg-primary/10 transition-all"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Order
                      </button>
                    </div>
                  ))}
                  {(shortages?.total ?? 0) > 5 && (
                    <button
                      onClick={() => setLocation("/admin/materials")}
                      className="w-full text-center text-xs text-primary hover:underline py-2"
                    >
                      View all {shortages?.total} shortages →
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* AI usage / cost governance */}
        <AiUsagePanel />
      </div>
    </DashboardLayout>
  );
}
