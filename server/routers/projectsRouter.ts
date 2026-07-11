import { db } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { logAdminAction } from "../_core/auditLog";
import {
  createProject,
  deleteProject,
  getMyProject,
  getPortfolioProfitability,
  getProfitabilitySources,
  getProjectById,
  getProjectRow,
  getProjectsStats,
  listProjects,
  updateProject,
  updateProjectProgress,
} from "../_data/projectsRepo";
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
      return listProjects(input);
    }),

  // Returns the authenticated client's own active project (portal use).
  myProject: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    // Admins don't use this endpoint; they use the admin list.
    if (ctx.user.role === "admin") return null;
    // Filter by the client row whose user_id matches the authenticated user.
    // Supabase foreign-table filters use the `foreignTable.column` syntax.
    return getMyProject(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const data = await getProjectById(input.id);
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
      const data = await createProject({
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
      });
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
      const data = await updateProject(id, {
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
      });
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
        return getProjectRow(input.id);
      }
      return updateProjectProgress(input.id, updates);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await logAdminAction(db, ctx, "project.delete", input.id, {
        projectId: input.id,
      });
      return deleteProject(input.id);
    }),

  stats: adminProcedure.query(async () => {
    const all = await getProjectsStats();
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
      const [projectRes, materialsRes, ledgerRes] =
        await getProfitabilitySources(input.id);

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

  // Portfolio-wide profitability rollup. Moves ProfitabilityTable's
  // client-side margin math server-side so the table and the analytics
  // charts share one source of truth. Decimal columns arrive as strings, so
  // every numeric field is coerced via `num()`.
  profitabilitySummary: adminProcedure.query(async () => {
    const num = (v: unknown): number => {
      const x = typeof v === "string" ? parseFloat(v) : Number(v);
      return Number.isFinite(x) ? x : 0;
    };

    const rows = await getPortfolioProfitability();

    const projects = rows.map(p => {
      const contracted = num(p.contracted_budget);
      const estimated = num(p.estimated_budget);
      const actualCost = num(p.actual_cost);
      // Margin is measured against the contracted value when present,
      // otherwise the estimate.
      const basis = contracted || estimated;
      const profit = basis - actualCost;
      const marginPct = basis > 0 ? (profit / basis) * 100 : 0;
      const variance = estimated > 0 ? actualCost - estimated : 0;
      return {
        id: p.id as number,
        name: p.name as string,
        status: (p.status ?? null) as string | null,
        contracted,
        estimated,
        actualCost,
        basis,
        profit,
        marginPct,
        variance,
        hasData: basis > 0 || actualCost > 0,
      };
    });

    const totals = projects.reduce(
      (acc, r) => {
        acc.contracted += r.contracted;
        acc.estimated += r.estimated;
        acc.actualCost += r.actualCost;
        acc.profit += r.profit;
        acc.basis += r.basis;
        return acc;
      },
      { contracted: 0, estimated: 0, actualCost: 0, profit: 0, basis: 0 }
    );

    // Blended portfolio margin over the same contracted-or-estimate basis
    // each project's profit was measured against.
    const marginPct =
      totals.basis > 0 ? (totals.profit / totals.basis) * 100 : 0;

    return { projects, totals: { ...totals, marginPct } };
  }),
});
