/**
 * Tests for the deterministic estimating basis.
 *
 * These cover the failure modes that motivated moving the numbers out of an
 * LLM prompt: fabricated figures for unpriced work, inverted or inconsistent
 * output reaching the database, and a basis that quietly goes stale.
 */
import { describe, it, expect } from "vitest";
import { PROJECT_TYPES } from "../../client/src/config/projects";
import { ESTIMATING_BASIS, findProjectType } from "./basis";
import { computeEstimate, validateEstimate } from "./compute";
import { validateBasis } from "./validateBasis";
import type { EstimatingBasis } from "./basis";

/** A deep-ish clone so a test can corrupt one field without leaking. */
function mutateBasis(patch: (b: EstimatingBasis) => void): EstimatingBasis {
  const copy: EstimatingBasis = JSON.parse(JSON.stringify(ESTIMATING_BASIS));
  patch(copy);
  return copy;
}

describe("estimating basis integrity", () => {
  it("passes its own integrity checks", () => {
    const report = validateBasis(ESTIMATING_BASIS, new Date("2026-09-11"));
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("covers every project type the estimator UI offers", () => {
    const report = validateBasis(
      ESTIMATING_BASIS,
      new Date("2026-09-11"),
      PROJECT_TYPES.map(p => p.id)
    );
    expect(report.problems).toEqual([]);
  });

  it("warns that the relocated rates are stale and unreviewed", () => {
    // This is the point of the staleness check: today, these numbers ARE old.
    // If this assertion ever fails it should be because Eric reviewed them.
    const report = validateBasis(ESTIMATING_BASIS, new Date("2026-09-11"));
    expect(report.ageDays).toBeGreaterThan(365);
    expect(report.warnings.join(" ")).toMatch(/last reviewed/);
    expect(report.warnings.join(" ")).toMatch(/relocated-prompt/);
  });

  it("rejects an inverted cost band", () => {
    const broken = mutateBasis(b => {
      const kitchen = b.projectTypes.find(p => p.id === "kitchen")!;
      kitchen.band = { low: 80_000, high: 25_000 };
    });
    const report = validateBasis(broken, new Date("2026-09-11"));
    expect(report.ok).toBe(false);
    expect(report.problems.join(" ")).toMatch(/is below low/);
  });

  it("rejects an absurd spread that looks like a typo", () => {
    const broken = mutateBasis(b => {
      const roofing = b.projectTypes.find(p => p.id === "roofing")!;
      roofing.band = { low: 8_000, high: 800_000 };
    });
    const report = validateBasis(broken, new Date("2026-09-11"));
    expect(report.problems.join(" ")).toMatch(/spread is/);
  });

  it("rejects shares that leave nothing for materials", () => {
    const broken = mutateBasis(b => {
      b.laborShare = 0.7;
      b.contingencyRate = 0.3;
      b.permitRate = 0.05;
    });
    const report = validateBasis(broken, new Date("2026-09-11"));
    expect(report.problems.join(" ")).toMatch(/nothing for materials/);
  });

  it("rejects an unpriced type that still carries a band", () => {
    const broken = mutateBasis(b => {
      const adu = b.projectTypes.find(p => p.id === "adu")!;
      adu.band = { low: 200, high: 400 };
    });
    const report = validateBasis(broken, new Date("2026-09-11"));
    expect(report.problems.join(" ")).toMatch(
      /marked unpriced but carries a band/
    );
  });

  it("flags a UI project type missing from the basis", () => {
    const report = validateBasis(ESTIMATING_BASIS, new Date("2026-09-11"), [
      "greenhouse",
    ]);
    expect(report.problems.join(" ")).toMatch(/offered in the UI but absent/);
  });
});

describe("computeEstimate", () => {
  it("prices a per-sqft project from the band", () => {
    const result = computeEstimate({
      projectType: "new-home",
      squareFootage: 2_000,
      complexity: "medium",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    // $180-350/sqft × 2000 sqft, medium sits 50% into the band.
    expect(result.estimate.estimatedLow).toBe(360_000);
    expect(result.estimate.estimatedHigh).toBe(700_000);
    expect(result.estimate.estimatedMid).toBe(530_000);
  });

  it("prices a flat project without square footage", () => {
    const result = computeEstimate({
      projectType: "kitchen",
      complexity: "medium",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.estimate.estimatedLow).toBe(25_000);
    expect(result.estimate.estimatedHigh).toBe(80_000);
    expect(result.estimate.estimatedMid).toBe(52_500);
  });

  it("positions complexity inside the band without moving the band", () => {
    const low = computeEstimate({ projectType: "kitchen", complexity: "low" });
    const high = computeEstimate({
      projectType: "kitchen",
      complexity: "high",
    });
    if (low.status !== "ok" || high.status !== "ok")
      throw new Error("expected ok");

    expect(low.estimate.estimatedMid).toBeLessThan(high.estimate.estimatedMid);
    // The range itself is a property of the project type, not the complexity.
    expect(low.estimate.estimatedLow).toBe(high.estimate.estimatedLow);
    expect(low.estimate.estimatedHigh).toBe(high.estimate.estimatedHigh);
  });

  it("moves premium selections up the band but never past the cap", () => {
    const plain = computeEstimate({
      projectType: "kitchen",
      complexity: "high",
    });
    const loaded = computeEstimate({
      projectType: "kitchen",
      complexity: "high",
      materials: Array.from({ length: 20 }, (_, i) => `premium ${i}`),
    });
    if (plain.status !== "ok" || loaded.status !== "ok")
      throw new Error("expected ok");

    expect(loaded.estimate.estimatedMid).toBeGreaterThan(
      plain.estimate.estimatedMid
    );
    // Capped at maxMaterialPosition — selections alone never reach the top.
    expect(loaded.estimate.estimatedMid).toBeLessThan(
      loaded.estimate.estimatedHigh
    );
  });

  it("returns VERIFY for an unpriced project type instead of a number", () => {
    for (const id of ["full-remodel", "adu", "restoration", "cabinets"]) {
      const result = computeEstimate({ projectType: id, squareFootage: 1_200 });
      expect(result.status).toBe("verify");
    }
  });

  it("returns VERIFY for an unknown project type", () => {
    const result = computeEstimate({ projectType: "submarine-refit" });
    expect(result.status).toBe("verify");
    if (result.status !== "verify") return;
    expect(result.reason).toMatch(/isn't in the estimating basis/);
  });

  it("returns VERIFY when a per-sqft type has no square footage", () => {
    const result = computeEstimate({ projectType: "new-home" });
    expect(result.status).toBe("verify");
    if (result.status !== "verify") return;
    expect(result.reason).toMatch(/per square foot/);
  });

  it("produces a breakdown that sums to the expected figure", () => {
    const result = computeEstimate({
      projectType: "addition",
      squareFootage: 640,
      complexity: "high",
      materials: ["Custom cabinetry"],
    });
    if (result.status !== "ok") throw new Error("expected ok");

    const { laborCost, materialsCost, permitsCost, contingency, estimatedMid } =
      result.estimate;
    const sum = laborCost + materialsCost + permitsCost + contingency;
    expect(Math.abs(sum - estimatedMid)).toBeLessThanOrEqual(4);
  });

  it("is deterministic — the same input always gives the same number", () => {
    const input = {
      projectType: "bathroom",
      complexity: "medium" as const,
      materials: ["Tile and stone"],
    };
    const a = computeEstimate(input);
    const b = computeEstimate(input);
    expect(a).toEqual(b);
  });

  it("explains its own derivation", () => {
    const result = computeEstimate({
      projectType: "roofing",
      complexity: "low",
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.derivation.join(" ")).toMatch(/whole-project range/);
    expect(result.derivation.join(" ")).toMatch(
      new RegExp(ESTIMATING_BASIS.basis.reviewedAt)
    );
  });
});

describe("validateEstimate", () => {
  const good = {
    estimatedLow: 25_000,
    estimatedMid: 52_500,
    estimatedHigh: 80_000,
    laborCost: 23_625,
    materialsCost: 21_525,
    permitsCost: 787.5,
    contingency: 6_562.5,
  };

  it("accepts a well-formed estimate", () => {
    expect(validateEstimate(good)).toEqual([]);
  });

  it("accepts every estimate the compute path actually produces", () => {
    for (const type of ESTIMATING_BASIS.projectTypes) {
      if (type.unpriced) continue;
      for (const complexity of ["low", "medium", "high"] as const) {
        const result = computeEstimate({
          projectType: type.id,
          squareFootage: 1_500,
          complexity,
        });
        if (result.status !== "ok")
          throw new Error(`expected ok for ${type.id}`);
        expect(validateEstimate(result.estimate)).toEqual([]);
      }
    }
  });

  it("rejects an inverted low/mid", () => {
    const problems = validateEstimate({ ...good, estimatedLow: 60_000 });
    expect(problems.join(" ")).toMatch(/estimatedLow.*is above estimatedMid/);
  });

  it("rejects an inverted mid/high", () => {
    const problems = validateEstimate({ ...good, estimatedHigh: 40_000 });
    expect(problems.join(" ")).toMatch(/estimatedMid.*is above estimatedHigh/);
  });

  it("rejects a negative component", () => {
    const problems = validateEstimate({ ...good, permitsCost: -100 });
    expect(problems.join(" ")).toMatch(/permitsCost is negative/);
  });

  it("rejects a non-finite value", () => {
    const problems = validateEstimate({ ...good, laborCost: NaN });
    expect(problems.join(" ")).toMatch(/laborCost is not a finite number/);
  });

  it("rejects a breakdown that does not sum to the expected figure", () => {
    const problems = validateEstimate({ ...good, materialsCost: 5_000 });
    expect(problems.join(" ")).toMatch(/breakdown sums to/);
  });

  it("rejects a labor share that does not match the basis", () => {
    // Keeps the partition summing correctly so only the share check fires.
    const problems = validateEstimate({
      ...good,
      laborCost: 10_000,
      materialsCost: 35_150,
    });
    expect(problems.join(" ")).toMatch(/does not match the 45% labor share/);
  });
});

describe("findProjectType", () => {
  it("is case-insensitive and trims", () => {
    expect(findProjectType("  Kitchen ")?.id).toBe("kitchen");
  });

  it("returns undefined for an unknown id", () => {
    expect(findProjectType("nope")).toBeUndefined();
  });
});
