/**
 * FieldReportDetail — view a single field report with full AI-structured content.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Mic,
  Package,
  Wrench,
} from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function FieldReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const reportId = parseInt(id ?? "0");

  const {
    data: report,
    isLoading,
    isError,
    refetch,
  } = trpc.fieldReports.getById.useQuery(
    { id: reportId },
    { enabled: !!reportId && !isNaN(reportId) }
  );

  const utils = trpc.useUtils();

  const publishMut = useMutationWithToast(
    trpc.fieldReports.publish.useMutation(),
    {
      success: "Report Published",
      successMessage: "Field report is now visible to client.",
      error: "Publish Failed",
      errorMessage: "Failed to publish report. Please try again.",
      invalidate: () => {
        utils.fieldReports.getById.invalidate({ id: reportId });
        utils.fieldReports.list.invalidate();
      },
    }
  );

  const unpublishMut = useMutationWithToast(
    trpc.fieldReports.unpublish.useMutation(),
    {
      success: "Report Unpublished",
      successMessage: "Field report hidden from client portal.",
      error: "Failed",
      errorMessage: "Failed to unpublish report.",
      invalidate: () => {
        utils.fieldReports.getById.invalidate({ id: reportId });
        utils.fieldReports.list.invalidate();
      },
    }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-12 text-center text-muted-foreground text-sm">
          Loading…
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-12 text-center">
          <p className="text-sm text-destructive mb-3">
            Could not load this report. Network or authorization issue.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => refetch()}
              className="text-xs font-bold tracking-widest uppercase border border-primary/40 text-primary px-4 py-2 hover:bg-primary/10 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Retry
            </button>
            <button
              onClick={() => setLocation("/admin/field-reports")}
              className="text-xs font-bold tracking-widest uppercase border border-border text-muted-foreground px-4 py-2 hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Back to Field Reports
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-12 text-center">
          <p className="text-muted-foreground text-sm">Report not found.</p>
          <button
            onClick={() => setLocation("/admin/field-reports")}
            className="text-primary text-sm underline mt-2"
          >
            Back to Field Reports
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const projectName = (report as any).projects?.name ?? "Unknown Project";
  const isPublished = report.published_to_client;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setLocation("/admin/field-reports")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Field Reports
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Mic className="h-5 w-5 text-primary" />
              <h1
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Field Report
              </h1>
              <span
                className={`text-[9px] px-2 py-1 border font-semibold tracking-widest uppercase ${
                  isPublished
                    ? "text-green-400 border-green-400/30 bg-green-400/5"
                    : "text-muted-foreground border-border/60"
                }`}
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {isPublished ? "Published" : "Draft"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {fmtDate(report.report_date)} ·{" "}
              <button
                onClick={() =>
                  setLocation(`/admin/projects/${(report as any).projects?.id}`)
                }
                className="text-primary hover:underline"
              >
                {projectName}
              </button>
            </p>
          </div>

          <button
            onClick={() => {
              if (isPublished) {
                unpublishMut.mutate({ id: reportId });
              } else {
                publishMut.mutate({ id: reportId });
              }
            }}
            disabled={publishMut.isPending || unpublishMut.isPending}
            className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-colors flex-shrink-0 ${
              isPublished
                ? "border border-border/60 text-muted-foreground hover:border-primary/40"
                : "bg-primary text-primary-foreground hover:bg-primary/85"
            } disabled:opacity-50`}
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {isPublished ? (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Unpublish
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> Publish to Client
              </>
            )}
          </button>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="bg-card border border-border/60 p-5 mb-5">
            <p
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-2"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              AI Summary
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {report.summary}
            </p>
          </div>
        )}

        {/* Structured sections */}
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {/* Tasks Completed */}
          {report.tasks_completed && report.tasks_completed.length > 0 && (
            <div className="bg-card border border-border/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <p
                  className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Tasks Completed
                </p>
              </div>
              <ul className="space-y-1.5">
                {report.tasks_completed.map((task: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground">{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Materials Used */}
          {report.materials_used && report.materials_used.length > 0 && (
            <div className="bg-card border border-border/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-primary" />
                <p
                  className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Materials Used
                </p>
              </div>
              <ul className="space-y-1.5">
                {report.materials_used.map((mat: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground">{mat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues Flagged */}
          {report.issues_flagged && report.issues_flagged.length > 0 && (
            <div className="bg-card border border-yellow-400/30 bg-yellow-400/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-yellow-400" />
                <p
                  className="text-[9px] font-bold tracking-[0.2em] uppercase text-yellow-400/80"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Issues Flagged
                </p>
              </div>
              <ul className="space-y-1.5">
                {report.issues_flagged.map((issue: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Material Shortages */}
          {report.material_shortages &&
            report.material_shortages.length > 0 && (
              <div className="bg-card border border-red-400/30 bg-red-400/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p
                    className="text-[9px] font-bold tracking-[0.2em] uppercase text-red-400/80"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Material Shortages
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {report.material_shortages.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span className="text-sm text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        {/* Raw Transcription */}
        {report.transcription && (
          <div className="bg-card border border-border/60 p-5 mb-5">
            <p
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Voice Transcription
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-light">
              {report.transcription}
            </p>
          </div>
        )}

        {/* Photo URLs */}
        {report.photo_urls && report.photo_urls.length > 0 && (
          <div className="bg-card border border-border/60 p-5 mb-5">
            <p
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Photos ({report.photo_urls.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.photo_urls.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video bg-input border border-border/60 overflow-hidden hover:border-primary/40 transition-colors"
                >
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Meta footer */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground/50 pb-8">
          <span>Report ID: #{report.id}</span>
          <span>Created: {new Date(report.created_at).toLocaleString()}</span>
          {report.published_at && (
            <span>
              Published: {new Date(report.published_at).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
