# Workflow: Review the Estimating Basis

This is **Eric's** workflow, not an engineering one. Full detail in
`docs/ESTIMATING_BASIS.md`.

## Input

- `shared/estimating/basis.ts` — the current rates.
- Current Eugene / Lane County costs, from Eric's own recent jobs and supplier
  pricing.
- `pnpm check:estimating` output — how stale the basis is today.

## Process

1. Review each project type's band against what jobs actually cost now.
2. Decide the four unpriced types (`full-remodel`, `adu`, `restoration`,
   `cabinets`): supply a band, or leave them unpriced. Leaving them unpriced is
   a legitimate permanent choice — they route to an on-site estimate instead of
   showing a number.
3. Update `basis.reviewedAt` to today.
4. Set `basis.source` to `"eric-reviewed"`.

## Output

A basis whose numbers Eric stands behind, dated so the next review is visible.

## Completion

`pnpm check:estimating` reports valid and current, with no staleness warnings.

## Stop conditions

Never invent a rate to clear a warning. An unpriced type that returns `VERIFY`
is a better answer than a number nobody reviewed.
