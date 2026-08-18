/**
 * Pure date / bar helpers for the Gantt chart.
 * Extracted so unit tests can cover the math without a React tree.
 */

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Approximate pixels per day used for drag-to-reschedule sensitivity. */
export const PIXELS_PER_DAY = 5;

export const STATUS_COLORS: Record<string, string> = {
  complete: "#10b981",
  in_progress: "#3b82f6",
  pending: "#8b7355",
  blocked: "#ef4444",
  deferred: "#f59e0b",
};

export const WEATHER_SENSITIVE_COLOR = "#eab308";

/** Parse an ISO date string to epoch ms. Invalid input yields NaN. */
export function getDateNum(dateStr: string): number {
  return new Date(dateStr).getTime();
}

/** Format a Date as YYYY-MM-DD (UTC calendar date from toISOString). */
export function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Shift a planned start/end pair by `dragDays` calendar days.
 * Returns null when either date is missing/invalid or dragDays is 0.
 */
export function shiftTaskDates(
  plannedStart: string,
  plannedEnd: string,
  dragDays: number
): { start: Date; end: Date; startISO: string; endISO: string } | null {
  if (!dragDays) return null;
  const startMs = getDateNum(plannedStart);
  const endMs = getDateNum(plannedEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

  const start = new Date(plannedStart);
  start.setDate(start.getDate() + dragDays);
  const end = new Date(plannedEnd);
  end.setDate(end.getDate() + dragDays);

  return {
    start,
    end,
    startISO: dateToISO(start),
    endISO: dateToISO(end),
  };
}

/**
 * Convert task date range into chart spacer + duration (days) relative to
 * the earliest task start in the set.
 */
export function toBarOffsets(
  plannedStart: string,
  plannedEnd: string,
  rangeMinMs: number
): { start: number; duration: number } {
  const taskStart = getDateNum(plannedStart);
  const taskEnd = getDateNum(plannedEnd);
  const start = (taskStart - rangeMinMs) / MS_PER_DAY;
  const duration = Math.max(1, (taskEnd - taskStart) / MS_PER_DAY);
  return { start, duration };
}

/** Pick bar fill: weather-sensitive overrides status color. */
export function getBarColor(status: string, weatherSensitive: boolean): string {
  if (weatherSensitive) return WEATHER_SENSITIVE_COLOR;
  return STATUS_COLORS[status] ?? "#8b7355";
}

/**
 * Days moved from a horizontal pixel delta (rounded).
 * Used by drag-to-reschedule.
 */
export function dragDaysFromPixels(deltaX: number): number {
  return Math.round(deltaX / PIXELS_PER_DAY);
}
