/**
 * Schedule domain constants.
 *
 * Extracted from `pages/admin/ScheduleView.tsx`. The task-type list MUST stay in
 * sync with `server/routers/scheduleRouter.ts` TaskTypeEnum.
 */

export const TASK_TYPES = [
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
] as const;

export type TaskType = (typeof TASK_TYPES)[number];
