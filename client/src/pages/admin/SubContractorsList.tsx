/**
 * Sub-Contractors — crew roster with trade, license, and briefing dispatch.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { useToast } from "@/components/ToastProvider";
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
  const { addToast } = useToast();

  const utils = trpc.useUtils();
  const { data: subs, isLoading } = trpc.subContractors.list.useQuery();
  const createMut = trpc.subContractors.create.useMutation({
    onSuccess: () => {
      utils.subContractors.list.invalidate();
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
      addToast({
        type: "success",
        title: "Added",
        message: "Sub-contractor added to roster.",
        duration: 4000,
      });
    },
    onError: () => {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to add sub-contractor. Please try again.",
        duration: 6000,
      });
    },
  });
  const deleteMut = trpc.subContractors.delete.useMutation({
    onSuccess: () => {
      utils.subContractors.list.invalidate();
      addToast({
        type: "success",
        title: "Removed",
        message: "Sub-contractor deleted.",
        duration: 4000,
      });
    },
    onError: () => {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to delete sub-contractor. Please try again.",
        duration: 6000,
      });
    },
  });
  const briefMut = trpc.subContractors.sendBriefing.useMutation({
    onSuccess: d => {
      addToast({
        type: "success",
        title: "Sent",
        message: `Briefing sent to ${d.subName}.`,
        duration: 4000,
      });
    },
    onError: () => {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to send briefing. Please try again.",
        duration: 6000,
      });
    },
  });

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Sub-Contractors
            </h1>
            <GuideHelpButton guideId="sub-contractors" />
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Sub
          </button>
        </div>

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
                onClick={() => createMut.mutate(form)}
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
          <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
            Loading…
          </div>
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
