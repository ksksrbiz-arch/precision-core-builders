/**
 * /dev-login — Developer access portal.
 *
 * Auth strategy (in order):
 *   1. Supabase signInWithPassword (real JWT — works cross-browser/device).
 *   2. localStorage mock session (single-browser fallback when Supabase is
 *      not configured with a dev password).
 *
 * After auth, shows a developer dashboard with:
 *   - Platform feature progress (Phase 1–5 checklist)
 *   - API key health check (live, via /api/platform-health)
 *   - Quick navigation links to admin sections
 *
 * Only accessible when VITE_DEV_MODE=true. Renders an error otherwise.
 */
import { ASSETS } from "@/const";
import { DEV_BYPASS_KEY, DEV_MOCK_USER } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Code2,
  CreditCard,
  Database,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Mic,
  Package,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  Users,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const IS_DEV = import.meta.env.VITE_DEV_MODE === "true";
const DEV_EMAIL = DEV_MOCK_USER.email;
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD as string | undefined;
// Bootstrap token accepted by platform-health for initial/dev setup.
// Can be overridden via VITE_HEALTH_TOKEN env var; falls back to the
// well-known bootstrap value that is already public in platform-health.ts.
const HEALTH_TOKEN =
  (import.meta.env.VITE_HEALTH_TOKEN as string | undefined) ??
  "pcb-bootstrap-2026";

// Partial features count as this fraction toward overall progress.
const PARTIAL_FEATURE_WEIGHT = 0.5;

type AuthState = "loading" | "ready" | "error";
type Tab = "progress" | "apikeys";

// ─── Platform Progress Data ───────────────────────────────────────────────────

type FeatureStatus = "done" | "partial" | "pending";

type Feature = {
  label: string;
  status: FeatureStatus;
  note?: string;
};

type Phase = {
  id: string;
  label: string;
  pct: number;
  features: Feature[];
};

const PHASES: Phase[] = [
  {
    id: "p1",
    label: "Phase 1 — Foundation",
    pct: 95,
    features: [
      { label: "Tailwind CSS 4 design system", status: "done" },
      { label: "36-page router (admin, portal, public)", status: "done" },
      { label: "50+ shadcn/ui components", status: "done" },
      { label: "tRPC 11 end-to-end type safety", status: "done" },
      {
        label: "Supabase auth + role system (admin/user)",
        status: "done",
      },
      { label: "12 Postgres tables via Drizzle ORM", status: "done" },
      { label: "GitHub → Netlify CI/CD pipeline", status: "done" },
      {
        label: "Landing page full Quiet Luxury aesthetic",
        status: "partial",
        note: "Basic Home.tsx exists",
      },
    ],
  },
  {
    id: "p2",
    label: "Phase 2 — Core Operations",
    pct: 40,
    features: [
      {
        label: "Voice-to-report (Whisper → Claude)",
        status: "partial",
        note: "90% — publish logic pending",
      },
      {
        label: "Weather-responsive scheduling",
        status: "partial",
        note: "85% — UI wired, Gantt pending",
      },
      {
        label: "Gantt chart with drag-and-drop",
        status: "pending",
        note: "Critical blocker",
      },
      {
        label: "Field report review & publish workflow",
        status: "partial",
        note: "Form ready, publish logic pending",
      },
      {
        label: "Real-time admin updates (Supabase Realtime)",
        status: "partial",
        note: "Architecture ready, pages pending",
      },
    ],
  },
  {
    id: "p3",
    label: "Phase 3 — Client Experience",
    pct: 35,
    features: [
      {
        label: "Client portal with live project timeline",
        status: "partial",
        note: "Structure ready, real-time data pending",
      },
      {
        label: "AI Project Estimator",
        status: "partial",
        note: "90% — 3-tier pricing working",
      },
      {
        label: "Digital finish selection manager",
        status: "partial",
        note: "Structure ready, product catalog pending",
      },
      {
        label: "Core Values ledger (immutable decisions)",
        status: "partial",
        note: "Table + UI scaffolded",
      },
    ],
  },
  {
    id: "p4",
    label: "Phase 4 — Automation",
    pct: 20,
    features: [
      {
        label: "Material procurement + vendor integration",
        status: "partial",
        note: "Scaffold only",
      },
      {
        label: "n8n workflows for sub-contractor comms",
        status: "partial",
        note: "URLs configured, workflows pending",
      },
      { label: "Milestone-based invoicing (Stripe)", status: "pending" },
      { label: "SMS/Email notification system", status: "pending" },
    ],
  },
  {
    id: "p5",
    label: "Phase 5 — Analytics & Portfolio",
    pct: 15,
    features: [
      {
        label: "Owner Command Center dashboard",
        status: "partial",
        note: "KPIs + AI chat done, lead scoring pending",
      },
      { label: "Profitability tracking (est. vs. actual)", status: "pending" },
      {
        label: "Portfolio showcase with images",
        status: "partial",
        note: "Structure ready, project data pending",
      },
      { label: "LLM-powered operational search", status: "pending" },
    ],
  },
];

