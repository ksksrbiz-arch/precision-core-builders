import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { getAuthHeader } from "@/lib/authHeader";
import { formatCurrency } from "@/lib/formatters";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Check,
  Copy,
  DollarSign,
  MapPin,
  Pencil,
  Save,
  Sparkles,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";
import { useLocation, useParams, useSearch } from "wouter";
import { useState } from "react";
import { StatusBadge } from "./CommandCenter";

type TabId =
  | "overview"
  | "reports"
  | "schedule"
  | "materials"
  | "ledger"
  | "profitability";

function getInitialTab(search: string): TabId {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const tab = params.get("tab") as TabId | null;
  const validTabs: TabId[] = [
    "overview",
    "reports",
    "schedule",
    "materials",
    "ledger",
    "profitability",
  ];
  return tab && validTabs.includes(tab) ? tab : "overview";
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getInitialTab(search)
  );
  const [editingOverview, setEditingOverview] = useState(false);
  const [draftProgress, setDraftProgress] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    projectType: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    estimatedBudget: string;
    contractedBudget: string;
    estimatedStartDate: string;
    estimatedEndDate: string;
    permitNumbers: string;
    siteCamUrl: string;
    clientPortalEnabled: boolean;
  } | null>(null);

  const projectId = parseInt(id ?? "0");
  const {
    data: project,
    isLoading,
    isError: isProjectError,
    refetch: refetchProject,
  } = trpc.projects.getById.useQuery({
    id: projectId,
  });
  const { data: reports } = trpc.fieldReports.list.useQuery(
    { projectId, pageSize: 10 },
    { enabled: activeTab === "reports" }
  );
  const { data: schedule } = trpc.schedule.list.useQuery(
    { projectId },
    { enabled: activeTab === "schedule" }
  );
  const { data: materials } = trpc.materials.list.useQuery(
    { projectId },
    { enabled: activeTab === "materials" }
  );
  const { data: ledger } = trpc.ledger.list.useQuery(
    { projectId },
    { enabled: activeTab === "ledger" }
  );
  const { data: profitability } = trpc.projects.profitability.useQuery(
    { id: projectId },
    { enabled: activeTab === "profitability" }
  );

  const utils = trpc.useUtils();

  // Live updates: schedule + ledger changes from another session refresh in place.
  useRealtimeTable({
    table: "schedule_items",
    onUpdate: payload => {
      const row = (payload.new ?? payload.old) as {
        project_id?: number;
      } | null;
      if (row?.project_id !== projectId) return;
      utils.schedule.list.invalidate({ projectId });
    },
  });
  useRealtimeTable({
    table: "ledger_entries",
    onUpdate: payload => {
      const row = (payload.new ?? payload.old) as {
        project_id?: number;
      } | null;
      if (row?.project_id !== projectId) return;
      utils.ledger.list.invalidate({ projectId });
      utils.projects.profitability.invalidate({ id: projectId });
    },
  });
  useRealtimeTable({
    table: "materials",
    onUpdate: payload => {
      const row = (payload.new ?? payload.old) as {
        project_id?: number;
      } | null;
      if (row?.project_id !== projectId) return;
      utils.materials.list.invalidate({ projectId });
    },
  });

  const updateProgress = useMutationWithToast(
    trpc.projects.updateProgress.useMutation(),
    {
      success: "Progress Saved",
      successMessage: "Project progress updated.",
      error: "Update Failed",
      errorMessage: "Failed to update progress. Please try again.",
      invalidate: () => utils.projects.getById.invalidate({ id: projectId }),
    }
  );

  const commitProgress = (raw: string) => {
    const next = parseInt(raw);
    if (Number.isFinite(next) && next !== (project?.completion_percent ?? 0)) {
      updateProgress.mutate({ id: projectId, completionPercent: next });
    }
    setDraftProgress(null);
  };

  const updateProject = useMutationWithToast(
    trpc.projects.update.useMutation(),
    {
      success: "Project Saved",
      successMessage: "Project details updated.",
      error: "Save Failed",
      errorMessage: "Failed to update project. Please try again.",
      invalidate: () => utils.projects.getById.invalidate({ id: projectId }),
      onSuccess: () => setEditingOverview(false),
    }
  );

  const startEditOverview = () => {
    if (!project) return;
    setEditForm({
      name: project.name ?? "",
      description: project.description ?? "",
      projectType: project.project_type ?? "",
      address: project.address ?? "",
      city: project.city ?? "",
      state: project.state ?? "OR",
      zip: project.zip ?? "",
      estimatedBudget: project.estimated_budget
        ? String(project.estimated_budget)
        : "",
      contractedBudget: project.contracted_budget
        ? String(project.contracted_budget)
        : "",
      estimatedStartDate: project.estimated_start_date
        ? new Date(project.estimated_start_date).toISOString().split("T")[0]
        : "",
      estimatedEndDate: project.estimated_end_date
        ? new Date(project.estimated_end_date).toISOString().split("T")[0]
        : "",
      permitNumbers: project.permit_numbers ?? "",
      siteCamUrl: project.site_cam_url ?? "",
      clientPortalEnabled: project.client_portal_enabled ?? true,
    });
    setEditingOverview(true);
  };

  const cancelEditOverview = () => {
    setEditingOverview(false);
    setEditForm(null);
  };

  const saveEditOverview = () => {
    if (!editForm || !editForm.name) return;
    updateProject.mutate({
      id: projectId,
      name: editForm.name,
      description: editForm.description || undefined,
      projectType: editForm.projectType || undefined,
      address: editForm.address || undefined,
      city: editForm.city || undefined,
      state: editForm.state || "OR",
      zip: editForm.zip || undefined,
      estimatedBudget: editForm.estimatedBudget
        ? parseFloat(editForm.estimatedBudget)
        : undefined,
      contractedBudget: editForm.contractedBudget
        ? parseFloat(editForm.contractedBudget)
        : undefined,
      estimatedStartDate: editForm.estimatedStartDate
        ? new Date(editForm.estimatedStartDate).toISOString()
        : undefined,
      estimatedEndDate: editForm.estimatedEndDate
        ? new Date(editForm.estimatedEndDate).toISOString()
        : undefined,
      permitNumbers: editForm.permitNumbers || undefined,
      siteCamUrl: editForm.siteCamUrl || undefined,
      clientPortalEnabled: editForm.clientPortalEnabled,
    });
  };

  const ef = editForm;
  const setEf = (key: string, value: string | boolean) =>
    setEditForm(prev => (prev ? { ...prev, [key]: value } : prev));

  const inputCls =
    "w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60";

  if (isLoading)
    return (
      <DashboardLayout>
        <div className="p-8 text-muted-foreground text-sm">Loading…</div>
      </DashboardLayout>
    );
  if (isProjectError)
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-8 text-center">
          <p className="text-sm text-destructive mb-3">
            Could not load this project. This may be a temporary network or
            authentication issue.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => refetchProject()}
              className="text-xs font-bold tracking-widest uppercase border border-primary/40 text-primary px-4 py-2 hover:bg-primary/10 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Retry
            </button>
            <button
              onClick={() => setLocation("/admin/projects")}
              className="text-xs font-bold tracking-widest uppercase border border-border text-muted-foreground px-4 py-2 hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Back to Projects
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  if (!project)
    return (
      <DashboardLayout>
        <div className="p-8 text-muted-foreground text-sm">
          Project not found.
        </div>
      </DashboardLayout>
    );

  const fmt = (n: number | string | null | undefined) =>
    n ? `$${Number(n).toLocaleString()}` : "—";

  const TABS = [
    "overview",
    "reports",
    "schedule",
    "materials",
    "ledger",
    "profitability",
  ] as const;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back + Header */}
        <button
          onClick={() => setLocation("/admin/projects")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-5 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Projects
        </button>

        <div className="flex flex-wrap items-start justify-between mb-6 gap-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h1
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {project.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {project.city}, {project.state}
                </span>
              )}
              {project.estimated_budget && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {fmt(project.estimated_budget)} estimated
                </span>
              )}
              {project.estimated_start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.estimated_start_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setLocation("/admin/field-reports/new")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors flex-shrink-0"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Field Report
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-card border border-border/60 p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs font-semibold tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Project Completion
            </p>
            <span className="text-lg font-bold text-primary">
              {draftProgress ?? project.completion_percent ?? 0}%
            </span>
          </div>
          <div className="h-2 bg-input rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{
                width: `${draftProgress ?? project.completion_percent ?? 0}%`,
              }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={draftProgress ?? project.completion_percent ?? 0}
            onChange={e => setDraftProgress(parseInt(e.target.value))}
            onMouseUp={e => commitProgress(e.currentTarget.value)}
            onTouchEnd={e => commitProgress(e.currentTarget.value)}
            onKeyUp={e => commitProgress(e.currentTarget.value)}
            className="w-full accent-primary"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border/40 mb-5 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-5 py-2.5 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {editingOverview && ef ? (
              /* Edit form */
              <div className="bg-card border border-primary/30 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Edit Project Details
                  </p>
                  <button
                    onClick={cancelEditOverview}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={ef.name}
                      onChange={e => setEf("name", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Description
                    </label>
                    <textarea
                      value={ef.description}
                      onChange={e => setEf("description", e.target.value)}
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  {[
                    { key: "projectType", label: "Project Type", type: "text" },
                    { key: "address", label: "Address", type: "text" },
                    { key: "city", label: "City", type: "text" },
                    { key: "state", label: "State", type: "text" },
                    { key: "zip", label: "ZIP", type: "text" },
                    {
                      key: "permitNumbers",
                      label: "Permit Numbers",
                      type: "text",
                    },
                    {
                      key: "siteCamUrl",
                      label: "Site Camera URL",
                      type: "url",
                    },
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
                        value={(ef as any)[f.key]}
                        onChange={e => setEf(f.key, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                  {[
                    { key: "estimatedBudget", label: "Estimated Budget ($)" },
                    { key: "contractedBudget", label: "Contracted Budget ($)" },
                  ].map(f => (
                    <div key={f.key}>
                      <label
                        className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {f.label}
                      </label>
                      <input
                        type="number"
                        value={(ef as any)[f.key]}
                        onChange={e => setEf(f.key, e.target.value)}
                        min="0"
                        className={inputCls}
                      />
                    </div>
                  ))}
                  {[
                    { key: "estimatedStartDate", label: "Start Date" },
                    { key: "estimatedEndDate", label: "End Date" },
                  ].map(f => (
                    <div key={f.key}>
                      <label
                        className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {f.label}
                      </label>
                      <input
                        type="date"
                        value={(ef as any)[f.key]}
                        onChange={e => setEf(f.key, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={ef.clientPortalEnabled}
                      onChange={e =>
                        setEf("clientPortalEnabled", e.target.checked)
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${
                        ef.clientPortalEnabled
                          ? "bg-primary"
                          : "bg-input border border-border"
                      }`}
                    />
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        ef.clientPortalEnabled
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-sm text-foreground">
                    Client portal access enabled
                  </span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={cancelEditOverview}
                    className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditOverview}
                    disabled={!ef.name || updateProject.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Save className="h-3 w-3" />
                    {updateProject.isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              /* Read view */
              <>
                <div className="flex justify-end mb-1">
                  <button
                    onClick={startEditOverview}
                    className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Pencil className="h-3 w-3" /> Edit Details
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Client",
                      value: (project as any).clients?.name ?? "—",
                    },
                    {
                      label: "Project Type",
                      value: project.project_type ?? "—",
                    },
                    { label: "Status", value: project.status },
                    {
                      label: "Estimated Budget",
                      value: fmt(project.estimated_budget),
                    },
                    {
                      label: "Contracted Budget",
                      value: fmt(project.contracted_budget),
                    },
                    { label: "Actual Cost", value: fmt(project.actual_cost) },
                    {
                      label: "License",
                      value: project.license_number ?? "CCB #246527",
                    },
                    {
                      label: "Portal Enabled",
                      value: project.client_portal_enabled ? "Yes" : "No",
                    },
                    {
                      label: "Permit Numbers",
                      value: project.permit_numbers ?? "None on file",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="bg-card border border-border/60 p-4"
                    >
                      <p
                        className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {label}
                      </p>
                      <p className="text-sm text-foreground">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* AI: draft a client-facing progress update from live data */}
            <ClientUpdateDrafter projectId={projectId} />

            {/* Status update control */}
            <ProjectStatusUpdate
              projectId={projectId}
              currentStatus={project.status}
            />
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            {reports?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No field reports yet.
              </p>
            ) : (
              reports?.data.map(r => (
                <button
                  key={r.id}
                  onClick={() => setLocation(`/admin/field-reports/${r.id}`)}
                  className="w-full text-left bg-card border border-border/60 p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {fmtDate(r.report_date)}
                    </p>
                    <span
                      className={`text-[9px] px-2 py-1 border font-semibold tracking-widest uppercase ${
                        r.published_to_client
                          ? "text-green-400 border-green-400/30"
                          : "text-muted-foreground border-border/60"
                      }`}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {r.published_to_client ? "Published" : "Draft"}
                    </span>
                  </div>
                  {r.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {r.summary}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-2">
            {schedule?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No schedule items yet.
              </p>
            ) : (
              schedule?.map(item => (
                <div
                  key={item.id}
                  className="bg-card border border-border/60 p-4 flex items-center gap-4"
                >
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      item.status === "complete"
                        ? "bg-green-400"
                        : item.status === "in_progress"
                          ? "bg-primary"
                          : item.status === "deferred"
                            ? "bg-red-400"
                            : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.planned_start && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.planned_start).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[9px] text-muted-foreground border border-border/60 px-2 py-1 uppercase tracking-wider flex-shrink-0"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {item.task_type}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "materials" && (
          <div className="space-y-2">
            {materials?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No materials tracked yet.
              </p>
            ) : (
              materials?.data.map(m => (
                <div
                  key={m.id}
                  className={`bg-card border p-4 flex items-center gap-4 ${
                    m.is_shortage
                      ? "border-red-400/40 bg-red-400/5"
                      : "border-border/60"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.vendor_name ?? "No vendor"} · {m.unit ?? "units"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs">
                      {m.quantity_received ?? 0}/{m.quantity_needed ?? "?"}{" "}
                      {m.unit ?? ""}
                    </p>
                    {m.is_shortage && (
                      <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">
                        Shortage
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "ledger" && (
          <div className="space-y-3">
            <div className="bg-card border border-border/60 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Add Ledger Entry
              </p>
              <LedgerEntryForm
                projectId={projectId}
                onSuccess={() => utils.ledger.list.invalidate({ projectId })}
              />
            </div>
            {ledger?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No ledger entries yet.
              </p>
            ) : (
              ledger?.data.map(e => (
                <div key={e.id} className="bg-card border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-sm font-medium">{e.title}</p>
                    <span
                      className="text-[9px] border border-border/60 px-2 py-0.5 text-muted-foreground uppercase tracking-wider flex-shrink-0"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {e.entry_type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">
                    {fmtDateTime(e.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "profitability" && (
          <div className="space-y-5">
            {!profitability ? (
              <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
                Loading profitability data…
              </div>
            ) : (
              <>
                {/* Budget vs Actual header */}
                <div
                  className={`flex items-center gap-3 p-4 border ${
                    profitability.onBudget
                      ? "border-green-400/30 bg-green-400/5"
                      : "border-red-400/30 bg-red-400/5"
                  }`}
                >
                  {profitability.onBudget ? (
                    <TrendingUp className="h-5 w-5 text-green-400 shrink-0" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400 shrink-0" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-bold ${profitability.onBudget ? "text-green-400" : "text-red-400"}`}
                    >
                      {profitability.onBudget ? "On Budget" : "Over Budget"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Variance:{" "}
                      <span
                        className={`font-semibold ${profitability.onBudget ? "text-green-400" : "text-red-400"}`}
                      >
                        {profitability.variance >= 0 ? "+" : ""}
                        {fmt(profitability.variance)}
                      </span>{" "}
                      · Margin:{" "}
                      <span className="font-semibold text-foreground">
                        {profitability.margin.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* KPI grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Contracted Budget",
                      value: fmt(
                        profitability.contracted || profitability.estimated
                      ),
                      sub: profitability.contracted
                        ? "Contracted"
                        : "Estimated",
                    },
                    {
                      label: "Projected Cost",
                      value: fmt(profitability.projectedCost),
                      sub: profitability.actualCost
                        ? "Actual reported"
                        : "From materials",
                    },
                    {
                      label: "Gross Margin",
                      value: `${profitability.margin.toFixed(1)}%`,
                      sub:
                        profitability.margin >= 20
                          ? "Healthy"
                          : profitability.margin >= 10
                            ? "Thin"
                            : "At risk",
                    },
                    {
                      label: "Materials Cost",
                      value: fmt(profitability.materialsCost),
                      sub: "Budgeted materials",
                    },
                    {
                      label: "Change Orders",
                      value: fmt(profitability.changeOrderTotal),
                      sub:
                        profitability.changeOrderTotal >= 0
                          ? "Net additions"
                          : "Net credits",
                    },
                    {
                      label: "Completion",
                      value: `${profitability.completionPercent}%`,
                      sub: profitability.status?.replace(/_/g, " "),
                    },
                  ].map(({ label, value, sub }) => (
                    <div
                      key={label}
                      className="bg-card border border-border/60 p-4"
                    >
                      <p
                        className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-xl font-bold"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {value}
                      </p>
                      {sub && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sub}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actual cost update */}
                <div className="bg-card border border-border/60 p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">
                    Update Actual Cost
                  </p>
                  <ActualCostForm
                    projectId={projectId}
                    currentActual={profitability.actualCost}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/**
 * ClientUpdateDrafter — Eric taps "Draft with AI" and Groq writes a warm,
 * client-ready progress update from the project's live data. Optional steer
 * lets him nudge the focus; the result is copy-to-clipboard ready to send.
 */
function ClientUpdateDrafter({ projectId }: { projectId: number }) {
  const [steer, setSteer] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setErrorMsg("");
    setCopied(false);
    try {
      const res = await fetch("/api/ai-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          kind: "client-update",
          projectId,
          instruction: steer.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Drafting failed. Please try again.");
      }
      setDraft(String(data.draft ?? ""));
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Drafting failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the textarea is selectable as a fallback.
    }
  };

  return (
    <div className="bg-card border border-border/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">
          Draft Client Update
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          value={steer}
          onChange={e => setSteer(e.target.value)}
          placeholder="Optional focus — e.g. 'reassure about the rain delay'"
          className="flex-1 px-3 py-2 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <Sparkles className="h-3 w-3" />
          {loading ? "Drafting…" : "Draft with AI"}
        </button>
      </div>
      {errorMsg && <p className="text-xs text-destructive mb-2">{errorMsg}</p>}
      {draft && (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={7}
            className="w-full px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60 resize-y"
          />
          <div className="flex justify-end">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LedgerEntryForm({
  projectId,
  onSuccess,
}: {
  projectId: number;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<any>("note");
  const append = trpc.ledger.append.useMutation({
    onSuccess: () => {
      setTitle("");
      setDesc("");
      onSuccess();
    },
  });

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Entry title"
          className="px-3 py-2 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
        >
          {[
            "decision",
            "change_order",
            "inspection",
            "permit",
            "milestone",
            "cost_adjustment",
            "note",
          ].map(t => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Description…"
        rows={2}
        className="w-full px-3 py-2 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
      />
      <button
        onClick={() =>
          title &&
          desc &&
          append.mutate({
            projectId,
            entryType: type,
            title,
            description: desc,
          })
        }
        disabled={!title || !desc || append.isPending}
        className="text-[11px] px-4 py-2 bg-primary text-primary-foreground font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {append.isPending ? "Saving…" : "Add Entry"}
      </button>
    </div>
  );
}

function ActualCostForm({
  projectId,
  currentActual,
}: {
  projectId: number;
  currentActual: number;
}) {
  const [value, setValue] = useState(
    currentActual ? String(currentActual) : ""
  );
  const utils = trpc.useUtils();
  const mut = trpc.projects.updateProgress.useMutation({
    onSuccess: () => {
      utils.projects.profitability.invalidate({ id: projectId });
      utils.projects.getById.invalidate({ id: projectId });
    },
  });

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          $
        </span>
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="0.00"
          className="w-full pl-7 pr-3 py-2 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
        />
      </div>
      <button
        onClick={() =>
          value &&
          mut.mutate({
            id: projectId,
            actualCost: parseFloat(value),
          })
        }
        disabled={!value || mut.isPending}
        className="px-4 py-2 text-[11px] font-bold tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/85 disabled:opacity-50 transition-colors"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {mut.isPending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "contracted", label: "Contracted" },
  { value: "in_progress", label: "In Progress" },
  { value: "punch_list", label: "Punch List" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On Hold" },
] as const;

type ProjectStatus = (typeof STATUS_OPTIONS)[number]["value"];

function ProjectStatusUpdate({
  projectId,
  currentStatus,
}: {
  projectId: number;
  currentStatus: string;
}) {
  const [status, setStatus] = useState<ProjectStatus>(
    currentStatus as ProjectStatus
  );
  const utils = trpc.useUtils();
  const mut = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      // Fire project_status_changed n8n event
      fetch("/api/n8n-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "project_status_changed",
          payload: { projectId, newStatus: status },
        }),
      }).catch(() => {});
    },
  });

  const isDirty = status !== currentStatus;

  return (
    <div className="bg-card border border-border/60 p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-3">
        Update Project Status
      </p>
      <div className="flex gap-3 items-center">
        <select
          value={status}
          onChange={e => setStatus(e.target.value as ProjectStatus)}
          className="flex-1 px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => mut.mutate({ id: projectId, status })}
          disabled={!isDirty || mut.isPending}
          className="px-4 py-2 text-[11px] font-bold tracking-widest uppercase bg-primary text-primary-foreground hover:bg-primary/85 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          {mut.isPending ? "Saving…" : "Save Status"}
        </button>
      </div>
    </div>
  );
}
