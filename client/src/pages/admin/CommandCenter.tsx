/**
 * Admin Command Center — main dashboard with KPIs, project status, recent activity,
 * AI lead scoring, Supabase Realtime updates, and Digital Foreman AI chat.
 */
import DashboardLayout from "@/components/DashboardLayout";
import AIChatBox from "@/components/AIChatBox";
import OpsCopilot from "@/components/OpsCopilot";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { LiveBadge } from "@/components/LiveBadge";
import { QueryError } from "@/components/QueryError";
import { SkeletonDashboard } from "@/components/Skeletons";
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
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  fmtDate,
} from "@/lib/formatters";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
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
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  projectStatusSeries,
} from "@/pages/admin/Analytics";
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
      {/* lining-nums: Cormorant's default old-style figures draw "1" like a
          small-cap "I" (a lone project read "I"). */}
      <p
        className="text-3xl font-bold text-foreground mb-1 lining-nums"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground font-light">{sub}</p>}
    </div>
  );
}

// ─── Lead Scoring Panel ────────────────────────────────────────────────────────

const LeadScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  reasoning: z.string(),
  suggestedAction: z.string(),
  estimatedValue: z.number().nonnegative().nullable(),
});
type LeadScore = z.infer<typeof LeadScoreSchema>;

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
  return fmtDate(ts);
}