// ─── Service Health Types ─────────────────────────────────────────────────────

type ServiceStatus = {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "error" | "not_configured";
  message: string;
  latencyMs?: number;
};

type HealthData = {
  status: string;
  summary: {
    healthy: number;
    degraded: number;
    errors: number;
    notConfigured: number;
    total: number;
  };
  services: ServiceStatus[];
  timestamp: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: FeatureStatus }) {
  if (status === "done")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
  if (status === "partial")
    return <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />;
}

function ServiceBadge({ status }: { status: ServiceStatus["status"] }) {
  const map = {
    healthy: {
      cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
      Icon: CheckCircle2,
      label: "OK",
    },
    degraded: {
      cls: "text-amber-400 bg-amber-400/10 border-amber-400/30",
      Icon: AlertTriangle,
      label: "Degraded",
    },
    error: {
      cls: "text-red-400 bg-red-400/10 border-red-400/30",
      Icon: XCircle,
      label: "Error",
    },
    not_configured: {
      cls: "text-muted-foreground bg-muted/10 border-border/40",
      Icon: Server,
      label: "Not Set",
    },
  };
  const { cls, Icon, label } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-bold tracking-widest uppercase ${cls}`}
      style={{ fontFamily: "var(--font-condensed)" }}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

const SERVICE_ICONS: Record<string, typeof Server> = {
  supabase: Database,
  db_tables: Database,
  cloudflare_ai: Sparkles,
  anthropic_ai: Shield,
  openai: Mic,
  weather: Activity,
  stripe: CreditCard,
  n8n: Webhook,
};

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab() {
  const [open, setOpen] = useState<string | null>("p1");

  const totalFeatures = PHASES.flatMap(p => p.features).length;
  const doneFeatures = PHASES.flatMap(p => p.features).filter(
    f => f.status === "done"
  ).length;
  const partialFeatures = PHASES.flatMap(p => p.features).filter(
    f => f.status === "partial"
  ).length;
  const overallPct = Math.round(
    ((doneFeatures + partialFeatures * PARTIAL_FEATURE_WEIGHT) /
      totalFeatures) *
      100
  );

  return (
    <div className="space-y-3">
      {/* Overall bar */}
      <div className="bg-background/60 border border-border/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Overall Platform Progress
          </span>
          <span className="text-sm font-bold text-amber-400 tabular-nums">
            {overallPct}%
          </span>
        </div>
        <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-2">
          {doneFeatures} done · {partialFeatures} in progress ·{" "}
          {totalFeatures - doneFeatures - partialFeatures} pending
        </p>
      </div>

      {/* Phase accordions */}
      {PHASES.map(phase => (
        <div
          key={phase.id}
          className="bg-background/60 border border-border/40"
        >
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4 hover:bg-accent/10 transition-colors text-left"
            onClick={() =>
              setOpen(prev => (prev === phase.id ? null : phase.id))
            }
          >
            {/* Mini progress ring via border trick */}
            <div className="relative h-8 w-8 shrink-0">
              <svg
                viewBox="0 0 32 32"
                className="absolute inset-0 -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-border/40"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(phase.pct / 100) * 81.7} 81.7`}
                  className="text-amber-400"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-amber-400 tabular-nums">
                {phase.pct}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {phase.label}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {phase.features.filter(f => f.status === "done").length}/
                {phase.features.length} features done
              </p>
            </div>
            {open === phase.id ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
          </button>

          {open === phase.id && (
            <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-2">
              {phase.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    <StatusDot status={f.status} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-foreground leading-snug">
                      {f.label}
                    </p>
                    {f.note && (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {f.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Done
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
          <Clock className="h-3 w-3 text-amber-400" /> In progress
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
          <Circle className="h-3 w-3 text-muted-foreground/30" /> Pending
        </span>
      </div>
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform-health", {
        headers: { Authorization: `Bearer ${HEALTH_TOKEN}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? `Platform health check failed: HTTP ${res.status}`);
      setHealth(data);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const overallColor =
    health?.status === "healthy"
      ? "text-emerald-400"
      : health?.status === "error"
        ? "text-red-400"
        : "text-amber-400";

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-background/60 border border-border/40 px-4 py-3">
        <div>
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Platform Health
          </p>
          {lastChecked && (
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
              Checked {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {health && (
            <span className={`text-xs font-semibold capitalize ${overallColor}`}>
              {health.summary.healthy}/{health.summary.total} healthy
            </span>
          )}
          <button
            type="button"
            onClick={runCheck}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border/60 text-[9px] font-bold tracking-widest uppercase hover:bg-accent/20 disabled:opacity-50 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <RefreshCw
              className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Checking…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-400/5 border border-red-400/20 text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !health && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        </div>
      )}

      {/* Services list */}
      {health && (
        <div className="space-y-1.5">
          {health.services.map(svc => {
            const Icon = SERVICE_ICONS[svc.id] ?? Server;
            return (
              <div
                key={svc.id}
                className="flex items-center gap-3 bg-background/60 border border-border/40 p-3"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground">
                    {svc.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 truncate">
                    {svc.message}
                    {svc.latencyMs !== undefined && (
                      <span className="ml-1.5 tabular-nums">
                        {svc.latencyMs}ms
                      </span>
                    )}
                  </p>
                </div>
                <ServiceBadge status={svc.status} />
              </div>
            );
          })}
        </div>
      )}

      {/* Setup Wizard link */}
      <a
        href="/admin/setup"
        className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11px] font-medium text-amber-300">
            Open Setup Wizard
          </span>
        </div>
        <ExternalLink className="h-3 w-3 text-amber-400/60 group-hover:text-amber-400 transition-colors" />
      </a>
    </div>
  );
}

// ─── Quick Links ──────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: "Command Center", path: "/admin", Icon: LayoutDashboard },
  { label: "Projects", path: "/admin/projects", Icon: BookOpen },
  { label: "Field Reports", path: "/admin/field-reports", Icon: Mic },
  { label: "Schedule", path: "/admin/schedule", Icon: Calendar },
  { label: "Materials", path: "/admin/materials", Icon: Package },
  { label: "Clients", path: "/admin/clients", Icon: Users },
  { label: "Analytics", path: "/admin/analytics", Icon: BarChart3 },
  { label: "Billing", path: "/admin/billing", Icon: CreditCard },
];

function QuickLinks() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {QUICK_LINKS.map(({ label, path, Icon }) => (
        <a
          key={path}
          href={path}
          className="flex flex-col items-center gap-1.5 p-2.5 bg-background/60 border border-border/40 hover:bg-accent/20 hover:border-amber-500/30 transition-colors text-center"
        >
          <Icon className="h-4 w-4 text-muted-foreground/70" />
          <span className="text-[9px] font-medium text-muted-foreground/60 leading-tight">
            {label}
          </span>
        </a>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DevLogin() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [authMethod, setAuthMethod] = useState<"supabase" | "mock" | null>(
    null
  );
  const [tab, setTab] = useState<Tab>("progress");

  useEffect(() => {
    if (!IS_DEV) {
      setAuthState("error");
      setErrorMsg(
        "Developer mode is disabled. Set VITE_DEV_MODE=true to enable."
      );
      return;
    }
    attemptLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attemptLogin() {
    setAuthState("loading");
    setErrorMsg("");

    // ── Strategy 1: Supabase password auth ────────────────────────────────
    if (DEV_PASSWORD) {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      });
      if (!error) {
        setAuthMethod("supabase");
        setAuthState("ready");
        return;
      }
    }

    // ── Strategy 2: localStorage mock session ─────────────────────────────
    localStorage.setItem(DEV_BYPASS_KEY, "true");
    setAuthMethod("mock");
    setAuthState("ready");
  }

  // ── Guard: dev mode disabled ─────────────────────────────────────────────
  if (!IS_DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border border-border/60 p-8 max-w-sm w-full text-center shadow-xl shadow-black/20">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-light">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ── Loading / auth in progress ───────────────────────────────────────────
  if (authState === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div
          className="fixed inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #C8A84B 0, #C8A84B 1px, transparent 0, transparent 50%)",
            backgroundSize: "12px 12px",
          }}
          aria-hidden="true"
        />
        <div className="w-full max-w-[380px]">
          <div className="flex justify-center mb-8">
            <img src={ASSETS.logo} alt="Precision Core Builders" className="h-10 w-auto" />
          </div>
          <div className="bg-card border border-amber-500/30 shadow-xl shadow-black/20 p-8 text-center space-y-5">
            <div className="h-14 w-14 border border-amber-500/40 bg-amber-500/10 flex items-center justify-center mx-auto">
              <Code2 className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <span
                className="block text-[9px] tracking-[0.3em] uppercase text-amber-400/70 font-semibold mb-1"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Developer Access
              </span>
              <h1
                className="text-xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Signing in…
              </h1>
            </div>
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <p className="text-sm text-muted-foreground font-light">
                {DEV_PASSWORD
                  ? "Authenticating with Supabase…"
                  : "Activating local dev session…"}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/40">
              Taking too long?{" "}
              <button
                type="button"
                onClick={attemptLogin}
                className="underline hover:text-amber-400 transition-colors"
              >
                Tap to retry
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (authState === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-[380px] bg-card border border-border/60 p-8 text-center space-y-5 shadow-xl shadow-black/20">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            {errorMsg}
          </p>
          <button
            type="button"
            onClick={attemptLogin}
            className="flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 text-amber-300 px-6 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-amber-500/20 transition-all mx-auto"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Developer Dashboard (authenticated) ──────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #C8A84B 0, #C8A84B 1px, transparent 0, transparent 50%)",
          backgroundSize: "12px 12px",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <img
              src={ASSETS.logo}
              alt="Precision Core Builders"
              className="h-7 w-auto"
            />
            <div>
              <span
                className="block text-[9px] tracking-[0.28em] uppercase text-amber-400/70 font-semibold"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Developer Portal
              </span>
              <p className="text-[10px] text-muted-foreground/50">
                {authMethod === "supabase"
                  ? "Supabase JWT · cross-browser"
                  : authMethod === "mock"
                    ? "Mock session · this browser only"
                    : ""}
              </p>
            </div>
          </div>
          <a
            href="/admin"
            className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 px-4 py-2 text-[10px] font-bold tracking-[0.14em] uppercase hover:bg-amber-500/20 transition-all"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Enter Admin
            <ExternalLink className="h-3 w-3" />
          </a>
        </motion.div>

        {/* Auth success badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex items-center gap-2.5 bg-emerald-400/5 border border-emerald-400/20 px-4 py-2.5 mb-5"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-[11px] text-emerald-300/80">
            Signed in as{" "}
            <span className="font-mono font-semibold">{DEV_EMAIL}</span>
            {" · "}role: <span className="font-semibold">admin</span>
          </p>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-5"
        >
          <p
            className="text-[9px] font-bold tracking-[0.22em] uppercase text-muted-foreground/50 mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Quick Navigation
          </p>
          <QuickLinks />
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="flex border-b border-border/40 mb-4">
            {(
              [
                { id: "progress", label: "Platform Progress", Icon: Zap },
                { id: "apikeys", label: "API Keys", Icon: Server },
              ] as { id: Tab; label: string; Icon: typeof Zap }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase border-b-2 transition-colors ${
                  tab === id
                    ? "border-amber-400 text-amber-400"
                    : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                }`}
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {tab === "progress" && <ProgressTab />}
          {tab === "apikeys" && <ApiKeysTab />}
        </motion.div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/25 mt-8 tracking-wider">
          Precision Core Builders · CCB #246527 · Eugene, OR
        </p>
      </div>
    </div>
  );
}
