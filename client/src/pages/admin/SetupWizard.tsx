/**
 * SetupWizard -- Eric's self-service configuration console.
 * Walks through Stripe account creation, grabs the API key,
 * and pushes it directly to Netlify env vars with one click.
 * All other configured keys shown as green checkmarks.
 */
import DashboardLayout from "@/components/DashboardLayout";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Shield,
  X,
  CreditCard,
  CloudRain,
  Webhook,
  Map,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Admin token stored in sessionStorage — Eric enters once per browser session.
// The actual token is set in Netlify env vars as SETUP_ADMIN_TOKEN.
function useAdminToken() {
  const [token, setTokenState] = useState(
    () => sessionStorage.getItem("pcb-setup-token") ?? ""
  );
  const setToken = (t: string) => {
    sessionStorage.setItem("pcb-setup-token", t);
    setTokenState(t);
  };
  return { token, setToken, isSet: !!token };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceKey = {
  id: string;
  label: string;
  envKey: string;
  icon: typeof CreditCard;
  description: string;
  optional: boolean;
  configured: boolean | null; // null = unknown
  guideSteps: string[];
  guideUrl: string;
  urlLabel: string;
  placeholder: string;
  prefix?: string; // expected value prefix for validation
};

// ─── Service Definitions ──────────────────────────────────────────────────────

const SERVICES: ServiceKey[] = [
  {
    id: "anthropic",
    label: "Claude AI (Anthropic)",
    envKey: "ANTHROPIC_API_KEY",
    icon: Shield,
    description:
      "Powers field report generation, lead scoring, AI chat, and estimating.",
    optional: false,
    configured: true,
    guideSteps: [],
    guideUrl: "",
    urlLabel: "",
    placeholder: "sk-ant-...",
    prefix: "sk-ant-",
  },
  {
    id: "stripe",
    label: "Stripe (Payments)",
    envKey: "STRIPE_SECRET_KEY",
    icon: CreditCard,
    description:
      "Sends milestone invoices and creates client payment links. 100% optional.",
    optional: true,
    configured: null,
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
    id: "weather",
    label: "OpenWeatherMap",
    envKey: "OPENWEATHERMAP_API_KEY",
    icon: CloudRain,
    description: "Live 7-day Eugene OR weather forecast for smart scheduling.",
    optional: false,
    configured: true,
    guideSteps: [],
    guideUrl: "",
    urlLabel: "",
    placeholder: "Already configured",
    prefix: "",
  },
  {
    id: "n8n",
    label: "n8n (Automation Webhooks)",
    envKey: "N8N_WEBHOOK_URL",
    icon: Webhook,
    description:
      "Sends SMS/email alerts when field reports are submitted or materials run short.",
    optional: true,
    configured: null,
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
    configured: null,
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

// ─── Single service card ───────────────────────────────────────────────────────

function ServiceCard({
  svc,
  adminToken,
}: {
  svc: ServiceKey;
  adminToken: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(svc.configured === true);
  const isConfigured = saved || svc.configured === true;

  const save = async () => {
    if (!value.trim()) {
      toast.error("Paste your key first");
      return;
    }
    if (svc.prefix && !value.trim().startsWith(svc.prefix)) {
      toast.error(`Key should start with "${svc.prefix}"`);
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
      setSaved(true);
      setOpen(false);
      setValue("");
      toast.success(
        `${svc.label} configured! Redeploy triggered -- live in ~60s.`
      );
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`bg-card border transition-colors ${
        isConfigured ? "border-green-400/30" : "border-border/60"
      }`}
    >
      {/* Header row */}
      <div
        className={`flex items-center gap-4 p-5 ${!isConfigured && svc.guideSteps.length > 0 ? "cursor-pointer hover:bg-accent/20" : ""}`}
        onClick={() =>
          !isConfigured && svc.guideSteps.length > 0 && setOpen(v => !v)
        }
      >
        <div
          className={`h-9 w-9 border flex items-center justify-center shrink-0 ${
            isConfigured
              ? "border-green-400/40 bg-green-400/10"
              : "border-border/60"
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
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
          {isConfigured ? (
            <span
              className="text-[10px] text-green-400 font-bold tracking-widest uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              ✓ Active
            </span>
          ) : (
            <span
              className="text-[10px] text-amber-400 font-bold tracking-widest uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Not set
            </span>
          )}
          {!isConfigured &&
            svc.guideSteps.length > 0 &&
            (open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ))}
        </div>
      </div>

      {/* Expanded guide */}
      {open && !isConfigured && (
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
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {saving ? "Saving…" : "Save & Deploy"}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const { token, setToken, isSet } = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");
  const configured = SERVICES.filter(s => s.configured === true).length;
  const total = SERVICES.length;

  // Auth gate — Eric enters his admin token once per session
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
              placeholder="Paste your admin token…"
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Platform Setup
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            One-time configuration for your Digital Foreman platform. Expand any
            service to see a plain-English setup guide.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-card border border-border/60 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Setup Progress
            </p>
            <span className="text-sm font-bold text-primary">
              {configured} / {total}
            </span>
          </div>
          <div className="h-2 bg-input rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(configured / total) * 100}%` }}
            />
          </div>
          <div className="flex gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-[10px] text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-[10px] text-muted-foreground">
                Not configured
              </span>
            </div>
          </div>
        </div>

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
            <ServiceCard key={svc.id} svc={svc} adminToken={token} />
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