function LeadScoringPanel({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeadScore | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const scoreRequest = useRef<AbortController | null>(null);
  useEffect(() => () => scoreRequest.current?.abort(), []);
  const [form, setForm] = useState({
    name: "",
    projectType: "",
    budget: "",
    location: "",
    timeline: "",
    message: "",
  });
  const [expandedSavedId, setExpandedSavedId] = useState<number | null>(null);

  // Scoring remains usable when the persisted board is unavailable, but the
  // failure must stay visible so an empty board isn't mistaken for saved data.
  const utils = trpc.useUtils();
  const leadsQuery = trpc.leads.list.useQuery(
    { limit: SAVED_LEADS_MAX },
    { retry: false, enabled }
  );
  const saved: SavedLead[] = (leadsQuery.data ?? []).map(rowToSavedLead);

  // Keep the score visible if persistence fails, and make the unsaved state
  // explicit rather than losing the lead behind a successful scoring result.
  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      setSaveError(false);
      return utils.leads.list.invalidate();
    },
    onError: () => setSaveError(true),
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
    setScoreError(null);
    setSaveError(false);
    const request = new AbortController();
    scoreRequest.current = request;
    try {
      const res = await fetch("/api/lead-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: request.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      // A malformed success response must never render a fabricated score or
      // reach the board (e.g. a missing priority previously crashed rendering).
      const score = LeadScoreSchema.parse(await res.json());
      if (request.signal.aborted) return;
      setResult(score);
      // Persist the scored lead to the shared prioritization board.
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
      if (request.signal.aborted) return;
      setScoreError(
        err instanceof Error && err.message === "HTTP 429"
          ? "Rate limit reached. Please wait before scoring another lead."
          : "AI scoring service is temporarily unavailable. Please try again."
      );
    } finally {
      if (!request.signal.aborted) setLoading(false);
      if (scoreRequest.current === request) scoreRequest.current = null;
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
        aria-expanded={open}
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
              { key: "name", placeholder: "Lead name", maxLength: 200 },
              {
                key: "projectType",
                placeholder: "Project type (remodel, new build…)",
                maxLength: 120,
              },
              {
                key: "budget",
                placeholder: "Budget range ($)",
                maxLength: 100,
              },
              {
                key: "location",
                placeholder: "Location (Eugene, Lane County…)",
                maxLength: 200,
              },
              {
                key: "timeline",
                placeholder: "Timeline (start date or 'ASAP')",
                maxLength: 100,
              },
            ].map(({ key, placeholder, maxLength }) => (
              <input
                key={key}
                value={(form as any)[key]}
                onChange={f(key as keyof typeof form)}
                placeholder={placeholder}
                maxLength={maxLength}
                aria-label={placeholder}
                className="px-3 py-3 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
              />
            ))}
            <textarea
              value={form.message}
              onChange={f("message")}
              placeholder="Lead message or project description…"
              aria-label="Lead message or project description"
              rows={2}
              maxLength={3000}
              className="sm:col-span-2 px-3 py-3 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none transition-colors"
            />
          </div>

          <button
            onClick={scoreALead}
            disabled={
              !enabled || loading || createLead.isPending || !form.name.trim()
            }
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

          {scoreError && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {scoreError}
            </p>
          )}
          {saveError && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              Lead scored, but could not be saved to the board. Keep these
              details and try again.
            </p>
          )}
          {leadsQuery.isError && (
            <div className="mt-4">
              <QueryError
                message="Couldn't load the prioritization board."
                onRetry={() => leadsQuery.refetch()}
              />
            </div>
          )}
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
                        {formatCurrency(result.estimatedValue)}
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
                      disabled={clearLeads.isPending}
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
                        This permanently removes every saved lead from the
                        prioritization board for everyone, including any leads
                        beyond the {SAVED_LEADS_MAX} shown here.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearAllSaved}
                        disabled={clearLeads.isPending}
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
                                  {formatCurrency(lead.estimatedValue)}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </button>
                        <button
                          onClick={() => removeSaved(lead.id)}
                          disabled={deleteLead.isPending}
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
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    },
    []
  );
  const { loading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const authReady = !authLoading && isAuthenticated && isAdmin;

  const utils = trpc.useUtils();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = trpc.projects.stats.useQuery(undefined, { enabled: authReady });
  const {
    data: recentProjects,
    isError: projectsError,
    refetch: refetchProjects,
  } = trpc.projects.list.useQuery({ pageSize: 5 }, { enabled: authReady });
  const {
    data: recentReports,
    isError: reportsError,
    refetch: refetchReports,
  } = trpc.fieldReports.list.useQuery({ pageSize: 5 }, { enabled: authReady });
  const {
    data: shortages,
    isError: shortagesError,
    refetch: refetchShortages,
  } = trpc.materials.list.useQuery(
    { shortagesOnly: true, pageSize: 10 },
    { enabled: authReady }
  );
  const {
    data: weeklyReports,
    isError: weeklyError,
    refetch: refetchWeekly,
  } = trpc.fieldReports.weeklyStats.useQuery(undefined, { enabled: authReady });

  // ── Supabase Realtime subscription ─────────────────────────────────────────
  const { isLive: projectsLive } = useRealtimeTable({
    table: "projects",
    enabled: authReady,
    onUpdate: () => {
      // Refetch every panel derived from project data on any change.
      refetchStats();
      refetchProjects();
      utils.materials.list.invalidate();
      utils.fieldReports.list.invalidate();
      utils.fieldReports.weeklyStats.invalidate();
      setRealtimeFlash(true);
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        setRealtimeFlash(false);
        flashTimer.current = null;
      }, 1500);
    },
  });
  // Actual cost (stats.totalActual) is derived from cost_adjustment ledger
  // entries, not a projects column — a new entry needs its own refetch.
  const { isLive: ledgerLive } = useRealtimeTable({
    table: "ledger_entries",
    enabled: authReady,
    onUpdate: () => refetchStats(),
  });
  // The Shortages tile and the recent/weekly field-report panels read other
  // tables; without these they'd go stale under a "LIVE" badge until reload.
  const { isLive: materialsLive } = useRealtimeTable({
    table: "materials",
    enabled: authReady,
    onUpdate: () => utils.materials.list.invalidate(),
  });
  const { isLive: reportsLive } = useRealtimeTable({
    table: "field_reports",
    enabled: authReady,
    onUpdate: () => {
      utils.fieldReports.list.invalidate();
      utils.fieldReports.weeklyStats.invalidate();
    },
  });
  // "Live" only while every channel feeding the dashboard is subscribed; one
  // dropped channel would otherwise leave a tile stale under a green badge.
  const isLive = projectsLive && ledgerLive && materialsLive && reportsLive;

  const budgetData = [
    {
      name: "Estimated",
      value: stats ? (stats.totalEstimated ?? 0) / 1000 : 0,
    },
    {
      name: "Actual",
      value: stats ? (stats.totalActual ?? 0) / 1000 : 0,
    },
  ];

  const statusData = stats ? projectStatusSeries(stats.byStatus) : [];

  // An all-zero series makes Recharts draw bare axes and tick labels with no
  // bars, which reads as "the chart is broken" rather than "nothing recorded
  // yet". Hold each chart back until it has something to draw.
  const hasStatusData = statusData.some(d => d.value > 0);
  const hasBudgetData =
    (stats?.totalEstimated ?? 0) > 0 || (stats?.totalActual ?? 0) > 0;

  // Compact money: $950 · $248K · $2.4M. The old inline `${n/1000}k` rendered
  // a $2.4M pipeline as "$2400k" and rounded $1,499 down to "$1k".
  const fmt = (n: number) => formatCompactCurrency(n);

  // A brand-new workspace has no measurements at all, so a literal 0 would
  // claim a measured result. `??` alone cannot tell those apart — a resolved
  // query returning 0 is still 0 — so an em dash stands in for "not yet
  // measured" on every KPI tile.
  const kpiCount = (n: number | null | undefined) => (n ? n : "—");
  const kpiMoney = (n: number | null | undefined) => (n ? fmt(n) : "—");

  // Hold the whole dashboard back on the first load: the KPI tiles and both
  // charts are all derived from `stats`.
  const isLoading = authLoading || statsLoading;

  const today = fmtDate(new Date(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // First load: every tile and both charts below read from `stats`, so show
  // one skeleton rather than a grid of em dashes that then jumps to real
  // numbers.
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          <AdminPageHeader title="Command Center" description={today} />
          <SkeletonDashboard />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <AdminPageHeader
          title="Command Center"
          description={today}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <LiveBadge
                isLive={isLive}
                className={`mr-1 transition-shadow ${
                  realtimeFlash ? "ring-1 ring-green-400/60" : ""
                }`}
              />
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
          }
        />

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        {statsError && (
          <div className="mb-6">
            <QueryError
              message="Couldn't load dashboard metrics."
              onRetry={() => refetchStats()}
            />
          </div>
        )}
        {shortagesError && (
          <div className="mb-6">
            <QueryError
              message="Couldn't load material shortages."
              onRetry={() => refetchShortages()}
            />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={ClipboardList}
            label="Total Projects"
            value={kpiCount(stats?.total)}
            sub="Unarchived projects"
          />
          <StatCard
            icon={TrendingUp}
            label="Active"
            value={kpiCount(stats?.byStatus.active)}
            sub="In progress"
          />
          <StatCard
            icon={DollarSign}
            label="Pipeline (Est.)"
            value={kpiMoney(stats?.totalEstimated)}
            sub="Total estimated value"
          />
          <StatCard
            icon={AlertTriangle}
            label="Shortages"
            value={kpiCount(shortages?.total)}
            sub="Material alerts"
          />
        </div>

        {/* Profitability KPIs */}
        {stats && (stats.totalEstimated > 0 || stats.totalActual > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border/60 p-5">
              <p
                className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Revenue Pipeline
              </p>
              <p
                className="text-2xl font-bold text-foreground lining-nums"
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
                className="text-2xl font-bold text-foreground lining-nums"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {fmt(stats.totalActual)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actual costs logged
              </p>
            </div>
            {(() => {
              // Like-for-like: costs logged so far vs the budget of the projects
              // that HAVE logged costs (not every lead and un-started job).
              const basis = stats.costedBasis ?? 0;
              const hasCosts = stats.totalActual > 0 && basis > 0;
              const marginPct = hasCosts
                ? ((basis - stats.totalActual) / basis) * 100
                : null;
              const tone =
                marginPct === null ? "card" : marginPct >= 0 ? "good" : "bad";
              return (
                <div
                  className={`p-5 border ${
                    tone === "good"
                      ? "bg-green-400/5 border-green-400/20"
                      : tone === "bad"
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
                    className={`text-2xl font-bold lining-nums ${
                      tone === "good"
                        ? "text-green-400"
                        : tone === "bad"
                          ? "text-red-400"
                          : "text-foreground"
                    }`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {marginPct === null ? "—" : formatPercent(marginPct, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {marginPct === null
                      ? "Log actual costs"
                      : marginPct >= 0
                        ? "On projects with logged costs"
                        : "Review project costs"}
                  </p>
                </div>
              );
            })()}
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
            {!hasStatusData ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {statsError
                  ? "Project metrics unavailable"
                  : "No project data yet"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statusData} barSize={28}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: CHART_COLORS.neutral }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART_COLORS.neutral }}
                    axisLine={false}
                    tickLine={false}
                    width={20}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border/60 p-5">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Budget Overview ($ thousands)
            </p>
            {!hasBudgetData ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {statsError
                  ? "Budget metrics unavailable"
                  : "No budget data yet"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={budgetData} barSize={48}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: CHART_COLORS.neutral }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART_COLORS.neutral }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number) => [formatCurrency(v * 1000), ""]}
                  />
                  <Bar
                    dataKey="value"
                    fill={CHART_COLORS.primary}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI Lead Scoring */}
        <div className="mb-6">
          <LeadScoringPanel enabled={authReady} />
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
            {projectsError ? (
              <QueryError
                message="Couldn't load recent projects."
                onRetry={() => refetchProjects()}
              />
            ) : recentProjects?.data.length === 0 ? (
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
            {reportsError ? (
              <QueryError
                message="Couldn't load recent field reports."
                onRetry={() => refetchReports()}
              />
            ) : recentReports?.data.length === 0 ? (
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
                        {fmtDate(r.report_date)}
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
        {/* weeklyStats always returns 8 (zero-filled) weeks, so gate on there
            being activity at all rather than on the array length. */}
        {weeklyError && (
          <div className="mb-6">
            <QueryError
              message="Couldn't load field report activity."
              onRetry={() => refetchWeekly()}
            />
          </div>
        )}
        {weeklyReports && weeklyReports.some(w => w.reports > 0) && (
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

        {/* AI Ops Co-pilot — answers over live operational data */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Ops Co-pilot · Live Data
            </p>
          </div>
          <OpsCopilot compact />
        </div>

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
