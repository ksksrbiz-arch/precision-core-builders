/**
 * FinishSelectionsAdmin — Manage material & finish selections per project.
 * Add items, approve, track budget impact, and manage client-facing selections.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { QueryError } from "@/components/QueryError";
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
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import {
  Check,
  DollarSign,
  Image,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

const ROOMS = [
  "Kitchen",
  "Master Bath",
  "Guest Bath",
  "Living Room",
  "Dining Room",
  "Bedroom",
  "Entry / Foyer",
  "Laundry",
  "Exterior",
  "General",
];
const CATEGORIES = [
  "Countertops",
  "Flooring",
  "Tile",
  "Cabinetry",
  "Hardware",
  "Lighting",
  "Plumbing Fixtures",
  "Appliances",
  "Paint / Stain",
  "Windows / Doors",
  "Roofing",
  "Siding",
  "Other",
];

const BLANK = {
  room: "",
  category: "",
  itemName: "",
  brand: "",
  sku: "",
  colorName: "",
  imageUrl: "",
  unitPrice: "",
  quantity: "1",
  budgetDelta: "",
  notes: "",
};

function fmt(n: number | string | null | undefined) {
  if (!n && n !== 0) return "—";
  const v = Number(n);
  return v >= 0
    ? `+$${v.toLocaleString()}`
    : `-$${Math.abs(v).toLocaleString()}`;
}

export default function FinishSelectionsAdmin() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const utils = trpc.useUtils();

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 50 });
  const {
    data: selections,
    isLoading,
    isError,
    refetch,
  } = trpc.finishSelections.list.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );
  const { data: budgetImpact } =
    trpc.finishSelections.calcBudgetImpact.useQuery(
      { projectId: selectedProject! },
      { enabled: !!selectedProject }
    );

  const create = useMutationWithToast(
    trpc.finishSelections.create.useMutation(),
    {
      success: "Selection Added",
      successMessage: "Finish selection added.",
      error: "Add Failed",
      invalidate: () => {
        utils.finishSelections.list.invalidate();
        utils.finishSelections.calcBudgetImpact.invalidate();
      },
      onSuccess: () => {
        setShowAdd(false);
        setForm(BLANK);
      },
    }
  );

  const adminApprove = useMutationWithToast(
    trpc.finishSelections.adminApprove.useMutation(),
    {
      success: "Approved",
      error: "Approve Failed",
      invalidate: () => utils.finishSelections.list.invalidate(),
    }
  );

  const del = useMutationWithToast(trpc.finishSelections.delete.useMutation(), {
    success: "Deleted",
    error: "Delete Failed",
    invalidate: () => {
      utils.finishSelections.list.invalidate();
      utils.finishSelections.calcBudgetImpact.invalidate();
    },
  });

  // Live updates: client approvals/changes refresh selections and budget impact.
  useRealtimeTable({
    table: "finish_selections",
    onUpdate: () => {
      utils.finishSelections.list.invalidate();
      utils.finishSelections.calcBudgetImpact.invalidate();
    },
  });

  const f =
    (key: keyof typeof BLANK) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!selectedProject || !form.itemName) return;
    create.mutate({
      projectId: selectedProject,
      room: form.room || undefined,
      category: form.category || undefined,
      itemName: form.itemName,
      brand: form.brand || undefined,
      sku: form.sku || undefined,
      colorName: form.colorName || undefined,
      imageUrl: form.imageUrl || undefined,
      unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
      quantity: form.quantity ? parseFloat(form.quantity) : undefined,
      totalCost:
        form.unitPrice && form.quantity
          ? parseFloat(form.unitPrice) * parseFloat(form.quantity)
          : undefined,
      budgetDelta: form.budgetDelta ? parseFloat(form.budgetDelta) : undefined,
      notes: form.notes || undefined,
    });
  };

  // Group by room
  const grouped = (selections ?? []).reduce(
    (acc: Record<string, any[]>, s: any) => {
      const room = s.room || "General";
      if (!acc[room]) acc[room] = [];
      acc[room].push(s);
      return acc;
    },
    {}
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-y-3 mb-6">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary mb-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Material Selections
            </p>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Finish Selections
            </h1>
            <p className="text-sm text-muted-foreground font-light mt-0.5">
              Manage client-facing material and finish choices with budget
              impact.
            </p>
          </div>
          {selectedProject && (
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Selection
            </button>
          )}
        </div>

        {/* Project selector */}
        <div className="bg-card border border-border/60 p-4 mb-5">
          <select
            value={selectedProject ?? ""}
            onChange={e =>
              setSelectedProject(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full sm:w-80 px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
          >
            <option value="">Select a project…</option>
            {projects?.data.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Budget impact summary */}
        {budgetImpact && (
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {[
              {
                label: "Net Budget Impact",
                value: fmt(budgetImpact.totalDelta),
                color:
                  budgetImpact.totalDelta > 0
                    ? "text-red-400"
                    : budgetImpact.totalDelta < 0
                      ? "text-green-400"
                      : "text-foreground",
              },
              {
                label: "Approved Impact",
                value: fmt(budgetImpact.approvedDelta),
                color: "text-foreground",
              },
              {
                label: "Pending Approval",
                value: `${budgetImpact.pendingApproval} of ${budgetImpact.total}`,
                color: "text-foreground",
              },
            ].map(s => (
              <div
                key={s.label}
                className="bg-card border border-border/60 p-4"
              >
                <p
                  className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {s.label}
                </p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {showAdd && selectedProject && (
          <div className="bg-card border border-primary/30 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">Add Selection</p>
              <button
                onClick={() => setShowAdd(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <select
                value={form.room}
                onChange={f("room")}
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                <option value="">Room…</option>
                {ROOMS.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={form.category}
                onChange={f("category")}
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                <option value="">Category…</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={form.itemName}
                onChange={f("itemName")}
                placeholder="Item name *"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
              <input
                value={form.brand}
                onChange={f("brand")}
                placeholder="Brand / manufacturer"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
              <input
                value={form.colorName}
                onChange={f("colorName")}
                placeholder="Color / finish name"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
              <input
                value={form.sku}
                onChange={f("sku")}
                placeholder="SKU / model number"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
              <input
                value={form.unitPrice}
                onChange={f("unitPrice")}
                type="number"
                placeholder="Unit price ($)"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
              <input
                value={form.quantity}
                onChange={f("quantity")}
                type="number"
                placeholder="Quantity"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
              <input
                value={form.budgetDelta}
                onChange={f("budgetDelta")}
                type="number"
                placeholder="Budget impact (+ or -)"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
              <input
                value={form.imageUrl}
                onChange={f("imageUrl")}
                placeholder="Swatch / image URL"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 sm:col-span-2 lg:col-span-3"
              />
              <textarea
                value={form.notes}
                onChange={f("notes")}
                placeholder="Notes for client…"
                rows={2}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none sm:col-span-2 lg:col-span-3"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!form.itemName || create.isPending}
                className="px-5 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {create.isPending ? "Saving…" : "Add Selection"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-5 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:text-foreground transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* No project selected */}
        {!selectedProject ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Select a project above to manage its finish selections.
            </p>
          </div>
        ) : isLoading ? (
          <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : isError ? (
          <QueryError
            message="We couldn't load finish selections for this project. Try again."
            onRetry={() => refetch()}
          />
        ) : !selections?.length ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-3">
              No selections yet. Add the first one above.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([room, items]) => (
              <div key={room}>
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2"
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
                      {sel.image_url ? (
                        <img
                          src={sel.image_url}
                          alt={sel.item_name}
                          className="h-14 w-14 object-cover border border-border/40 shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 bg-input border border-border/40 flex items-center justify-center shrink-0">
                          <Image className="h-5 w-5 text-muted-foreground/20" />
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
                                sel.category,
                                sel.brand,
                                sel.color_name,
                                sel.sku ? `SKU: ${sel.sku}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            {sel.budget_delta != null &&
                              Number(sel.budget_delta) !== 0 && (
                                <span
                                  className={`text-xs font-bold ${Number(sel.budget_delta) > 0 ? "text-red-400" : "text-green-400"}`}
                                >
                                  {Number(sel.budget_delta) > 0 ? "+" : ""}$
                                  {Math.abs(
                                    Number(sel.budget_delta)
                                  ).toLocaleString()}
                                </span>
                              )}
                          </div>
                        </div>

                        {sel.notes && (
                          <p className="text-xs text-muted-foreground/70 mt-1 font-light">
                            {sel.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span
                            className={`text-[9px] font-bold tracking-widest uppercase ${sel.client_approved ? "text-green-400" : "text-muted-foreground/40"}`}
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            {sel.client_approved
                              ? "✓ Client Approved"
                              : "Awaiting Client"}
                          </span>
                          {!sel.eric_approved && (
                            <button
                              onClick={() =>
                                adminApprove.mutate({ id: sel.id })
                              }
                              disabled={adminApprove.isPending}
                              className="text-[9px] font-bold tracking-widest uppercase text-primary border border-primary/30 px-2 py-0.5 hover:bg-primary/10 disabled:opacity-50 transition-all"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              Eric Approve
                            </button>
                          )}
                          {sel.eric_approved && (
                            <span
                              className="text-[9px] font-bold tracking-widest uppercase text-primary flex items-center gap-1"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              <Check className="h-2.5 w-2.5" /> Eric Approved
                            </span>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                aria-label="Delete selection"
                                disabled={del.isPending}
                                className="text-[9px] text-muted-foreground/40 hover:text-red-400 transition-colors ml-auto disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete this selection?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes “{sel.item_name}”
                                  from this project's finish selections.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => del.mutate({ id: sel.id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </DashboardLayout>
  );
}
