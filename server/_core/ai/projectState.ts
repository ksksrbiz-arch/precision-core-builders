/**
 * Deterministic project-state extraction for the public chat.
 *
 * The chat used to be stateless prose in, prose out. A visitor could describe
 * their project across three turns and the surface retained nothing — no way to
 * tell whether they were browsing or ready to book, and no way to offer a next
 * step that fit.
 *
 * This builds a small structured model of the project from what the visitor
 * actually said, using pattern matching rather than a model call. Two reasons
 * it must stay deterministic: extraction is cheap and repeatable in code, and
 * an LLM asked to "extract the project" will happily invent a square footage
 * that was never mentioned. Nothing here infers a value from silence.
 *
 * Ported in shape from Clearview's `inferProject` / `nextSteps` /
 * `estimateReady` in `functions/ask/api/chat.js`.
 */
import { findProjectType } from "../../../shared/estimating";

export type ProjectStage =
  "Researching" | "Comparing options" | "Planning" | "Ready for estimate";

export type ProjectState = {
  /** A project-type id from the estimating basis, when one was named. */
  projectType?: string;
  projectTypeLabel?: string;
  squareFootage?: number;
  complexity?: "low" | "medium" | "high";
  /** Premium finishes the visitor mentioned wanting. */
  interests?: string[];
  stage?: ProjectStage;
};

export type NextStep = { label: string; prompt: string };

/** Phrases that name a project type, mapped to basis ids. */
const TYPE_PATTERNS: [RegExp, string][] = [
  [
    /\b(new (home|house|build|construction)|build a (home|house)|ground up)\b/i,
    "new-home",
  ],
  [/\b(gut|full|whole[- ]house) remodel\b/i, "full-remodel"],
  [/\bkitchen\b/i, "kitchen"],
  [/\b(bathroom|bath remodel|master bath|powder room)\b/i, "bathroom"],
  [/\b(addition|add on|bump[- ]?out|extend the)\b/i, "addition"],
  [
    /\b(adu|accessory dwelling|mother[- ]in[- ]law|granny flat|second unit)\b/i,
    "adu",
  ],
  [/\b(deck|patio|pergola|outdoor (kitchen|living))\b/i, "outdoor"],
  [/\b(roof|roofing|re[- ]?roof|shingle)\b/i, "roofing"],
  [
    /\b(restoration|restore|fire damage|water damage|historic)\b/i,
    "restoration",
  ],
  [/\b(cabinet|cabinetry|built[- ]?ins?|millwork)\b/i, "cabinets"],
];

const INTEREST_PATTERNS: [RegExp, string][] = [
  [/\b(quartz|granite|marble|countertop)\b/i, "High-end countertops"],
  [/\b(custom cabinet|cabinetry|millwork)\b/i, "Custom cabinetry"],
  [/\b(hardwood|white oak|wide plank)\b/i, "Hardwood flooring"],
  [/\b(tile|stone|slab)\b/i, "Tile and stone"],
  [/\b(smart home|automation|lutron|control4)\b/i, "Smart home integration"],
  [
    /\b(sub[- ]?zero|wolf|thermador|premium appliance)\b/i,
    "Premium appliances",
  ],
  [
    /\b(energy[- ]efficient|passive|triple[- ]pane)\b/i,
    "Energy-efficient windows",
  ],
];

/**
 * Merge new signals from the latest message into the known state.
 *
 * Earlier explicit values win: a visitor who said "kitchen" on turn one and
 * later mentions their roof in passing is still planning a kitchen. Only fields
 * that are genuinely absent get filled.
 */
