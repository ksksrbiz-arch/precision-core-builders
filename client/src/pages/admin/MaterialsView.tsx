/**
 * MaterialsView — Materials inventory, shortage tracking, and PO generation.
 * Calls /api/material-procurement to generate vendor-grouped Purchase Orders
 * for shortages.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { getAuthHeader } from "@/lib/authHeader";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useToast } from "@/components/ToastProvider";
import { useIsMobile } from "@/hooks/useMobile";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Package,
  PackageX,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";

type PurchaseOrder = {
  id: string;
  vendor: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number | null;
    sku: string | null;
  }>;
  total: number;
};

const PO_STATUSES = [
  "draft",
  "issued",
  "partial",
  "received",
  "cancelled",
] as const;
type PoStatus = (typeof PO_STATUSES)[number];

const PO_STATUS_STYLES: Record<PoStatus, string> = {
  draft: "border-border/60 text-muted-foreground",
  issued: "border-primary/40 text-primary",
  partial: "border-amber-400/40 text-amber-400",
  received: "border-green-400/40 text-green-400",
  cancelled: "border-red-400/40 text-red-400",
};

export default function MaterialsView() {
  const isMobile = useIsMobile();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortagesOnly, setShowShortagesOnly] = useState(false);
  const [generatingPO, setGeneratingPO] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poError, setPoError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    category: "",
    unit: "",
    vendorId: undefined as number | undefined,
    vendorName: "",
    quantityNeeded: "",
    unitPriceCurrent: "",
    phaseNeeded: "",
    notes: "",
  });
  const { addToast } = useToast();

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 50 });
  const { data: vendorsData } = trpc.vendors.list.useQuery();
  const {
    data: materials,
    isLoading,
    isError,
    refetch,
  } = trpc.materials.list.useQuery({
    projectId: selectedProject ?? undefined,
    shortagesOnly: showShortagesOnly,
    pageSize: 100,
  });
  const utils = trpc.useUtils();
  const {
    data: purchaseOrdersData,
    isLoading: poLoading,
    isError: poIsError,
    refetch: refetchPOs,
  } = trpc.purchaseOrders.list.useQuery({
    projectId: selectedProject ?? undefined,
  });
  const updatePOStatus = useMutationWithToast(
    trpc.purchaseOrders.updateStatus.useMutation(),
    {
      success: "Status Updated",
      successMessage: "Purchase order status updated.",
      error: "Update Failed",
      errorMessage: "Failed to update purchase order status.",
      onSuccess: () => utils.purchaseOrders.list.invalidate(),
    }
  );
  const appendLedger = trpc.ledger.append.useMutation({
    onError: err => {
      addToast({
        type: "error",
        title: "Audit Log Failed",
        message: `PO generated but ledger entry failed: ${err.message}`,
        duration: 8000,
      });
    },
  });

  // Live updates: deliveries marked received from another device show up here.
  useRealtimeTable({
    table: "materials",
    onUpdate: payload => {
      const row = (payload.new ?? payload.old) as {
        project_id?: number;
      } | null;
      if (selectedProject && row?.project_id !== selectedProject) return;
      utils.materials.list.invalidate();
    },
  });
  const createMaterial = useMutationWithToast(
    trpc.materials.create.useMutation(),
    {
      success: "Material Added",
      successMessage: "Material added to inventory.",
      error: "Add Failed",
      errorMessage: "Failed to add material. Please try again.",
      onSuccess: () => {
        refetch();
        setShowAddForm(false);
        setNewMaterial({
          name: "",
          category: "",
          unit: "",
          vendorId: undefined,
          vendorName: "",
          quantityNeeded: "",
          unitPriceCurrent: "",
          phaseNeeded: "",
          notes: "",
        });
      },
    }
  );

  const generatePO = async () => {
    if (!selectedProject) {
      addToast({
        type: "error",
        title: "Error",
        message: "Select a project first.",
        duration: 6000,
      });
      return;
    }
    setGeneratingPO(true);
    setPoError(null);
    try {
      const res = await fetch("/api/material-procurement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({ projectId: selectedProject }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.purchaseOrders?.length > 0) {
        setPurchaseOrders(data.purchaseOrders);
        addToast({
          type: "success",
          title: "Generated",
          message: `Generated ${data.purchaseOrders.length} PO${data.purchaseOrders.length > 1 ? "s" : ""} for ${data.shortagesFound} shortage${data.shortagesFound > 1 ? "s" : ""}`,
          duration: 4000,
        });

        // Log PO generation to ledger
        const vendorSummary = data.purchaseOrders
          .map((po: any) => `${po.vendor}: ${po.items?.length ?? 0} item(s)`)
          .join("; ");
        appendLedger.mutate({
          projectId: selectedProject,
          entryType: "decision",
          title: `Purchase Orders Generated (${data.purchaseOrders.length} PO${data.purchaseOrders.length > 1 ? "s" : ""})`,
          description: `Purchase orders generated for material shortages. ${vendorSummary}`,
          visibleToClient: false,
        });

        // Fire material_shortage n8n event
        fetch("/api/n8n-webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "material_shortage",
            payload: {
              projectId: selectedProject,
              shortagesFound: data.shortagesFound,
              purchaseOrderCount: data.purchaseOrders.length,
            },
          }),
        }).catch(() => {});

        refetch();
        // Surface the freshly persisted POs in the table below.
        utils.purchaseOrders.list.invalidate();
      } else {
        addToast({
          type: "info",
          title: "Info",
          message: "No shortages found — all materials are fully ordered.",
          duration: 4000,
        });
      }
    } catch (err) {
      const msg = String(err);
      setPoError(msg);
      addToast({
        type: "error",
        title: "Error",
        message: "PO generation failed.",
        duration: 6000,
      });
    } finally {
      setGeneratingPO(false);
    }
  };

  const fmtCurrency = (n: number | null | undefined) =>
    n != null
      ? `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";

  const fmtDate = (d: string | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const persistedPOs = purchaseOrdersData?.data ?? [];

  const filtered = (materials?.data ?? []).filter(
    m =>
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.vendor_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Accurate shortage count from the server (the paged `materials.data` above is
  // capped at pageSize, so filtering it would undercount for large projects).
  const { data: shortageStats } = trpc.materials.list.useQuery({
    projectId: selectedProject ?? undefined,
    shortagesOnly: true,
    pageSize: 1,
  });
  const shortageCount = shortageStats?.total ?? 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <AdminPageHeader
          title="Materials"
          guideId="materials"
          description="Inventory tracking, shortage alerts, and vendor purchase orders."
          actions={
            <>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex min-h-11 items-center gap-2 border border-border/60 text-muted-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:text-primary hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Material
              </button>
              <button
                onClick={generatePO}
                disabled={generatingPO || !selectedProject}
                className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {generatingPO ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                Generate PO
              </button>
            </>
          }
        />

        {/* Stats bar */}
        <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-3">
          <div className="bg-card border border-border/60 p-4">
            <p
              className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Total Items
            </p>
            <p className="text-2xl font-bold text-foreground">
              {materials?.total ?? "—"}
            </p>
          </div>
          <div
            className={`bg-card border p-4 ${shortageCount > 0 ? "border-red-400/40 bg-red-400/5" : "border-border/60"}`}
          >
            <p
              className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Shortages
            </p>
            <p
              className={`text-2xl font-bold ${shortageCount > 0 ? "text-red-400" : "text-foreground"}`}
            >
              {shortageCount}
            </p>
          </div>
          <div className="bg-card border border-border/60 p-4">
            <p
              className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Purchase Orders
            </p>
            <p className="text-2xl font-bold text-primary">
              {purchaseOrdersData?.total ?? persistedPOs.length}
            </p>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Project filter */}
          <select
            value={selectedProject ?? ""}
            onChange={e =>
              setSelectedProject(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none sm:w-auto sm:min-w-[160px]"
          >
            <option value="">All Projects</option>
            {projects?.data.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search materials or vendor…"
              className="w-full pl-9 pr-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
            />
          </div>

          {/* Shortages toggle */}
          <button
            onClick={() => setShowShortagesOnly(v => !v)}
            className={`flex w-full items-center justify-center gap-2 border px-3 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors sm:w-auto ${
              showShortagesOnly
                ? "bg-red-400/10 border-red-400/40 text-red-400"
                : "border-border/60 text-muted-foreground hover:border-red-400/40 hover:text-red-400"
            }`}
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Shortages Only
          </button>
        </div>

        {/* Add material form */}
        {showAddForm && (
          <div className="bg-card border border-primary/30 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Add Material
              </p>
              <button
                onClick={() => setShowAddForm(false)}
                aria-label="Close add material form"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Catalog vendor picker — snapshots name into vendorName */}
              <select
                value={newMaterial.vendorId ?? ""}
                onChange={e => {
                  const id = e.target.value
                    ? parseInt(e.target.value)
                    : undefined;
                  const vendor = (vendorsData ?? []).find(v => v.id === id);
                  setNewMaterial(prev => ({
                    ...prev,
                    vendorId: id,
                    vendorName: vendor ? vendor.name : prev.vendorName,
                  }));
                }}
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                <option value="">— Select vendor —</option>
                {(vendorsData ?? []).map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              {[
                { key: "name", placeholder: "Material name *", required: true },
                {
                  key: "category",
                  placeholder: "Category (lumber, hardware…)",
                },
                { key: "unit", placeholder: "Unit (ea, lf, sqft, lb…)" },
                { key: "vendorName", placeholder: "Vendor name" },
                {
                  key: "quantityNeeded",
                  placeholder: "Quantity needed",
                  type: "number",
                },
                {
                  key: "unitPriceCurrent",
                  placeholder: "Unit price ($)",
                  type: "number",
                },
                {
                  key: "phaseNeeded",
                  placeholder: "Phase (framing, roofing…)",
                },
              ].map(f => (
                <input
                  key={f.key}
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={(newMaterial as any)[f.key]}
                  onChange={e =>
                    setNewMaterial(prev => ({
                      ...prev,
                      [f.key]: e.target.value,
                    }))
                  }
                  className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              ))}
              <textarea
                placeholder="Notes"
                rows={1}
                value={newMaterial.notes}
                onChange={e =>
                  setNewMaterial(prev => ({ ...prev, notes: e.target.value }))
                }
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() =>
                  createMaterial.mutate({
                    name: newMaterial.name,
                    projectId: selectedProject ?? undefined,
                    category: newMaterial.category || undefined,
                    unit: newMaterial.unit || undefined,
                    vendorId: newMaterial.vendorId || undefined,
                    vendorName: newMaterial.vendorName || undefined,
                    quantityNeeded: newMaterial.quantityNeeded
                      ? parseFloat(newMaterial.quantityNeeded)
                      : undefined,
                    unitPriceCurrent: newMaterial.unitPriceCurrent
                      ? parseFloat(newMaterial.unitPriceCurrent)
                      : undefined,
                    phaseNeeded: newMaterial.phaseNeeded || undefined,
                    notes: newMaterial.notes || undefined,
                  })
                }
                disabled={!newMaterial.name || createMaterial.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {createMaterial.isPending ? "Adding…" : "Add Material"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="border border-border/60 text-muted-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:text-foreground transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* PO Error */}
        {poError && (
          <Alert variant="destructive" className="mb-5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Purchase order generation failed</AlertTitle>
            <AlertDescription>
              <p>{poError}</p>
              <button
                onClick={generatePO}
                disabled={generatingPO || !selectedProject}
                className="mt-1 flex items-center gap-2 text-[11px] border border-border/60 text-muted-foreground px-3 py-1.5 tracking-wider uppercase hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Generated Purchase Orders */}
        {purchaseOrders.length > 0 && (
          <div className="mb-6 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Generated Purchase Orders
            </p>
            {purchaseOrders.map(po => (
              <div key={po.id} className="bg-card border border-primary/30 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {po.id}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vendor:{" "}
                      <span className="text-foreground">{po.vendor}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {fmtCurrency(po.total)}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      Total
                    </p>
                  </div>
                </div>
                {isMobile ? (
                  <div className="space-y-2">
                    {po.items.map((item, i) => (
                      <div
                        key={i}
                        className="rounded border border-border/40 bg-background/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.sku ?? "—"}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {fmtCurrency(
                              item.unitPrice
                                ? item.quantity * item.unitPrice
                                : null
                            )}
                          </p>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Quantity
                            </p>
                            <p className="mt-1 text-foreground">
                              {item.quantity} {item.unit ?? "ea"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Unit Price
                            </p>
                            <p className="mt-1 text-foreground">
                              {fmtCurrency(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-border/40 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border/40">
                          {[
                            "Item",
                            "SKU",
                            "Qty",
                            "Unit",
                            "Unit Price",
                            "Subtotal",
                          ].map(h => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left text-[9px] font-bold tracking-wider uppercase text-muted-foreground"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {po.items.map((item, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/20 last:border-0"
                          >
                            <td className="px-3 py-2 text-foreground font-medium">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.sku ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.unit ?? "ea"}
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {fmtCurrency(item.unitPrice)}
                            </td>
                            <td className="px-3 py-2 text-foreground font-semibold">
                              {item.unitPrice
                                ? fmtCurrency(item.quantity * item.unitPrice)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => {
                      const blob = new Blob(
                        [
                          `PURCHASE ORDER\n${po.id}\nVendor: ${po.vendor}\n\n${po.items.map(i => `${i.name} | ${i.quantity} ${i.unit ?? "ea"} @ ${fmtCurrency(i.unitPrice)}`).join("\n")}\n\nTOTAL: ${fmtCurrency(po.total)}`,
                        ],
                        { type: "text/plain" }
                      );
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `${po.id}.txt`;
                      a.click();
                    }}
                    className="flex items-center gap-2 text-[10px] border border-border/60 text-muted-foreground px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Download className="h-3 w-3" /> Export PO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Persisted Purchase Orders */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Purchase Orders
            </p>
            {selectedProject && (
              <button
                onClick={() => refetchPOs()}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            )}
          </div>

          {poLoading && (
            <div className="border border-border/60 p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          )}

          {!poLoading && poIsError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Couldn't load purchase orders</AlertTitle>
              <AlertDescription>
                <button
                  onClick={() => refetchPOs()}
                  className="mt-1 flex items-center gap-2 text-[11px] border border-border/60 text-muted-foreground px-3 py-1.5 tracking-wider uppercase hover:border-primary/40 hover:text-primary transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </AlertDescription>
            </Alert>
          )}

          {!poLoading && !poIsError && persistedPOs.length === 0 && (
            <div className="border border-border/60 border-dashed p-6 text-center">
              <FileText className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                No purchase orders yet. Generate one from material shortages
                above.
              </p>
            </div>
          )}

          {!poLoading && !poIsError && persistedPOs.length > 0 && (
            <div className="border border-border/60 overflow-hidden">
              {isMobile ? (
                <div className="space-y-3 p-3">
                  {persistedPOs.map(po => (
                    <div
                      key={po.id}
                      className="rounded border border-border/40 bg-background/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {po.po_number}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {po.vendor_name}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-primary">
                          {fmtCurrency(po.subtotal)}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {fmtDate(po.created_at)}
                        </span>
                        <select
                          value={po.status}
                          disabled={updatePOStatus.isPending}
                          onChange={e =>
                            updatePOStatus.mutate({
                              id: po.id,
                              status: e.target.value as PoStatus,
                            })
                          }
                          className={`border bg-input px-2 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-primary/60 disabled:opacity-50 ${
                            PO_STATUS_STYLES[po.status as PoStatus] ??
                            "border-border/60 text-muted-foreground"
                          }`}
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {PO_STATUSES.map(s => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/40">
                      {[
                        "PO Number",
                        "Vendor",
                        "Subtotal",
                        "Created",
                        "Status",
                      ].map(h => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[9px] font-bold tracking-wider uppercase text-muted-foreground"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {persistedPOs.map(po => (
                      <tr
                        key={po.id}
                        className="border-b border-border/20 last:border-0 hover:bg-card/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {po.po_number}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {po.vendor_name}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          {fmtCurrency(po.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {fmtDate(po.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={po.status}
                            disabled={updatePOStatus.isPending}
                            onChange={e =>
                              updatePOStatus.mutate({
                                id: po.id,
                                status: e.target.value as PoStatus,
                              })
                            }
                            className={`border bg-input px-2 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-primary/60 disabled:opacity-50 ${
                              PO_STATUS_STYLES[po.status as PoStatus] ??
                              "border-border/60 text-muted-foreground"
                            }`}
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            {PO_STATUSES.map(s => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Materials table */}
        {isLoading && (
          <div className="border border-border/60 p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Couldn't load materials</AlertTitle>
            <AlertDescription>
              <p>
                Something went wrong while loading the inventory. Please try
                again.
              </p>
              <button
                onClick={() => refetch()}
                className="mt-1 flex items-center gap-2 text-[11px] border border-border/60 text-muted-foreground px-3 py-1.5 tracking-wider uppercase hover:border-primary/40 hover:text-primary transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package />
              </EmptyMedia>
              <EmptyTitle>No materials found</EmptyTitle>
              <EmptyDescription>
                {searchQuery || showShortagesOnly || selectedProject
                  ? "No materials match the current filters. Try clearing them or add a new material."
                  : "Track inventory, shortages, and vendor pricing by adding your first material."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => setShowAddForm(true)}
                className="text-[11px] text-primary border border-primary/40 px-4 py-2 tracking-wider uppercase hover:bg-primary/10 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                + Add First Material
              </button>
            </EmptyContent>
          </Empty>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="border border-border/60 overflow-hidden">
            {isMobile ? (
              <div className="space-y-3 p-3">
                {filtered.map(m => {
                  const shortage = m.is_shortage;
                  const needed = m.quantity_needed ?? 0;
                  const received = m.quantity_received ?? 0;
                  const pct =
                    needed > 0 ? Math.round((received / needed) * 100) : 100;

                  return (
                    <div
                      key={m.id}
                      className={`rounded border p-4 ${
                        shortage
                          ? "border-red-400/30 bg-red-400/5"
                          : "border-border/40 bg-background/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {shortage ? (
                              <PackageX className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            ) : (
                              <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <p className="text-sm font-medium text-foreground">
                              {m.name}
                            </p>
                          </div>
                          {m.category && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {m.category}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-foreground">
                            {fmtCurrency(m.unit_price_current)}
                          </p>
                          {m.unit_price_budgeted &&
                            m.unit_price_current &&
                            m.unit_price_current > m.unit_price_budgeted && (
                              <p className="mt-1 text-[9px] text-red-400">
                                ↑ over budget
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Project
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {(m as any).projects?.name ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Vendor
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {(m as any).vendors?.name ?? m.vendor_name ?? "—"}
                          </p>
                          {m.vendor_sku && (
                            <p className="text-[10px] text-muted-foreground/60">
                              SKU: {m.vendor_sku}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-foreground">
                            {received}/{needed} {m.unit ?? ""}
                          </span>
                          {shortage ? (
                            <span
                              className="rounded border border-red-400/30 bg-red-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-red-400"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              Shortage
                            </span>
                          ) : pct >= 100 ? (
                            <span className="flex items-center gap-1 text-[10px] text-green-400">
                              <CheckCircle2 className="h-3 w-3" /> On Hand
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              {pct}% received
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 rounded-full bg-input">
                          <div
                            className={`h-full rounded-full transition-all ${
                              shortage
                                ? "bg-red-400"
                                : pct >= 100
                                  ? "bg-green-400"
                                  : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    {[
                      "Material",
                      "Project",
                      "Vendor",
                      "Qty",
                      "Status",
                      "Unit Price",
                    ].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[9px] font-bold tracking-wider uppercase text-muted-foreground"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const shortage = m.is_shortage;
                    const needed = m.quantity_needed ?? 0;
                    const received = m.quantity_received ?? 0;
                    const pct =
                      needed > 0 ? Math.round((received / needed) * 100) : 100;

                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-border/20 last:border-0 hover:bg-card/50 transition-colors ${
                          shortage ? "bg-red-400/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {shortage ? (
                              <PackageX className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            ) : (
                              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">
                                {m.name}
                              </p>
                              {m.category && (
                                <p className="text-[10px] text-muted-foreground">
                                  {m.category}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {(m as any).projects?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {(m as any).vendors?.name ?? m.vendor_name ?? "—"}
                          {m.vendor_sku && (
                            <p className="text-[10px] text-muted-foreground/60">
                              SKU: {m.vendor_sku}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-foreground">
                            {received}/{needed} {m.unit ?? ""}
                          </p>
                          <div className="mt-1 h-1 w-20 rounded-full bg-input">
                            <div
                              className={`h-full rounded-full transition-all ${
                                shortage
                                  ? "bg-red-400"
                                  : pct >= 100
                                    ? "bg-green-400"
                                    : "bg-primary"
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {shortage ? (
                            <span
                              className="text-[9px] px-2 py-1 bg-red-400/10 border border-red-400/30 text-red-400 font-bold tracking-wider uppercase"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              Shortage
                            </span>
                          ) : pct >= 100 ? (
                            <span className="flex items-center gap-1 text-[9px] text-green-400">
                              <CheckCircle2 className="h-3 w-3" /> On Hand
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">
                              {pct}% received
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          {fmtCurrency(m.unit_price_current)}
                          {m.unit_price_budgeted &&
                            m.unit_price_current &&
                            m.unit_price_current > m.unit_price_budgeted && (
                              <p className="text-[9px] text-red-400">
                                ↑ over budget
                              </p>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
