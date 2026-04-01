/**
 * Admin Command Center — main dashboard with KPIs, project status, recent activity,
 * AI lead scoring, Supabase Realtime updates, and Digital Foreman AI chat.
 */
import DashboardLayout from "@/components/DashboardLayout";
import AIChatBox from "@/components/AIChatBox";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle, BarChart3, Bot, ChevronDown, ChevronUp,
  ClipboardList, DollarSign, Loader2, Plus, TrendingUp, Users, Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── Stat Card ─────────────────────────────────────────────────────────────────

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

// ─── Lead Scoring Panel ────────────────────────────────────────────────────────

type LeadScore = {
  score: number;
  priority: "low" | "medium" | "high" | "urgent";
  reasoning: string;
  suggestedAction: string;
  estimatedValue: number | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    "text-muted-foreground border-border/60",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  high:   "text-primary border-primary/30 bg-primary/10",
  urgent: "text-red-400 border-red-400/30 bg-red-400/10",
};

function LeadScoringPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeadScore | null>(null);
  const [form, setForm] = useState({
    name: "", projectType: "", budget: "", location: "", timeline: "", message: "",
  });

  const scoreALead = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/lead-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (err) {
      setResult({
        score: 0, priority: "low",
        reasoning: `Error: ${err}`,
        suggestedAction: "Check ANTHROPIC_API_KEY in Netlify environment.",
        estimatedValue: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="bg-card border border-border/60">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
             style={{ fontFamily: "var(--font-condensed)" }}>
            AI Lead Intelligence
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border/40">
          <p className="text-xs text-muted-foreground font-light mt-4 mb-4">
            Score an incoming lead to prioritize your response. AI analyzes project fit, budget, location, and timeline.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            {[
              { key: "name",        placeholder: "Lead name"               },
              { key: "projectType", placeholder: "Project type (remodel, new build…)" },
              { key: "budget",      placeholder: "Budget range ($)"        },
              { key: "location",    placeholder: "Location (Eugene, Lane County…)" },
              { key: "timeline",    placeholder: "Timeline (start date or 'ASAP')" },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                value={(form as any)[key]}
                onChange={f(key as keyof typeof form)}
                placeholder={placeholder}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
              />
            ))}
            <textarea
              value={form.message}
              onChange={f("message")}
              placeholder="Lead message or project description…"
              rows={2}
              className="sm:col-span-2 px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none transition-colors"
            />
          </div>

          <button
            onClick={scoreALead}
            disabled={loading || !form.name}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {loading ? "Scoring…" : "Score This Lead"}
          </button>

          {result && (
            <div className="mt-4 border border-border/60 p-4 bg-background/40">
              {/* Score gauge */}
              <div className="flex items-center gap-4 mb-3">
                <div className="relative h-14 w-14 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
                            strokeWidth="2.5" className="text-border/40" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
                            strokeWidth="2.5"
                            strokeDasharray={`${result.score} ${100 - result.score}`}
                            className={result.score >= 75 ? "text-green-400" : result.score >= 50 ? "text-primary" : result.score >= 25 ? "text-amber-400" : "text-red-400"} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {result.score}
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] px-2 py-1 border font-bold tracking-widest uppercase ${PRIORITY_COLORS[result.priority]}`}
                        style={{ fontFamily: "var(--font-condensed)" }}>
                    {result.priority.toUpperCase()}
                  </span>
                  {result.estimatedValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Est. value: <span className="text-primary font-semibold">${result.estimatedValue.toLocaleString()}</span>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground mb-2">{result.reasoning}</p>
              <div className="border-l-2 border-primary pl-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-primary mb-0.5"
                   style={{ fontFamily: "var(--font-condensed)" }}>Next Action</p>
                <p className="text-xs text-muted-foreground">{result.suggestedAction}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Command Center ───────────────────────────────────────────────────────

export default function CommandCenter() {
  const [, setLocation] = useLocation();
  const [realtimeFlash, setRealtimeFlash] = useState(false);

  const utils = trpc.useUtils();
  const { data: stats, refetch: refetchStats } = trpc.projects.stats.useQuery();
  const { data: recentProjects, refetch: refetchProjects } = trpc.projects.list.useQuery({ pageSize: 5 });
  const { data: recentReports } = trpc.fieldReports.list.useQuery({ pageSize: 5 });
  const { data: shortages } = trpc.materials.list.useQuery({ shortagesOnly: true, pageSize: 10 });

  // ── Supabase Realtime subscription ─────────────────────────────────────────
  const { isLive } = useRealtimeTable({
    table: "projects",
    onUpdate: () => {
      // Refetch stats and projects list on any change
      refetchStats();
      refetchProjects();
      setRealtimeFlash(true);
      setTimeout(() => setRealtimeFlash(false), 1500);
    },
  });

  const budgetData = [
    { name: "Estimated", value: stats ? Math.round((stats.totalEstimated ?? 0) / 1000) : 0 },
    { name: "Actual",    value: stats ? Math.round((stats.totalActual    ?? 0) / 1000) : 0 },
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
              {/* Realtime indicator */}
              <div className="flex items-center gap-1.5 ml-1">
                <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  realtimeFlash ? "bg-green-300 scale-125" : isLive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"
                }`} />
                <span className="text-[9px] tracking-widest uppercase text-muted-foreground/60"
                      style={{ fontFamily: "var(--font-condensed)" }}>
                  {isLive ? "Live" : "Offline"}
                </span>
              </div>
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

        {/* AI Lead Scoring */}
        <div className="mb-6">
          <LeadScoringPanel />
        </div>

        {/* Recent activity */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
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

        {/* AI Chat */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
               style={{ fontFamily: "var(--font-condensed)" }}>
              Digital Foreman AI
            </p>
          </div>
          <AIChatBox compact />
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
