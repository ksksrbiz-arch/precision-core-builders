/**
 * Sub-Contractors — crew roster with trade, license, and briefing dispatch.
 */
import { useAllProjects } from "@/hooks/useAllPages";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { SkeletonCard } from "@/components/Skeletons";
import { QueryError } from "@/components/QueryError";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useIsMobile } from "@/hooks/useMobile";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { getAuthHeader } from "@/lib/authHeader";
import { trpc } from "@/lib/trpc";
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
import {
  HardHat,
  Mail,
  Pencil,
  Phone,
  Plus,
  Send,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import {
  EMPTY_SUB_FORM,
  SUB_TRADES as TRADES,
  buildSubPayload,
  insuranceStatus,
  subToForm,
  type SubForm,
} from "@/lib/subContractors";

export default function SubContractorsList() {
  const [showNew, setShowNew] = useState(false);
  const [briefingTarget, setBriefingTarget] = useState<{
    id: number;
    name: string;
    trade: string | null;
  } | null>(null);
  const [briefingProjectId, setBriefingProjectId] = useState<number | null>(
    null
  );
  const [briefingSchedule, setBriefingSchedule] = useState("See schedule");
  const [briefingAccess, setBriefingAccess] = useState("");
  const [briefingSafety, setBriefingSafety] = useState("");
  const [briefingDrafting, setBriefingDrafting] = useState(false);
  const [briefingDraftError, setBriefingDraftError] = useState("");

  const draftBriefing = async () => {
    if (!briefingTarget || !briefingProjectId) return;
    setBriefingDrafting(true);
    setBriefingDraftError("");
    try {
      const res = await fetch("/api/ai-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          kind: "sub-briefing",
          projectId: briefingProjectId,
          trade: briefingTarget.trade ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Drafting failed. Please try again.");
      }
      if (data.scheduleDetails)
        setBriefingSchedule(String(data.scheduleDetails));
      if (typeof data.safetyNotes === "string")
        setBriefingSafety(data.safetyNotes);
    } catch (err) {
      setBriefingDraftError(
        err instanceof Error
          ? err.message
          : "Drafting failed. Please try again."
      );
    } finally {
      setBriefingDrafting(false);
    }
  };
  // The same form serves "new" (editingId === null) and "edit".
  const [form, setForm] = useState<SubForm>(EMPTY_SUB_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const formOpen = showNew || editingId !== null;
  const closeForm = () => {
    setShowNew(false);
    setEditingId(null);
    setForm(EMPTY_SUB_FORM);
  };
  const startEdit = (sub: any) => {
    setShowNew(false);
    setEditingId(sub.id);
    setForm(subToForm(sub));
  };
  const utils = trpc.useUtils();
  const isMobile = useIsMobile();
  const {
    data: subs,
    isLoading,
    isError,
    refetch,
  } = trpc.subContractors.list.useQuery();
  const { data: projectsData } = useAllProjects();

  // Live updates: roster changes from another device refresh the list.
  useRealtimeTable({
    table: "sub_contractors",
    onUpdate: () => utils.subContractors.list.invalidate(),
  });
  const activeProjects = (projectsData?.data ?? []).filter(
    (p: any) => p.status !== "complete" && p.status !== "archived"
  );

  const createMut = useMutationWithToast(
    trpc.subContractors.create.useMutation(),
    {
      success: "Sub Added",
      successMessage: "Sub-contractor added to roster.",
      error: "Create Failed",
      errorMessage: "Failed to add sub-contractor. Please try again.",
      invalidate: () => utils.subContractors.list.invalidate(),
      onSuccess: closeForm,
    }
  );

  const updateMut = useMutationWithToast(
    trpc.subContractors.update.useMutation(),
    {
      success: "Sub Updated",
      successMessage: "Sub-contractor details saved.",
      error: "Update Failed",
      errorMessage: "Failed to update sub-contractor. Please try again.",
      invalidate: () => utils.subContractors.list.invalidate(),
      onSuccess: closeForm,
    }
  );

  const saveForm = () => {
    if (!form.name.trim()) return;
    if (editingId !== null) {
      updateMut.mutate({
        id: editingId,
        ...buildSubPayload(form, null),
        isActive: form.isActive,
      });
    } else {
      createMut.mutate(
        buildSubPayload(form, undefined) as Parameters<
          typeof createMut.mutate
        >[0]
      );
    }
  };
  const isSaving = createMut.isPending || updateMut.isPending;

  const deleteMut = useMutationWithToast(
    trpc.subContractors.delete.useMutation(),
    {
      success: "Sub Removed",
      successMessage: "Sub-contractor deleted.",
      error: "Delete Failed",
      errorMessage: "Failed to delete sub-contractor. Please try again.",
      invalidate: () => utils.subContractors.list.invalidate(),
    }
  );

  const briefMut = useMutationWithToast(
    trpc.subContractors.sendBriefing.useMutation(),
    {
      success: "Briefing Sent",
      error: "Send Failed",
      errorMessage: "Failed to send briefing. Please try again.",
      onSuccess: () => {
        setBriefingTarget(null);
        setBriefingProjectId(null);
        setBriefingSchedule("See schedule");
        setBriefingAccess("");
        setBriefingSafety("");
      },
    }
  );

  const tradeColor = (trade: string | null) => {
    const t = (trade ?? "").toLowerCase();
    if (t.includes("electric"))
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    if (t.includes("plumb"))
      return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    if (t.includes("roof"))
      return "text-red-400 bg-red-400/10 border-red-400/30";
    if (t.includes("paint"))
      return "text-purple-400 bg-purple-400/10 border-purple-400/30";
    if (t.includes("hvac"))
      return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
    if (t.includes("concrete") || t.includes("frame"))
      return "text-stone-400 bg-stone-400/10 border-stone-400/30";
    return "text-primary bg-primary/10 border-primary/30";
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <AdminPageHeader
          title="Sub-Contractors"
          guideId="sub-contractors"
          description="Manage trade partners, licenses, and dispatch briefings with confidence."
          actions={
            <button
              onClick={() => setShowNew(true)}
              className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Sub
            </button>
          }
        />

        {/* New sub form */}
        {formOpen && (
          <div className="bg-card border border-primary/30 p-6 mb-5 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {editingId !== null
                ? "Edit Sub-Contractor"
                : "New Sub-Contractor"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: "name", label: "Contact Name *", type: "text" },
                { key: "company", label: "Company", type: "text" },
                { key: "email", label: "Email", type: "email" },
                { key: "phone", label: "Phone", type: "tel" },
                { key: "licenseNumber", label: "License #", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label
                    className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e =>
                      setForm(prev => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                  />
                </div>
              ))}
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Trade
                </label>
                <select
                  value={form.trade}
                  onChange={e =>
                    setForm(prev => ({ ...prev, trade: e.target.value }))
                  }
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                >
                  <option value="">Select trade…</option>
                  {TRADES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  {/* A legacy free-text trade must stay selectable on edit. */}
                  {form.trade &&
                    !(TRADES as readonly string[]).includes(form.trade) && (
                      <option value={form.trade}>{form.trade}</option>
                    )}
                </select>
              </div>
              <div>
                <label
                  htmlFor="sub-insurance-expiry"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Insurance Expires
                </label>
                <input
                  id="sub-insurance-expiry"
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      insuranceExpiry: e.target.value,
                    }))
                  }
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                />
              </div>
              <div>
                <label
                  htmlFor="sub-rating"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Rating
                </label>
                <select
                  id="sub-rating"
                  value={form.rating}
                  onChange={e =>
                    setForm(prev => ({ ...prev, rating: e.target.value }))
                  }
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                >
                  <option value="">Not rated</option>
                  {[5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={String(r)}>
                      {"★".repeat(r)} ({r})
                    </option>
                  ))}
                </select>
              </div>
              {editingId !== null && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e =>
                      setForm(prev => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                  Active — available for new briefings and scheduling
                </label>
              )}
            </div>
            <div>
              <label
                htmlFor="sub-notes"
                className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Notes
              </label>
              <textarea
                id="sub-notes"
                rows={2}
                value={form.notes}
                onChange={e =>
                  setForm(prev => ({ ...prev, notes: e.target.value }))
                }
                className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeForm}
                className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={!form.name.trim() || isSaving}
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Sub list */}
        {isLoading ? (
          <SkeletonCard count={4} />
        ) : isError ? (
          <QueryError
            message="We couldn't load sub-contractors. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : !subs?.length ? (
          <Empty className="bg-card border border-border/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HardHat />
              </EmptyMedia>
              <EmptyTitle>No sub-contractors yet</EmptyTitle>
              <EmptyDescription>
                Build your trade roster to track licenses and dispatch briefings
                in a few taps.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => setShowNew(true)}
                className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Your First Sub
              </button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {subs.map((sub: any) => (
              <div
                key={sub.id}
                className={`bg-card border border-border/60 p-4 hover:border-primary/20 transition-colors ${
                  sub.is_active === false ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{sub.name}</p>
                    {sub.company && (
                      <p className="text-xs text-muted-foreground">
                        {sub.company}
                      </p>
                    )}
                  </div>
                  {sub.trade && (
                    <span
                      className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 border ${tradeColor(sub.trade)}`}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {sub.trade}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                  {sub.phone && (
                    <a
                      href={`tel:${sub.phone}`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      {sub.phone}
                    </a>
                  )}
                  {sub.email && (
                    <a
                      href={`mailto:${sub.email}`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      {sub.email}
                    </a>
                  )}
                  {sub.license_number && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-primary" />
                      {sub.license_number}
                    </span>
                  )}
                </div>

                {/* Mobile: one-tap call / email buttons */}
                {isMobile && (sub.phone || sub.email) && (
                  <div className="flex gap-2 mb-3">
                    {sub.phone && (
                      <a
                        href={`tel:${sub.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-primary/40 bg-primary/5 text-primary text-[11px] font-bold tracking-widest uppercase active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        <Phone className="h-4 w-4" /> Call
                      </a>
                    )}
                    {sub.email && (
                      <a
                        href={`mailto:${sub.email}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        <Mail className="h-4 w-4" /> Email
                      </a>
                    )}
                  </div>
                )}

                {(() => {
                  const ins = insuranceStatus(sub.insurance_expiry);
                  if (!ins) return null;
                  const tone =
                    ins.status === "expired"
                      ? "text-red-400 bg-red-400/10 border-red-400/30"
                      : ins.status === "expiring"
                        ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
                        : "text-green-400 bg-green-400/10 border-green-400/30";
                  const label =
                    ins.status === "expired"
                      ? `Insurance expired ${Math.abs(ins.daysLeft)}d ago`
                      : ins.status === "expiring"
                        ? `Insurance expires in ${ins.daysLeft}d`
                        : "Insured";
                  return (
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 border mb-3 ${tone}`}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      <Shield className="h-3 w-3" /> {label}
                    </span>
                  );
                })()}
                {sub.is_active === false && (
                  <span
                    className="inline-flex ml-2 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 border border-border/60 text-muted-foreground mb-3"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Inactive
                  </span>
                )}

                {sub.rating && (
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < sub.rating ? "text-primary fill-primary" : "text-border"}`}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                  <button
                    onClick={() =>
                      setBriefingTarget({
                        id: sub.id,
                        name: sub.name,
                        trade: sub.trade ?? null,
                      })
                    }
                    disabled={briefMut.isPending}
                    className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 disabled:opacity-50 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Send className="h-3 w-3" /> Send Briefing
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => startEdit(sub)}
                    aria-label={`Edit ${sub.name}`}
                    className="text-muted-foreground/60 hover:text-primary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        aria-label={`Remove ${sub.name}`}
                        className="text-muted-foreground/30 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {sub.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the sub-contractor from your roster.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMut.mutate({ id: sub.id })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Briefing dialog: requires an explicit project so we don't ship
            the wrong client/address/scope to subs (was hardcoded to project #1).
            Uses ui/dialog (Radix) instead of a hand-rolled overlay so it gets
            a focus trap, Escape-to-close, and focus restoration for free. */}
        <Dialog
          open={!!briefingTarget}
          onOpenChange={open => {
            if (!open) setBriefingTarget(null);
          }}
        >
          <DialogContent className="bg-card border border-primary/30 max-w-md">
            <DialogHeader>
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-1"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Send Briefing
              </p>
              <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>
                {briefingTarget?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="briefing-project"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Project *
                </label>
                <select
                  id="briefing-project"
                  value={briefingProjectId ?? ""}
                  onChange={e =>
                    setBriefingProjectId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                >
                  <option value="">Select a project…</option>
                  {activeProjects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.address ? ` — ${p.address}` : ""}
                    </option>
                  ))}
                </select>
                {activeProjects.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    No active projects. Create one before sending a briefing.
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground block"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Schedule Details *
                  </label>
                  <button
                    type="button"
                    onClick={draftBriefing}
                    disabled={!briefingProjectId || briefingDrafting}
                    title={
                      briefingProjectId
                        ? "Fill schedule & safety from the project's live plan"
                        : "Select a project first"
                    }
                    className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 disabled:opacity-40 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Sparkles className="h-3 w-3" />
                    {briefingDrafting ? "Drafting…" : "Draft with AI"}
                  </button>
                </div>
                <input
                  type="text"
                  value={briefingSchedule}
                  onChange={e => setBriefingSchedule(e.target.value)}
                  placeholder="e.g. Mon-Wed 7am-3pm framing"
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                />
                {briefingDraftError && (
                  <p className="text-[11px] text-destructive mt-1">
                    {briefingDraftError}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Site Access Code
                </label>
                <input
                  type="text"
                  value={briefingAccess}
                  onChange={e => setBriefingAccess(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Safety Notes
                </label>
                <textarea
                  value={briefingSafety}
                  onChange={e => setBriefingSafety(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setBriefingTarget(null)}
                  className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (
                      !briefingTarget ||
                      !briefingProjectId ||
                      !briefingSchedule.trim()
                    )
                      return;
                    briefMut.mutate({
                      subContractorId: briefingTarget.id,
                      projectId: briefingProjectId,
                      scheduleDetails: briefingSchedule.trim(),
                      siteAccessCode: briefingAccess.trim() || undefined,
                      safetyNotes: briefingSafety.trim() || undefined,
                    });
                  }}
                  disabled={
                    !briefingProjectId ||
                    !briefingSchedule.trim() ||
                    briefMut.isPending
                  }
                  className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {briefMut.isPending ? "Sending…" : "Send Briefing"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
