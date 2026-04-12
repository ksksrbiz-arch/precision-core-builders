/**
 * SetupWizard -- Eric's self-service configuration console with live health checks.
 * Walks through platform setup, tests all integrations in real-time,
 * and provides actionable status for each service.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/components/ToastProvider";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudRain,
  CreditCard,
  Database,
  ExternalLink,
  Key,
  Loader2,
  Map,
  Mic,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  Webhook,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Admin Token Hook ────────────────────────────────────────────────────────

function useAdminToken() {
  const [token, setTokenState] = useState(
    () => sessionStorage.getItem("pcb-setup-token") ?? ""
  );
  const setToken = (t: string) => {
    sessionStorage.setItem("pcb-setup-token", t);
    setTokenState(t);
  };
  const clear = () => {
    sessionStorage.removeItem("pcb-setup-token");
    setTokenState("");
  };
  return { token, setToken, clear, isSet: !!token };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceStatus = {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "error" | "not_configured";
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
};

type HealthResponse = {
  status: "healthy" | "degraded" | "error" | "setup_required";
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

type ServiceKey = {
  id: string;
  label: string;
  envKey: string;
  icon: typeof CreditCard;
  description: string;
  optional: boolean;
  guideSteps: string[];
  guideUrl: string;
  urlLabel: string;
  placeholder: string;
  prefix?: string;
};

// ─── Service Definitions ──────────────────────────────────────────────────────

const SERVICES: ServiceKey[] = [
  {
    id: "supabase",
    label: "Supabase Database",
    envKey: "SUPABASE_URL",
    icon: Database,
    description:
      "Core database for projects, clients, field reports, and all platform data.",
    optional: false,
    guideSteps: [],
    guideUrl: "",
    urlLabel: "",
    placeholder: "Pre-configured",
    prefix: "",
  },
  {
    id: "cloudflare_ai",
    label: "Cloudflare Workers AI",
    envKey: "CF_API_TOKEN",
    icon: Sparkles,
    description:
      "Free-tier AI for estimates, chat, and field reports (Llama 3.3 70B).",
    optional: false,
    guideSteps: [],
    guideUrl: "",
    urlLabel: "",
    placeholder: "Pre-configured",
    prefix: "",
  },
  {
    id: "anthropic_ai",
    label: "Claude AI (Fallback)",
    envKey: "ANTHROPIC_API_KEY",
    icon: Shield,
    description:
      "Premium AI fallback when Cloudflare rate limits are hit. Used sparingly.",
    optional: false,
    guideSteps: [],
    guideUrl: "",
    urlLabel: "",
    placeholder: "Pre-configured",
    prefix: "sk-ant-",
  },
  {
    id: "openai",
    label: "OpenAI (Whisper)",
    envKey: "OPENAI_API_KEY",
    icon: Mic,
    description: "Voice transcription for field reports via Whisper API.",
    optional: false,
    guideSteps: [],
    guideUrl: "",
    urlLabel: "",
    placeholder: "Pre-configured",
    prefix: "sk-",
  },
  {
    id: "weather",
    label: "OpenWeatherMap",
    envKey: "OPENWEATHERMAP_API_KEY",
    icon: CloudRain,
    description: "Live 7-day Eugene OR weather forecast for smart scheduling.",
    optional: false,
    guideSteps: [],
    guideUrl: "",
    urlLabel: "",
    placeholder: "Pre-configured",
    prefix: "",
  },
  {
    id: "stripe",
    label: "Stripe Payments",
    envKey: "STRIPE_SECRET_KEY",
    icon: CreditCard,
    description:
      "Milestone invoicing and client payment links. 100% optional.",
    optional: true,
    guideSteps: [
      "Go to stripe.com and click Start now -- it is free to create an account.",
      "Enter your email and create a password, then verify your email.",
      "Stripe will ask about your business. Select Individual / Sole proprietor, enter your name, and choose Construction as the industry.",
      "You can skip the bank account step for now -- add it later when ready to receive payouts.",
      "In the top menu, click Developers then API Keys.",
      "You will see a Secret key row. Click Reveal test key to start (use test mode until ready to go live).",
      "Copy the key that starts with sk_test_... and paste it below.",
      "When ready to take real payments, flip to Live mode and copy the sk_live_... key instead.",
    ],
    guideUrl: "https://dashboard.stripe.com/register",
    urlLabel: "Open Stripe Sign Up",
    placeholder: "sk_test_... or sk_live_...",
    prefix: "sk_",
  },
  {
    id: "n8n",
    label: "n8n Automation",
    envKey: "N8N_WEBHOOK_URL",
    icon: Webhook,
    description:
      "Sends SMS/email alerts when field reports are submitted or materials run short.",
    optional: true,
    guideSteps: [
      "Go to n8n.io and sign up for a free cloud account (or self-host -- both work).",
      "Click New Workflow and add a Webhook trigger node.",
      "Set the path to owner-notify and the method to POST.",
      "Add your notification -- Twilio SMS, Gmail, or Slack all have built-in n8n nodes.",
      "Activate the workflow, then copy the Production URL shown in the Webhook node.",
      "Paste just the base URL below (e.g. https://yourname.app.n8n.cloud/webhook).",
    ],
    guideUrl: "https://app.n8n.cloud/register",
    urlLabel: "Open n8n Sign Up",
    placeholder: "https://yourname.app.n8n.cloud/webhook",
    prefix: "https://",
  },
  {
    id: "maps",
    label: "Google Maps",
    envKey: "VITE_GOOGLE_MAPS_API_KEY",
    icon: Map,
    description:
      "Interactive job site maps on the Contact page and Project detail view.",
    optional: true,
    guideSteps: [
      "Go to console.cloud.google.com and sign in with your Google account.",
      "Click Select a project at the top, then New Project. Name it Precision Core Builders.",
      "In the left menu go to APIs and Services, then Enable APIs. Search for Maps JavaScript API and enable it.",
      "Go to APIs and Services, then Credentials, then Create Credentials, then API Key.",
      "Copy the key shown, then click Restrict Key. Under API restrictions, select only Maps JavaScript API.",
      "Paste the key below. Maps become interactive on the Contact page immediately after redeploy.",
    ],
    guideUrl: "https://console.cloud.google.com/apis/credentials",
    urlLabel: "Open Google Cloud Console",
    placeholder: "AIza...",
    prefix: "AIza",
  },
];

// ─── Status Badge Component ──────────────────────────────────────────────────

function StatusBadge({
  status,
  latency,
}: {
  status: ServiceStatus["status"];
  latency?: number;
}) {
  const config = {
    healthy: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-400/10 border-green-400/30",
      label: "Healthy",
    },
    degraded: {
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-400/30",
      label: "Degraded",
    },
    error: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-400/10 border-red-400/30",
      label: "Error",
    },
    not_configured: {
      icon: Wrench,
      color: "text-muted-foreground",
      bg: "bg-muted/10 border-border/40",
      label: "Not Set",
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-bold tracking-widest uppercase ${c.bg} ${c.color}`}
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        <Icon className="h-3 w-3" />
        {c.label}
      </span>
      {latency !== undefined && (
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
          {latency}ms
        </span>
      )}
    </div>
  );
}

// ─── Health Check Panel ──────────────────────────────────────────────────────

function HealthCheckPanel({
  adminToken,
  onRefresh,
  addToast,
}: {
  adminToken: string;
  onRefresh?: () => void;
  addToast: any;
}) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform-health?adminToken=${encodeURIComponent(adminToken)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setHealth(data);
      setLastChecked(new Date());
      onRefresh?.();
    } catch (err) {
      setError(String(err));
      addToast({ type: "error", title: "Error", message: "Health check failed.", duration: 6000 });
    } finally {
      setLoading(false);
    }
  }, [adminToken, onRefresh]);

  // Auto-run on mount
  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  const statusColors = {
    healthy: "border-green-400/40 bg-green-400/5",
    degraded: "border-amber-400/40 bg-amber-400/5",
    error: "border-red-400/40 bg-red-400/5",
    setup_required: "border-primary/40 bg-primary/5",
  };

  const statusMessages = {
    healthy: "All systems operational",
    degraded: "Some services need attention",
    error: "Critical issues detected",
    setup_required: "Initial setup required",
  };

  return (
    <div className="bg-card border border-border/60 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 border border-primary/40 bg-primary/10 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Platform Health
            </h2>
            <p className="text-[10px] text-muted-foreground">
              {lastChecked
                ? `Last checked ${lastChecked.toLocaleTimeString()}`
                : "Checking..."}
            </p>
          </div>
        </div>

        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-border/60 text-[10px] font-bold tracking-widest uppercase hover:bg-accent/20 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <RefreshCw
            className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Checking..." : "Refresh"}
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-5">
          <div className="flex items-center gap-3 text-red-400">
            <XCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : health ? (
        <>
          {/* Summary */}
          <div
            className={`p-4 border-b border-border/40 ${statusColors[health.status]}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {health.status === "healthy" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : health.status === "error" ? (
                  <XCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                )}
                <span className="text-sm font-medium">
                  {statusMessages[health.status]}
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] text-muted-foreground">
                  <span className="text-green-400 font-bold">
                    {health.summary.healthy}
                  </span>{" "}
                  healthy
                </span>
                {health.summary.degraded > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    <span className="text-amber-400 font-bold">
                      {health.summary.degraded}
                    </span>{" "}
                    degraded
                  </span>
                )}
                {health.summary.errors > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    <span className="text-red-400 font-bold">
                      {health.summary.errors}
                    </span>{" "}
                    errors
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  <span className="text-muted-foreground/60 font-bold">
                    {health.summary.notConfigured}
                  </span>{" "}
                  not set
                </span>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="p-5">
            <div className="grid gap-3">
              {health.services.map(svc => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between p-3 bg-background/60 border border-border/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{svc.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {svc.message}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={svc.status} latency={svc.latencyMs} />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

// ─── Service Configuration Card ──────────────────────────────────────────────

function ServiceCard({
  svc,
  healthStatus,
  adminToken,
  onSaved,
  addToast,
}: {
  svc: ServiceKey;
  healthStatus?: ServiceStatus;
  adminToken: string;
  onSaved: () => void;
  addToast: any;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const isConfigured = healthStatus
    ? healthStatus.status === "healthy" || healthStatus.status === "degraded"
    : false;
  const canConfigure = svc.guideSteps.length > 0;

  const save = async () => {
    if (!value.trim()) {
      addToast({ type: "error", title: "Error", message: "Paste your key first.", duration: 6000 });
      return;
    }
    if (svc.prefix && !value.trim().startsWith(svc.prefix)) {
      addToast({
        type: "error",
        title: "Error",
        message: `Key should start with "${svc.prefix}".`,
        duration: 6000,
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/setup-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: svc.envKey,
          value: value.trim(),
          adminToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error ?? `HTTP ${res.status}`);
      addToast({
        type: "success",
        title: "Configured",
        message: `${svc.label} configured! Redeploy triggered -- live in ~60s.`,
        duration: 4000,
      });
      setOpen(false);
      setValue("");
      onSaved();
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: String(err),
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`bg-card border transition-colors ${
        isConfigured
          ? "border-green-400/30"
          : healthStatus?.status === "error"
            ? "border-red-400/30"
            : "border-border/60"
      }`}
    >
      {/* Header row */}
      <div
        className={`flex items-center gap-4 p-5 ${canConfigure && !isConfigured ? "cursor-pointer hover:bg-accent/20" : ""}`}
        onClick={() => canConfigure && !isConfigured && setOpen(v => !v)}
      >
        <div
          className={`h-9 w-9 border flex items-center justify-center shrink-0 ${
            isConfigured
              ? "border-green-400/40 bg-green-400/10"
              : healthStatus?.status === "error"
                ? "border-red-400/40 bg-red-400/10"
                : "border-border/60"
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
          ) : healthStatus?.status === "error" ? (
            <XCircle className="h-4.5 w-4.5 text-red-400" />
          ) : (
            <svc.icon className="h-4.5 w-4.5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{svc.label}</p>
            {svc.optional && (
              <span
                className="text-[9px] px-1.5 py-0.5 border border-border/40 text-muted-foreground/60 tracking-widest uppercase"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Optional
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-light mt-0.5">
            {svc.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {healthStatus && (
            <StatusBadge
              status={healthStatus.status}
              latency={healthStatus.latencyMs}
            />
          )}
          {canConfigure &&
            !isConfigured &&
            (open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ))}
        </div>
      </div>

      {/* Expanded guide */}
      {open && !isConfigured && canConfigure && (
        <div className="px-5 pb-5 border-t border-border/40">
          {/* Step-by-step */}
          <div className="mt-5 mb-5">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Step-by-Step Setup
            </p>
            <ol className="space-y-3">
              {svc.guideSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="h-5 w-5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* External link */}
          {svc.guideUrl && (
            <a
              href={svc.guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[11px] text-primary border border-primary/40 px-3 py-1.5 hover:bg-primary/10 transition-colors mb-5"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <ExternalLink className="h-3 w-3" /> {svc.urlLabel}
            </a>
          )}

          {/* Key input */}
          <div className="bg-background/60 border border-border/60 p-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Key className="h-3 w-3 inline mr-1.5 text-primary" />
              Paste Your Key Here
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={svc.placeholder}
                className="flex-1 bg-input border border-border px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 transition-colors"
              />
              <button
                onClick={save}
                disabled={saving || !value.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                {saving ? "Saving..." : "Save & Deploy"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-2">
              Your key is sent directly to Netlify's encrypted environment --
              never stored in the app. A redeploy triggers automatically so it
              goes live in about 60 seconds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Actions Panel ─────────────────────────────────────────────────────

function QuickActionsPanel({
  adminToken,
  addToast,
}: {
  adminToken: string;
  addToast: any;
}) {
  const [testingAI, setTestingAI] = useState(false);
  const [testingDb, setTestingDb] = useState(false);

  const testAI = async () => {
    setTestingAI(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Say 'AI is working!' in exactly those words.",
          context: "system_test",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI test failed");
      addToast({
        type: "success",
        title: "AI Ready",
        message: `AI Response: ${data.reply?.slice(0, 50) ?? "OK"}...`,
        duration: 4000,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "AI Test Failed",
        message: String(err),
        duration: 6000,
      });
    } finally {
      setTestingAI(false);
    }
  };

  const testDb = async () => {
    setTestingDb(true);
    try {
      // Use the health check endpoint
      const res = await fetch(
        `/api/platform-health?adminToken=${encodeURIComponent(adminToken)}`
      );
      const data = await res.json();
      const dbService = data.services?.find(
        (s: ServiceStatus) => s.id === "supabase"
      );
      if (dbService?.status === "healthy") {
        addToast({
          type: "success",
          title: "Database Ready",
          message: `Database: ${dbService.message}`,
          duration: 4000,
        });
      } else {
        addToast({
          type: "error",
          title: "Database Error",
          message: `Database: ${dbService?.message ?? "Unknown error"}`,
          duration: 6000,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "DB Test Failed",
        message: String(err),
        duration: 6000,
      });
    } finally {
      setTestingDb(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 p-5 mb-6">
      <p
        className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        <Wrench className="h-3 w-3 inline mr-1.5 text-primary" />
        Quick Actions
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={testAI}
          disabled={testingAI}
          className="flex items-center gap-2 px-4 py-2 border border-border/60 text-[10px] font-bold tracking-widest uppercase hover:bg-accent/20 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          {testingAI ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Test AI
        </button>
        <button
          onClick={testDb}
          disabled={testingDb}
          className="flex items-center gap-2 px-4 py-2 border border-border/60 text-[10px] font-bold tracking-widest uppercase hover:bg-accent/20 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          {testingDb ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Database className="h-3 w-3" />
          )}
          Test Database
        </button>
        <a
          href="https://app.netlify.com/sites/precision-core/deploys"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-border/60 text-[10px] font-bold tracking-widest uppercase hover:bg-accent/20 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ExternalLink className="h-3 w-3" />
          View Deploys
        </a>
        <a
          href="https://supabase.com/dashboard/project/mdxfvxycwzauixuphjau"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-border/60 text-[10px] font-bold tracking-widest uppercase hover:bg-accent/20 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ExternalLink className="h-3 w-3" />
          Supabase Dashboard
        </a>
      </div>
    </div>
  );
}

// ─── MCP Tools Panel ──────────────────────────────────────────────────────────

type MCPAction = {
  id: string;
  name: string;
  description: string;
  icon: typeof Database;
  category: "data" | "test" | "admin";
  dangerous?: boolean;
  requiresParams?: boolean;
};

const MCP_ACTIONS: MCPAction[] = [
  {
    id: "seed-demo-data",
    name: "Seed Demo Data",
    description: "Create sample client, project, field report, and materials for testing",
    icon: Database,
    category: "data",
  },
  {
    id: "clear-demo-data",
    name: "Clear Demo Data",
    description: "Remove all demo projects and related records",
    icon: XCircle,
    category: "data",
    dangerous: true,
  },
  {
    id: "check-database",
    name: "Check Database",
    description: "Verify all required tables exist and count records",
    icon: Activity,
    category: "test",
  },
  {
    id: "test-ai",
    name: "Test AI Endpoint",
    description: "Send a test prompt to Cloudflare Workers AI",
    icon: Sparkles,
    category: "test",
  },
  {
    id: "test-weather",
    name: "Test Weather API",
    description: "Fetch current Eugene OR weather from OpenWeatherMap",
    icon: CloudRain,
    category: "test",
  },
  {
    id: "test-voice",
    name: "Test Voice API",
    description: "Verify OpenAI Whisper API access for voice transcription",
    icon: Mic,
    category: "test",
  },
  {
    id: "verify-stripe",
    name: "Verify Stripe",
    description: "Check Stripe connection and account status",
    icon: CreditCard,
    category: "test",
  },
  {
    id: "get-stats",
    name: "Platform Stats",
    description: "Get counts of projects, clients, invoices, and reports",
    icon: Server,
    category: "admin",
  },
];

type ActionResult = {
  success: boolean;
  action: string;
  message: string;
  data?: unknown;
  durationMs: number;
};

function MCPToolsPanel({
  adminToken,
  onActionComplete,
  addToast,
}: {
  adminToken: string;
  onActionComplete?: () => void;
  addToast: any;
}) {
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const executeAction = async (actionId: string) => {
    setRunningAction(actionId);
    setLastResult(null);

    try {
      const res = await fetch("/api/platform-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionId,
          adminToken,
        }),
      });

      const result: ActionResult = await res.json();
      setLastResult(result);

      if (result.success) {
        addToast({
          type: "success",
          title: result.action,
          message: result.message,
          duration: 4000,
        });
        onActionComplete?.();
      } else {
        addToast({
          type: "error",
          title: result.action,
          message: result.message,
          duration: 6000,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Action Failed",
        message: String(err),
        duration: 6000,
      });
      setLastResult({
        success: false,
        action: actionId,
        message: String(err),
        durationMs: 0,
      });
    } finally {
      setRunningAction(null);
    }
  };

  const categories = [
    { key: "test", label: "Test Services", icon: Zap },
    { key: "data", label: "Data Management", icon: Database },
    { key: "admin", label: "Administration", icon: Shield },
  ] as const;

  return (
    <div className="bg-card border border-primary/30 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <Zap className="h-3 w-3 inline mr-1.5" />
          MCP Tools
        </p>
        <span className="text-[9px] text-muted-foreground/60 bg-primary/10 px-2 py-0.5 border border-primary/20">
          Executable Actions
        </span>
      </div>

      {categories.map(cat => {
        const actions = MCP_ACTIONS.filter(a => a.category === cat.key);
        if (actions.length === 0) return null;

        return (
          <div key={cat.key} className="mb-4 last:mb-0">
            <p className="text-[9px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {actions.map(action => {
                const isRunning = runningAction === action.id;
                const Icon = action.icon;

                return (
                  <button
                    key={action.id}
                    onClick={() => executeAction(action.id)}
                    disabled={!!runningAction}
                    className={`flex items-start gap-3 p-3 border text-left transition-colors disabled:opacity-50 ${
                      action.dangerous
                        ? "border-red-500/30 hover:bg-red-500/10"
                        : "border-border/60 hover:bg-accent/20"
                    }`}
                  >
                    <div
                      className={`p-1.5 ${
                        action.dangerous
                          ? "bg-red-500/10 text-red-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[11px] font-semibold text-foreground truncate"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {action.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Last Result */}
      {lastResult && (
        <div
          className={`mt-4 p-3 border ${
            lastResult.success
              ? "border-green-500/30 bg-green-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className="text-[11px] font-medium">{lastResult.message}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">
              {lastResult.durationMs}ms
            </span>
          </div>

          {lastResult.data && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[9px] text-primary hover:underline flex items-center gap-1"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Show Details
                  </>
                )}
              </button>
              {showDetails && (
                <pre className="mt-2 text-[10px] text-muted-foreground bg-input/50 p-2 overflow-x-auto border border-border/40">
                  {JSON.stringify(lastResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const { token, setToken, clear, isSet } = useAdminToken();
  const { addToast } = useToast();
  const [tokenInput, setTokenInput] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch health on mount to populate service statuses
  useEffect(() => {
    if (!isSet) return;
    fetch(`/api/platform-health?adminToken=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => {});
  }, [isSet, token, refreshKey]);

  // Map health statuses to service IDs
  const statusMap: Record<string, ServiceStatus> = {};
  health?.services.forEach(s => {
    statusMap[s.id] = s;
  });

  // Auth gate
  if (!isSet) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-card border border-border/60 p-8 text-center">
            <Key className="h-10 w-10 text-primary/40 mx-auto mb-4" />
            <h1
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Setup Authentication
            </h1>
            <p className="text-sm text-muted-foreground font-light mb-6">
              Enter your admin token to access platform configuration. This was
              set in your Netlify environment variables as{" "}
              <code className="text-xs bg-input px-1 py-0.5 border border-border">
                SETUP_ADMIN_TOKEN
              </code>
              .
            </p>
            <input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && tokenInput.trim())
                  setToken(tokenInput.trim());
              }}
              placeholder="Paste your admin token..."
              className="w-full bg-input border border-border text-sm text-foreground p-3 mb-4 focus:outline-none focus:border-primary/60"
            />
            <button
              onClick={() => {
                if (tokenInput.trim()) setToken(tokenInput.trim());
              }}
              disabled={!tokenInput.trim()}
              className="w-full py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Shield className="h-3.5 w-3.5 inline mr-2" /> Authenticate
            </button>
            <p className="text-[10px] text-muted-foreground/50 mt-4">
              Token is stored only in your browser session. Closing the tab
              clears it.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-semibold mb-1"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Platform Setup
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Configure and monitor your Digital Foreman platform integrations.
            </p>
          </div>
          <button
            onClick={clear}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Health Check Panel */}
        <HealthCheckPanel
          adminToken={token}
          onRefresh={() => setRefreshKey(k => k + 1)}
          addToast={addToast}
        />

        {/* Quick Actions */}
        <QuickActionsPanel adminToken={token} addToast={addToast} />

        {/* MCP Tools */}
        <MCPToolsPanel
          adminToken={token}
          onActionComplete={() => setRefreshKey(k => k + 1)}
          addToast={addToast}
        />

        {/* Info banner */}
        <div className="border border-primary/20 bg-primary/5 p-4 mb-6 flex gap-3">
          <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">
              You're in full control.
            </span>{" "}
            Every service below is your own account -- Precision Core Builders
            manages no payments, stores no keys, and has no access to your
            Stripe or billing data. Keys are saved encrypted directly to your
            Netlify project.
          </div>
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          {SERVICES.map(svc => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              healthStatus={statusMap[svc.id]}
              adminToken={token}
              onSaved={() => setRefreshKey(k => k + 1)}
              addToast={addToast}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 p-4 border border-border/40 bg-muted/10">
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            <span className="font-semibold text-muted-foreground">
              After saving any key
            </span>{" "}
            -- Netlify automatically rebuilds and redeploys your site (~60
            seconds). You'll see the feature become active immediately after. If
            you need to update a key later, just come back to this page and
            paste the new value.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
