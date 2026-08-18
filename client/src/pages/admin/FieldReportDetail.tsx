/**
 * FieldReportDetail — view a single field report with full AI-structured content.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useToast } from "@/components/ToastProvider";
import { trpc } from "@/lib/trpc";
import { fmtDate as fmtDateSafe, fmtDateTime } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileX,
  Loader2,
  Mic,
  Package,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";

/** Structured AI tag for a single field-report photo (see visionTagging.ts). */
type PhotoTag = {
  url: string;
  category: "progress" | "safety" | "defect" | "material" | "general";
  headline: string;
  tags: string[];
  safetyConcerns: string[];
  progressNote?: string;
  error?: string;
};

const CATEGORY_STYLES: Record<PhotoTag["category"], string> = {
  progress: "text-green-500 border-green-500/30 bg-green-500/5",
  safety: "text-red-400 border-red-400/30 bg-red-400/5",
  defect: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  material: "text-primary border-primary/30 bg-primary/5",
  general: "text-muted-foreground border-border/60 bg-muted/20",
};

// These columns are stored as JSON strings (fieldReportsRouter JSON.stringify's
// them on write; getById returns them raw). Parse to arrays before rendering —
// calling .map() on the raw string would crash the page.
function parseList<T = string>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

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

  const { addToast } = useToast();
  const syncShortagesMut = useMutationWithToast(
    trpc.materials.createMany.useMutation(),
    {
      success: "Shortages Synced",
      successMessage: "Material shortages pushed to inventory.",
      error: "Sync Failed",
      errorMessage: "Could not sync shortages to materials.",
      invalidate: () => {
        utils.materials.list.invalidate();
      },
    }
  );

  // AI photo tagging — runs the free-tier vision model over attached photos.
  const tagPhotosMut = trpc.fieldReports.tagPhotos.useMutation({
    onSuccess: () => utils.fieldReports.getById.invalidate({ id: reportId }),
  });

  // Guard so the auto-run fires at most once per report id (never loops).
  const autoTaggedRef = useRef<number | null>(null);
  const photoUrls = parseList(report?.photo_urls);
  const photoTags = parseList<PhotoTag>(report?.photo_tags);
  const hasPhotos = photoUrls.length > 0;
  const tagsMissing = hasPhotos && photoTags.length === 0;

  // Auto-analyze the first time a report with photos but no tags is opened, so
  // Eric never has to open Vision Studio manually. Only fires when vision is
  // reachable (mutation surfaces a config error otherwise, which we don't loop).
  useEffect(() => {
    if (
      report &&
      tagsMissing &&
      autoTaggedRef.current !== reportId &&
      !tagPhotosMut.isPending
    ) {
      autoTaggedRef.current = reportId;
      tagPhotosMut.mutate({ id: reportId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, tagsMissing, reportId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-4 w-40 mb-6" />
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-40 shrink-0" />
          </div>
          <Skeleton className="h-24 w-full mb-5" />
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-12">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Could not load this report</AlertTitle>
            <AlertDescription>
              A network or authorization issue occurred. Please try again.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-center mt-4">
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
        <div className="max-w-md mx-auto p-12">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileX />
              </EmptyMedia>
              <EmptyTitle>Report not found</EmptyTitle>
              <EmptyDescription>
                This field report may have been removed or the link is
                incorrect.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => setLocation("/admin/field-reports")}
                className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase border border-primary/40 text-primary px-4 py-2 hover:bg-primary/10 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Field Reports
              </button>
            </EmptyContent>
          </Empty>
        </div>
      </DashboardLayout>
    );
  }

  const projectName = (report as any).projects?.name ?? "Unknown Project";
  const isPublished = report.published_to_client;

  const tasksCompleted = parseList(report.tasks_completed);
  const materialsUsed = parseList(report.materials_used);
  const issuesFlagged = parseList(report.issues_flagged);
  const materialShortages = parseList(report.material_shortages);
  const fmtDate = (d: string) =>
    fmtDateSafe(d, {
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
          {tasksCompleted.length > 0 && (
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
                {tasksCompleted.map((task: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground">{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Materials Used */}
          {materialsUsed.length > 0 && (
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
                {materialsUsed.map((mat: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground">{mat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues Flagged */}
          {issuesFlagged.length > 0 && (
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
                {issuesFlagged.map((issue: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Material Shortages */}
          {materialShortages.length > 0 && (
            <div className="bg-card border border-red-400/30 bg-red-400/5 p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p
                    className="text-[9px] font-bold tracking-[0.2em] uppercase text-red-400/80"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Material Shortages
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    syncShortagesMut.isPending || !(report as any).project_id
                  }
                  onClick={() => {
                    const projectId = (report as any).project_id as
                      number | undefined;
                    if (!projectId) {
                      addToast({
                        type: "error",
                        title: "No project",
                        message:
                          "This report is not linked to a project, so shortages cannot be synced.",
                        duration: 5000,
                      });
                      return;
                    }
                    const names = materialShortages
                      .map((s: string) => String(s).trim())
                      .filter(Boolean);
                    if (!names.length) return;
                    syncShortagesMut.mutate({
                      items: names.map((name: string) => ({
                        projectId,
                        name,
                        quantityNeeded: 1,
                        quantityOrdered: 0,
                        notes: `Flagged from field report #${reportId}`,
                      })),
                    });
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase border border-red-400/40 text-red-400 px-2.5 py-1.5 hover:bg-red-400/10 disabled:opacity-50 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Package className="h-3 w-3" />
                  {syncShortagesMut.isPending
                    ? "Syncing…"
                    : "Push to Materials"}
                </button>
              </div>
              <ul className="space-y-1.5">
                {materialShortages.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <span className="text-sm text-foreground">{s}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground mt-3">
                Pushes each shortage name into project inventory as a shortage
                row so Generate PO can pick them up.
              </p>
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

        {/* Photos + AI vision tags */}
        {photoUrls.length > 0 &&
          (() => {
            // Map tags by URL so ordering/count mismatches never misalign.
            const tagByUrl = new Map(photoTags.map(t => [t.url, t]));
            const analyzing = tagPhotosMut.isPending;
            const configError =
              tagPhotosMut.error?.data?.code === "PRECONDITION_FAILED";

            return (
              <div className="bg-card border border-border/60 p-5 mb-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p
                      className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Photos ({photoUrls.length}) · AI Analyzed
                    </p>
                  </div>
                  {!configError && (
                    <button
                      onClick={() => tagPhotosMut.mutate({ id: reportId })}
                      disabled={analyzing}
                      className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {analyzing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      {analyzing
                        ? "Analyzing…"
                        : photoTags.length > 0
                          ? "Re-analyze"
                          : "Analyze"}
                    </button>
                  )}
                </div>

                {configError && (
                  <p className="text-xs text-muted-foreground mb-3 font-light">
                    Vision AI is not configured. Add a free OPENROUTER_API_KEY
                    to enable automatic photo analysis.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photoUrls.map((url: string, i: number) => {
                    const tag = tagByUrl.get(url);
                    return (
                      <div
                        key={i}
                        className="border border-border/60 overflow-hidden flex flex-col"
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video bg-input overflow-hidden hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </a>
                        <div className="p-3 space-y-2">
                          {tag && !tag.error ? (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 border font-bold tracking-widest uppercase ${CATEGORY_STYLES[tag.category]}`}
                                  style={{
                                    fontFamily: "var(--font-condensed)",
                                  }}
                                >
                                  {tag.category}
                                </span>
                                <span className="text-xs font-medium text-foreground">
                                  {tag.headline}
                                </span>
                              </div>
                              {tag.progressNote && (
                                <p className="text-xs text-muted-foreground font-light">
                                  {tag.progressNote}
                                </p>
                              )}
                              {tag.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {tag.tags.map((t, ti) => (
                                    <span
                                      key={ti}
                                      className="text-[10px] px-1.5 py-0.5 bg-muted/40 text-muted-foreground rounded"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {tag.safetyConcerns.length > 0 && (
                                <div className="flex items-start gap-1.5 text-[11px] text-red-400">
                                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <span>{tag.safetyConcerns.join("; ")}</span>
                                </div>
                              )}
                            </>
                          ) : tag?.error ? (
                            <p className="text-[11px] text-muted-foreground/70 font-light">
                              Analysis unavailable for this photo.
                            </p>
                          ) : analyzing ? (
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-light">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Analyzing…
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {/* Meta footer */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground/50 pb-8">
          <span>Report ID: #{report.id}</span>
          <span>Created: {fmtDateTime(report.created_at)}</span>
          {report.published_at && (
            <span>Published: {fmtDateTime(report.published_at)}</span>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
