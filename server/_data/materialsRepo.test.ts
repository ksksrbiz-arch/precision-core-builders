import { describe, expect, it } from "vitest";
import { computeIsShortage } from "./materialsRepo";

describe("computeIsShortage", () => {
  it("is true when ordered is less than needed", () => {
    expect(computeIsShortage(10, 3)).toBe(true);
    expect(computeIsShortage(10, 0)).toBe(true);
    expect(computeIsShortage(10, null)).toBe(true);
    expect(computeIsShortage(10, undefined)).toBe(true);
  });

  it("is false when ordered meets or exceeds needed", () => {
    expect(computeIsShortage(10, 10)).toBe(false);
    expect(computeIsShortage(10, 12)).toBe(false);
  });

  it("is false when needed is missing or non-numeric", () => {
    expect(computeIsShortage(null, 5)).toBe(false);
    expect(computeIsShortage(undefined, 5)).toBe(false);
    expect(computeIsShortage(Number.NaN, 5)).toBe(false);
  });

  it("accepts string numbers (Postgrest decimal shape)", () => {
    expect(computeIsShortage("8", "2")).toBe(true);
    expect(computeIsShortage("8", "8")).toBe(false);
  });
});
