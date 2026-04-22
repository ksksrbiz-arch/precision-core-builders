import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { trpc } from "@/lib/trpc";
import { Plus, Search, MapPin, DollarSign } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { StatusBadge } from "./CommandCenter";

export default function ProjectsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.projects.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    status: (status as any) || undefined,
  });

  const fmt = (n: number | string | null | undefined) =>
    n ? `$${Number(n).toLocaleString()}` : "—";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <AdminPageHeader
          title="Projects"
          guideId="projects"
          description="Track active jobs, budgets, progress, and status from one command surface."
          actions={
            <button
              onClick={() => setLocation("/admin/projects/new")}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> New Project
            </button>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
            />
          </div>
          <select
            value={status ?? ""}
            onChange={e => {
              setStatus(e.target.value || undefined);
              setPage(1);
            }}
            className="bg-input border border-border text-sm text-foreground px-3 py-2.5 focus:outline-none focus:border-primary/60"
          >
            <option value="">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="estimate_sent">Estimate Sent</option>
            <option value="contracted">Contracted</option>
            <option value="in_progress">In Progress</option>
            <option value="punch_list">Punch List</option>
            <option value="complete">Complete</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border/60 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : data?.data.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                No projects found
              </p>
              <button
                onClick={() => setLocation("/admin/projects/new")}
                className="text-primary text-sm underline"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40">
                      {[
                        "Project",
                        "Client",
                        "Status",
                        "Budget",
                        "Progress",
                        "",
                      ].map(h => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/60"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setLocation(`/admin/projects/${p.id}`)}
                        className="border-b border-border/30 hover:bg-primary/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {p.name}
                          </p>
                          {p.city && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {p.city}, {p.state}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {(p as any).clients?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {fmt(p.estimated_budget)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-input rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${p.completion_percent ?? 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {p.completion_percent ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-primary hover:underline">
                            View →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {(data?.total ?? 0) > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * 20 + 1}–
                    {Math.min(page * 20, data?.total ?? 0)} of {data?.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="text-xs px-3 py-1.5 border border-border/60 disabled:opacity-40 hover:border-primary/40 transition-colors"
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={page * 20 >= (data?.total ?? 0)}
                      onClick={() => setPage(p => p + 1)}
                      className="text-xs px-3 py-1.5 border border-border/60 disabled:opacity-40 hover:border-primary/40 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
