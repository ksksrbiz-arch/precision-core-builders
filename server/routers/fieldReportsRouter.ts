import { db } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { logAdminAction } from "../_core/auditLog";
import { assertProjectAccess } from "../_core/access";
import { authorUuid } from "../_core/identity";
import {
  createFieldReport,
  deleteFieldReport,
  getFieldReportById,
  getFieldReportPhotos,
  getFieldReportProjectId,
  getWeeklyStatsRows,
  listFieldReports,
  listPublishedFieldReports,
  publishFieldReport,
  saveFieldReportPhotoTags,
  unpublishFieldReport,
  updateFieldReport,
} from "../_data/fieldReportsRepo";
import {
  isVisionTaggingConfigured,
  tagFieldReportPhotos,
  VisionConfigError,
} from "../_core/visionTagging";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const DAY_MS = 86_400_000;
const WEEKLY_BUCKETS = 8;

/** Monday 00:00 UTC (ms) of the week containing `t`. */
function weekStartUtc(t: number): number {
  const d = new Date(t);
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday
  return (
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
    ((dayOfWeek + 6) % 7) * DAY_MS
  );
}

/** Start (ms) of the oldest of the last 8 weekly buckets. */
function weeklyWindowStart(now: number = Date.now()): number {
  return weekStartUtc(now) - (WEEKLY_BUCKETS - 1) * 7 * DAY_MS;
}

