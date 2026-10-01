import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { assertProjectAccess } from "../_core/access";
import {
  createScheduleItem,
  deleteScheduleItem,
  getWeatherSensitiveItems,
  listScheduleItems,
  updateScheduleItem,
  updateScheduleItemOrder,
} from "../_data/scheduleRepo";
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

/**
 * Fields shared by create and update — no defaults (see projectsRouter for why:
 * Zod 4 applies `.default()` inside `.partial()`, which made every Gantt drag
 * or modal save reset the task to status "pending", type "other", not
 * weather-sensitive and sort order 0).
 */
const ScheduleItemFields = z.object({
  projectId: z.number().int().positive(),
  parentId: z.number().int().positive().optional(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  taskType: TaskTypeEnum.optional(),
  status: TaskStatusEnum.optional(),
  isOutdoor: z.boolean().optional(),
  weatherSensitive: z.boolean().optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  durationDays: z.number().int().positive().optional(),
  dependsOn: z.string().optional(),
  sortOrder: z.number().int().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

const ScheduleItemInput = ScheduleItemFields.extend({
  taskType: TaskTypeEnum.optional().default("other"),
  status: TaskStatusEnum.optional().default("pending"),
  isOutdoor: z.boolean().optional().default(false),
  weatherSensitive: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

/** Update: `undefined` = unchanged; `null` clears a free-text/optional field. */
const ScheduleItemUpdateInput = z
  .object({ id: z.number().int().positive() })
  .merge(ScheduleItemFields.partial().omit({ projectId: true }))
  .extend({
    description: z.string().nullable().optional(),
    dependsOn: z.string().nullable().optional(),
    assignedTo: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  });

export const scheduleRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      // A portal client may only read their own project's schedule.
      await assertProjectAccess(ctx, input.projectId);
      return listScheduleItems(input.projectId);
    }),

  create: adminProcedure
    .input(ScheduleItemInput)
    .mutation(async ({ input }) => {
      return createScheduleItem({
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
      });
    }),

  update: adminProcedure
    .input(ScheduleItemUpdateInput)
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
      return updateScheduleItem(id, {
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
      });
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
      return updateScheduleItem(input.id, {
        status: input.status,
        ...(input.actualStart && { actual_start: input.actualStart }),
        ...(input.actualEnd && { actual_end: input.actualEnd }),
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return deleteScheduleItem(input.id);
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
      return getWeatherSensitiveItems(input);
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
        await updateScheduleItemOrder(id, order, input.projectId);
      }
      return { success: true };
    }),
});
