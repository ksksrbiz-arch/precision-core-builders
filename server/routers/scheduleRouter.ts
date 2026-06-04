import { db, paginate } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

const TaskTypeEnum = z.enum([
  "outdoor",
  "indoor",
  "framing",
  "roofing",
  "electrical",
  "plumbing",
  "insulation",
  "drywall",
  "flooring",
  "cabinetry",
  "painting",
  "finish_work",
  "inspection",
  "other",
]);
const TaskStatusEnum = z.enum([
  "pending",
  "in_progress",
  "complete",
  "blocked",
  "deferred",
]);

const ScheduleItemInput = z.object({
  projectId: z.number().int().positive(),
  parentId: z.number().int().positive().optional(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  taskType: TaskTypeEnum.optional().default("other"),
  status: TaskStatusEnum.optional().default("pending"),
  isOutdoor: z.boolean().optional().default(false),
  weatherSensitive: z.boolean().optional().default(false),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  durationDays: z.number().int().positive().optional(),
  dependsOn: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export const scheduleRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("schedule_items")
        .select("*")
        .eq("project_id", input.projectId)
        .order("sort_order")
        .order("planned_start");
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: adminProcedure
    .input(ScheduleItemInput)
    .mutation(async ({ input }) => {
      const { data, error } = await db
        .from("schedule_items")
        .insert({
          project_id: input.projectId,
          parent_id: input.parentId,
          title: input.title,
          description: input.description,
          task_type: input.taskType,
          status: input.status,
          is_outdoor: input.isOutdoor,
          weather_sensitive: input.weatherSensitive,
          planned_start: input.plannedStart,
          planned_end: input.plannedEnd,
          duration_days: input.durationDays,
          depends_on: input.dependsOn,
          sort_order: input.sortOrder,
          assigned_to: input.assignedTo,
          notes: input.notes,
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
        .merge(ScheduleItemInput.partial().omit({ projectId: true }))
    )
    .mutation(async ({ input }) => {
      const {
        id,
        taskType,
        isOutdoor,
        weatherSensitive,
        plannedStart,
        plannedEnd,
        durationDays,
        dependsOn,
        sortOrder,
        assignedTo,
        parentId,
        ...rest
      } = input;
      const { data, error } = await db
        .from("schedule_items")
        .update({
          ...rest,
          ...(parentId !== undefined && { parent_id: parentId }),
          ...(taskType !== undefined && { task_type: taskType }),
          ...(isOutdoor !== undefined && { is_outdoor: isOutdoor }),
          ...(weatherSensitive !== undefined && {
            weather_sensitive: weatherSensitive,
          }),
          ...(plannedStart !== undefined && { planned_start: plannedStart }),
          ...(plannedEnd !== undefined && { planned_end: plannedEnd }),
          ...(durationDays !== undefined && { duration_days: durationDays }),
          ...(dependsOn !== undefined && { depends_on: dependsOn }),
          ...(sortOrder !== undefined && { sort_order: sortOrder }),
          ...(assignedTo !== undefined && { assigned_to: assignedTo }),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: TaskStatusEnum,
        actualStart: z.string().datetime().optional(),
        actualEnd: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { data, error } = await db
        .from("schedule_items")
        .update({
          status: input.status,
          ...(input.actualStart && { actual_start: input.actualStart }),
          ...(input.actualEnd && { actual_end: input.actualEnd }),
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
        .from("schedule_items")
        .delete()
        .eq("id", input.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  // Weather-sensitive tasks for a date window
  getWeatherSensitive: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("schedule_items")
        .select("*")
        .eq("project_id", input.projectId)
        .eq("weather_sensitive", true)
        .neq("status", "complete")
        .gte("planned_start", input.startDate)
        .lte("planned_end", input.endDate);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  updateOrder: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        updates: z.array(
          z.object({ id: z.number().int(), order: z.number().int() })
        ),
      })
    )
    .mutation(async ({ input }) => {
      for (const { id, order } of input.updates) {
        await db
          .from("schedule_items")
          .update({ sort_order: order })
          .eq("id", id)
          .eq("project_id", input.projectId);
      }
      return { success: true };
    }),
});
