/**
 * Admin Command Center — main dashboard with KPIs, project status, recent activity,
 * AI lead scoring, Supabase Realtime updates, and Digital Foreman AI chat.
 */
import DashboardLayout from "@/components/DashboardLayout";
import AIChatBox from "@/components/AIChatBox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  DollarSign,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "primary",
}: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border/60 p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <p
          className="text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          {label}
        </p>
        <div className="h-8 w-8 md:h-10 md:w-10 border border-primary/30 flex items-center justify-center">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        </div>
      </div>
      <p
        className="text-3xl font-bold text-foreground mb-1"
        style={{ fontFamily: "var(--font-heading)" }}
      >
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
  low: "text-muted-foreground border-border/60",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  high: "text-primary border-primary/30 bg-primary/10",
  urgent: "text-red-400 border-red-400/30 bg-red-400/10",
};

const PRIORITY_WEIGHT: Record<LeadScore["priority"], number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

type SavedLead = LeadScore & {
  id: number;
  scoredAt: number;
  name: string;
  projectType: string;
  budget: string;
  location: string;
  timeline: string;
};

const SAVED_LEADS_MAX = 50;

/** Map a persisted leads-table row into the board's SavedLead shape. */
function rowToSavedLead(r: {
  id: number;
  name: string;
  project_type: string | null;
  budget: string | null;
  location: string | null;
  timeline: string | null;
  score: number;
  priority: LeadScore["priority"];
  reasoning: string | null;
  suggested_action: string | null;
  estimated_value: string | number | null;
  created_at: string;
}): SavedLead {
  return {
    id: r.id,
    score: r.score,
    priority: r.priority,
    reasoning: r.reasoning ?? "",
    suggestedAction: r.suggested_action ?? "",
    estimatedValue:
      r.estimated_value != null ? Number(r.estimated_value) : null,
    scoredAt: new Date(r.created_at).getTime(),
    name: r.name,
    projectType: r.project_type ?? "",
    budget: r.budget ?? "",
    location: r.location ?? "",
    timeline: r.timeline ?? "",
  };
}

