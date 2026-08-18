import { describe, expect, it } from "vitest";
import {
  STATUS_COLORS,
  WEATHER_SENSITIVE_COLOR,
  dateToISO,
  dragDaysFromPixels,
  getBarColor,
  getDateNum,
  shiftTaskDates,
  toBarOffsets,
  PIXELS_PER_DAY,
  MS_PER_DAY,
} from "./ganttMath";

describe("getDateNum", () => {
  it("parses a valid ISO date to epoch ms", () => {
    const ms = getDateNum("2026-03-01");
    expect(ms).toBe(new Date("2026-03-01").getTime());
    expect(Number.isNaN(ms)).toBe(false);
  });

  it("returns NaN for garbage input", () => {
    expect(Number.isNaN(getDateNum("not-a-date"))).toBe(true);
  });
});

describe("dateToISO", () => {
  it("formats as YYYY-MM-DD", () => {
    // Use a midday UTC date to avoid local timezone edge cases on the date part
    const d = new Date("2026-03-15T12:00:00.000Z");
    expect(dateToISO(d)).toBe("2026-03-15");
  });
});

describe("shiftTaskDates", () => {
  it("returns null when dragDays is 0", () => {
    expect(shiftTaskDates("2026-03-01", "2026-03-05", 0)).toBeNull();
  });

  it("shifts both ends forward by N days", () => {
    const result = shiftTaskDates("2026-03-01", "2026-03-05", 3);
    expect(result).not.toBeNull();
    expect(result!.startISO).toBe("2026-03-04");
    expect(result!.endISO).toBe("2026-03-08");
  });

  it("shifts both ends backward", () => {
    const result = shiftTaskDates("2026-03-10", "2026-03-12", -2);
    expect(result).not.toBeNull();
    expect(result!.startISO).toBe("2026-03-08");
    expect(result!.endISO).toBe("2026-03-10");
  });

  it("returns null for invalid dates", () => {
    expect(shiftTaskDates("bad", "2026-03-05", 1)).toBeNull();
  });
});

describe("toBarOffsets", () => {
  it("places the earliest task at start=0 with correct duration", () => {
    const min = getDateNum("2026-03-01");
    const { start, duration } = toBarOffsets("2026-03-01", "2026-03-05", min);
    expect(start).toBe(0);
    // 4 days span → duration at least 1; (end-start)/MS_PER_DAY = 4
    expect(duration).toBe(4);
  });

  it("offsets later tasks relative to range min", () => {
    const min = getDateNum("2026-03-01");
    const { start, duration } = toBarOffsets("2026-03-03", "2026-03-05", min);
    expect(start).toBe(2);
    expect(duration).toBe(2);
  });

  it("enforces a minimum duration of 1 day", () => {
    const min = getDateNum("2026-03-01");
    // Same start/end → 0 day span clamped to 1
    const { duration } = toBarOffsets("2026-03-01", "2026-03-01", min);
    expect(duration).toBe(1);
  });
});

describe("getBarColor", () => {
  it("uses weather-sensitive color when flagged", () => {
    expect(getBarColor("pending", true)).toBe(WEATHER_SENSITIVE_COLOR);
  });

  it("maps known statuses to STATUS_COLORS", () => {
    expect(getBarColor("complete", false)).toBe(STATUS_COLORS.complete);
    expect(getBarColor("blocked", false)).toBe(STATUS_COLORS.blocked);
  });

  it("falls back for unknown status", () => {
    expect(getBarColor("mystery", false)).toBe("#8b7355");
  });
});

describe("dragDaysFromPixels", () => {
  it("rounds pixel delta by PIXELS_PER_DAY", () => {
    expect(dragDaysFromPixels(0)).toBe(0);
    expect(dragDaysFromPixels(PIXELS_PER_DAY)).toBe(1);
    expect(dragDaysFromPixels(PIXELS_PER_DAY * 2.4)).toBe(2);
    expect(dragDaysFromPixels(-PIXELS_PER_DAY * 1.6)).toBe(-2);
  });
});

describe("MS_PER_DAY constant", () => {
  it("is 24 hours in ms", () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });
});
