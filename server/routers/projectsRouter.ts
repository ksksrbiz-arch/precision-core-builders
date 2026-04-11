import { db, paginate } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

const ProjectStatusEnum = z.enum([
  "lead",
  "estimate_sent",
  "contracted",
  "in_progress",
  "punch_list",
  "complete",
  "on_hold",
]);

const CreateProjectInput = z.object({
  clientId: z.number().int().positive(),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  status: ProjectStatusEnum.optional().default("lead"),
  projectType: z.string().max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional().default("OR"),
  zip: z.string().max(10).optional(),
  estimatedBudget: z.number().positive().optional(),
  contractedBudget: z.number().positive().optional(),
  estimatedStartDate: z.string().datetime().optional(),
  estimatedEndDate: z.string().datetime().optional(),
  clientPortalEnabled: z.boolean().optional().default(true),
  siteCamUrl: z.string().url().optional(),
  permitNumbers: z.string().optional(),
});

export const projectsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        status: ProjectStatusEnum.optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { from, to } = paginate(input);
      let q = db
        .from("projects")
        .select("*, clients(id,name,email,phone)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (input.status) q = q.eq("status", input.status);
      if (input.search) q = q.ilike("name", `%${input.search}%`);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await db
        .from("projects")
        .select("*, clients(id,name,email,phone,user_id)")
        .eq("id", input.id)
        .single();
      if (error) throw new Error(error.message);
      // Clients can only view their own projects
      if (ctx.user?.role !== "admin") {
        if (
          data.clients?.user_id !== ctx.user?.id ||
          !data.client_portal_enabled
        ) {
          throw new Error("Unauthorized");
        }
      }
      return data;
    }),

  create: adminProcedure
    .input(CreateProjectInput)
    .mutation(async ({ input }) => {
      const { data, error } = await db
        .from("projects")
        .insert({
          client_id: input.clientId,
          name: input.name,
          description: input.description,
          status: input.status,
          project_type: input.projectType,
          address: input.address,
          city: input.city,
          state: input.state ?? "OR",
          zip: input.zip,
          estimated_budget: input.estimatedBudget,
          contracted_budget: input.contractedBudget,
          estimated_start_date: input.estimatedStartDate,
          estimated_end_date: input.estimatedEndDate,
          client_portal_enabled: input.clientPortalEnabled ?? true,
          site_cam_url: input.siteCamUrl,
          permit_numbers: input.permitNumbers,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: adminProcedure
    .input(
      z
        .object({ id: z.number().int().positive() })
        .merge(CreateProjectInput.partial())
    )
    .mutation(async ({ input }) => {
      const {
        id,
        clientId,
        projectType,
        estimatedBudget,
        contractedBudget,
        estimatedStartDate,
        estimatedEndDate,
        clientPortalEnabled,
        siteCamUrl,
        permitNumbers,
        ...rest
      } = input;
      const { data, error } = await db
        .from("projects")
        .update({
          ...(clientId !== undefined && { client_id: clientId }),
          ...(projectType !== undefined && { project_type: projectType }),
          ...(estimatedBudget !== undefined && {
            estimated_budget: estimatedBudget,
          }),
          ...(contractedBudget !== undefined && {
            contracted_budget: contractedBudget,
          }),
          ...(estimatedStartDate !== undefined && {
            estimated_start_date: estimatedStartDate,
          }),
          ...(estimatedEndDate !== undefined && {
            estimated_end_date: estimatedEndDate,
          }),
          ...(clientPortalEnabled !== undefined && {
            client_portal_enabled: clientPortalEnabled,
          }),
          ...(siteCamUrl !== undefined && { site_cam_url: siteCamUrl }),
          ...(permitNumbers !== undefined && { permit_numbers: permitNumbers }),
          ...rest,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  updateProgress: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        completionPercent: z.number().int().min(0).max(100),
        actualCost: z.number().nonnegative().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { data, error } = await db
        .from("projects")
        .update({
          completion_percent: input.completionPercent,
          ...(input.actualCost !== undefined && {
            actual_cost: input.actualCost,
          }),
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
      const { error } = await db.from("projects").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  stats: adminProcedure.query(async () => {
    const { data } = await db
      .from("projects")
      .select("status, estimated_budget, actual_cost, contracted_budget");
    const all = data ?? [];
    return {
      total: all.length,
      byStatus: {
        lead: all.filter(p => p.status === "lead").length,
        active: all.filter(p => p.status === "in_progress").length,
        contracted: all.filter(p => p.status === "contracted").length,
        complete: all.filter(p => p.status === "complete").length,
      },
      totalEstimated: all.reduce(
        (s, p) => s + Number(p.estimated_budget ?? 0),
        0
      ),
      totalActual: all.reduce((s, p) => s + Number(p.actual_cost ?? 0), 0),
    };
  }),
});
