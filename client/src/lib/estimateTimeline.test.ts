import { describe, expect, it } from "vitest";
import { estimateTimeline } from "./estimateTimeline";

describe("estimateTimeline", () => {
  it("returns null for unknown project types", () => {
    expect(estimateTimeline("spaceship", "medium")).toBeNull();
  });

  it("returns the baseline range for medium complexity", () => {
    // kitchen base is [4, 8]
    expect(estimateTimeline("kitchen", "medium")).toBe("4–8 weeks");
  });

  it("shortens the range for low complexity (~0.85×)", () => {
    // kitchen: 4*0.85=3.4→3, 8*0.85=6.8→7
    expect(estimateTimeline("kitchen", "low")).toBe("3–7 weeks");
  });

  it("lengthens the range for high complexity (~1.25×)", () => {
    // kitchen: 4*1.25=5, 8*1.25=10
    expect(estimateTimeline("kitchen", "high")).toBe("5–10 weeks");
  });

  it("never returns a low bound below 1 week", () => {
    // outdoor base [2, 6], low → 2*0.85=1.7→2 still ok; force via tiny base if any
    const result = estimateTimeline("outdoor", "low");
    expect(result).toMatch(/^\d+–\d+ weeks$/);
    const low = Number(result!.split("–")[0]);
    expect(low).toBeGreaterThanOrEqual(1);
  });

  it("ensures high bound is at least low+1", () => {
    // roofing base [1, 3], low → 1*0.85=0.85→1, 3*0.85=2.55→3 → "1–3 weeks"
    const result = estimateTimeline("roofing", "low");
    expect(result).toBe("1–3 weeks");
  });
});
