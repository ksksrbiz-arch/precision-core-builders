import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Calendar, DollarSign, MapPin } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { StatusBadge } from "./CommandCenter";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview"|"reports"|"schedule"|"materials"|"ledger">("overview");
  const projectId = parseInt(id ?? "0");

  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: reports } = trpc.fieldReports.list.useQuery(
    { projectId, pageSize: 10 }, { enabled: activeTab === "reports" }
  );
  const { data: schedule } = trpc.schedule.list.useQuery(
    { projectId }, { enabled: activeTab === "schedule" }
  );
  const { data: materials } = trpc.materials.list.useQuery(
    { projectId }, { enabled: activeTab === "materials" }
  );
  const { data: ledger } = trpc.ledger.list.useQuery(
    { projectId }, { enabled: activeTab === "ledger" }
  );

  const utils = trpc.useUtils();
  const updateProgress = trpc.projects.updateProgress.useMutation({
    onSuccess: () => utils.projects.getById.invalidate({ id: projectId }),
  });
  const appendLedger = trpc.ledger.append.useMutation({
    onSuccess: () => utils.ledger.list.invalidate({ projectId }),
  });

  if (isLoading) return <DashboardLayout><div className="p-8 text-muted-foreground text-sm">Loading…</div></DashboardLayout>;
  if (!project) return <DashboardLayout><div className="p-8 text-muted-foreground text-sm">Project not found.</div></DashboardLayout>;

  const fmt = (n: number | string | null | undefined) =>
    n ? `$${Number(n).toLocaleString()}` : "—";

  const TABS = ["overview", "reports", "schedule", "materials", "ledger"] as const;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back + Header */}
        <button onClick={() => setLocation("/admin/projects")}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-5 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> All Projects
        </button>

        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {project.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.city}, {project.state}</span>}
              {project.estimated_budget && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{fmt(project.estimated_budget)} estimated</span>}
              {project.estimated_start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(project.estimated_start_date).toLocaleDateString()}</span>}
            </div>
          </div>
          <button onClick={() => setLocation("/admin/field-reports/new")}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors flex-shrink-0"
                  style={{ fontFamily: "var(--font-condensed)" }}>
            <Plus className="h-3.5 w-3.5" /> Field Report
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-card border border-border/60 p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground"
               style={{ fontFamily: "var(--font-condensed)" }}>
              Project Completion
            </p>
            <span className="text-lg font-bold text-primary">{project.completion_percent ?? 0}%</span>
          </div>
          <div className="h-2 bg-input rounded-full overflow-hidden mb-3">
            <div className="h-full bg-primary rounded-full transition-all duration-500"
                 style={{ width: `${project.completion_percent ?? 0}%` }} />
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={project.completion_percent ?? 0}
            onChange={e => updateProgress.mutate({ id: projectId, completionPercent: parseInt(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border/40 mb-5 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Client", value: (project as any).clients?.name ?? "—" },
              { label: "Project Type", value: project.project_type ?? "—" },
              { label: "Status", value: project.status },
              { label: "Estimated Budget", value: fmt(project.estimated_budget) },
              { label: "Contracted Budget", value: fmt(project.contracted_budget) },
              { label: "Actual Cost", value: fmt(project.actual_cost) },
              { label: "License", value: project.license_number ?? "CCB #246527" },
              { label: "Portal Enabled", value: project.client_portal_enabled ? "Yes" : "No" },
              { label: "Permit Numbers", value: project.permit_numbers ?? "None on file" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border/60 p-4">
                <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-1"
                   style={{ fontFamily: "var(--font-condensed)" }}>{label}</p>
                <p className="text-sm text-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            {reports?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No field reports yet.</p>
            ) : reports?.data.map(r => (
              <button key={r.id} onClick={() => setLocation(`/admin/field-reports/${r.id}`)}
                      className="w-full text-left bg-card border border-border/60 p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{new Date(r.report_date).toLocaleDateString()}</p>
                  <span className={`text-[9px] px-2 py-1 border font-semibold tracking-widest uppercase ${
                    r.published_to_client ? "text-green-400 border-green-400/30" : "text-muted-foreground border-border/60"
                  }`} style={{ fontFamily: "var(--font-condensed)" }}>
                    {r.published_to_client ? "Published" : "Draft"}
                  </span>
                </div>
                {r.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>}
              </button>
            ))}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-2">
            {schedule?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No schedule items yet.</p>
            ) : schedule?.map(item => (
              <div key={item.id} className="bg-card border border-border/60 p-4 flex items-center gap-4">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  item.status === "complete" ? "bg-green-400" :
                  item.status === "in_progress" ? "bg-primary" :
                  item.status === "deferred" ? "bg-red-400" : "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.planned_start && (
                    <p className="text-xs text-muted-foreground">{new Date(item.planned_start).toLocaleDateString()}</p>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground border border-border/60 px-2 py-1 uppercase tracking-wider flex-shrink-0"
                      style={{ fontFamily: "var(--font-condensed)" }}>{item.task_type}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "materials" && (
          <div className="space-y-2">
            {materials?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No materials tracked yet.</p>
            ) : materials?.data.map(m => (
              <div key={m.id} className={`bg-card border p-4 flex items-center gap-4 ${
                m.is_shortage ? "border-red-400/40 bg-red-400/5" : "border-border/60"
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.vendor_name ?? "No vendor"} · {m.unit ?? "units"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs">{m.quantity_received ?? 0}/{m.quantity_needed ?? "?"} {m.unit ?? ""}</p>
                  {m.is_shortage && <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">Shortage</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "ledger" && (
          <div className="space-y-3">
            <div className="bg-card border border-border/60 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Add Ledger Entry</p>
              <LedgerEntryForm projectId={projectId} onSuccess={() => utils.ledger.list.invalidate({ projectId })} />
            </div>
            {ledger?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No ledger entries yet.</p>
            ) : ledger?.data.map(e => (
              <div key={e.id} className="bg-card border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm font-medium">{e.title}</p>
                  <span className="text-[9px] border border-border/60 px-2 py-0.5 text-muted-foreground uppercase tracking-wider flex-shrink-0"
                        style={{ fontFamily: "var(--font-condensed)" }}>{e.entry_type}</span>
                </div>
                <p className="text-xs text-muted-foreground">{e.description}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-2">{new Date(e.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function LedgerEntryForm({ projectId, onSuccess }: { projectId: number; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<any>("note");
  const append = trpc.ledger.append.useMutation({ onSuccess: () => { setTitle(""); setDesc(""); onSuccess(); } });

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Entry title"
               className="px-3 py-2 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60" />
        <select value={type} onChange={e => setType(e.target.value)}
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
          {["decision","change_order","inspection","permit","milestone","cost_adjustment","note"].map(t => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description…" rows={2}
                className="w-full px-3 py-2 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none" />
      <button
        onClick={() => title && desc && append.mutate({ projectId, entryType: type, title, description: desc })}
        disabled={!title || !desc || append.isPending}
        className="text-[11px] px-4 py-2 bg-primary text-primary-foreground font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {append.isPending ? "Saving…" : "Add Entry"}
      </button>
    </div>
  );
}