function sortLeadsByPriority(leads: SavedLead[]): SavedLead[] {
  return [...leads].sort((a, b) => {
    const w = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (w !== 0) return w;
    if (b.score !== a.score) return b.score - a.score;
    return b.scoredAt - a.scoredAt;
  });
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function LeadScoringPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeadScore | null>(null);
  const [form, setForm] = useState({
    name: "",
    projectType: "",
    budget: "",
    location: "",
    timeline: "",
    message: "",
  });
  const [expandedSavedId, setExpandedSavedId] = useState<number | null>(null);

  // Persisted lead board (admin-only). Degrades gracefully: if the query fails
  // (e.g. the leads table hasn't been migrated yet) the board just shows empty
  // and lead scoring still works.
  const utils = trpc.useUtils();
  const leadsQuery = trpc.leads.list.useQuery(
    { limit: SAVED_LEADS_MAX },
    { retry: false }
  );
  const saved: SavedLead[] = (leadsQuery.data ?? []).map(rowToSavedLead);

  const createLead = useMutationWithToast(trpc.leads.create.useMutation(), {
    success: "Lead saved",
    successMessage: "Added to the prioritization board.",
    error: "Could not save lead",
    invalidate: () => utils.leads.list.invalidate(),
  });
  const deleteLead = useMutationWithToast(trpc.leads.delete.useMutation(), {
    success: "Lead removed",
    error: "Could not remove lead",
    invalidate: () => utils.leads.list.invalidate(),
  });
  const clearLeads = useMutationWithToast(trpc.leads.clear.useMutation(), {
    success: "Board cleared",
    error: "Could not clear board",
    invalidate: () => utils.leads.list.invalidate(),
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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          res.status === 429 ? "HTTP 429" : (data.error ?? `HTTP ${res.status}`)
        );
      }
      setResult(data);
      // Persist the scored lead to the shared prioritization board.
      const score = data as LeadScore;
      createLead.mutate({
        name: form.name || "Unnamed lead",
        projectType: form.projectType || undefined,
        budget: form.budget || undefined,
        location: form.location || undefined,
        timeline: form.timeline || undefined,
        message: form.message || undefined,
        score: score.score,
        priority: score.priority,
        reasoning: score.reasoning || undefined,
        suggestedAction: score.suggestedAction || undefined,
        estimatedValue: score.estimatedValue,
      });
    } catch (err) {
      setResult({
        score: 0,
        priority: "low",
        reasoning:
          err instanceof Error && err.message.startsWith("HTTP 429")
            ? "Rate limit reached. Please wait before scoring another lead."
            : "AI scoring service is temporarily unavailable. Please try again.",
        suggestedAction:
          "Retry in a moment or score manually based on project details.",
        estimatedValue: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const removeSaved = (id: number) => deleteLead.mutate({ id });

  const clearAllSaved = () => {
    clearLeads.mutate(undefined);
    setExpandedSavedId(null);
  };

  const sortedSaved = sortLeadsByPriority(saved);

  const f =
    (key: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="bg-card border border-border/60">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 md:p-6 min-h-14"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            AI Lead Intelligence
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border/40">
          <p className="text-xs text-muted-foreground font-light mt-4 mb-4">
            Score an incoming lead to prioritize your response. AI analyzes
            project fit, budget, location, and timeline.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            {[
              { key: "name", placeholder: "Lead name" },
              {
                key: "projectType",
                placeholder: "Project type (remodel, new build…)",
              },
              { key: "budget", placeholder: "Budget range ($)" },
              {
                key: "location",
                placeholder: "Location (Eugene, Lane County…)",
              },
              {
                key: "timeline",
                placeholder: "Timeline (start date or 'ASAP')",
              },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                value={(form as any)[key]}
                onChange={f(key as keyof typeof form)}
                placeholder={placeholder}
                className="px-3 py-3 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
              />
            ))}
            <textarea
              value={form.message}
              onChange={f("message")}
              placeholder="Lead message or project description…"
              rows={2}
              className="sm:col-span-2 px-3 py-3 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none transition-colors"
            />
          </div>

          <button
            onClick={scoreALead}
            disabled={loading || !form.name}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 min-h-11 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {loading ? "Scoring…" : "Score This Lead"}
          </button>

          {result && (
            <div className="mt-4 border border-border/60 p-4 bg-background/40">
              {/* Score gauge */}
              <div className="flex items-center gap-4 mb-3">
                <div className="relative h-14 w-14 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-border/40"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeDasharray={`${result.score} ${100 - result.score}`}
                      className={
                        result.score >= 75
                          ? "text-green-400"
                          : result.score >= 50
                            ? "text-primary"
                            : result.score >= 25
                              ? "text-amber-400"
                              : "text-red-400"
                      }
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {result.score}
                  </span>
                </div>
                <div>
                  <span
                    className={`text-[10px] px-2 py-1 border font-bold tracking-widest uppercase ${PRIORITY_COLORS[result.priority]}`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {result.priority.toUpperCase()}
                  </span>
                  {result.estimatedValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Est. value:{" "}
                      <span className="text-primary font-semibold">
                        ${result.estimatedValue.toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground mb-2">{result.reasoning}</p>
              <div className="border-l-2 border-primary pl-3">
                <p
                  className="text-[10px] font-bold tracking-widest uppercase text-primary mb-0.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Next Action
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.suggestedAction}
                </p>
              </div>
            </div>
          )}

          {/* Prioritization board — persisted scored leads */}
          {sortedSaved.length > 0 && (
            <div className="mt-6 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Prioritization Board · {sortedSaved.length}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear all
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear prioritization board?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes all {sortedSaved.length} saved
                        lead{sortedSaved.length === 1 ? "" : "s"} from the
                        prioritization board for everyone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearAllSaved}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <ul className="space-y-2">
                {sortedSaved.map(lead => {
                  const isExpanded = expandedSavedId === lead.id;
                  return (
                    <li
                      key={lead.id}
                      className="border border-border/60 bg-background/40"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div
                          className={`h-8 w-8 shrink-0 flex items-center justify-center text-xs font-bold border ${
                            lead.score >= 75
                              ? "text-green-400 border-green-400/40"
                              : lead.score >= 50
                                ? "text-primary border-primary/40"
                                : lead.score >= 25
                                  ? "text-amber-400 border-amber-400/40"
                                  : "text-red-400 border-red-400/40"
                          }`}
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {lead.score}
                        </div>
                        <button
                          onClick={() =>
                            setExpandedSavedId(isExpanded ? null : lead.id)
                          }
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate">
                              {lead.name}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 border font-bold tracking-widest uppercase ${PRIORITY_COLORS[lead.priority]}`}
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              {lead.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {[lead.projectType, lead.budget, lead.location]
                              .filter(Boolean)
                              .join(" · ") || "No details captured"}
                            {" · "}
                            <span>{formatRelativeTime(lead.scoredAt)}</span>
                            {lead.estimatedValue ? (
                              <>
                                {" · "}
                                <span className="text-primary">
                                  ${lead.estimatedValue.toLocaleString()}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </button>
                        <button
                          onClick={() => removeSaved(lead.id)}
                          aria-label={`Remove ${lead.name} from prioritization board`}
                          className="shrink-0 p-1 text-muted-foreground/60 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 -mt-1 space-y-2">
                          <p className="text-xs text-foreground">
                            {lead.reasoning}
                          </p>
                          <div className="border-l-2 border-primary pl-3">
                            <p
                              className="text-[10px] font-bold tracking-widest uppercase text-primary mb-0.5"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              Next Action
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lead.suggestedAction}
                            </p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10px] text-muted-foreground/60 mt-3">
                Saved to your workspace — available on every device.
              </p>
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
  const { data: recentProjects, refetch: refetchProjects } =
    trpc.projects.list.useQuery({ pageSize: 5 });
  const { data: recentReports } = trpc.fieldReports.list.useQuery({
    pageSize: 5,
  });
  const { data: shortages } = trpc.materials.list.useQuery({
    shortagesOnly: true,
    pageSize: 10,
  });
  const { data: weeklyReports } = trpc.fieldReports.weeklyStats.useQuery();

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
    {
      name: "Estimated",
      value: stats ? Math.round((stats.totalEstimated ?? 0) / 1000) : 0,
    },
    {
      name: "Actual",
      value: stats ? Math.round((stats.totalActual ?? 0) / 1000) : 0,
    },
  ];

  const statusData = stats
    ? [
        { name: "Leads", value: stats.byStatus.lead, fill: "#7A7060" },
        {
          name: "Contracted",
          value: stats.byStatus.contracted,
          fill: "#C8A84B",
        },
        { name: "Active", value: stats.byStatus.active, fill: "#6B9E3F" },
        { name: "Complete", value: stats.byStatus.complete, fill: "#5B7FA6" },
      ]
    : [];

  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-y-3 mb-7">
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Command Center
              </h1>
              <GuideHelpButton guideId="command-center" />
              {/* Realtime indicator */}
              <div className="flex items-center gap-1.5 ml-1">
                <div
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    realtimeFlash
                      ? "bg-green-300 scale-125"
                      : isLive
                        ? "bg-green-500 animate-pulse"
                        : "bg-muted-foreground/40"
                  }`}
                />
                <span
                  className="text-[9px] tracking-widest uppercase text-muted-foreground/60"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {isLive ? "Live" : "Offline"}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-light mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLocation("/admin/field-reports/new")}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 min-h-11 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Field Report
            </button>
            <button
              onClick={() => setLocation("/admin/projects/new")}
              className="flex items-center gap-2 border border-border/60 text-muted-foreground px-4 py-3 min-h-11 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <ClipboardList className="h-3.5 w-3.5" /> New Project
            </button>
          </div>
        </div>

        {/* Getting Started — shown only when platform has no projects yet */}
        {stats?.total === 0 && (
          <div className="border border-primary/30 bg-primary/5 p-5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2
                  className="text-sm font-semibold text-foreground mb-1"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Welcome to Precision Core Builders
                </h2>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  Your platform is live. Complete these steps to go fully
                  operational.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <button
                onClick={() => setLocation("/onboarding")}
                className="flex items-start gap-3 p-3 border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-left"
              >
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p
                    className="text-[11px] font-bold tracking-wider uppercase text-primary"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Run Setup Wizard
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    Connect Supabase, AI, weather &amp; payments step-by-step
                  </p>
                </div>
              </button>
              <button
                onClick={() => setLocation("/admin/setup")}
                className="flex items-start gap-3 p-3 border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
              >
                <Settings className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p
                    className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Platform Health
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    View &amp; test all service integrations
                  </p>
                </div>
              </button>
              <button
                onClick={() => setLocation("/admin/projects/new")}
                className="flex items-start gap-3 p-3 border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
              >
                <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p
                    className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Add First Project
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    Create a project to start tracking work
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={ClipboardList}
            label="Total Projects"
            value={stats?.total ?? "—"}
            sub="All time"
          />
          <StatCard
            icon={TrendingUp}
            label="Active"
            value={stats?.byStatus.active ?? "—"}
            sub="In progress"
          />
          <StatCard
            icon={DollarSign}
            label="Contracted"
            value={stats ? fmt(stats.totalEstimated) : "—"}
            sub="Total pipeline"
          />
          <StatCard
            icon={AlertTriangle}
            label="Shortages"
            value={shortages?.total ?? 0}
            sub="Material alerts"
          />
        </div>

        {/* Profitability KPIs */}
        {stats && (stats.totalEstimated > 0 || stats.totalActual > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border/60 p-5">
              <p
                className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Revenue Pipeline
              </p>
              <p
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {fmt(stats.totalEstimated)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Across all projects
              </p>
            </div>
            <div className="bg-card border border-border/60 p-5">
              <p
                className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Reported Costs
              </p>
              <p
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {fmt(stats.totalActual)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actual costs logged
              </p>
            </div>
            <div
              className={`p-5 border ${
                stats.totalEstimated > stats.totalActual
                  ? "bg-green-400/5 border-green-400/20"
                  : stats.totalActual > 0
                    ? "bg-red-400/5 border-red-400/20"
                    : "bg-card border-border/60"
              }`}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Gross Margin
              </p>
              <p
                className={`text-2xl font-bold ${
                  stats.totalEstimated > stats.totalActual
                    ? "text-green-400"
                    : stats.totalActual > 0
                      ? "text-red-400"
                      : "text-foreground"
                }`}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {stats.totalEstimated > 0 && stats.totalActual > 0
                  ? `${(((stats.totalEstimated - stats.totalActual) / stats.totalEstimated) * 100).toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.totalEstimated > stats.totalActual
                  ? "Portfolio on track"
                  : stats.totalActual > 0
                    ? "Review project costs"
                    : "Log actual costs"}
              </p>
            </div>
          </div>
        )}

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border/60 p-5">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Project Status
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={statusData} barSize={28}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                />
                <Tooltip
                  contentStyle={{
                    background: "#141210",
                    border: "1px solid rgba(200,168,75,0.2)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#EDE6D9" }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border/60 p-5">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Budget Overview ($ thousands)
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={budgetData} barSize={48}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#7A7060" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "#141210",
                    border: "1px solid rgba(200,168,75,0.2)",
                    fontSize: 12,
                  }}
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
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Recent Projects
              </p>
              <button
                onClick={() => setLocation("/admin/projects")}
                className="text-[10px] text-primary hover:underline tracking-wider uppercase"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                View all →
              </button>
            </div>
            {recentProjects?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground font-light py-4 text-center">
                No projects yet
              </p>
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
                      <p className="text-xs text-muted-foreground font-light">
                        {(p as any).clients?.name ?? "—"}
                      </p>
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
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Recent Field Reports
              </p>
              <button
                onClick={() => setLocation("/admin/field-reports")}
                className="text-[10px] text-primary hover:underline tracking-wider uppercase"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                View all →
              </button>
            </div>
            {recentReports?.data.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground font-light mb-3">
                  No field reports yet
                </p>
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
                      <p className="text-sm font-medium truncate">
                        {(r as any).projects?.name ?? "Unknown Project"}
                      </p>
                      <p className="text-xs text-muted-foreground font-light">
                        {new Date(r.report_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-1 font-semibold tracking-widest uppercase ${
                        r.published_to_client
                          ? "text-green-400 border border-green-400/30 bg-green-400/10"
                          : "text-muted-foreground border border-border/60"
                      }`}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {r.published_to_client ? "Published" : "Draft"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Field Report Activity Chart */}
        {weeklyReports && weeklyReports.length > 0 && (
          <div className="bg-card border border-border/60 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Field Report Activity — Last 8 Weeks
              </p>
              <button
                onClick={() => setLocation("/admin/field-reports")}
                className="text-[10px] text-primary hover:underline tracking-wider uppercase"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                View all →
              </button>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weeklyReports} barSize={16}>
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
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 bg-primary inline-block" /> Reports
                filed
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 bg-red-500 inline-block opacity-70" />{" "}
                Reports with issues
              </span>
            </div>
          </div>
        )}

        {/* AI Chat */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-primary" />
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
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
    lead: { label: "Lead", cls: "text-muted-foreground border-border/60" },
    estimate_sent: {
      label: "Estimated",
      cls: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    },
    contracted: {
      label: "Contracted",
      cls: "text-primary border-primary/30 bg-primary/10",
    },
    in_progress: {
      label: "Active",
      cls: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    },
    punch_list: {
      label: "Punch List",
      cls: "text-orange-400 border-orange-400/30 bg-orange-400/10",
    },
    complete: {
      label: "Complete",
      cls: "text-green-400 border-green-400/30 bg-green-400/10",
    },
    on_hold: {
      label: "On Hold",
      cls: "text-red-400 border-red-400/30 bg-red-400/10",
    },
  };
  const s = map[status] ?? {
    label: status,
    cls: "text-muted-foreground border-border/60",
  };
  return (
    <span
      className={`text-[9px] px-2 py-1 font-semibold tracking-widest uppercase border flex-shrink-0 ${s.cls}`}
      style={{ fontFamily: "var(--font-condensed)" }}
    >
      {s.label}
    </span>
  );
}
