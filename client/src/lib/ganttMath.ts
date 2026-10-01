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

/**
 * Gap (as a fraction of a row's band) the chart leaves above AND below each
 * bar — i.e. the `barCategoryGap` prop. Recharts applies it on both sides, so
 * a bar fills `1 - 2 × gap` of its row. The connector math recovers the row
 * spacing from a bar's rendered height with this, so the chart and the math
 * must share it.
 */
export const BAR_CATEGORY_GAP = 0.2;
export const BAR_ROW_FILL = 1 - 2 * BAR_CATEGORY_GAP;

export type ConnectorBar = {
  /** Days from the earliest task start to this bar's start. */
  start: number;
  /** Bar length in days. */
  duration: number;
  /** Row index (top = 0). */
  index: number;
};

export type DependencyConnector = {
  /** SVG path of the elbow from the predecessor's end to the successor's start. */
  path: string;
  /** Small right-pointing arrowhead at the successor's start. */
  arrow: string;
  /** True when the successor starts before the predecessor finishes. */
  conflict: boolean;
};

/**
 * Finish-to-start connector, expressed in the successor bar's pixel rect.
 *
 * The chart only hands each bar its own rect, so the predecessor's end is
 * recovered from the day offsets: pixels-per-day is the successor's width over
 * its duration, row spacing is its height over BAR_ROW_FILL.
 */
export function dependencyConnector(
  succRect: { x: number; y: number; width: number; height: number },
  succ: ConnectorBar,
  pred: ConnectorBar
): DependencyConnector | null {
  if (!(succ.duration > 0) || !(succRect.width > 0)) return null;
  const pxPerDay = succRect.width / succ.duration;
  const rowStep = succRect.height / BAR_ROW_FILL;

  const x2 = succRect.x;
  const y2 = succRect.y + succRect.height / 2;
  const x1 = x2 + (pred.start + pred.duration - succ.start) * pxPerDay;
  const y1 = y2 + (pred.index - succ.index) * rowStep;
  const conflict = x2 < x1 - 0.5;

  const arrow = `M${x2 - 5},${y2 - 3} L${x2},${y2} L${x2 - 5},${y2 + 3} Z`;

  if (!conflict) {
    const xm = x1 + Math.min(10, (x2 - x1) / 2);
    return {
      path: `M${x1},${y1} H${xm} V${y2} H${x2}`,
      arrow,
      conflict,
    };
  }
  // Successor starts before the predecessor ends: loop out past the
  // predecessor, run between the rows, and come back in from the left.
  const ym = y1 + (y2 >= y1 ? rowStep / 2 : -rowStep / 2);
  return {
    path: `M${x1},${y1} H${x1 + 8} V${ym} H${x2 - 8} V${y2} H${x2}`,
    arrow,
    conflict,
  };
}