/** Parse a JSON-string array column, tolerating null / malformed values. */
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export const fieldReportsRouter = router({
  // Admin-only: returns all reports (including unpublished drafts) for any
  // project. Portal clients must use `listPublished`. Previously
  // protectedProcedure, which let any logged-in client read unpublished
  // reports across projects by passing an arbitrary projectId.
  list: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(50).optional(),
      })
    )
    .query(async ({ input }) => {
      return listFieldReports(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const data = await getFieldReportById(input.id);
      // Clients may only read PUBLISHED reports for their own project —
      // drafts hold internal notes and flagged issues Eric hasn't released.
      if (ctx.user.role !== "admin") {
        const clientUserId = (data?.projects as any)?.clients?.user_id;
        if (
          !clientUserId ||
          clientUserId !== ctx.user.id ||
          !data?.published_to_client
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to view this field report.",
          });
        }
      }
      return data;
    }),

  create: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        reportDate: z.string().datetime().optional(),
        transcription: z.string().optional(),
        summary: z.string().optional(),
        tasksCompleted: z.array(z.string()).optional(),
        materialsUsed: z.array(z.string()).optional(),
        issuesFlagged: z.array(z.string()).optional(),
        materialShortages: z.array(z.string()).optional(),
        photoUrls: z.array(z.string().url()).optional(),
        voiceMemoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const data = await createFieldReport({
        project_id: input.projectId,
        author_id: authorUuid(ctx.user),
        report_date: input.reportDate ?? new Date().toISOString(),
        transcription: input.transcription,
        summary: input.summary,
        tasks_completed: input.tasksCompleted
          ? JSON.stringify(input.tasksCompleted)
          : null,
        materials_used: input.materialsUsed
          ? JSON.stringify(input.materialsUsed)
          : null,
        issues_flagged: input.issuesFlagged
          ? JSON.stringify(input.issuesFlagged)
          : null,
        material_shortages: input.materialShortages
          ? JSON.stringify(input.materialShortages)
          : null,
        photo_urls: input.photoUrls ? JSON.stringify(input.photoUrls) : null,
        voice_memo_url: input.voiceMemoUrl,
      });
      await logAdminAction(db, ctx, "fieldReport.create", input.projectId, {
        reportId: data.id,
        reportDate: data.report_date,
      });
      return data;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        summary: z.string().optional(),
        tasksCompleted: z.array(z.string()).optional(),
        materialsUsed: z.array(z.string()).optional(),
        issuesFlagged: z.array(z.string()).optional(),
        materialShortages: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const {
        id,
        tasksCompleted,
        materialsUsed,
        issuesFlagged,
        materialShortages,
        ...rest
      } = input;
      return updateFieldReport(id, {
        ...rest,
        ...(tasksCompleted !== undefined && {
          tasks_completed: JSON.stringify(tasksCompleted),
        }),
        ...(materialsUsed !== undefined && {
          materials_used: JSON.stringify(materialsUsed),
        }),
        ...(issuesFlagged !== undefined && {
          issues_flagged: JSON.stringify(issuesFlagged),
        }),
        ...(materialShortages !== undefined && {
          material_shortages: JSON.stringify(materialShortages),
        }),
      });
    }),

  // Run the free-tier vision model over a report's attached photos and persist
  // the structured tags. Idempotent by design: safe to re-run to refresh tags
  // (e.g. after adding photos). Returns the tags for immediate rendering.
  //
  // The client auto-invokes this the first time a report with photos but no
  // tags is opened, so site photos are analyzed without a manual Vision Studio
  // visit — but it's an explicit mutation (not baked into `create`) so report
  // creation stays instant and a slow/rate-limited vision call never blocks it.
  tagPhotos: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (!isVisionTaggingConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: new VisionConfigError().message,
        });
      }

      const report = await getFieldReportPhotos(input.id);
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Field report not found.",
        });
      }

      const urls = parseJsonArray(
        (report as { photo_urls?: unknown }).photo_urls
      );
      if (urls.length === 0) {
        return { tags: [] as Awaited<ReturnType<typeof tagFieldReportPhotos>> };
      }

      const tags = await tagFieldReportPhotos(urls, authorUuid(ctx.user));
      await saveFieldReportPhotoTags(input.id, JSON.stringify(tags));
      return { tags };
    }),

  publish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const data = await publishFieldReport(input.id);
      await logAdminAction(db, ctx, "fieldReport.publish", data.project_id, {
        reportId: input.id,
      });
      return data;
    }),

  unpublish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const data = await unpublishFieldReport(input.id);
      await logAdminAction(db, ctx, "fieldReport.unpublish", data.project_id, {
        reportId: input.id,
      });
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      // Fetch project_id before deletion for audit log.
      const { data: report, error: fetchError } = await getFieldReportProjectId(
        input.id
      );
      if (fetchError || !report) {
        throw new Error(fetchError?.message ?? "Field report not found");
      }
      await deleteFieldReport(input.id);
      await logAdminAction(db, ctx, "fieldReport.delete", report.project_id, {
        reportId: input.id,
      });
      return { success: true };
    }),

  // Client-facing: published reports for their project
  listPublished: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      // A portal client may only read their own project's published reports.
      await assertProjectAccess(ctx, input.projectId);
      return listPublishedFieldReports(input.projectId);
    }),

  // Analytics: report counts by week (last 8 weeks, including the current
  // one). Every week is present — quiet weeks are zero rather than missing, so
  // the chart's spacing is honest — and weeks are Monday-start in UTC so the
  // buckets don't depend on the server's timezone.
  weeklyStats: adminProcedure.query(async () => {
    const since = weeklyWindowStart();
    const data = await getWeeklyStatsRows(new Date(since).toISOString());

    const weeks = new Map<
      number,
      { week: string; reports: number; issues: number; published: number }
    >();
    for (let i = 0; i < WEEKLY_BUCKETS; i++) {
      const start = since + i * 7 * DAY_MS;
      weeks.set(start, {
        week: new Date(start).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        reports: 0,
        issues: 0,
        published: 0,
      });
    }
    for (const r of data ?? []) {
      const t = Date.parse(r.report_date);
      if (Number.isNaN(t)) continue;
      const bucket = weeks.get(weekStartUtc(t));
      if (!bucket) continue; // outside the 8-week window
      bucket.reports++;
      if (r.published_to_client) bucket.published++;
      if (parseJsonArray(r.issues_flagged).length > 0) bucket.issues++;
    }

    return [...weeks.values()];
  }),
});
