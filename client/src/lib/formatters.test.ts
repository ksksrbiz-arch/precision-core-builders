import { describe, expect, it } from "vitest";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "./formatters";

describe("formatCurrency", () => {
  it("formats integers with a $ prefix and grouping", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
    expect(formatCurrency(0)).toBe("$0");
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });

  it("returns the fallback for nullish/NaN values", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency(Number.NaN)).toBe("—");
    expect(formatCurrency(null, "n/a")).toBe("n/a");
  });
});

describe("formatNumber", () => {
  it("applies locale grouping", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });

  it("honours number-format options", () => {
    expect(formatNumber(3.14159, { maximumFractionDigits: 2 })).toBe("3.14");
  });

  it("returns the fallback for nullish values", () => {
    expect(formatNumber(undefined)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("appends a percent sign with fixed digits", () => {
    expect(formatPercent(42)).toBe("42%");
    expect(formatPercent(42.5, 1)).toBe("42.5%");
  });

  it("returns the fallback for nullish values", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatCompactCurrency", () => {
  it("compacts large values", () => {
    // Intl compact notation varies slightly by engine; assert shape.
    expect(formatCompactCurrency(1_200_000)).toMatch(/^\$1(\.2)?M$/);
    expect(formatCompactCurrency(5000)).toMatch(/^\$5K$/);
  });

  it("formats small values without suffix", () => {
    expect(formatCompactCurrency(450)).toBe("$450");
  });

  it("returns fallback for nullish", () => {
    expect(formatCompactCurrency(null)).toBe("—");
    expect(formatCompactCurrency(undefined, "n/a")).toBe("n/a");
  });
});
