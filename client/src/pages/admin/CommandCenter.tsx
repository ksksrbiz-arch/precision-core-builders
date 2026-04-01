/**
 * Admin Command Center — main dashboard with KPIs, project status, recent activity.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { trpc } from "@/lib/trpc";
import { BarChart3, ClipboardList, DollarSign, TrendingUp, Users, AlertTriangle, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function StatCard({
  icon: Icon, label, value, sub, color = "primary",
}: { icon: typeof BarChart3; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border/60 p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground"
           style={{ fontFamily: "var(--font-condensed)" }}>
          {label}
        </p>
        <div className="h-8 w-8 border border-primary/30 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground font-light">{sub}</p>}
    </div>
  );
}

export default function CommandCenter() {
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.projects.stats.useQuery();
  const { data: recentProjects } = trpc.projects.list.useQuery({ pageSize: 5 });
  const { data: recentReports } = trpc.fieldReports.list.useQuery({ pageSize: 5 });
  const { data: shortages } = trpc.materials.list.useQuery({ shortagesOnly: true, pageSize: 10 });

  const budgetData = [
    { name: "Estimated", value: stats ? Math.round((stats.totalEstimated ?? 0) / 1000) : 0 },
    { name: "Actual", value: stats ? Math.round((stats.totalActual ?? 0) / 1000) : 0 },
  ];

  const statusData = stats ? [
    { name: "Leads",       value: stats.byStatus.lead,       fill: "#7A7060" },
    { name: "Contracted",  value: stats.byStatus.contracted,  fill: "#C8A84B" },
    { name: "Active",      value: stats.byStatus.active,      fill: "#6B9E3F" },
    { name: "Complete",    value: stats.byStatus.complete,     fill: "#5B7FA6" },
  ] : [];

  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                Command Center
              </h1>
              <GuideHelpButton guideId="command-center" />
            </div>
            <p className="text-sm text-muted-foreground font-light mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLocation("/admin/field-reports/new")}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Field Report
            </button>
            <button
              onClick={() => setLocation("/admin/projects")}
              className="flex items-center gap-2 border border-border/60 text-muted-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <ClipboardList className="h-3.5 w-3.5" /> New Project
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={ClipboardList} label="Total Projects" value={stats?.total ?? "—"} sub="All time" />
          <StatCard icon={TrendingUp}    label="Active"         value={stats?.byStatus.active ?? "—"} sub="In progress" />
          <StatCard icon={DollarSign}    label="Contracted"     value={stats ? fmt(stats.totalEstimated) : "—"} sub="Total pipeline" />
          <StatCard icon={AlertTriangle} label="Shortages"      value={shortages?.total ?? 0} sub="Material alerts" />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          {/* Project status breakdown */}
          <div className="bg-card border border-border/60 p-5">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
               style={{ fontFamily: "var(--font-condensed)" }}>
              Project Status
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={statusData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#7A7060" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#7A7060" }} axisLine={false} tickLine={false} width={20} />
                <Tooltip
                  contentStyle={{ background: "#141210", border: "1px solid rgba(200,168,75,0.2)", fontSize: 12 }}
                  labelStyle={{ color: "#EDE6D9" }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Budget overview */}
          <div className="bg-card border border-border/60 p-5">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
               style={{ fontFamily: "var(--font-condensed)" }}>
              Budget Overview ($ thousands)
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={budgetData} barSize={48}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#7A7060" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#7A7060" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: "#141210", border: "1px solid rgba(200,168,75,0.2)", fontSize: 12 }}
                  formatter={(v: number) => [`$${v}k`, ""]}
                />
                <Bar dataKey="value" fill="#C8A84B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent projects */}
          <div className="bg-card border border-border/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                 style={{ fontFamily: "var(--font-condensed)" }}>
                Recent Projects
              </p>
              <button onClick={() => setLocation("/admin/projects")}
                      className="text-[10px] text-primary hover:underline tracking-wider uppercase"
                      style={{ fontFamily: "var(--font-condensed)" }}>
                View all →
              </button>
            </div>
            {recentProjects?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground font-light py-4 text-center">No projects yet</p>
            ) : (
              <div className="space-y-2">
                {recentProjects?.data.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setLocation(`/admin/projects/${p.id}`)}
                    className="w-full flex items-center justify-between p-3 border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-light">{(p as any).clients?.name ?? "—"}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent field reports */}
          <div className="bg-card border border-border/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                 style={{ fontFamily: "var(--font-condensed)" }}>
                Recent Field Reports
              </p>
              <button onClick={() => setLocation("/admin/field-reports")}
                      className="text-[10px] text-primary hover:underline tracking-wider uppercase"
                      style={{ fontFamily: "var(--font-condensed)" }}>
                View all →
              </button>
            </div>
            {recentReports?.data.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-light mb-3">No field reports yet</p>
                <button
                  onClick={() => setLocation("/admin/field-reports/new")}
                  className="text-[11px] text-primary border border-primary/40 px-4 py-2 tracking-wider uppercase hover:bg-primary/10 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  + Create First Report
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentReports?.data.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setLocation(`/admin/field-reports/${r.id}`)}
                    className="w-full flex items-center justify-between p-3 border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{(r as any).projects?.name ?? "Unknown Project"}</p>
                      <p className="text-xs text-muted-foreground font-light">
                        {new Date(r.report_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-[9px] px-2 py-1 font-semibold tracking-widest uppercase ${
                      r.published_to_client
                        ? "text-green-400 border border-green-400/30 bg-green-400/10"
                        : "text-muted-foreground border border-border/60"
                    }`} style={{ fontFamily: "var(--font-condensed)" }}>
                      {r.published_to_client ? "Published" : "Draft"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    lead:          { label: "Lead",       cls: "text-muted-foreground border-border/60" },
    estimate_sent: { label: "Estimated",  cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
    contracted:    { label: "Contracted", cls: "text-primary border-primary/30 bg-primary/10" },
    in_progress:   { label: "Active",     cls: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
    punch_list:    { label: "Punch List", cls: "text-orange-400 border-orange-400/30 bg-orange-400/10" },
    complete:      { label: "Complete",   cls: "text-green-400 border-green-400/30 bg-green-400/10" },
    on_hold:       { label: "On Hold",    cls: "text-red-400 border-red-400/30 bg-red-400/10" },
  };
  const s = map[status] ?? { label: status, cls: "text-muted-foreground border-border/60" };
  return (
    <span className={`text-[9px] px-2 py-1 font-semibold tracking-widest uppercase border flex-shrink-0 ${s.cls}`}
          style={{ fontFamily: "var(--font-condensed)" }}>
      {s.label}
    </span>
  );
}
