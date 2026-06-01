/**
 * Sub-Contractors — crew roster with trade, license, and briefing dispatch.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { SkeletonCard } from "@/components/Skeletons";
import { QueryError } from "@/components/QueryError";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useIsMobile } from "@/hooks/useMobile";
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
  Phone,
  Plus,
  Send,
  Shield,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";

const TRADES = [
  "Electrical",
  "Plumbing",
  "HVAC",
  "Roofing",
  "Painting",
  "Drywall",
  "Framing",
  "Concrete",
  "Landscaping",
  "Flooring",
  "Cabinetry",
  "General",
];

export default function SubContractorsList() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    trade: "",
    licenseNumber: "",
    notes: "",
  });
  const utils = trpc.useUtils();
  const isMobile = useIsMobile();
  const {
    data: subs,
    isLoading,
    isError,
    refetch,
  } = trpc.subContractors.list.useQuery();

  const createMut = useMutationWithToast(
    trpc.subContractors.create.useMutation(),
    {
      success: "Sub Added",
      successMessage: "Sub-contractor added to roster.",
      error: "Create Failed",
      errorMessage: "Failed to add sub-contractor. Please try again.",
      invalidate: () => utils.subContractors.list.invalidate(),
      onSuccess: () => {
        setShowNew(false);
        setForm({
          name: "",
          company: "",
          email: "",
          phone: "",
          trade: "",
          licenseNumber: "",
          notes: "",
        });
      },
    }
  );

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
        {showNew && (
          <div className="bg-card border border-primary/30 p-6 mb-5 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              New Sub-Contractor
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
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createMut.mutate({
                    ...form,
                    trade: form.trade
                      ? (form.trade.toLowerCase() as Parameters<
                          typeof createMut.mutate
                        >[0]["trade"])
                      : undefined,
                  })
                }
                disabled={!form.name || createMut.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {createMut.isPending ? "Saving…" : "Save"}
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
          <div className="bg-card border border-border/60 p-12 text-center">
            <HardHat className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-3">
              No sub-contractors added
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="text-primary text-sm underline"
            >
              Add your first sub
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {subs.map((sub: any) => (
              <div
                key={sub.id}
                className="bg-card border border-border/60 p-4 hover:border-primary/20 transition-colors"
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
                      briefMut.mutate({
                        subContractorId: sub.id,
                        projectId: 1,
                        scheduleDetails: "See schedule",
                      })
                    }
                    disabled={briefMut.isPending}
                    className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 disabled:opacity-50 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Send className="h-3 w-3" /> Send Briefing
                  </button>
                  <div className="flex-1" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-muted-foreground/30 hover:text-destructive transition-colors">
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
      </div>
    </DashboardLayout>
  );
}
