/**
 * Client Portal — Published Field Reports
 * Read-only view of reports Eric has published to this client.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import { fmtDate } from "@/lib/formatters";
import { PortalLayout } from "@/components/layout/PortalLayout";
import PortalAssistant from "@/components/PortalAssistant";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Calendar, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function PortalReports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: projects } = trpc.projects.list.useQuery(
    { pageSize: 1 },
    { enabled: !!user }
  );
  const project = projects?.data?.[0];

  const { data: reports, isLoading } = trpc.fieldReports.listPublished.useQuery(
    { projectId: project?.id! },
    { enabled: !!project?.id }
  );

  // Live: new published reports appear without manual refresh
  useRealtimeTable({
    table: "field_reports",
    onUpdate: () => {
      if (project?.id)
        utils.fieldReports.listPublished.invalidate({ projectId: project.id });
    },
  });

  const parseJSON = (s: string | null): string[] => {
    try {
      return JSON.parse(s ?? "[]");
    } catch {
      return [];
    }
  };
  const formatReportDate = (d: string) =>
    fmtDate(d, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <PortalLayout>
      <div className="container py-10 max-w-3xl">
        <button
          onClick={() => setLocation("/portal")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Portal
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Field Reports
          </p>
          <h1
            className="text-2xl sm:text-3xl font-semibold mb-2 break-words"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {project?.name ?? "Your Project"}
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-8">
            Daily progress updates from Eric and his crew.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
            Loading reports…
          </div>
        ) : !reports?.length ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              No reports published yet. Eric will share updates as work
              progresses.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => {
              const tasks = parseJSON(report.tasks_completed);
              const issues = parseJSON(report.issues_flagged);
              const shortages = parseJSON(report.material_shortages);
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border/60 p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {formatReportDate(report.report_date)}
                    </span>
                    <CheckCircle2 className="h-3 w-3 text-green-400 ml-auto" />
                  </div>
                  <p className="text-sm text-foreground mb-4 leading-relaxed">
                    {report.summary}
                  </p>
                  {tasks.length > 0 && (
                    <div className="mb-3">
                      <p
                        className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Work Completed
                      </p>
                      <ul className="space-y-1">
                        {tasks.map((task: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="text-primary mt-0.5">·</span>{" "}
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {issues.length > 0 && (
                    <div className="mb-3">
                      <p
                        className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-400 mb-2"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Issues Flagged
                      </p>
                      <ul className="space-y-1">
                        {issues.map((issue: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="text-amber-400 mt-0.5">·</span>{" "}
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {shortages.length > 0 && (
                    <div>
                      <p
                        className="text-[10px] font-bold tracking-[0.18em] uppercase text-red-400 mb-2"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Material Shortages
                      </p>
                      <ul className="space-y-1">
                        {shortages.map((s: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="text-red-400 mt-0.5">·</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Reports assistant */}
        <div className="mt-6">
          <PortalAssistant
            title="Reports Assistant"
            quickPrompts={[
              "Summarize my recent updates",
              "Were any issues flagged?",
              "What was completed this week?",
              "What's the latest on my project?",
            ]}
          />
        </div>
      </div>
    </PortalLayout>
  );
}
