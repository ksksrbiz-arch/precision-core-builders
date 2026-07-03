/**
 * Client Portal — Payments & Estimates
 * Shows the client their project estimates, payment milestones, and approval status.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { fmtDate } from "@/lib/formatters";
import { SITE } from "@/const";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { SkeletonCard } from "@/components/Skeletons";
import {
  buildFreePaymentLinks,
  hasAnyFreePaymentMethod,
} from "@/lib/freePayments";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Mail,
  Send,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useLocation } from "wouter";

const MILESTONE_LABELS: Record<number, { label: string; pct: number }> = {
  0: { label: "Contract / Mobilization", pct: 10 },
  1: { label: "Foundation / Demo Complete", pct: 20 },
  2: { label: "Framing & Rough-In", pct: 30 },
  3: { label: "Drywall / Sheathing", pct: 20 },
  4: { label: "Finish Work", pct: 10 },
  5: { label: "Final Walkthrough", pct: 10 },
};

function fmtMoney(n: number | null | undefined) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null | undefined) {
  return fmtDate(d, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PortalPayments() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Resolve the project the same way the portal dashboard does: portal clients
  // use the client-scoped `myProject`; admins previewing the portal use `list`.
  // The old unscoped `list` leaked the newest system-wide project to clients.
  const isAdmin = user?.role === "admin";
  const { data: myProject } = trpc.projects.myProject.useQuery(undefined, {
    enabled: !!user && !isAdmin,
  });
  const { data: adminProjects } = trpc.projects.list.useQuery(
    { pageSize: 1 },
    { enabled: !!user && isAdmin }
  );
  const project = isAdmin ? adminProjects?.data?.[0] : myProject;

  const { data: estimatesResult, isLoading } =
    trpc.estimates.listForClient.useQuery(
      { projectId: project?.id },
      { enabled: !!user }
    );

  const estimates = estimatesResult?.data ?? [];
  const latestEstimate = estimates[0];

  // Derive milestone payment schedule from the latest approved estimate
  const midValue = latestEstimate?.estimated_mid ?? 0;
  const milestones = Object.entries(MILESTONE_LABELS).map(([idx, m]) => ({
    ...m,
    idx: Number(idx),
    amount: Math.round((midValue * m.pct) / 100),
    // Mark milestone paid once real project completion exceeds its threshold.
    // The schema column is `completion_percent` (see PortalDashboard).
    paid:
      project?.completion_percent != null
        ? project.completion_percent >= [10, 30, 60, 80, 90, 100][Number(idx)]
        : false,
  }));

  // Outstanding balance = sum of milestone amounts not yet marked paid.
  const outstandingDollars = milestones
    .filter(m => !m.paid)
    .reduce((sum, m) => sum + m.amount, 0);

  // Free, zero-key pay links (PayPal.me / Venmo / Zelle / mailto invoice) for
  // the outstanding balance. Empty when no handles are configured — the page
  // then falls back to the "call Eric" note below.
  const payLinks =
    midValue > 0 && outstandingDollars > 0 && hasAnyFreePaymentMethod()
      ? buildFreePaymentLinks({
          amountCents: Math.round(outstandingDollars * 100),
          description: `${project?.name ?? "Project"} — outstanding balance`,
          clientEmail: user?.email ?? undefined,
          clientName: user?.name ?? undefined,
          projectName: project?.name ?? undefined,
        })
      : [];

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <PortalLayout>
      <div className="container max-w-3xl py-10">
        {/* Back */}
        <button
          onClick={() => setLocation("/portal")}
          className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors mb-8"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Overview
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 bg-primary/10 border border-primary/20 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Payments & Estimates
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Your project estimate, payment schedule, and invoice history.
          </p>
        </motion.div>

        {isLoading ? (
          <SkeletonCard count={3} />
        ) : !project && !latestEstimate ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border/60 p-12 text-center"
          >
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-2">
              No active project found for your account yet.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Contact Eric at{" "}
              <a href={SITE.phoneHref} className="text-primary hover:underline">
                {SITE.phone}
              </a>
            </p>
          </motion.div>
        ) : !latestEstimate ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border/60 p-12 text-center"
          >
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              No estimates on file yet. Eric will upload your project estimate
              once the scope is finalized.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Estimate Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-card border border-border/60 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Project Estimate
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {latestEstimate.approved_by_client ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                    </span>
                  ) : latestEstimate.sent_to_client ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-amber-400">
                      <Send className="h-3.5 w-3.5" /> Pending Review
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Draft
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
                  {[
                    {
                      label: "Conservative",
                      value: fmtMoney(latestEstimate.estimated_low),
                    },
                    {
                      label: "Mid-Range",
                      value: fmtMoney(latestEstimate.estimated_mid),
                      highlight: true,
                    },
                    {
                      label: "Premium",
                      value: fmtMoney(latestEstimate.estimated_high),
                    },
                  ].map(r => (
                    <div
                      key={r.label}
                      className={`p-3 border text-center ${
                        r.highlight
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40"
                      }`}
                    >
                      <p
                        className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-1"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {r.label}
                      </p>
                      <p
                        className={`text-lg font-bold ${r.highlight ? "text-primary" : "text-foreground"}`}
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {r.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                {(latestEstimate.labor_cost ||
                  latestEstimate.materials_cost) && (
                  <div className="border border-border/40 divide-y divide-border/30 mb-4">
                    {[
                      { label: "Labor", value: latestEstimate.labor_cost },
                      {
                        label: "Materials",
                        value: latestEstimate.materials_cost,
                      },
                      {
                        label: "Permits & Fees",
                        value: latestEstimate.permits_cost,
                      },
                      {
                        label: "Contingency",
                        value: latestEstimate.contingency,
                      },
                    ]
                      .filter(r => r.value)
                      .map(r => (
                        <div
                          key={r.label}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <span className="text-xs text-muted-foreground">
                            {r.label}
                          </span>
                          <span className="text-xs font-semibold">
                            {fmtMoney(r.value)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Prepared {formatDate(latestEstimate.created_at)}</span>
                  {latestEstimate.expires_at && (
                    <span>
                      Valid until {formatDate(latestEstimate.expires_at)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Payment Milestone Schedule */}
            {midValue > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="bg-card border border-border/60 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-5 border-b border-border/40">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Payment Schedule
                  </span>
                </div>

                <div className="divide-y divide-border/30">
                  {milestones.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5"
                    >
                      <div
                        className={`h-7 w-7 flex items-center justify-center shrink-0 border ${
                          m.paid
                            ? "bg-green-400/10 border-green-400/30"
                            : "bg-muted/30 border-border/40"
                        }`}
                      >
                        {m.paid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <span
                            className="text-[10px] font-bold text-muted-foreground"
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${m.paid ? "text-muted-foreground line-through" : "text-foreground"}`}
                        >
                          {m.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {m.pct}% of contract
                        </p>
                      </div>
                      <p
                        className={`text-sm font-bold shrink-0 ${m.paid ? "text-green-400" : "text-foreground"}`}
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {fmtMoney(m.amount)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between px-5 py-4 bg-primary/5 border-t border-primary/20">
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Total Contract Value
                  </span>
                  <span
                    className="text-base font-bold text-primary"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {fmtMoney(midValue)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Pay Outstanding Balance — free, zero-key links */}
            {payLinks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="bg-card border border-primary/30 overflow-hidden"
              >
                <div className="flex items-center justify-between p-5 border-b border-primary/20">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span
                      className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Pay Outstanding Balance
                    </span>
                  </div>
                  <span
                    className="text-base font-bold text-primary"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {fmtMoney(outstandingDollars)}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {payLinks.map(link => (
                      <a
                        key={link.provider}
                        href={link.url}
                        target={link.isMailto ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 border border-border/60 px-4 py-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {link.isMailto ? (
                          <Mail className="h-3.5 w-3.5" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        {link.provider === "paypal" || link.provider === "venmo"
                          ? `Pay with ${link.label}`
                          : link.label}
                      </a>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
                    Payments are processed directly by the provider — no fees
                    are added by Precision Core Builders.
                  </p>
                </div>
              </motion.div>
            )}

            {/* All Estimates History */}
            {estimates.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="bg-card border border-border/60 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-5 border-b border-border/40">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Estimate History
                  </span>
                </div>
                <div className="divide-y divide-border/30">
                  {estimates.map((est: any) => (
                    <div
                      key={est.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {est.projects?.name ?? "Project Estimate"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(est.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {fmtMoney(est.estimated_mid)}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                            est.approved_by_client
                              ? "text-green-400"
                              : est.sent_to_client
                                ? "text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {est.approved_by_client
                            ? "Approved"
                            : est.sent_to_client
                              ? "Sent"
                              : "Draft"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Contact note */}
            <p className="text-xs text-muted-foreground text-center pb-4">
              Questions about your estimate or payments?{" "}
              <a href={SITE.phoneHref} className="text-primary hover:underline">
                Call Eric at {SITE.phone}
              </a>
            </p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
