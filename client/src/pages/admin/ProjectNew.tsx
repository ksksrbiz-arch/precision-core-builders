/**
 * ProjectNew — create a new project with full details.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type ProjectStatus =
  | "lead"
  | "estimate_sent"
  | "contracted"
  | "in_progress"
  | "punch_list"
  | "complete"
  | "on_hold";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "contracted", label: "Contracted" },
  { value: "in_progress", label: "In Progress" },
  { value: "punch_list", label: "Punch List" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On Hold" },
];

const PROJECT_TYPES = [
  "Residential Remodel",
  "New Construction",
  "Commercial",
  "Restoration",
  "Outdoor / Landscaping",
  "Painting",
  "Roofing",
  "Cabinetry",
  "Other",
];

type FormState = {
  clientId: string;
  name: string;
  description: string;
  status: string;
  projectType: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  estimatedBudget: string;
  contractedBudget: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
  clientPortalEnabled: boolean;
  siteCamUrl: string;
  permitNumbers: string;
};

const DEFAULT_FORM: FormState = {
  clientId: "",
  name: "",
  description: "",
  status: "lead",
  projectType: "",
  address: "",
  city: "",
  state: "OR",
  zip: "",
  estimatedBudget: "",
  contractedBudget: "",
  estimatedStartDate: "",
  estimatedEndDate: "",
  clientPortalEnabled: true,
  siteCamUrl: "",
  permitNumbers: "",
};

function LabeledInput({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground mb-1 block"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function ProjectNew() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const { data: clientsData } = trpc.clients.list.useQuery({
    pageSize: 100,
  });

  const utils = trpc.useUtils();

  const createMut = useMutationWithToast(trpc.projects.create.useMutation(), {
    success: "Project Created",
    successMessage: "New project saved successfully.",
    error: "Create Failed",
    errorMessage: "Failed to create project. Please try again.",
    invalidate: () => utils.projects.list.invalidate(),
    onSuccess: (data: { id: number }) => {
      setLocation(`/admin/projects/${data.id}`);
    },
  });

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.name || !form.clientId) return;
    createMut.mutate({
      clientId: parseInt(form.clientId),
      name: form.name,
      description: form.description || undefined,
      status: form.status as ProjectStatus,
      projectType: form.projectType || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || "OR",
      zip: form.zip || undefined,
      estimatedBudget: form.estimatedBudget
        ? parseFloat(form.estimatedBudget)
        : undefined,
      contractedBudget: form.contractedBudget
        ? parseFloat(form.contractedBudget)
        : undefined,
      estimatedStartDate: form.estimatedStartDate
        ? new Date(form.estimatedStartDate).toISOString()
        : undefined,
      estimatedEndDate: form.estimatedEndDate
        ? new Date(form.estimatedEndDate).toISOString()
        : undefined,
      clientPortalEnabled: form.clientPortalEnabled,
      siteCamUrl: form.siteCamUrl || undefined,
      permitNumbers: form.permitNumbers || undefined,
    });
  };

  const inputCls =
    "w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60";
  const selectCls =
    "w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setLocation("/admin/projects")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Projects
        </button>

        <div className="flex items-center gap-3 mb-6">
          <FolderPlus className="h-5 w-5 text-primary" />
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            New Project
          </h1>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <section className="bg-card border border-border/60 p-6 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Basic Info
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <LabeledInput label="Client" required>
                <select
                  value={form.clientId}
                  onChange={e => set("clientId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select a client…</option>
                  {clientsData?.data.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Project Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="e.g. Smith Kitchen Remodel"
                  className={inputCls}
                />
              </LabeledInput>

              <LabeledInput label="Project Type">
                <select
                  value={form.projectType}
                  onChange={e => set("projectType", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select type…</option>
                  {PROJECT_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </LabeledInput>

              <LabeledInput label="Status">
                <select
                  value={form.status}
                  onChange={e => set("status", e.target.value)}
                  className={selectCls}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </LabeledInput>
            </div>

            <LabeledInput label="Description">
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={3}
                placeholder="Brief project description…"
                className={`${inputCls} resize-none`}
              />
            </LabeledInput>
          </section>

          {/* Location */}
          <section className="bg-card border border-border/60 p-6 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Location
            </p>
            <LabeledInput label="Street Address">
              <input
                type="text"
                value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="123 Main St"
                className={inputCls}
              />
            </LabeledInput>
            <div className="grid sm:grid-cols-3 gap-4">
              <LabeledInput label="City">
                <input
                  type="text"
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                  placeholder="Eugene"
                  className={inputCls}
                />
              </LabeledInput>
              <LabeledInput label="State">
                <input
                  type="text"
                  value={form.state}
                  onChange={e => set("state", e.target.value)}
                  placeholder="OR"
                  maxLength={2}
                  className={inputCls}
                />
              </LabeledInput>
              <LabeledInput label="ZIP">
                <input
                  type="text"
                  value={form.zip}
                  onChange={e => set("zip", e.target.value)}
                  placeholder="97401"
                  className={inputCls}
                />
              </LabeledInput>
            </div>
          </section>

          {/* Budget & Timeline */}
          <section className="bg-card border border-border/60 p-6 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Budget & Timeline
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <LabeledInput label="Estimated Budget ($)">
                <input
                  type="number"
                  value={form.estimatedBudget}
                  onChange={e => set("estimatedBudget", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="1000"
                  className={inputCls}
                />
              </LabeledInput>
              <LabeledInput label="Contracted Budget ($)">
                <input
                  type="number"
                  value={form.contractedBudget}
                  onChange={e => set("contractedBudget", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="1000"
                  className={inputCls}
                />
              </LabeledInput>
              <LabeledInput label="Estimated Start Date">
                <input
                  type="date"
                  value={form.estimatedStartDate}
                  onChange={e => set("estimatedStartDate", e.target.value)}
                  className={inputCls}
                />
              </LabeledInput>
              <LabeledInput label="Estimated End Date">
                <input
                  type="date"
                  value={form.estimatedEndDate}
                  onChange={e => set("estimatedEndDate", e.target.value)}
                  className={inputCls}
                />
              </LabeledInput>
            </div>
          </section>

          {/* Settings */}
          <section className="bg-card border border-border/60 p-6 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Settings
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <LabeledInput label="Permit Numbers">
                <input
                  type="text"
                  value={form.permitNumbers}
                  onChange={e => set("permitNumbers", e.target.value)}
                  placeholder="e.g. BLD-2024-001"
                  className={inputCls}
                />
              </LabeledInput>
              <LabeledInput label="Site Camera URL">
                <input
                  type="url"
                  value={form.siteCamUrl}
                  onChange={e => set("siteCamUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </LabeledInput>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.clientPortalEnabled}
                  onChange={e => set("clientPortalEnabled", e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-5 rounded-full transition-colors ${
                    form.clientPortalEnabled
                      ? "bg-primary"
                      : "bg-input border border-border"
                  }`}
                />
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.clientPortalEnabled
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-sm text-foreground">
                Enable client portal access
              </span>
            </label>
          </section>

          {/* Actions */}
          <div className="flex gap-3 justify-end pb-6">
            <button
              onClick={() => setLocation("/admin/projects")}
              className="px-5 py-2.5 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.clientId || createMut.isPending}
              className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {createMut.isPending ? "Creating…" : "Create Project"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
