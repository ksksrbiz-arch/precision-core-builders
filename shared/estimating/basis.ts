/**
 * The estimating basis — Precision Core Builders' cost assumptions, as data.
 *
 * Before this file existed, these numbers lived inside an LLM system prompt and
 * the model was asked to *invent* the dollar figures from them. That put a
 * free-tier model in charge of the numbers a public prospect sees on
 * /estimator and of the rows written to the `estimates` table. Now code owns
 * the arithmetic and the model only explains it.
 *
 * PROVENANCE: every rate below was lifted verbatim from the previous
 * `PROMPTS.estimator` system prompt, where it was labelled "2024-2025". It has
 * been relocated, not re-researched — `reviewedAt` reflects that, and
 * `validateBasis()` will report it as overdue until Eric reviews the numbers
 * against current Eugene/Lane County costs. Treat a stale basis as a
 * VERIFY item, not a failure: the estimator still works, it just tells the
 * truth about how old its assumptions are.
 *
 * A project type with no rate is `unpriced` rather than guessed. The estimator
 * routes those to an on-site visit instead of showing a fabricated number.
 */

export type CostBand = {
  /** Low end of the range. */
  low: number;
  /** High end of the range. */
  high: number;
};

export type ProjectTypeBasis = {
  /** Matches an id in `client/src/config/projects.ts`. */
  id: string;
  label: string;
  /**
   * How the band is applied. "per-sqft" multiplies by square footage (which
   * therefore becomes required); "flat" is a whole-project range.
   */
  unit: "per-sqft" | "flat";
  band: CostBand;
  /**
   * When true, this type has no reviewed rate. The estimator returns a VERIFY
   * result and invites an on-site estimate rather than showing a number.
   * Fill in `band`, flip this to false, and the type lights up.
   */
  unpriced?: boolean;
  note?: string;
};

export type EstimatingBasis = {
  basis: {
    /** Where the rates came from. "relocated-prompt" means: not yet reviewed. */
    source: "relocated-prompt" | "eric-reviewed" | "market-survey";
    region: string;
    /** ISO date (YYYY-MM-DD) the rates were last reviewed by a human. */
    reviewedAt: string;
    /** Past this age, the basis is reported stale. */
    maxAgeDays: number;
  };
  projectTypes: ProjectTypeBasis[];
  /** Share of the mid estimate attributable to labor. */
  laborShare: number;
  /** Permit cost as a share of the mid estimate. */
  permitRate: number;
  /** Recommended contingency as a share of the mid estimate. */
  contingencyRate: number;
  /**
   * How far into the band each complexity level sits, as a 0-1 position.
   * Complexity positions the expected figure inside the range; it never
   * widens or moves the range itself.
   */
  complexityPosition: Record<"low" | "medium" | "high", number>;
  /**
   * Each premium material selection nudges the expected figure further up the
   * band by this much, capped by `maxMaterialPosition`.
   */
  materialStep: number;
  maxMaterialPosition: number;
};

export const ESTIMATING_BASIS: EstimatingBasis = {
  basis: {
    source: "relocated-prompt",
    region: "Eugene, OR (Lane County)",
    // The rates below were described as "2024-2025" in the prompt they came
    // from. Dating them to the end of that window is the most favourable
    // honest reading; it is deliberately not today's date.
    reviewedAt: "2025-01-01",
    maxAgeDays: 365,
  },

  projectTypes: [
    {
      id: "new-home",
      label: "New Home Build",
      unit: "per-sqft",
      band: { low: 180, high: 350 },
      note: "Range spans finish level; complexity positions within it.",
    },
    {
      id: "addition",
      label: "Home Addition",
      unit: "per-sqft",
      band: { low: 150, high: 280 },
    },
    {
      id: "outdoor",
      label: "Outdoor / Deck",
      unit: "per-sqft",
      band: { low: 15, high: 45 },
    },
    {
      id: "kitchen",
      label: "Kitchen Remodel",
      unit: "flat",
      band: { low: 25_000, high: 80_000 },
    },
    {
      id: "bathroom",
      label: "Bathroom Remodel",
      unit: "flat",
      band: { low: 8_000, high: 35_000 },
    },
    {
      id: "roofing",
      label: "Roofing",
      unit: "flat",
      band: { low: 8_000, high: 25_000 },
      note: "Typical home; steep or multi-layer tear-off sits above this.",
    },

    // ── Unpriced ────────────────────────────────────────────────────────────
    // These four are offered on /estimator but had no rate in the original
    // prompt. The model was inventing their numbers outright. Until Eric
    // supplies a reviewed band, they return VERIFY and route to a site visit.
    {
      id: "full-remodel",
      label: "Full Remodel",
      unit: "flat",
      band: { low: 0, high: 0 },
      unpriced: true,
      note: "Scope varies too widely to band without a walkthrough.",
    },
    {
      id: "adu",
      label: "ADU / Second Unit",
      unit: "per-sqft",
      band: { low: 0, high: 0 },
      unpriced: true,
      note: "Depends on utility runs, siting and Eugene ADU requirements.",
    },
    {
      id: "restoration",
      label: "Restoration",
      unit: "flat",
      band: { low: 0, high: 0 },
      unpriced: true,
      note: "Driven by concealed damage; cannot be banded from a form.",
    },
    {
      id: "cabinets",
      label: "Custom Cabinets",
      unit: "flat",
      band: { low: 0, high: 0 },
      unpriced: true,
      note: "Driven by linear footage, species and door style.",
    },
  ],

  // "Labor: typically 40-50% of total project cost" → midpoint.
  laborShare: 0.45,
  // "Oregon building permits: typically 1-2% of project value" → midpoint.
  permitRate: 0.015,
  // "Contingency: 10-15% recommended" → midpoint.
  contingencyRate: 0.125,

  complexityPosition: { low: 0.3, medium: 0.5, high: 0.7 },
  materialStep: 0.04,
  maxMaterialPosition: 0.85,
};

/** Look up a project type by id. Returns undefined for unknown ids. */
export function findProjectType(id: string): ProjectTypeBasis | undefined {
  const key = id.trim().toLowerCase();
  return ESTIMATING_BASIS.projectTypes.find(p => p.id.toLowerCase() === key);
}
