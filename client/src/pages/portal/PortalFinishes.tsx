/**
 * Client Portal — Finish Selections
 * Client reviews and approves material/finish choices with real-time budget impact.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import { PortalLayout } from "@/components/layout/PortalLayout";
import PortalAssistant from "@/components/PortalAssistant";
import { motion } from "framer-motion";
import { ArrowLeft, Check, DollarSign, Plus, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/components/ToastProvider";

/**
 * Curated finish options the client can choose from, grouped by category.
 * `delta` is the budget impact (in dollars) relative to the base allowance.
 */
const FINISH_OPTIONS: {
  category: string;
  options: { label: string; delta: number }[];
}[] = [
  {
    category: "Countertops",
    options: [
      { label: "Quartz (Standard)", delta: 0 },
      { label: "Granite", delta: 1200 },
      { label: "Natural Marble", delta: 3500 },
    ],
  },
  {
    category: "Flooring",
    options: [
      { label: "Engineered Hardwood (Standard)", delta: 0 },
      { label: "Luxury Vinyl Plank", delta: -800 },
      { label: "Natural Stone Tile", delta: 2400 },
    ],
  },
  {
    category: "Cabinetry",
    options: [
      { label: "Shaker (Standard)", delta: 0 },
      { label: "Custom Inset", delta: 4000 },
    ],
  },
  {
    category: "Fixtures",
    options: [
      { label: "Brushed Nickel (Standard)", delta: 0 },
      { label: "Matte Black", delta: 350 },
      { label: "Polished Brass", delta: 600 },
    ],
  },
];

export default function PortalFinishes() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Portal clients use myProject; admins previewing the portal use list.
  const isAdmin = user?.role === "admin";
  const { data: myProject } = trpc.projects.myProject.useQuery(undefined, {
    enabled: !!user && !isAdmin,
  });
  const { data: adminProjects } = trpc.projects.list.useQuery(
    { pageSize: 1 },
    { enabled: !!user && isAdmin }
  );
  const project = isAdmin ? adminProjects?.data?.[0] : myProject;

  const { data: selections, isLoading } = trpc.finishSelections.list.useQuery(
    { projectId: project?.id! },
    { enabled: !!project?.id }
  );
  const { data: budgetImpact } =
    trpc.finishSelections.calcBudgetImpact.useQuery(
      { projectId: project?.id! },
      { enabled: !!project?.id }
    );

  const refetchFinishes = () => {
    if (!project?.id) return;
    utils.finishSelections.list.invalidate({ projectId: project.id });
    utils.finishSelections.calcBudgetImpact.invalidate({
      projectId: project.id,
    });
  };

  // Live: budget impact and selections update as Eric edits them
  useRealtimeTable({
    table: "finish_selections",
    onUpdate: () => {
      if (project?.id) refetchFinishes();
    },
  });

  const approveMut = trpc.finishSelections.clientApprove.useMutation({
    onSuccess: () => {
      refetchFinishes();
      addToast({
        type: "success",
        title: "Selection Approved",
        message: "Your selection has been recorded.",
        duration: 4000,
      });
    },
  });

  const selectMut = trpc.finishSelections.select.useMutation({
    onSuccess: () => {
      refetchFinishes();
      addToast({
        type: "success",
        title: "Selection Saved",
        message: "Your finish choice has been recorded.",
        duration: 4000,
      });
    },
    onError: err => {
      addToast({
        type: "error",
        title: "Could Not Save Selection",
        message: err.message,
        duration: 5000,
      });
    },
  });

  const chooseFinish = (
    category: string,
    option: { label: string; delta: number }
  ) => {
    if (!project?.id) return;
    selectMut.mutate({
      projectId: project.id,
      category,
      selection: option.label,
      budgetImpact: option.delta,
    });
  };

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
    <PortalLayout>
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
            className="text-2xl sm:text-3xl font-semibold mb-2"
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
                    {budgetImpact.pendingApproval} selection
                    {budgetImpact.pendingApproval > 1 ? "s" : ""} awaiting your
                    approval
                  </span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {!project ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-light mb-1">
              No active project found.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Finish selections appear here once your project is set up.
            </p>
          </div>
        ) : (
          <>
            {/* Choose your finishes */}
            <div className="mb-10">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Choose Your Finishes
              </p>
              <div className="space-y-4">
                {FINISH_OPTIONS.map(({ category, options }) => (
                  <div
                    key={category}
                    className="bg-card border border-border/60 p-4"
                  >
                    <p className="text-sm font-semibold mb-3">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {options.map(option => (
                        <button
                          key={option.label}
                          onClick={() => chooseFinish(category, option)}
                          disabled={selectMut.isPending}
                          className="group flex items-center gap-2 border border-border/60 px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-medium">
                            {option.label}
                          </span>
                          {option.delta !== 0 && (
                            <span
                              className={`text-[11px] font-bold ${option.delta > 0 ? "text-red-400" : "text-green-400"}`}
                            >
                              {option.delta > 0 ? "+" : ""}
                              {fmt(option.delta)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
                Loading selections…
              </div>
            ) : !selections?.length ? (
              <div className="bg-card border border-border/60 p-12 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">
                  No finish selections yet. Eric will add options as your
                  project progresses.
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
                                  style={{
                                    fontFamily: "var(--font-condensed)",
                                  }}
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
                                  style={{
                                    fontFamily: "var(--font-condensed)",
                                  }}
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
          </>
        )}

        {/* Finishes assistant */}
        <div className="mt-6">
          <PortalAssistant
            title="Finishes Assistant"
            quickPrompts={[
              "What finishes have I selected?",
              "Which selections affect my budget?",
              "What still needs my approval?",
              "Summarize my selections by room",
            ]}
          />
        </div>
      </div>
    </PortalLayout>
  );
}
