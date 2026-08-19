/**
 * EstimateEditor — admin authoring + edit form for a cost estimate.
 *
 * Two modes:
 *   • Create — reached via /admin/estimates/new (no route param). Saves through
 *     the admin-gated `estimates.create` mutation.
 *   • Edit — reached via /admin/estimates/:id/edit. Loads the existing estimate
 *     with `estimates.getById` and saves through `estimates.update`.
 *
 * Optional "AI prefill" posts the project parameters to /api/estimate-project
 * and drops the returned cost buckets into the form. It intentionally omits
 * projectId/clientId so the function does NOT persist a separate row — the save
 * happens only when the admin submits this form.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { getAuthHeader } from "@/lib/authHeader";
import { trpc } from "@/lib/trpc";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { PROJECT_TYPES } from "@/config/projects";
import { ArrowLeft, Calculator, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";

type Complexity = "" | "low" | "medium" | "high";

type FormState = {
  projectId: string;
  clientId: string;
  projectType: string;
  complexity: Complexity;
  squareFootage: string;
  location: string;
  additionalNotes: string;
  estimatedLow: string;
  estimatedMid: string;
  estimatedHigh: string;
  laborCost: string;
  materialsCost: string;
  permitsCost: string;
  contingency: string;
  aiReasoning: string;
};

const DEFAULT_FORM: FormState = {
  projectId: "",
  clientId: "",
  projectType: "",
  complexity: "",
  squareFootage: "",
  location: "",
  additionalNotes: "",
  estimatedLow: "",
  estimatedMid: "",
  estimatedHigh: "",
  laborCost: "",
  materialsCost: "",
  permitsCost: "",
  contingency: "",
  aiReasoning: "",
};

const COMPLEXITY_OPTIONS: { value: Complexity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const COST_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: "estimatedLow", label: "Estimated Low ($)" },
  { key: "estimatedMid", label: "Estimated Mid ($)" },
  { key: "estimatedHigh", label: "Estimated High ($)" },
  { key: "laborCost", label: "Labor Cost ($)" },
  { key: "materialsCost", label: "Materials Cost ($)" },
  { key: "permitsCost", label: "Permits Cost ($)" },
  { key: "contingency", label: "Contingency ($)" },
];

function LabeledInput({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground mb-1 block"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function EstimateEditor() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const estimateId = id ? parseInt(id, 10) : null;
  const isEdit = estimateId != null && !Number.isNaN(estimateId);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [prefilling, setPrefilling] = useState(false);
  const [prefillError, setPrefillError] = useState("");
  const [formError, setFormError] = useState("");
  // Guards the realtime refetch below from clobbering in-progress edits:
  // a remote change only re-hydrates the form while the user has not yet
  // typed anything into it.
  const [dirty, setDirty] = useState(false);

  const utils = trpc.useUtils();
  const { data: projectsData } = trpc.projects.list.useQuery({ pageSize: 100 });
  const { data: clientsData } = trpc.clients.list.useQuery({ pageSize: 100 });

  const {
    data: existing,
    isLoading: loadingExisting,
    isError: existingError,
    refetch: refetchExisting,
  } = trpc.estimates.getById.useQuery(
    { id: estimateId ?? 0 },
    { enabled: isEdit }
  );

  // Live updates: reflect edits made to this estimate from another device.
  // Skipped while the user has unsaved local edits so a concurrent change
  // elsewhere can never silently overwrite what they're typing.
  useRealtimeTable({
    table: "estimates",
    onUpdate: payload => {
      if (!isEdit || dirty) return;
      const row = (payload.new ?? payload.old) as { id?: number } | null;
      if (row?.id !== estimateId) return;
      refetchExisting();
    },
  });

  // Hydrate the form once the existing estimate loads (edit mode).
  useEffect(() => {
    if (!existing) return;
    const str = (v: unknown) =>
      v === null || v === undefined ? "" : String(v);
    setDirty(false);
    setForm({
      projectId: str(existing.project_id),
      clientId: str(existing.client_id),
      projectType: str(existing.project_type),
      complexity: (existing.complexity ?? "") as Complexity,
      squareFootage: str(existing.square_footage),
      location: str(existing.location),
      additionalNotes: str(existing.additional_notes),
      estimatedLow: str(existing.estimated_low),
      estimatedMid: str(existing.estimated_mid),
      estimatedHigh: str(existing.estimated_high),
      laborCost: str(existing.labor_cost),
      materialsCost: str(existing.materials_cost),
      permitsCost: str(existing.permits_cost),
      contingency: str(existing.contingency),
      aiReasoning: str(existing.ai_reasoning),
    });
  }, [existing]);

  const set = (key: keyof FormState, value: string) => {
    setDirty(true);
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const createMut = useMutationWithToast(trpc.estimates.create.useMutation(), {
    success: "Estimate Created",
    successMessage: "New estimate saved successfully.",
    error: "Create Failed",
    errorMessage: "Failed to create estimate. Please try again.",
    invalidate: () => utils.estimates.list.invalidate(),
    onSuccess: () => setLocation("/admin/estimates"),
  });

  const updateMut = useMutationWithToast(trpc.estimates.update.useMutation(), {
    success: "Estimate Updated",
    successMessage: "Estimate saved successfully.",
    error: "Update Failed",
    errorMessage: "Failed to update estimate. Please try again.",
    invalidate: () => utils.estimates.list.invalidate(),
    onSuccess: () => setLocation("/admin/estimates"),
  });

  const num = (s: string) => {
    const t = s.trim();
    if (!t) return undefined;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const buildPayload = () => ({
    projectId: form.projectId ? parseInt(form.projectId, 10) : undefined,
    clientId: form.clientId ? parseInt(form.clientId, 10) : undefined,
    projectType: form.projectType || undefined,
    complexity: form.complexity || undefined,
    squareFootage: num(form.squareFootage),
    location: form.location.trim() || undefined,
    additionalNotes: form.additionalNotes.trim() || undefined,
    estimatedLow: num(form.estimatedLow),
    estimatedMid: num(form.estimatedMid),
    estimatedHigh: num(form.estimatedHigh),
    laborCost: num(form.laborCost),
    materialsCost: num(form.materialsCost),
    permitsCost: num(form.permitsCost),
    contingency: num(form.contingency),
    aiReasoning: form.aiReasoning.trim() || undefined,
  });

  const handleSubmit = () => {
    const payload = buildPayload();

    // Guard against persisting an empty estimate row: require at least a
    // project type or one cost figure.
    const hasCost =
      payload.estimatedLow != null ||
      payload.estimatedMid != null ||
      payload.estimatedHigh != null;
    if (!payload.projectType && !hasCost) {
      setFormError(
        "Add a project type or at least one estimate amount before saving."
      );
      return;
    }

    // Sanity-check the tier ordering when all three are provided.
    const { estimatedLow: lo, estimatedMid: mid, estimatedHigh: hi } = payload;
    if (lo != null && mid != null && hi != null && !(lo <= mid && mid <= hi)) {
      setFormError("Estimate amounts must be ordered low ≤ mid ≤ high.");
      return;
    }

    setFormError("");
    if (isEdit) {
      updateMut.mutate({ id: estimateId!, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleAiPrefill = async () => {
    if (!form.projectType) {
      setPrefillError("Select a project type before running the AI estimate.");
      return;
    }
    setPrefilling(true);
    setPrefillError("");
    try {
      // Deliberately omit projectId/clientId so the function only computes and
      // returns an estimate instead of persisting a separate row.
      const res = await fetch("/api/estimate-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          projectType: form.projectType,
          squareFootage: num(form.squareFootage),
          complexity: form.complexity || undefined,
          location: form.location.trim() || undefined,
          additionalNotes: form.additionalNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "AI estimate failed. Please try again.");
      }
      const numToStr = (v: unknown) =>
        typeof v === "number" && Number.isFinite(v)
          ? String(Math.round(v))
          : "";
      setDirty(true);
      setForm(prev => ({
        ...prev,
        estimatedLow: numToStr(data.estimatedLow) || prev.estimatedLow,
        estimatedMid: numToStr(data.estimatedMid) || prev.estimatedMid,
        estimatedHigh: numToStr(data.estimatedHigh) || prev.estimatedHigh,
        laborCost: numToStr(data.laborCost) || prev.laborCost,
        materialsCost: numToStr(data.materialsCost) || prev.materialsCost,
        permitsCost: numToStr(data.permitsCost) || prev.permitsCost,
        contingency: numToStr(data.contingency) || prev.contingency,
        aiReasoning:
          typeof data.aiReasoning === "string"
            ? data.aiReasoning
            : prev.aiReasoning,
      }));
    } catch (err) {
      setPrefillError(
        err instanceof Error ? err.message : "AI estimate failed."
      );
    } finally {
      setPrefilling(false);
    }
  };

  const inputCls =
    "w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60";
  const selectCls = inputCls;
  const saving = createMut.isPending || updateMut.isPending;

  if (isEdit && loadingExisting) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-20 text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  if (isEdit && existingError) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-20 text-center">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load this estimate.
          </p>
          <button
            onClick={() => setLocation("/admin/estimates")}
            className="mt-4 text-[11px] text-primary border border-primary/40 px-4 py-2 tracking-wider uppercase hover:bg-primary/10 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Back to Estimates
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setLocation("/admin/estimates")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Estimates
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Calculator className="h-5 w-5 text-primary" />
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {isEdit ? "Edit Estimate" : "New Estimate"}
          </h1>
        </div>

        <div className="space-y-6">
          {/* Project Details */}
          <section className="bg-card border border-border/60 p-6 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Project Details
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <LabeledInput label="Project">
                <select
                  value={form.projectId}
                  onChange={e => set("projectId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">No linked project</option>
                  {projectsData?.data.map((p: { id: number; name: string }) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Client">
                <select
                  value={form.clientId}
                  onChange={e => set("clientId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Walk-in / none</option>
                  {clientsData?.data.map((c: { id: number; name: string }) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Project Type">
                <select
                  value={form.projectType}
                  onChange={e => set("projectType", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select type…</option>
                  {PROJECT_TYPES.map(t => (
                    <option key={t.id} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Complexity">
                <select
                  value={form.complexity}
                  onChange={e =>
                    set("complexity", e.target.value as Complexity)
                  }
                  className={selectCls}
                >
                  <option value="">Not specified</option>
                  {COMPLEXITY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Square Footage">
                <input
                  type="number"
                  value={form.squareFootage}
                  onChange={e => set("squareFootage", e.target.value)}
                  placeholder="e.g. 2000"
                  min="0"
                  step="10"
                  className={inputCls}
                />
              </LabeledInput>

              <LabeledInput label="Location">
                <input
                  type="text"
                  value={form.location}
                  onChange={e => set("location", e.target.value)}
                  placeholder="Eugene, OR"
                  className={inputCls}
                />
              </LabeledInput>
            </div>

            <LabeledInput label="Additional Notes">
              <textarea
                value={form.additionalNotes}
                onChange={e => set("additionalNotes", e.target.value)}
                rows={3}
                placeholder="Scope, finish level, or special requirements…"
                className={`${inputCls} resize-none`}
              />
            </LabeledInput>
          </section>

          {/* Cost Breakdown */}
          <section className="bg-card border border-border/60 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cost Breakdown
              </p>
              <button
                type="button"
                onClick={handleAiPrefill}
                disabled={prefilling}
                className="flex items-center gap-1.5 border border-primary/40 text-primary px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase hover:bg-primary/10 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {prefilling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {prefilling ? "Estimating…" : "AI Prefill"}
              </button>
            </div>

            {prefillError && (
              <p className="text-xs text-destructive">{prefillError}</p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {COST_FIELDS.map(({ key, label }) => (
                <LabeledInput key={key} label={label}>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="0"
                    min="0"
                    step="100"
                    className={inputCls}
                  />
                </LabeledInput>
              ))}
            </div>

            <LabeledInput label="AI Reasoning / Notes">
              <textarea
                value={form.aiReasoning}
                onChange={e => set("aiReasoning", e.target.value)}
                rows={3}
                placeholder="Basis for the estimate and key cost drivers…"
                className={`${inputCls} resize-none`}
              />
            </LabeledInput>
          </section>

          {/* Actions */}
          <div className="flex gap-3 justify-end pb-6">
            <button
              onClick={() => setLocation("/admin/estimates")}
              className="px-5 py-2.5 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Estimate"}
            </button>
          </div>
          {formError && (
            <p className="text-xs text-destructive text-right mt-2">
              {formError}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
