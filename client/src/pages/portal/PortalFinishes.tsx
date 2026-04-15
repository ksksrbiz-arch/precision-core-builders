/**
 * Client Portal — Finish Selections
 * Client reviews and approves material/finish choices with real-time budget impact.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ASSETS } from "@/const";
import { motion } from "framer-motion";
import { ArrowLeft, Check, DollarSign, LogOut, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/components/ToastProvider";

function PortalNav() {
  const { signOut } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[64px] flex items-center border-b border-border/50 bg-background/95 backdrop-blur-md">
      <div className="container flex items-center justify-between">
        <a href="/" aria-label="Home">
          <img
            src={ASSETS.logo}
            alt="Precision Core Builders"
            className="h-8 w-auto"
          />
        </a>
        <nav className="hidden sm:flex items-center gap-6">
          {[
            { label: "Overview", href: "/portal" },
            { label: "Reports", href: "/portal/reports" },
            { label: "Selections", href: "/portal/finishes" },
            { label: "Ledger", href: "/portal/ledger" },
            { label: "Payments", href: "/portal/payments" },
          ].map(n => (
            <a
              key={n.href}
              href={n.href}
              className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-destructive transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </header>
  );
}

export default function PortalFinishes() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: projects } = trpc.projects.list.useQuery(
    { pageSize: 1 },
    { enabled: !!user }
  );
  const project = projects?.data?.[0];

  const { data: selections, isLoading } = trpc.finishSelections.list.useQuery(
    { projectId: project?.id! },
    { enabled: !!project?.id }
  );
  const { data: budgetImpact } =
    trpc.finishSelections.calcBudgetImpact.useQuery(
      { projectId: project?.id! },
      { enabled: !!project?.id }
    );

  const approveMut = trpc.finishSelections.clientApprove.useMutation({
    onSuccess: () => {
      utils.finishSelections.list.invalidate();
      addToast({ type: "success", title: "Selection Approved", message: "Your selection has been recorded.", duration: 4000 });
    },
  });

  const fmt = (n: number | string | null | undefined) =>
    n ? `$${Number(n).toLocaleString()}` : "—";
  const totalDelta = budgetImpact?.totalDelta ?? 0;

  // Group by room
  const grouped = (selections ?? []).reduce(
    (acc: Record<string, any[]>, s: any) => {
      const room = s.room || "General";
      if (!acc[room]) acc[room] = [];
      acc[room].push(s);
      return acc;
    },
    {} as Record<string, any[]>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PortalNav />
      <main className="pt-[64px]">
        <div className="container py-10 max-w-3xl">
          <button
            onClick={() => setLocation("/portal")}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Portal
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary mb-2"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Finish Selections
            </p>
            <h1
              className="text-3xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Material & Finish Choices
            </h1>
            <p className="text-sm text-muted-foreground font-light mb-4">
              Review your selections and approve to lock in pricing.
            </p>

            {/* Budget impact summary */}
            {selections && selections.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 border ${
                    totalDelta > 0
                      ? "border-red-400/30 bg-red-400/5 text-red-400"
                      : totalDelta < 0
                        ? "border-green-400/30 bg-green-400/5 text-green-400"
                        : "border-border/60 bg-card text-muted-foreground"
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-sm font-semibold">
                    Net budget impact: {totalDelta > 0 ? "+" : ""}
                    {fmt(totalDelta)}
                  </span>
                </div>
                {budgetImpact && budgetImpact.pendingApproval > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 border border-amber-400/30 bg-amber-400/5 text-amber-400">
                    <span className="text-sm font-semibold">
                      {budgetImpact.pendingApproval} selection{budgetImpact.pendingApproval > 1 ? "s" : ""} awaiting your approval
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {isLoading ? (
            <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
              Loading selections…
            </div>
          ) : !selections?.length ? (
            <div className="bg-card border border-border/60 p-12 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                No finish selections yet. Eric will add options as your project
                progresses.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([room, items]) => (
                <div key={room}>
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {room}
                  </p>
                  <div className="space-y-2">
                    {(items as any[]).map((sel: any) => (
                      <div
                        key={sel.id}
                        className="bg-card border border-border/60 p-4 flex items-start gap-4"
                      >
                        {/* Swatch / image */}
                        {sel.image_url ? (
                          <img
                            src={sel.image_url}
                            alt={sel.item_name}
                            className="h-16 w-16 object-cover border border-border/40 shrink-0"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-input border border-border/40 flex items-center justify-center shrink-0">
                            <Sparkles className="h-5 w-5 text-muted-foreground/20" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {sel.item_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[
                                  sel.brand,
                                  sel.color_name,
                                  sel.sku ? `SKU: ${sel.sku}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">
                                {fmt(sel.total_cost)}
                              </p>
                              {sel.budget_delta != null &&
                                Number(sel.budget_delta) !== 0 && (
                                  <p
                                    className={`text-xs font-bold ${Number(sel.budget_delta) > 0 ? "text-red-400" : "text-green-400"}`}
                                  >
                                    {Number(sel.budget_delta) > 0 ? "+" : ""}
                                    {fmt(sel.budget_delta)}
                                  </p>
                                )}
                            </div>
                          </div>
                          {sel.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-1 font-light">
                              {sel.notes}
                            </p>
                          )}

                          {/* Approval */}
                          <div className="mt-3 flex items-center gap-3">
                            {sel.client_approved ? (
                              <span
                                className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-400"
                                style={{ fontFamily: "var(--font-condensed)" }}
                              >
                                <Check className="h-3 w-3" /> Approved{" "}
                                {sel.client_approved_at
                                  ? new Date(
                                      sel.client_approved_at
                                    ).toLocaleDateString()
                                  : ""}
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  approveMut.mutate({ id: sel.id })
                                }
                                disabled={approveMut.isPending}
                                className="text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 border border-primary/30 px-3 py-1 hover:bg-primary/5 disabled:opacity-50 transition-all"
                                style={{ fontFamily: "var(--font-condensed)" }}
                              >
                                Approve Selection
                              </button>
                            )}
                            {sel.eric_approved && (
                              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                                <Check className="h-2.5 w-2.5" /> Confirmed by
                                Eric
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
