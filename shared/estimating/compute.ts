/**
 * Deterministic estimate arithmetic.
 *
 * Code produces every dollar figure here. The LLM's only job downstream is to
 * explain the result in Eric's voice — it never originates, adjusts, or
 * overrides a number. This is the same split Clearview uses between its
 * pricing model and its estimator specialist.
 */
import {
  ESTIMATING_BASIS,
  findProjectType,
  type EstimatingBasis,
  type ProjectTypeBasis,
} from "./basis";

export type EstimateInput = {
  projectType: string;
  squareFootage?: number;
  complexity?: "low" | "medium" | "high";
  /** Premium material selections; each nudges the expected figure upward. */
  materials?: string[];
};

export type EstimateBreakdown = {
  estimatedLow: number;
  estimatedMid: number;
  estimatedHigh: number;
  laborCost: number;
  materialsCost: number;
  permitsCost: number;
  contingency: number;
};

export type EstimateComputation =
  | {
      status: "ok";
      estimate: EstimateBreakdown;
      /** Human-readable derivation, fed to the LLM so it explains real math. */
      derivation: string[];
      projectType: ProjectTypeBasis;
    }
  | {
      status: "verify";
      /** Why no number can be produced. Always shown to the visitor. */
      reason: string;
      projectType?: ProjectTypeBasis;
    };

const round = (n: number): number => Math.round(n);

/**
 * Compute an estimate, or return a VERIFY result when the basis cannot
 * responsibly produce one. Never throws and never guesses: an unknown project
 * type, an unpriced type, or a missing square footage on a per-sqft type all
 * return `status: "verify"` rather than a fabricated figure.
 */
export function computeEstimate(
  input: EstimateInput,
  basis: EstimatingBasis = ESTIMATING_BASIS
): EstimateComputation {
  const projectType = findProjectType(input.projectType);

  if (!projectType) {
    return {
      status: "verify",
      reason:
        "That project type isn't in the estimating basis, so there's no reviewed cost range to work from. An on-site visit is the honest next step.",
    };
  }

  if (projectType.unpriced) {
    return {
      status: "verify",
      projectType,
      reason:
        projectType.note ??
        `${projectType.label} projects vary too widely to price from a form.`,
    };
  }

  if (projectType.unit === "per-sqft") {
    const sqft = input.squareFootage;
    if (!sqft || !Number.isFinite(sqft) || sqft <= 0) {
      return {
        status: "verify",
        projectType,
        reason: `${projectType.label} is priced per square foot, so a square-footage figure is needed before a range means anything.`,
      };
    }
  }

  const multiplier =
    projectType.unit === "per-sqft" ? (input.squareFootage as number) : 1;

  const low = projectType.band.low * multiplier;
  const high = projectType.band.high * multiplier;

  // Complexity positions the expected figure inside the band. Premium material
  // selections push it further up, capped so it never reaches the top of the
  // range on selections alone.
  const complexity = input.complexity ?? "medium";
  const basePosition = basis.complexityPosition[complexity];
  const materialCount = input.materials?.length ?? 0;
  const position = Math.min(
    basis.maxMaterialPosition,
    basePosition + materialCount * basis.materialStep
  );

  const mid = low + position * (high - low);

  // The breakdown partitions the mid estimate exactly — labor, permits and
  // contingency come off the top and materials take the remainder, so the
  // four components always sum back to `estimatedMid`.
  const laborCost = mid * basis.laborShare;
  const permitsCost = mid * basis.permitRate;
  const contingency = mid * basis.contingencyRate;
  const materialsCost = mid - laborCost - permitsCost - contingency;

  const unitLabel =
    projectType.unit === "per-sqft"
      ? `$${projectType.band.low}–$${projectType.band.high}/sqft × ${input.squareFootage} sqft`
      : `$${projectType.band.low.toLocaleString()}–$${projectType.band.high.toLocaleString()} whole-project range`;

  return {
    status: "ok",
    projectType,
    estimate: {
      estimatedLow: round(low),
      estimatedMid: round(mid),
      estimatedHigh: round(high),
      laborCost: round(laborCost),
      materialsCost: round(materialsCost),
      permitsCost: round(permitsCost),
      contingency: round(contingency),
    },
    derivation: [
      `Basis: ${unitLabel} (reviewed ${basis.basis.reviewedAt}, ${basis.basis.region}).`,
      `Complexity "${complexity}" sits ${Math.round(basePosition * 100)}% into that range` +
        (materialCount
          ? `, plus ${materialCount} premium selection${materialCount === 1 ? "" : "s"} moving it to ${Math.round(position * 100)}%.`
          : "."),
      `Breakdown splits the expected figure: labor ${Math.round(basis.laborShare * 100)}%, permits ${basis.permitRate * 100}%, contingency ${basis.contingencyRate * 100}%, materials the remainder.`,
    ],
  };
}

/**
 * Integrity check on a computed estimate, run before anything is returned to a
 * visitor or written to the `estimates` table.
 *
 * This is the guard the platform previously lacked entirely: the model's JSON
 * was whitelisted onto columns, but nothing verified the numbers were ordered,
 * positive, or internally consistent. Returns the problems found; an empty
 * array means the estimate is safe to persist.
 */
export function validateEstimate(
  estimate: EstimateBreakdown,
  basis: EstimatingBasis = ESTIMATING_BASIS
): string[] {
  const problems: string[] = [];
  const entries = Object.entries(estimate) as [
    keyof EstimateBreakdown,
    number,
  ][];

  for (const [key, value] of entries) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      problems.push(`${key} is not a finite number (${String(value)})`);
    } else if (value < 0) {
      problems.push(`${key} is negative (${value})`);
    }
  }
  // Ordering and summation checks are meaningless once a field is unusable.
  if (problems.length) return problems;

  const { estimatedLow, estimatedMid, estimatedHigh } = estimate;

  if (estimatedLow > estimatedMid) {
    problems.push(
      `estimatedLow (${estimatedLow}) is above estimatedMid (${estimatedMid})`
    );
  }
  if (estimatedMid > estimatedHigh) {
    problems.push(
      `estimatedMid (${estimatedMid}) is above estimatedHigh (${estimatedHigh})`
    );
  }
  if (estimatedLow <= 0) {
    problems.push(`estimatedLow (${estimatedLow}) must be greater than zero`);
  }

  const componentSum =
    estimate.laborCost +
    estimate.materialsCost +
    estimate.permitsCost +
    estimate.contingency;
  // Rounding each component independently can drift a few dollars from the
  // rounded mid; anything beyond that means the partition is wrong.
  const drift = Math.abs(componentSum - estimatedMid);
  if (drift > Math.max(4, estimatedMid * 0.001)) {
    problems.push(
      `breakdown sums to ${componentSum} but estimatedMid is ${estimatedMid} (drift ${drift.toFixed(2)})`
    );
  }

  const expectedLabor = estimatedMid * basis.laborShare;
  if (
    Math.abs(estimate.laborCost - expectedLabor) >
    Math.max(2, expectedLabor * 0.01)
  ) {
    problems.push(
      `laborCost (${estimate.laborCost}) does not match the ${basis.laborShare * 100}% labor share of estimatedMid`
    );
  }

  return problems;
}
