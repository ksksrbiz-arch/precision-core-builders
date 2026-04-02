/**
 * Dev Dash — Developer monitoring dashboard for tracking Eric's platform
 * progress, feature completion, system health, and areas to improve.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  Database,
  ExternalLink,
  FileCode,
  Gauge,
  GitBranch,
  Layers,
  Loader2,
  Package,
  Palette,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

/* ═══════════════════════════════════════════════════════════════════════
   FEATURE REGISTRY — source of truth for what's built vs planned
   ═══════════════════════════════════════════════════════════════════════ */

type FeatureStatus = "done" | "partial" | "stubbed" | "planned";

type Feature = {
  name: string;
  status: FeatureStatus;
  path?: string;
  notes?: string;
};

type FeatureGroup = {
  phase: string;
  label: string;
  icon: typeof Code2;
  features: Feature[];
};

const FEATURE_REGISTRY: FeatureGroup[] = [
  {
    phase: "1",
    label: "Foundation & Design",
    icon: Palette,
    features: [
      {
        name: "Tailwind CSS 4 theme",
        status: "done",
        path: "/client/src/index.css",
      },
      { name: "Typography (Cormorant + Barlow)", status: "done" },
      { name: "Framer Motion animations", status: "done" },
      { name: "shadcn/ui component library (50+)", status: "done" },
      {
        name: "Supabase Auth integration",
        status: "done",
        path: "/auth/login",
      },
      { name: "Role-based access (admin/user)", status: "done" },
      { name: "DashboardLayout + sidebar nav", status: "done" },
      { name: "Landing page (cinematic hero)", status: "done", path: "/" },
      { name: "PWA support + service worker", status: "done" },
      { name: "Error boundaries", status: "done" },
      {
        name: "Login: password + magic link + Google",
        status: "done",
        path: "/auth/login",
      },
    ],
  },
  {
    phase: "2",
    label: "Core Operations",
    icon: Wrench,
    features: [
      { name: "Command Center dashboard", status: "done", path: "/admin" },
      {
        name: "Projects CRUD + list/detail",
        status: "done",
        path: "/admin/projects",
      },
      {
        name: "Clients CRUD + list/detail",
        status: "done",
        path: "/admin/clients",
      },
      {
        name: "Field Reports list + new",
        status: "done",
        path: "/admin/field-reports",
      },
      {
        name: "Voice-to-report (Whisper)",
        status: "partial",
        path: "/admin/field-reports/new",
        notes: "UI done, needs Whisper API key",
      },
      {
        name: "Gemini report generation",
        status: "partial",
        notes: "Stubbed in field report flow",
      },
      {
        name: "Schedule view + weather overlay",
        status: "done",
        path: "/admin/schedule",
      },
      {
        name: "Weather API integration (Eugene, OR)",
        status: "partial",
        notes: "Netlify function stubbed",
      },
      {
        name: "Supabase Realtime subscriptions",
        status: "done",
        notes: "Live on Command Center",
      },
      { name: "Site plan builder", status: "done", path: "/admin/site-plans" },
    ],
  },
  {
    phase: "3",
    label: "Client Experience",
    icon: Users,
    features: [
      { name: "Client portal dashboard", status: "partial", path: "/portal" },
      {
        name: "Portal: field reports view",
        status: "partial",
        path: "/portal/reports",
      },
      {
        name: "Portal: finish selections",
        status: "partial",
        path: "/portal/finishes",
      },
      {
        name: "Portal: Core Values ledger",
        status: "partial",
        path: "/portal/ledger",
      },
      {
        name: "AI Project Estimator",
        status: "partial",
        path: "/estimator",
        notes: "Public page exists, needs Netlify function",
      },
      { name: "Vision Studio", status: "done", path: "/vision-studio" },
      { name: "Portfolio showcase", status: "done", path: "/portfolio" },
    ],
  },
  {
    phase: "4",
    label: "Automation & Procurement",
    icon: Zap,
    features: [
      {
        name: "Materials inventory + shortage alerts",
        status: "done",
        path: "/admin/materials",
      },
      {
        name: "AI PO generation",
        status: "partial",
        notes: "UI calls /api/material-procurement",
      },
      {
        name: "Sub-contractor management",
        status: "done",
        path: "/admin/sub-contractors",
      },
      {
        name: "Billing / milestone invoicing",
        status: "partial",
        path: "/admin/billing",
        notes: "Stripe integration stubbed",
      },
      {
        name: "Estimates list + workflow",
        status: "done",
        path: "/admin/estimates",
      },
      { name: "Core Values Ledger", status: "done", path: "/admin/ledger" },
      {
        name: "n8n automation workflows",
        status: "planned",
        notes: "Not started",
      },
      {
        name: "SMS/Email notifications",
        status: "planned",
        notes: "Not started",
      },
    ],
  },
  {
    phase: "5",
    label: "Analytics & AI",
    icon: Sparkles,
    features: [
      {
        name: "AI Lead Scoring panel",
        status: "partial",
        notes: "UI done in Command Center, needs API key",
      },
      {
        name: "Digital Foreman AI chat",
        status: "partial",
        notes: "UI exists, needs ANTHROPIC_API_KEY",
      },
      { name: "Profitability tracking", status: "planned" },
      { name: "LLM-powered search", status: "planned" },
      { name: "360 project walkthroughs", status: "planned" },
    ],
  },
  {
    phase: "6",
    label: "Platform & Infra",
    icon: Server,
    features: [
      { name: "Netlify deployment config", status: "done" },
      { name: "Security headers (CSP, X-Frame)", status: "done" },
      { name: "tRPC router scaffolding", status: "done" },
      { name: "Drizzle ORM + migrations", status: "done" },
      {
        name: "Setup Wizard (self-service config)",
        status: "done",
        path: "/admin/setup",
      },
      {
        name: "System Guide (help docs)",
        status: "done",
        path: "/admin/guides",
      },
      {
        name: "Portfolio CMS admin",
        status: "done",
        path: "/admin/portfolio-cms",
      },
      {
        name: "Row-Level Security (RLS)",
        status: "planned",
        notes: "Critical for multi-client isolation",
      },
      {
        name: "Netlify Functions migration",
        status: "planned",
        notes: "Still using Express scaffolding",
      },
      { name: "Rate limiting", status: "planned" },
      { name: "Audit logging", status: "planned" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const STATUS_META: Record<
  FeatureStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  done: {
    label: "Done",
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/30",
    icon: CheckCircle2,
  },
  partial: {
    label: "Partial",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/30",
    icon: Clock,
  },
  stubbed: {
    label: "Stubbed",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
    icon: Code2,
  },
  planned: {
    label: "Planned",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border/40",
    icon: Circle,
  },
};

function countByStatus(features: Feature[]) {
  const counts = { done: 0, partial: 0, stubbed: 0, planned: 0 };
  features.forEach(f => counts[f.status]++);
  return counts;
}

function completionPct(features: Feature[]) {
  if (features.length === 0) return 0;
  const score = features.reduce((acc, f) => {
    if (f.status === "done") return acc + 1;
    if (f.status === "partial") return acc + 0.5;
    if (f.status === "stubbed") return acc + 0.25;
    return acc;
  }, 0);
  return Math.round((score / features.length) * 100);
}

const allFeatures = FEATURE_REGISTRY.flatMap(g => g.features);
const overallPct = completionPct(allFeatures);
const overallCounts = countByStatus(allFeatures);

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function ProgressRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-border/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={
            pct >= 75
              ? "text-green-400"
              : pct >= 50
                ? "text-primary"
                : pct >= 25
                  ? "text-amber-400"
                  : "text-red-400"
          }
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-lg font-bold"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {pct}%
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: FeatureStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 font-semibold tracking-widest uppercase border ${meta.bg} ${meta.color}`}
      style={{ fontFamily: "var(--font-condensed)" }}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

function FeatureGroupCard({ group }: { group: FeatureGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [, setLocation] = useLocation();
  const pct = completionPct(group.features);
  const counts = countByStatus(group.features);
  const Icon = group.icon;

  return (
    <div className="bg-card border border-border/60">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-accent/20 transition-colors"
      >
        <div className="h-10 w-10 border border-primary/30 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] tracking-[0.2em] uppercase text-primary font-bold"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Phase {group.phase}
            </span>
            <span className="text-sm font-semibold text-foreground truncate">
              {group.label}
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 75
                    ? "bg-green-400"
                    : pct >= 50
                      ? "bg-primary"
                      : pct >= 25
                        ? "bg-amber-400"
                        : "bg-red-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono w-8 text-right">
              {pct}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span className="text-green-400 font-mono">{counts.done}</span>
          <span>/</span>
          <span className="font-mono">{group.features.length}</span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 ml-1" />
          ) : (
            <ChevronRight className="h-4 w-4 ml-1" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/40">
          {group.features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-2.5 text-sm border-b border-border/20 last:border-b-0 hover:bg-accent/10 transition-colors"
            >
              <StatusBadge status={f.status} />
              <span
                className={`flex-1 truncate ${
                  f.status === "planned"
                    ? "text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {f.name}
              </span>
              {f.notes && (
                <span className="text-[10px] text-muted-foreground/60 truncate max-w-[200px] hidden sm:block">
                  {f.notes}
                </span>
              )}
              {f.path && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setLocation(f.path!);
                  }}
                  className="text-primary/60 hover:text-primary transition-colors shrink-0"
                  title={`Go to ${f.path}`}
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthProbe({
  label,
  check,
  icon: Icon,
}: {
  label: string;
  check: () => boolean;
  icon: typeof Database;
}) {
  const ok = check();
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className={`h-4 w-4 ${ok ? "text-green-400" : "text-red-400"}`} />
      <span className="text-sm flex-1">{label}</span>
      <span
        className={`text-[9px] px-2 py-0.5 font-bold tracking-widest uppercase border ${
          ok
            ? "text-green-400 border-green-400/30 bg-green-400/10"
            : "text-red-400 border-red-400/30 bg-red-400/10"
        }`}
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {ok ? "OK" : "Missing"}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PRIORITY ACTIONS — what needs attention next
   ═══════════════════════════════════════════════════════════════════════ */

type PriorityAction = {
  title: string;
  reason: string;
  severity: "high" | "medium" | "low";
  category: string;
};

const PRIORITY_ACTIONS: PriorityAction[] = [
  {
    title: "Configure Supabase environment variables",
    reason: "Auth, DB, and Realtime depend on VITE_SUPABASE_URL and keys",
    severity: "high",
    category: "Infra",
  },
  {
    title: "Set ANTHROPIC_API_KEY for AI features",
    reason: "Lead scoring, Digital Foreman chat, and report generation need it",
    severity: "high",
    category: "AI",
  },
  {
    title: "Add Row-Level Security (RLS) policies",
    reason: "Client data isolation is critical before multi-tenant use",
    severity: "high",
    category: "Security",
  },
  {
    title: "Migrate Express server to Netlify Functions",
    reason: "Legacy Express scaffolding still in server/_core/index.ts",
    severity: "medium",
    category: "Infra",
  },
  {
    title: "Wire up Whisper API for voice-to-report",
    reason: "Field report voice recording UI is ready, needs API key",
    severity: "medium",
    category: "Feature",
  },
  {
    title: "Connect Stripe for billing milestones",
    reason: "Billing page UI exists but Stripe integration is stubbed",
    severity: "medium",
    category: "Feature",
  },
  {
    title: "Build n8n automation workflows",
    reason: "Sub-contractor scheduling and notification delivery not started",
    severity: "low",
    category: "Automation",
  },
  {
    title: "Performance audit (Lighthouse > 90)",
    reason: "Home page has heavy animations that may hurt mobile scores",
    severity: "low",
    category: "Polish",
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-400 border-red-400/30 bg-red-400/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  low: "text-muted-foreground border-border/60",
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function DevDash() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  // Try to fetch system health from tRPC
  const healthQuery = trpc.system.health.useQuery(
    { timestamp: Date.now() },
    { retry: false, refetchOnWindowFocus: false }
  );

  const refresh = () => setLastRefresh(new Date());

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Dev Dash
              </h1>
              <span
                className="text-[9px] px-2 py-0.5 border border-primary/40 bg-primary/10 text-primary font-bold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Internal
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-light mt-0.5">
              Platform progress tracker &mdash; last refreshed{" "}
              {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 border border-border/60 text-muted-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* ── Overall Progress ──────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border/60 p-5 sm:col-span-2 lg:col-span-1 flex items-center gap-5">
            <ProgressRing pct={overallPct} />
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-1"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Overall Build
              </p>
              <p className="text-xs text-muted-foreground">
                {allFeatures.length} features tracked
              </p>
            </div>
          </div>

          <div className="bg-card border border-border/60 p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Complete
              </p>
            </div>
            <p
              className="text-3xl font-bold text-green-400"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {overallCounts.done}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              features fully built
            </p>
          </div>

          <div className="bg-card border border-border/60 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                In Progress
              </p>
            </div>
            <p
              className="text-3xl font-bold text-amber-400"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {overallCounts.partial + overallCounts.stubbed}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              partial or stubbed
            </p>
          </div>

          <div className="bg-card border border-border/60 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Circle className="h-4 w-4 text-muted-foreground" />
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Planned
              </p>
            </div>
            <p
              className="text-3xl font-bold text-muted-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {overallCounts.planned}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              not yet started
            </p>
          </div>
        </div>

        {/* ── Priority Actions ──────────────────────────────────── */}
        <div className="bg-card border border-border/60 mb-6">
          <div className="p-5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Priority Actions
              </p>
            </div>
            <p className="text-xs text-muted-foreground font-light mt-1">
              What needs attention to unblock Eric's workflow
            </p>
          </div>
          <div>
            {PRIORITY_ACTIONS.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-5 py-3 border-b border-border/20 last:border-b-0"
              >
                <span
                  className={`text-[9px] px-2 py-0.5 font-bold tracking-widest uppercase border shrink-0 mt-0.5 ${SEVERITY_COLORS[action.severity]}`}
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {action.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground font-light mt-0.5">
                    {action.reason}
                  </p>
                </div>
                <span
                  className="text-[9px] px-2 py-0.5 border border-border/40 text-muted-foreground/60 font-semibold tracking-widest uppercase shrink-0"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {action.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── System Health ─────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" />
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                System Health
              </p>
            </div>
            <div className="space-y-1 divide-y divide-border/20">
              <HealthProbe
                label="Supabase URL configured"
                check={() => !!import.meta.env.VITE_SUPABASE_URL}
                icon={Database}
              />
              <HealthProbe
                label="Supabase key present"
                check={() =>
                  !!(
                    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
                    import.meta.env.VITE_SUPABASE_ANON_KEY
                  )
                }
                icon={Shield}
              />
              <HealthProbe
                label="tRPC health endpoint"
                check={() => healthQuery.isSuccess}
                icon={Server}
              />
              <HealthProbe
                label="Authenticated session"
                check={() => !!user}
                icon={Users}
              />
            </div>
          </div>

          {/* ── Tech Stack ───────────────────────────────────────── */}
          <div className="bg-card border border-border/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-primary" />
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Tech Stack
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "React", version: "19.2" },
                { label: "Vite", version: "8.0" },
                { label: "Tailwind CSS", version: "4.1" },
                { label: "tRPC", version: "11.16" },
                { label: "React Query", version: "5.90" },
                { label: "Wouter", version: "3.3" },
                { label: "Framer Motion", version: "12.23" },
                { label: "Drizzle ORM", version: "0.44" },
                { label: "Supabase JS", version: "2.49" },
                { label: "TypeScript", version: "5.9" },
                { label: "Recharts", version: "2.15" },
                { label: "Zod", version: "4.1" },
              ].map(dep => (
                <div
                  key={dep.label}
                  className="flex items-center justify-between py-1.5 px-2 border border-border/20"
                >
                  <span className="text-muted-foreground">{dep.label}</span>
                  <span className="font-mono text-foreground">
                    v{dep.version}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Phase-by-Phase Feature Tracker ─────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-4 w-4 text-primary" />
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Feature Tracker by Phase
            </p>
          </div>
          <div className="space-y-3">
            {FEATURE_REGISTRY.map(group => (
              <FeatureGroupCard key={group.phase} group={group} />
            ))}
          </div>
        </div>

        {/* ── Quick Links ────────────────────────────────────────── */}
        <div className="bg-card border border-border/60 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="h-4 w-4 text-primary" />
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Quick Navigation
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Command Center", path: "/admin", icon: TrendingUp },
              { label: "Projects", path: "/admin/projects", icon: FileCode },
              {
                label: "Field Reports",
                path: "/admin/field-reports",
                icon: Wrench,
              },
              { label: "Setup Wizard", path: "/admin/setup", icon: Package },
              { label: "Public Site", path: "/", icon: ExternalLink },
              { label: "Login Page", path: "/auth/login", icon: Shield },
              { label: "Client Portal", path: "/portal", icon: Users },
              { label: "Estimator", path: "/estimator", icon: Sparkles },
            ].map(link => (
              <button
                key={link.path}
                onClick={() => setLocation(link.path)}
                className="flex items-center gap-2 px-3 py-2.5 border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                <link.icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                <span className="truncate">{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
