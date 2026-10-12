import { describe, expect, it } from "vitest";
import { FINISH_OPTIONS, findFinishOption } from "./finishOptions";

describe("finishOptions", () => {
  it("finds an option by label, case-insensitively and ignoring padding", () => {
    expect(findFinishOption(undefined, "  natural MARBLE ")?.delta).toBe(3500);
  });

  it("prefers the given category but works from the label alone", () => {
    expect(findFinishOption("Countertops", "Granite")?.delta).toBe(1200);
    expect(findFinishOption("Flooring", "Granite")?.delta).toBe(1200);
  });

  it("returns undefined for anything that is not a curated option", () => {
    expect(findFinishOption("Flooring", "Mystery Slab")).toBeUndefined();
    expect(findFinishOption(undefined, "")).toBeUndefined();
  });

  it("has unique labels, so a label alone identifies exactly one price", () => {
    const labels = FINISH_OPTIONS.flatMap(c =>
      c.options.map(o => o.label.toLowerCase())
    );
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps the upgrade prices Eric approved (guards accidental edits)", () => {
    const prices = Object.fromEntries(
      FINISH_OPTIONS.flatMap(c => c.options.map(o => [o.label, o.delta]))
    );
    expect(prices).toEqual({
      "Quartz (Standard)": 0,
      Granite: 1200,
      "Natural Marble": 3500,
      "Engineered Hardwood (Standard)": 0,
      "Luxury Vinyl Plank": -800,
      "Natural Stone Tile": 2400,
      "Shaker (Standard)": 0,
      "Custom Inset": 4000,
      "Brushed Nickel (Standard)": 0,
      "Matte Black": 350,
      "Polished Brass": 600,
    });
  });
});
