import { db, paginate } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { logAdminAction } from "../_core/auditLog";
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
  startDate: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
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
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().positive().optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
          status: ProjectStatusEnum.optional(),
          search: z.string().optional(),
        })
        .optional()
        .default({})
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

  // Returns the authenticated client's own active project (portal use).
  myProject: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    // Admins don't use this endpoint; they use the admin list.
    if (ctx.user.role === "admin") return null;
    // Filter by the client row whose user_id matches the authenticated user.
    // Supabase foreign-table filters use the `foreignTable.column` syntax.
    const { data, error } = await db
      .from("projects")
      .select("*, clients!inner(id,name,email,phone,user_id)")
      .eq("client_portal_enabled", true)
      .eq("clients.user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
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
    .mutation(async ({ input, ctx }) => {
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
      await logAdminAction(db, ctx, "project.create", data.id, {
        name: data.name,
        clientId: data.client_id,
        status: data.status,
      });
      return data;
    }),

  update: adminProcedure
    .input(
      z
        .object({ id: z.number().int().positive() })
        .merge(CreateProjectInput.partial())
    )
    .mutation(async ({ input, ctx }) => {
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
      await logAdminAction(db, ctx, "project.update", id, {
        updatedFields: Object.keys(rest).concat(
          clientId !== undefined ? ["clientId"] : [],
          projectType !== undefined ? ["projectType"] : []
        ),
      });
      return data;
    }),

  updateProgress: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        completionPercent: z.number().int().min(0).max(100).optional(),
        actualCost: z.number().nonnegative().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updates: Record<string, unknown> = {};
      if (input.completionPercent !== undefined)
        updates.completion_percent = input.completionPercent;
      if (input.actualCost !== undefined)
        updates.actual_cost = input.actualCost;
      if (Object.keys(updates).length === 0) {
        const { data: current } = await db
          .from("projects")
          .select()
          .eq("id", input.id)
          .single();
        return current;
      }
      const { data, error } = await db
        .from("projects")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await logAdminAction(db, ctx, "project.delete", input.id, {
        projectId: input.id,
      });
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

  profitability: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [projectRes, materialsRes, ledgerRes] = await Promise.all([
        db
          .from("projects")
          .select(
            "id,name,estimated_budget,contracted_budget,actual_cost,completion_percent,status"
          )
          .eq("id", input.id)
          .single(),
        db
          .from("materials")
          .select("unit_price_current,quantity_needed,quantity_on_hand")
          .eq("project_id", input.id),
        db
          .from("ledger_entries")
          .select("amount_delta,entry_type")
          .eq("project_id", input.id),
      ]);

      if (projectRes.error) throw new Error(projectRes.error.message);
      const project = projectRes.data;

      const materialsCost = (materialsRes.data ?? []).reduce(
        (sum, m) =>
          sum +
          Number(m.unit_price_current ?? 0) * Number(m.quantity_needed ?? 0),
        0
      );

      const changeOrderTotal = (ledgerRes.data ?? [])
        .filter(
          e =>
            e.entry_type === "change_order" ||
            e.entry_type === "cost_adjustment"
        )
        .reduce((sum, e) => sum + Number(e.amount_delta ?? 0), 0);

      const contracted = Number(project.contracted_budget ?? 0);
      const estimated = Number(project.estimated_budget ?? 0);
      const actualCost = Number(project.actual_cost ?? 0);
      const budget = contracted || estimated;
      const projectedCost = actualCost > 0 ? actualCost : materialsCost;
      const margin = budget > 0 ? ((budget - projectedCost) / budget) * 100 : 0;
      const variance = budget - projectedCost;

      return {
        projectId: input.id,
        contracted,
        estimated,
        actualCost,
        materialsCost,
        changeOrderTotal,
        projectedCost,
        margin,
        variance,
        completionPercent: Number(project.completion_percent ?? 0),
        status: project.status,
        onBudget: variance >= 0,
      };
    }),
});
