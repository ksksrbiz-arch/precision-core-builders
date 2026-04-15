import { db, paginate } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const fieldReportsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(50).optional(),
      })
    )
    .query(async ({ input }) => {
      const { from, to } = paginate(input);
      let q = db
        .from("field_reports")
        .select("*, projects(id,name)", { count: "exact" })
        .order("report_date", { ascending: false })
        .range(from, to);
      if (input.projectId) q = q.eq("project_id", input.projectId);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("field_reports")
        .select("*, projects(id,name,client_id,clients(user_id))")
        .eq("id", input.id)
        .single();
      if (error) throw new Error(error.message);
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
      const { data, error } = await db
        .from("field_reports")
        .insert({
          project_id: input.projectId,
          author_id: ctx.user.id,
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
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
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
      const { data, error } = await db
        .from("field_reports")
        .update({
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
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  publish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { data, error } = await db
        .from("field_reports")
        .update({
          published_to_client: true,
          published_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db
        .from("field_reports")
        .delete()
        .eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  // Client-facing: published reports for their project
  listPublished: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("field_reports")
        .select(
          "id,report_date,summary,tasks_completed,published_at,photo_urls"
        )
        .eq("project_id", input.projectId)
        .eq("published_to_client", true)
        .order("report_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  // Analytics: report counts by week (last 8 weeks)
  weeklyStats: adminProcedure.query(async () => {
    const { data } = await db
      .from("field_reports")
      .select("report_date,published_to_client,issues_flagged")
      .order("report_date", { ascending: true })
      .gte(
        "report_date",
        new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString()
      );

    const weeks: Record<string, { week: string; reports: number; issues: number; published: number }> = {};
    for (const r of data ?? []) {
      const d = new Date(r.report_date);
      // ISO week start (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) {
        weeks[key] = {
          week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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
