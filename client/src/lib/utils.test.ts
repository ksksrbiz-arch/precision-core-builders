import { describe, expect, it } from "vitest";
import { cn, fmtDate, fmtDateTime } from "./utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toContain("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
      "text-sm font-bold"
    );
  });
});

describe("fmtDate", () => {
  it("formats a valid ISO date", () => {
    const out = fmtDate("2026-03-15T12:00:00.000Z");
    expect(out).not.toBe("—");
    expect(out).not.toBe("Invalid Date");
  });

  it("returns fallback for null / empty / invalid", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
    expect(fmtDate("")).toBe("—");
    expect(fmtDate("not-a-date")).toBe("—");
    expect(fmtDate(null, undefined, "n/a")).toBe("n/a");
  });
});

describe("fmtDateTime", () => {
  it("formats a valid timestamp", () => {
    const out = fmtDateTime("2026-03-15T12:00:00.000Z");
    expect(out).not.toBe("—");
    expect(out).not.toBe("Invalid Date");
  });

  it("returns fallback for invalid input", () => {
    expect(fmtDateTime(null)).toBe("—");
    expect(fmtDateTime("bogus")).toBe("—");
  });
});