export function inferProjectState(
  message: string,
  known: ProjectState = {},
  history: { role: string; content: string }[] = []
): ProjectState {
  const source = [
    ...history.filter(m => m.role === "user").map(m => m.content),
    message,
  ]
    .join("\n")
    .slice(0, 6000);

  const next: ProjectState = { ...known };

  if (!next.projectType) {
    for (const [pattern, id] of TYPE_PATTERNS) {
      if (pattern.test(source)) {
        const basisType = findProjectType(id);
        next.projectType = id;
        next.projectTypeLabel = basisType?.label ?? id;
        break;
      }
    }
  }

  if (!next.squareFootage) {
    // Only an explicit figure counts. "a big kitchen" is not a measurement.
    const sqft = source.match(
      /\b([\d,]{2,7})\s*(?:sq\.?\s*(?:ft|feet)|square\s*(?:ft|feet)|sf)\b/i
    );
    if (sqft) {
      const n = Number(sqft[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0 && n <= 50_000) next.squareFootage = n;
    }
  }

  if (!next.complexity) {
    if (
      /\b(high[- ]end|luxury|custom|top[- ]of[- ]the[- ]line|no expense|premium)\b/i.test(
        source
      )
    )
      next.complexity = "high";
    else if (
      /\b(budget|simple|basic|straightforward|keep it modest|economical)\b/i.test(
        source
      )
    )
      next.complexity = "low";
  }

  const interests = new Set(next.interests ?? []);
  for (const [pattern, label] of INTEREST_PATTERNS) {
    if (pattern.test(source)) interests.add(label);
  }
  if (interests.size) next.interests = [...interests].slice(0, 8);

  // Stage is re-derived every turn: it is the one field that should move as
  // the conversation progresses.
  if (
    /\b(ready for (an?|the) estimate|request an estimate|come out and measure|schedule (a )?(visit|measure|walkthrough)|get started|sign)\b/i.test(
      source
    )
  )
    next.stage = "Ready for estimate";
  else if (
    /\b(budget|timeline|financing|permit|when could you|planning|getting ready|next spring|this fall)\b/i.test(
      source
    )
  )
    next.stage = "Planning";
  else if (
    /\b(compare|comparing|versus|vs\.?|difference between|which (one|option)|or should i)\b/i.test(
      source
    )
  )
    next.stage = "Comparing options";
  else next.stage = next.stage ?? "Researching";

  return next;
}

/**
 * Up to three next-step prompts, chosen from what the visitor has and has not
 * told us. These are conversation continuations, not marketing copy.
 */
export function nextSteps(state: ProjectState): NextStep[] {
  const steps: NextStep[] = [];
  const add = (label: string, prompt: string) => {
    if (steps.length < 3 && !steps.some(s => s.prompt === prompt)) {
      steps.push({ label, prompt });
    }
  };

  const basisType = state.projectType
    ? findProjectType(state.projectType)
    : undefined;

  // An unpriced type can never produce a number, so steer to the visit.
  if (basisType?.unpriced) {
    add(
      "Why this needs a visit",
      `Why does a ${basisType.label.toLowerCase()} need an on-site estimate instead of a range?`
    );
  } else if (
    state.projectType &&
    !state.squareFootage &&
    basisType?.unit === "per-sqft"
  ) {
    add(
      "Size it",
      "How do I work out the square footage you'd need for an estimate?"
    );
  } else if (state.projectType) {
    add(
      "What it costs",
      `What drives the cost of a ${basisType?.label.toLowerCase() ?? "project"} like mine?`
    );
  }

  if (!state.projectType) {
    add(
      "Where to start",
      "What should I think about before starting a project?"
    );
  }

  switch (state.stage) {
    case "Comparing options":
      add("The deciding factor", "What should decide it for my project?");
      break;
    case "Planning":
      add(
        "Planning checklist",
        "What should I have ready before the estimate?"
      );
      break;
    case "Ready for estimate":
      add("Book the visit", "What happens during an on-site estimate?");
      break;
    default:
      add("Timeline", "How long does a project like this usually take?");
  }

  if (state.complexity === "high" || state.interests?.length) {
    add("Finish level", "How much does finish level change the cost?");
  }

  return steps;
}

/**
 * Whether to surface the estimate call-to-action.
 *
 * Deliberately generous on intent but never pushy on turn one: a visitor who
 * explicitly asks is always ready; otherwise we want real signal that they have
 * a project in mind, not just a question.
 */
export function estimateReady(
  state: ProjectState,
  history: { role: string }[] = []
): boolean {
  if (state.stage === "Ready for estimate") return true;
  const known = [
    state.projectType,
    state.squareFootage,
    state.complexity,
    state.interests?.length,
  ].filter(Boolean).length;
  if (state.stage === "Planning" && known >= 1) return true;
  return known >= 2 && history.length >= 2;
}
