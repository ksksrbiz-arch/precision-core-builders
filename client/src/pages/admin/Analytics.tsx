/**
 * Analytics — Portfolio-wide profitability, field report trends, and lead pipeline.
 * Phase 5: Owner Command Center analytics expansion.
 */
import DashboardLayout from "@/components/DashboardLayout";
import AiUsagePanel from "@/components/AiUsagePanel";
import ProfitabilityTable from "@/components/ProfitabilityTable";
import { trpc } from "@/lib/trpc";
import { formatCompactCurrency, formatPercent } from "@/lib/formatters";
import { motion } from "framer-motion";
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
  DollarSign,
  BarChart3,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";

const COLORS = [
  "#8B7355",
  "#6B8E23",
  "#5B7FA6",
  "#C0392B",
  "#7A7060",
  "#D4A574",
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
  const { data: stats, isError: statsError } = trpc.projects.stats.useQuery();
  const { data: allProjects, isError: projectsError } =
    trpc.projects.list.useQuery({ pageSize: 100 });
  const { data: profitability, isError: profitabilityError } =
    trpc.projects.profitabilitySummary.useQuery();
  const { data: weeklyReports, isError: reportsError } =
    trpc.fieldReports.weeklyStats.useQuery();
  const { data: shortages, isError: shortagesError } =
    trpc.materials.list.useQuery({
      shortagesOnly: true,
      pageSize: 100,
    });
  const anyError =
    statsError ||
    projectsError ||
    reportsError ||
    shortagesError ||
    profitabilityError;

  const totalEstimated = stats?.totalEstimated ?? 0;
  const totalActual = stats?.totalActual ?? 0;
  const grossMargin =
    totalEstimated > 0 && totalActual > 0
      ? ((totalEstimated - totalActual) / totalEstimated) * 100
      : null;

  // Pipeline by status
  const statusData = stats
    ? [
        { name: "Leads", value: stats.byStatus.lead, fill: COLORS[4] },
        {
          name: "Contracted",
          value: stats.byStatus.contracted,
          fill: COLORS[2],
        },
        { name: "Active", value: stats.byStatus.active, fill: COLORS[1] },
        { name: "Complete", value: stats.byStatus.complete, fill: COLORS[0] },
      ].filter(d => d.value > 0)
    : [];

  // Per-project budget list
  const projectsWithBudget = (allProjects?.data ?? [])
    .filter(p => (p.estimated_budget ?? 0) > 0)
    .sort(
      (a, b) =>
        Number(b.estimated_budget ?? 0) - Number(a.estimated_budget ?? 0)
    )
    .slice(0, 10)
    .map((p, i) => ({
      name:
        p.name.length > PROJECT_NAME_MAX_LEN
          ? p.name.slice(0, PROJECT_NAME_MAX_LEN) + "…"
          : p.name,
      estimated: Number(p.estimated_budget ?? 0),
      actual: Number(p.actual_cost ?? 0),
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
          ? "#6B8E23"
          : p.marginPct >= 10
            ? "#D4A574"
            : "#C0392B",
    }));

  const totalReports = weeklyReports?.reduce((s, w) => s + w.reports, 0) ?? 0;
  const totalIssues = weeklyReports?.reduce((s, w) => s + w.issues, 0) ?? 0;

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
            Portfolio Analytics
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-0.5">
            Profitability, pipeline, and operational trends across all projects.
          </p>
        </div>

        {anyError && (
          <div className="border border-destructive/40 bg-destructive/5 p-4 mb-6 flex items-start justify-between gap-4">
            <p className="text-xs text-destructive">
              Some analytics data could not be loaded. Numbers below may be
              incomplete.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-[11px] font-bold tracking-widest uppercase text-destructive hover:underline shrink-0"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Reload
            </button>
          </div>
        )}

        {/* Portfolio KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            value={grossMargin !== null ? formatPercent(grossMargin, 1) : "—"}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              (shortages?.total ?? 0) > 0 ? "text-amber-400" : "text-foreground"
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
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
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
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 0,
                      fontSize: 11,
                    }}
                  />
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
                    tick={{ fontSize: 9, fill: "#7A7060" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 0,
                      fontSize: 11,
                    }}
                  />
                  <Bar
                    dataKey="reports"
                    name="Reports"
                    fill="#8B7355"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="issues"
                    name="Issues"
                    fill="#C0392B"
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
                  tick={{ fontSize: 9, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => fmt(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 9, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 0,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar
                  dataKey="estimated"
                  name="Estimated"
                  fill="#8B7355"
                  radius={[0, 2, 2, 0]}
                  opacity={0.6}
                />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="#6B8E23"
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
                  tick={{ fontSize: 9, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v.toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 9, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 0,
                    fontSize: 11,
                  }}
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
                  className="flex items-center justify-between p-3 border border-border/40"
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

        {/* AI usage / cost governance */}
        <AiUsagePanel />
      </div>
    </DashboardLayout>
  );
}
