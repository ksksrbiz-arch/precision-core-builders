import { db } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { logAdminAction } from "../_core/auditLog";
import {
  createFieldReport,
  deleteFieldReport,
  getFieldReportById,
  getFieldReportProjectId,
  getWeeklyStatsRows,
  listFieldReports,
  listPublishedFieldReports,
  publishFieldReport,
  unpublishFieldReport,
  updateFieldReport,
} from "../_data/fieldReportsRepo";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
      // Clients may only read reports for their own project.
      if (ctx.user.role !== "admin") {
        const clientUserId = (data?.projects as any)?.clients?.user_id;
        if (!clientUserId || clientUserId !== ctx.user.id) {
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
        author_id: ctx.user!.id,
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
    .query(async ({ input }) => {
      return listPublishedFieldReports(input.projectId);
    }),

  // Analytics: report counts by week (last 8 weeks)
  weeklyStats: adminProcedure.query(async () => {
    const data = await getWeeklyStatsRows();

    const weeks: Record<
      string,
      { week: string; reports: number; issues: number; published: number }
    > = {};
    for (const r of data ?? []) {
      const d = new Date(r.report_date);
      // ISO week start (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) {
        weeks[key] = {
          week: weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          reports: 0,
          issues: 0,
          published: 0,
        };
      }
      weeks[key].reports++;
      if (r.published_to_client) weeks[key].published++;
      try {
        const issues = JSON.parse(r.issues_flagged ?? "[]");
        if (Array.isArray(issues) && issues.length > 0) weeks[key].issues++;
      } catch {
        // ignore
      }
    }

    return Object.values(weeks).slice(-8);
  }),
});
