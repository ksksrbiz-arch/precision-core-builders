/**
 * BillingView — Milestone-based invoicing via Stripe.
 * Creates payment links and formal invoices for project milestones.
 * Invoices created this session are cached in localStorage so they survive
 * page reloads even when Stripe is not yet configured. On mount the view also
 * attempts to list recent invoices from Stripe and merges them with the cache.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useToast } from "@/components/ToastProvider";
import { trpc } from "@/lib/trpc";
import {
  buildFreePaymentLinks,
  getFreePaymentConfig,
  hasAnyFreePaymentMethod,
} from "@/lib/freePayments";
import {
  CheckCircle2,
  ClipboardCopy,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_KEY = "pcb_billing_invoices";

function loadCachedInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? sanitizeCachedInvoices(JSON.parse(raw) as Invoice[]) : [];
  } catch {
    return [];
  }
}

function saveCachedInvoices(list: Invoice[]) {
  try {
    // Keep at most 100 entries to avoid bloating localStorage.
    localStorage.setItem(
      LS_KEY,
      JSON.stringify(sanitizeCachedInvoices(list).slice(0, 100))
    );
  } catch {
    // Storage full — silently ignore; in-memory state is still correct.
  }
}

/** De-duplicate invoices by (invoiceId | paymentLinkId), newest-first. */
function mergeInvoices(a: Invoice[], b: Invoice[]): Invoice[] {
  const seen = new Set<string>();
  const result: Invoice[] = [];
  for (const inv of [...a, ...b]) {
    const key = inv.invoiceId ?? inv.paymentLinkId ?? `${inv.createdAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(inv);
    }
  }
  return result.sort(
    (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
  );
}

type Invoice = {
  invoiceId?: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  invoiceUrl?: string;
  invoicePdf?: string;
  status?: string;
  amountCents: number;
  description: string;
  clientEmail?: string;
  projectName?: string;
  createdAt: string;
  type: "payment_link" | "invoice" | "free_link";
  /** Populated for "free_link" — every configured payment URL for this invoice. */
  freeLinks?: Array<{
    provider: "paypal" | "venmo" | "zelle" | "email";
    label: string;
    url: string;
    isMailto: boolean;
  }>;
};

const MILESTONE_TEMPLATES = [
  { label: "Contract Signing / Mobilization", pct: 10 },
  { label: "Foundation / Demo Complete", pct: 20 },
  { label: "Framing & Rough-In Complete", pct: 30 },
  { label: "Drywall / Sheathing Complete", pct: 20 },
  { label: "Finish Work Complete", pct: 10 },
  { label: "Final Walkthrough & Punch List", pct: 10 },
];

function fmtCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}
function fmtDollars(d: number) {
  return `$${d.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function sanitizeCachedInvoices(list: Invoice[]): Invoice[] {
  // Do not persist hosted payment or invoice URLs; they grant access to
  // billing artifacts and should only live in memory for the current session.
  return list.map(({ invoicePdf, invoiceUrl, paymentLinkUrl, ...invoice }) => ({
    ...invoice,
  }));
}

function safeExternalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    // Allow https links (Stripe / PayPal / Venmo) and mailto: invoice links.
    if (url.protocol === "https:") return url.toString();
    if (url.protocol === "mailto:") return url.toString();
    return undefined;
  } catch {
    return undefined;
  }
}

export default function BillingView() {
  // Default to the free payment-link mode when at least one free handle is
  // configured (PayPal/Venmo/Zelle) — Eric does not need a Stripe account
  // to start collecting payments.
  const freeAvailable = hasAnyFreePaymentMethod();
  const stripeEnabled = Boolean(
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_FEATURE_STRIPE === "true"
  );
  const [mode, setMode] = useState<"payment_link" | "invoice" | "free_link">(
    freeAvailable ? "free_link" : "payment_link"
  );
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>(loadCachedInvoices);
  const [showForm, setShowForm] = useState(false);
  const [stripeNotConfigured, setStripeNotConfigured] = useState(false);
  const { addToast } = useToast();

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 50 });
  const { data: clients } = trpc.clients.list.useQuery({ pageSize: 50 });

  const selectedProjectData = projects?.data.find(
    p => p.id === selectedProject
  );

  // ─── Auto-populate client email when a project is selected ────────────────
  useEffect(() => {
    if (!selectedProjectData) return;
    const clientId = (selectedProjectData as any).client_id;
    if (!clientId || !clients?.data) return;
    const client = clients.data.find((c: any) => c.id === clientId);
    if (client && !clientEmail) {
      setClientEmail(client.email ?? "");
      setClientName(client.name ?? "");
    }
  }, [selectedProjectData, clients, clientEmail]);

  // ─── Load recent Stripe invoices on mount ─────────────────────────────────
  const fetchStripeInvoices = useCallback(async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_invoices", limit: 30 }),
      });
      if (!res.ok) return; // Stripe not configured — cached data is fine
      const data = (await res.json()) as {
        invoices?: Array<{
          id: string;
          amount_due: number;
          description: string | null;
          hosted_invoice_url: string | null;
          invoice_pdf: string | null;
          status: string;
          created: number;
          customer_email?: string;
        }>;
      };
      if (data.invoices) {
        const normalized: Invoice[] = data.invoices.map(inv => ({
          invoiceId: inv.id,
          amountCents: inv.amount_due,
          description: inv.description ?? "Stripe invoice",
          invoiceUrl: inv.hosted_invoice_url ?? undefined,
          invoicePdf: inv.invoice_pdf ?? undefined,
          status: inv.status,
          clientEmail: inv.customer_email,
          createdAt: new Date(inv.created * 1000).toISOString(),
          type: "invoice" as const,
        }));
        setInvoices(prev => {
          const merged = mergeInvoices(normalized, prev);
          saveCachedInvoices(merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn("[billing] failed to load Stripe invoices", err);
    } finally {
      setStripeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStripeInvoices();
  }, [fetchStripeInvoices]);

  const applyTemplate = (tpl: (typeof MILESTONE_TEMPLATES)[0]) => {
    const budget = selectedProjectData?.contracted_budget
      ? Number(selectedProjectData.contracted_budget)
      : null;
    if (budget) {
      setAmount(((budget * tpl.pct) / 100).toFixed(2));
    }
    setDescription(tpl.label);
  };

  const createPayment = async () => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || !description) {
      addToast({
        type: "error",
        title: "Error",
        message: "Amount and description are required.",
        duration: 6000,
      });
      return;
    }
    if (mode === "invoice" && !clientEmail) {
      addToast({
        type: "error",
        title: "Error",
        message: "Client email is required for invoices.",
        duration: 6000,
      });
      return;
    }

    setLoading(true);
    try {
      // ─── Free payment-link mode — no server call, no API keys ─────────────
      if (mode === "free_link") {
        const links = buildFreePaymentLinks({
          amountCents,
          description,
          clientEmail: clientEmail || undefined,
          clientName: clientName || undefined,
          projectName: selectedProjectData?.name,
        });
        if (links.length === 0) {
          throw new Error(
            "No free payment handles are configured. Set at least one of VITE_PAYPAL_ME_USERNAME, VITE_VENMO_USERNAME, or VITE_ZELLE_HANDLE in Netlify environment variables."
          );
        }
        const primary = links.find(l => !l.isMailto) ?? links[0];
        const newInvoice: Invoice = {
          paymentLinkId: `free-${Date.now()}`,
          paymentLinkUrl: primary.url,
          amountCents,
          description,
          clientEmail: clientEmail || undefined,
          projectName: selectedProjectData?.name,
          createdAt: new Date().toISOString(),
          type: "free_link",
          status: "active",
          freeLinks: links,
        };
        setInvoices(prev => {
          const merged = mergeInvoices([newInvoice], prev);
          saveCachedInvoices(merged);
          return merged;
        });
        try {
          await navigator.clipboard.writeText(primary.url);
        } catch {
          // Clipboard may be unavailable on mobile / insecure contexts.
        }
        addToast({
          type: "success",
          title: "Payment link ready",
          message: `${primary.label} link copied. Paste it into a text message or email.`,
          duration: 5000,
        });
        setAmount("");
        setDescription("");
        setShowForm(false);
        return;
      }

      const payload: Record<string, any> = {
        action:
          mode === "payment_link" ? "create_payment_link" : "create_invoice",
        amountCents,
        description,
        projectName: selectedProjectData?.name,
        clientEmail: clientEmail || undefined,
        clientName: clientName || undefined,
      };

      const res = await fetch("/api/stripe-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("STRIPE_SECRET_KEY")) {
          setStripeNotConfigured(true);
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const newInvoice: Invoice = {
        ...data,
        amountCents,
        description,
        clientEmail: clientEmail || undefined,
        projectName: selectedProjectData?.name,
        createdAt: new Date().toISOString(),
        type: mode,
      };
      setInvoices(prev => {
        const merged = mergeInvoices([newInvoice], prev);
        saveCachedInvoices(merged);
        return merged;
      });

      // Fire payment_received / invoice sent event via n8n-webhook
      fetch("/api/n8n-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "milestone_complete",
          payload: {
            projectId: selectedProject,
            projectName: selectedProjectData?.name,
            milestoneLabel: description,
            amountDollars: amountCents / 100,
            clientEmail: clientEmail || undefined,
            type: mode,
          },
        }),
      }).catch(() => {
        // Non-fatal
      });

      addToast({
        type: "success",
        title: "Created",
        message:
          mode === "payment_link"
            ? "Payment link created and copied."
            : "Invoice sent to client.",
        duration: 4000,
      });
      setAmount("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: String(err),
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amountCents, 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <AdminPageHeader
          title="Billing"
          guideId="billing"
          description="Milestone-based invoicing, payment links, and Stripe billing operations."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchStripeInvoices}
                disabled={stripeLoading}
                className="flex min-h-11 items-center gap-2 border border-border/60 text-muted-foreground px-3 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
                title="Reload invoices from Stripe"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${stripeLoading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={() => setShowForm(v => !v)}
                className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <Plus className="h-3.5 w-3.5" /> New Invoice
              </button>
            </div>
          }
        />

        {/* Stripe not configured banner (only shown when no free option is available) */}
        {stripeNotConfigured && !freeAvailable && (
          <div className="bg-amber-400/5 border border-amber-400/30 p-4 mb-5 text-sm">
            <p className="font-semibold text-amber-400 mb-1">
              ⚠️ No billing provider configured
            </p>
            <p className="text-muted-foreground text-xs">
              Either set Stripe keys (
              <code className="bg-muted px-1 py-0.5 text-xs">
                STRIPE_SECRET_KEY
              </code>
              ), or use free PayPal/Venmo/Zelle links by setting{" "}
              <code className="bg-muted px-1 py-0.5 text-xs">
                VITE_PAYPAL_ME_USERNAME
              </code>
              ,{" "}
              <code className="bg-muted px-1 py-0.5 text-xs">
                VITE_VENMO_USERNAME
              </code>
              , or{" "}
              <code className="bg-muted px-1 py-0.5 text-xs">
                VITE_ZELLE_HANDLE
              </code>{" "}
              in Netlify environment variables.
            </p>
          </div>
        )}

        {/* Free billing available banner */}
        {freeAvailable && (
          <div className="bg-primary/5 border border-primary/30 p-4 mb-5 text-sm">
            <p className="font-semibold text-primary mb-1 flex items-center gap-2">
              <Zap className="h-4 w-4" /> Free payment links active
            </p>
            <p className="text-muted-foreground text-xs">
              Generating PayPal / Venmo / Zelle / email invoice links — no
              transaction fees, no API keys, no Stripe account required.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            {
              label: "Total Invoiced",
              value: fmtCents(totalBilled),
              icon: DollarSign,
            },
            {
              label: "Invoices Sent",
              value: invoices.filter(i => i.type === "invoice").length,
              icon: Send,
            },
            {
              label: "Payment Links",
              value: invoices.filter(i => i.type === "payment_link").length,
              icon: CreditCard,
            },
          ].map(s => (
            <div
              key={s.label}
              className="bg-card border border-border/60 p-4 flex items-start gap-3"
            >
              <div className="h-8 w-8 border border-primary/30 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p
                  className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {s.label}
                </p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-card border border-primary/30 p-5 mb-6">
            <div className="flex items-center justify-between mb-5">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Create New Invoice
              </p>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex flex-wrap gap-0 mb-5 border border-border/60 w-fit max-w-full overflow-hidden">
              {(
                [
                  ...(freeAvailable
                    ? ([["free_link", "Free Link", Zap]] as const)
                    : []),
                  ["payment_link", "Stripe Link", CreditCard],
                  ["invoice", "Stripe Invoice", FileText],
                ] as const
              )
                .filter(([val]) => {
                  // Hide Stripe-only modes when Stripe is disabled and a free
                  // option exists — keeps Eric's UI free of dead buttons.
                  if (
                    !stripeEnabled &&
                    freeAvailable &&
                    (val === "payment_link" || val === "invoice")
                  ) {
                    return false;
                  }
                  return true;
                })
                .map(([val, label, Icon]) => (
                  <button
                    key={val}
                    onClick={() => setMode(val)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors ${
                      mode === val
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">
                      {label.includes(" ") ? label.split(" ")[0] : label}
                    </span>
                  </button>
                ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Project */}
              <div>
                <label
                  className="block text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Project
                </label>
                <select
                  value={selectedProject ?? ""}
                  onChange={e =>
                    setSelectedProject(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full bg-input border border-border text-sm text-foreground px-3 py-2 focus:outline-none focus:border-primary/60"
                >
                  <option value="">Select project…</option>
                  {projects?.data.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.contracted_budget
                        ? ` (${fmtDollars(Number(p.contracted_budget))})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client email (required for invoices) */}
              {mode === "invoice" && (
                <>
                  <div>
                    <label
                      className="block text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1.5"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Client Email *
                    </label>
                    <input
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      type="email"
                      placeholder="client@email.com"
                      className="w-full bg-input border border-border text-sm px-3 py-2 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1.5"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Client Name
                    </label>
                    <select
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-input border border-border text-sm text-foreground px-3 py-2 focus:outline-none focus:border-primary/60"
                    >
                      <option value="">Select or type name…</option>
                      {clients?.data.map((c: any) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Amount */}
              <div>
                <label
                  className="block text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Amount (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <input
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label
                  className="block text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Description *
                </label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Framing complete — 30% milestone"
                  className="w-full bg-input border border-border text-sm px-3 py-2 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>
            </div>

            {/* Milestone templates */}
            {selectedProjectData && (
              <div className="mt-4">
                <p
                  className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-2"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Quick Milestones
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MILESTONE_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.label}
                      onClick={() => applyTemplate(tpl)}
                      className="text-left text-[10px] p-2.5 border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="font-bold text-primary">{tpl.pct}%</span>{" "}
                      — {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={createPayment}
                disabled={loading || !amount || !description}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : mode === "invoice" ? (
                  <Send className="h-3.5 w-3.5" />
                ) : mode === "free_link" ? (
                  <Zap className="h-3.5 w-3.5" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                {mode === "invoice"
                  ? "Send Invoice"
                  : mode === "free_link"
                    ? "Generate Free Link"
                    : "Create Payment Link"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="border border-border/60 text-muted-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:text-foreground transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Invoice list */}
        {stripeLoading && invoices.length === 0 ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 text-primary/40 animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-light">
              Loading invoices…
            </p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-light mb-1">
              No invoices yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Create milestone invoices to send clients payment links or formal
              Stripe invoices.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv, i) => {
              const link = safeExternalUrl(
                inv.paymentLinkUrl ?? inv.invoiceUrl
              );
              return (
                <div
                  key={inv.invoiceId ?? inv.paymentLinkId ?? i}
                  className="bg-card border border-border/60 p-5 flex items-center gap-4"
                >
                  <div className="h-9 w-9 border border-primary/30 flex items-center justify-center shrink-0">
                    {inv.type === "invoice" ? (
                      <FileText className="h-4 w-4 text-primary" />
                    ) : (
                      <CreditCard className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {inv.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      {inv.projectName && (
                        <span className="text-xs text-muted-foreground">
                          {inv.projectName}
                        </span>
                      )}
                      {inv.clientEmail && (
                        <span className="text-xs text-muted-foreground">
                          {inv.clientEmail}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground/60">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary">
                      {fmtCents(inv.amountCents)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      {inv.status === "paid" ? (
                        <span className="flex items-center gap-1 text-[9px] text-green-400">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      ) : (
                        <span
                          className="text-[9px] px-1.5 py-0.5 border border-primary/30 bg-primary/10 text-primary font-bold tracking-widest uppercase"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {inv.status === "void" ? "Void" : "Active"}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Copy link */}
                  {link && (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(link);
                          addToast({
                            type: "success",
                            title: "Copied",
                            message: "Payment link copied to clipboard.",
                            duration: 3000,
                          });
                        } catch {
                          addToast({
                            type: "error",
                            title: "Copy failed",
                            message: "Could not copy to clipboard.",
                            duration: 4000,
                          });
                        }
                      }}
                      className="h-8 w-8 border border-border/60 flex items-center justify-center hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors shrink-0"
                      title="Copy link"
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Open in Stripe */}
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 w-8 border border-border/60 flex items-center justify-center hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors shrink-0"
                      title="Open in Stripe"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
