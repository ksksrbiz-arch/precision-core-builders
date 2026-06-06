import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { QueryError } from "@/components/QueryError";
import { SkeletonCard } from "@/components/Skeletons";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/useMobile";
import { Plus, Search, MapPin, DollarSign, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { StatusBadge } from "./CommandCenter";

export default function ProjectsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const isMobile = useIsMobile();

  const { data, isLoading, isError, refetch } = trpc.projects.list.useQuery({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
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
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 min-h-11 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
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
              className="w-full pl-9 pr-4 py-3 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
            />
          </div>
          <select
            value={status ?? ""}
            onChange={e => {
              setStatus(e.target.value || undefined);
              setPage(1);
            }}
            className="bg-input border border-border text-sm text-foreground px-3 py-3 focus:outline-none focus:border-primary/60"
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

        {isLoading ? (
          <SkeletonCard count={5} />
        ) : isError ? (
          <QueryError
            message="We couldn't load your projects. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : data?.data.length === 0 ? (
          <div className="bg-card border border-border/60 p-12 text-center">
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
        ) : isMobile ? (
          /* ── Mobile: tappable project cards ──────────────────────────────── */
          <div className="space-y-3">
            {data?.data.map(p => (
              <button
                key={p.id}
                onClick={() => setLocation(`/admin/projects/${p.id}`)}
                className="w-full text-left bg-card border border-border/60 p-4 md:p-5 active:bg-primary/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-semibold text-foreground truncate">
                      {p.name}
                    </p>
                    {p.city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {p.city}, {p.state}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={p.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Progress
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {p.completion_percent ?? 0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-input rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${p.completion_percent ?? 0}%` }}
                      />
                    </div>
                  </div>
                  {(p.estimated_budget || (p as any).clients?.name) && (
                    <div className="flex items-center gap-4 pt-0.5">
                      {p.estimated_budget && (
                        <div className="min-w-0">
                          <p
                            className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60"
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            Budget
                          </p>
                          <p className="text-xs font-semibold text-foreground flex items-center gap-0.5">
                            <DollarSign className="h-3 w-3 shrink-0" />
                            {Number(p.estimated_budget).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {(p as any).clients?.name && (
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60"
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            Client
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {(p as any).clients.name}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
            {/* Pagination */}
            {(data?.total ?? 0) > 20 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="text-xs px-4 py-3 min-h-11 border border-border/60 disabled:opacity-40 hover:border-primary/40 transition-colors active:scale-95"
                >
                  ← Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  {(page - 1) * 20 + 1}–{Math.min(page * 20, data?.total ?? 0)}{" "}
                  of {data?.total}
                </span>
                <button
                  disabled={page * 20 >= (data?.total ?? 0)}
                  onClick={() => setPage(p => p + 1)}
                  className="text-xs px-4 py-3 min-h-11 border border-border/60 disabled:opacity-40 hover:border-primary/40 transition-colors active:scale-95"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Desktop: standard table ──────────────────────────────────────── */
          <div className="bg-card border border-border/60 overflow-hidden">
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
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">{p.name}</p>
                        {p.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {p.city}, {p.state}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {(p as any).clients?.name ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {fmt(p.estimated_budget)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4 text-right">
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
                  {(page - 1) * 20 + 1}–{Math.min(page * 20, data?.total ?? 0)}{" "}
                  of {data?.total}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="text-xs px-4 py-3 min-h-11 border border-border/60 disabled:opacity-40 hover:border-primary/40 transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page * 20 >= (data?.total ?? 0)}
                    onClick={() => setPage(p => p + 1)}
                    className="text-xs px-4 py-3 min-h-11 border border-border/60 disabled:opacity-40 hover:border-primary/40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
