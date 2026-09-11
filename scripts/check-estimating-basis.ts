#!/usr/bin/env tsx
/**
 * Estimating-basis health check.
 *
 * Eric's installed cost assumptions live in `shared/estimating/basis.ts` and go
 * stale the same way Clearview's installed pricing does. This runs the integrity
 * validator against the basis the app actually ships and against the project
 * types the estimator UI actually offers.
 *
 * Integrity problems fail the job. Staleness is reported as a warning and does
 * not fail — an out-of-date basis is a VERIFY item for Eric to act on, not a
 * reason to block a deploy.
 *
 *   pnpm check:estimating
 */
import { PROJECT_TYPES } from "../client/src/config/projects";
import { ESTIMATING_BASIS, validateBasis } from "../shared/estimating";

const report = validateBasis(
  ESTIMATING_BASIS,
  new Date(),
  PROJECT_TYPES.map(p => p.id)
);

console.log(
  `Estimating basis — ${ESTIMATING_BASIS.basis.region}, source "${ESTIMATING_BASIS.basis.source}", reviewed ${ESTIMATING_BASIS.basis.reviewedAt}` +
    (report.ageDays === null ? "" : ` (${report.ageDays} days ago)`)
);

const priced = ESTIMATING_BASIS.projectTypes.filter(p => !p.unpriced);
console.log(
  `${priced.length} of ${ESTIMATING_BASIS.projectTypes.length} project types have a reviewed cost band.\n`
);

for (const warning of report.warnings) {
  console.warn(`  warning: ${warning}`);
}
for (const problem of report.problems) {
  console.error(`  PROBLEM: ${problem}`);
}

if (!report.ok) {
  console.error(
    `\n${report.problems.length} integrity problem(s) — the estimator will refuse to produce numbers until these are fixed.`
  );
  process.exit(1);
}

if (report.warnings.length) {
  console.log(
    `\nBasis is structurally valid with ${report.warnings.length} warning(s). Review the rates against current Eugene costs and bump basis.reviewedAt.`
  );
} else {
  console.log("\nEstimating basis is valid and current.");
}
