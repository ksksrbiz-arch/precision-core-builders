/**
 * Integrity check on the estimating basis itself.
 *
 * Ported in shape from Clearview's `shared/pricing-schema.mjs`. Like that one,
 * this is about *integrity*, not market accuracy — nothing automated can tell
 * you whether $180/sqft is the right Eugene rate today. What it does catch is
 * the class of mistake that silently produces a wrong number for every visitor:
 * an inverted band, an absurd spread, a fat-fingered share, a project type the
 * estimator offers but the basis never priced, and a basis nobody has reviewed
 * in a year.
 *
 * `problems` fail the check. `warnings` are reported but do not fail — a stale
 * basis is a VERIFY item for Eric, not a build break.
 */
import { ESTIMATING_BASIS, type EstimatingBasis } from "./basis";

/** A band wider than this is almost always a typo, not a range. */
const MAX_SPREAD_RATIO = 6;

export type BasisReport = {
  ok: boolean;
  problems: string[];
  warnings: string[];
  /** Days since `basis.reviewedAt`, or null when the date is unparseable. */
  ageDays: number | null;
};

export function validateBasis(
  doc: EstimatingBasis = ESTIMATING_BASIS,
  now: Date = new Date(),
  /** Project-type ids the UI offers, so the basis can be checked for gaps. */
  offeredTypeIds: string[] = []
): BasisReport {
  const problems: string[] = [];
  const warnings: string[] = [];
  let ageDays: number | null = null;

  if (!doc || typeof doc !== "object") {
    return {
      ok: false,
      problems: ["estimating basis is missing or not an object"],
      warnings,
      ageDays,
    };
  }

  // ── basis metadata ────────────────────────────────────────────────────────
  const meta = doc.basis;
  if (!meta || typeof meta !== "object") {
    problems.push("basis metadata is missing");
  } else {
    const reviewed = new Date(`${meta.reviewedAt}T00:00:00Z`);
    if (Number.isNaN(reviewed.getTime())) {
      problems.push(
        `basis.reviewedAt is not a date: ${String(meta.reviewedAt)}`
      );
    } else {
      ageDays = Math.floor((now.getTime() - reviewed.getTime()) / 86_400_000);
      if (ageDays < 0) {
        problems.push(`basis.reviewedAt is in the future (${meta.reviewedAt})`);
      }
      const maxAge = Number(meta.maxAgeDays) || 365;
      if (ageDays > maxAge) {
        warnings.push(
          `estimating basis was last reviewed ${ageDays} days ago, past its ${maxAge}-day limit — Eric should re-check the Eugene rates`
        );
      }
    }
    if (meta.source === "relocated-prompt") {
      warnings.push(
        'basis.source is still "relocated-prompt": these rates were moved out of an LLM prompt and have not been reviewed against current costs'
      );
    }
  }

  // ── shares ────────────────────────────────────────────────────────────────
  const shares: [string, number, number, number][] = [
    ["laborShare", doc.laborShare, 0.2, 0.7],
    ["permitRate", doc.permitRate, 0, 0.1],
    ["contingencyRate", doc.contingencyRate, 0, 0.3],
  ];
  for (const [label, value, min, max] of shares) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      problems.push(`${label} is not a number (${String(value)})`);
    } else if (value < min || value > max) {
      problems.push(`${label} (${value}) is outside ${min}–${max}`);
    }
  }
  const shareTotal = doc.laborShare + doc.permitRate + doc.contingencyRate;
  if (Number.isFinite(shareTotal) && shareTotal >= 1) {
    problems.push(
      `labor + permits + contingency is ${shareTotal}, leaving nothing for materials`
    );
  }

  // ── complexity positions ──────────────────────────────────────────────────
  const positions = doc.complexityPosition;
  if (!positions) {
    problems.push("complexityPosition is missing");
  } else {
    for (const level of ["low", "medium", "high"] as const) {
      const p = positions[level];
      if (typeof p !== "number" || p < 0 || p > 1) {
        problems.push(
          `complexityPosition.${level} (${String(p)}) is outside 0–1`
        );
      }
    }
    if (
      Number.isFinite(positions.low) &&
      Number.isFinite(positions.high) &&
      positions.low >= positions.high
    ) {
      problems.push(
        `complexityPosition.low (${positions.low}) is not below .high (${positions.high})`
      );
    }
  }

  // ── project types ─────────────────────────────────────────────────────────
  const types = Array.isArray(doc.projectTypes) ? doc.projectTypes : [];
  if (types.length === 0) problems.push("no project types defined");

  const seen = new Set<string>();
  for (const type of types) {
    const id = type?.id ?? "(no id)";
    if (seen.has(id)) problems.push(`duplicate project type id: ${id}`);
    seen.add(id);
    if (!type?.label) problems.push(`project type ${id}: missing label`);
    if (type?.unit !== "per-sqft" && type?.unit !== "flat") {
      problems.push(`project type ${id}: unit must be "per-sqft" or "flat"`);
    }

    const { low, high } = type?.band ?? { low: NaN, high: NaN };

    if (type?.unpriced) {
      // An unpriced type is a deliberate VERIFY route, not an error — but a
      // band left on it is a trap for whoever flips the flag next.
      if (low !== 0 || high !== 0) {
        problems.push(
          `project type ${id} is marked unpriced but carries a band (${low}–${high}) — clear it or unset unpriced`
        );
      }
      warnings.push(
        `project type ${id} is unpriced and will route to an on-site estimate instead of showing a range`
      );
      continue;
    }

    if (!Number.isFinite(low) || low <= 0) {
      problems.push(
        `project type ${id}: low (${low}) must be greater than zero`
      );
    }
    if (!Number.isFinite(high) || high <= 0) {
      problems.push(
        `project type ${id}: high (${high}) must be greater than zero`
      );
    }
    if (Number.isFinite(low) && Number.isFinite(high) && low > 0) {
      if (high < low) {
        problems.push(
          `project type ${id}: high (${high}) is below low (${low})`
        );
      } else if (high / low > MAX_SPREAD_RATIO) {
        problems.push(
          `project type ${id}: spread is ${(high / low).toFixed(1)}× (${low}–${high}), wider than ${MAX_SPREAD_RATIO}× — likely a typo`
        );
      }
    }
  }

  if (types.length > 0 && types.every(t => t?.unpriced)) {
    problems.push(
      "every project type is unpriced — the estimator could never show a number"
    );
  }

  // ── coverage against what the UI actually offers ──────────────────────────
  for (const offered of offeredTypeIds) {
    if (!seen.has(offered)) {
      problems.push(
        `project type "${offered}" is offered in the UI but absent from the estimating basis`
      );
    }
  }

  return { ok: problems.length === 0, problems, warnings, ageDays };
}
