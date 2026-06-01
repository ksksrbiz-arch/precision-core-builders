/**
 * Field Reports — list all reports with project filter, date, and publish status.
 * Eric's daily field memos in one view.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { QueryError } from "@/components/QueryError";
import { trpc } from "@/lib/trpc";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function FieldReportsList() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const utils = trpc.useUtils();

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 100 });
  const { data, isLoading, isError, refetch } = trpc.fieldReports.list.useQuery(
    {
      page,
      pageSize: 20,
      projectId,
    }
  );

  // Live: new reports appear without manual refresh
  useRealtimeTable({
    table: "field_reports",
    onUpdate: () => {
      utils.fieldReports.list.invalidate();
    },
  });

  const parseJSON = (s: string | null): string[] => {
    try {
      return JSON.parse(s ?? "[]");
    } catch {
      return [];
    }
  };
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <AdminPageHeader
          title="Field Reports"
          guideId="field-reports"
          description="Review voice-to-report logs, crew notes, and published daily updates."
          actions={
            <button
              onClick={() => setLocation("/admin/field-reports/new")}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> New Report
            </button>
          }
        />

        {/* Project filter */}
        <div className="mb-5">
          <select
            value={projectId ?? ""}
            onChange={e => {
              setProjectId(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="bg-input border border-border text-sm text-foreground px-3 py-2.5 focus:outline-none focus:border-primary/60 w-full sm:w-auto sm:min-w-[220px]"
          >
            <option value="">All Projects</option>
            {projects?.data.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reports */}
        {isLoading ? (
          <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : isError ? (
          <QueryError
            message="We couldn't load field reports. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : data?.data.length === 0 ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-3">
              No field reports yet
            </p>
            <button
              onClick={() => setLocation("/admin/field-reports/new")}
              className="text-primary text-sm underline"
            >
              Record your first voice memo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.data.map((report: any) => {
              const tasks = parseJSON(report.tasks_completed);
              const issues = parseJSON(report.issues_flagged);
              const shortages = parseJSON(report.material_shortages);

              return (
                <button
                  key={report.id}
                  onClick={() =>
                    setLocation(
                      `/admin/projects/${report.project_id}?tab=reports`
                    )
                  }
                  className="w-full text-left bg-card border border-border/60 p-5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {(report as any).projects?.name ??
                            `Project #${report.project_id}`}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {report.summary || "No summary"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {report.published_to_client ? (
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-400"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Published
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          <Clock className="h-3 w-3" /> Draft
                        </span>
                      )}
                      <Eye className="h-3.5 w-3.5 text-muted-foreground/30" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{" "}
                      {fmtDate(report.report_date)}
                    </span>
                    {tasks.length > 0 && (
                      <span>
                        {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {issues.length > 0 && (
                      <span className="text-amber-400">
                        {issues.length} issue{issues.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {shortages.length > 0 && (
                      <span className="text-red-400">
                        {shortages.length} shortage
                        {shortages.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {Math.ceil(data.total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= data.total}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
