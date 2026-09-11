# The Estimating Basis

**Status:** Active — Phase 0 of the AI architecture upgrade
**Owner:** Eric (the rates) / the codebase (the arithmetic)

## Why this exists

The AI estimator used to work like this: the Eugene cost benchmarks lived inside
the `PROMPTS.estimator` system prompt, and a free-tier LLM was asked to produce
`estimatedLow`, `estimatedMid`, `estimatedHigh` and the cost breakdown from
them. Those figures were shown to prospects on the **public** `/estimator` page
and written into the `estimates` table, which the ledger and profitability views
read from.

Three problems with that:

1. **The model originated the numbers.** Nothing checked that low ≤ mid ≤ high,
   that the components summed to anything, or that the figure was in a sane band.
   A whitelist mapped the model's JSON onto columns, which stopped row pollution
   but validated nothing about the values.
2. **Rates in a prompt string cannot be maintained.** They carried a
   "2024-2025" label and no freshness mechanism. Nothing would ever notice them
   aging.
3. **Four of the ten offered project types had no benchmark at all**
   (full remodel, ADU, restoration, custom cabinets). The model invented those
   numbers from nothing.

## How it works now

```
compute (deterministic) → validate → explain (LLM, optional) → persist
```

Code owns every dollar figure. The LLM's only job is the narrative in
`aiReasoning`, and it is explicitly forbidden from introducing a figure the
derivation doesn't contain — `reasoningViolations()` checks rather than trusts,
and falls back to a deterministic explanation on any violation.

### Files

| File                                      | Owns                                       |
| :---------------------------------------- | :----------------------------------------- |
| `shared/estimating/basis.ts`              | The rates, as data. Eric's surface.        |
| `shared/estimating/compute.ts`            | `computeEstimate()` + `validateEstimate()` |
| `shared/estimating/validateBasis.ts`      | Integrity checks on the basis itself       |
| `netlify/functions/estimate-project.ts`   | The pipeline above                         |
| `scripts/check-estimating-basis.ts`       | `pnpm check:estimating`                    |
| `.github/workflows/estimating-health.yml` | Monthly staleness surfacing                |

### How a number is derived

Each project type carries a **band** (`low`–`high`), either per-square-foot or
whole-project. The band _is_ the published range — `estimatedLow` and
`estimatedHigh` are its ends.

Complexity positions the **expected** figure inside that band (low 30%,
medium 50%, high 70%). It never widens or moves the band. Each premium material
selection nudges the position up 4 percentage points, capped at 85% so
selections alone can never reach the top of the range.

The breakdown partitions the expected figure exactly: labor 45%, permits 1.5%,
contingency 12.5%, materials the remainder. The four always sum back to
`estimatedMid`, and `validateEstimate()` enforces it.

## VERIFY is a valid answer

A project type with no reviewed band is marked `unpriced` and returns

```json
{ "status": "verify", "reason": "...", "message": "..." }
```

with HTTP 200. The estimator UI renders an "On-Site Estimate Required" panel and
keeps the lead-capture form. No model call is made — saying "this needs eyes on
it" doesn't require one.

This is deliberate, and it is a _stronger_ position than a fabricated number:
it's honest, it's defensible for a CCB-licensed contractor, and it routes a
high-intent visitor straight to the thing that actually converts.

**Currently unpriced:** `full-remodel`, `adu`, `restoration`, `cabinets`.

## What Eric needs to do

The rates in `basis.ts` were **relocated, not re-researched**. They are the same
numbers that were in the prompt, and `basis.source` is set to
`"relocated-prompt"` to say so out loud. `pnpm check:estimating` reports them as
overdue today.

To bring the basis current:

1. Review each band in `shared/estimating/basis.ts` against current
   Eugene/Lane County costs.
2. Fill in bands for the four unpriced types — or leave them unpriced, which is
   a legitimate permanent choice for restoration and full remodels.
3. Update `basis.reviewedAt` to today and set `basis.source` to
   `"eric-reviewed"`.
4. Run `pnpm check:estimating` — it should report valid and current.

Nothing else changes. No prompt edits, no code changes, no redeploy logic.

## Rules for future work

- **Never put a rate in a prompt.** If a number affects money, it belongs in
  `basis.ts` where it can be validated, dated, and version-controlled.
- **Never let an LLM originate, adjust, or restate a figure.** Compute it, then
  ask the model to explain it.
- **Validate before persisting.** `validateEstimate()` runs on every path that
  reaches the `estimates` table.
- **Fail down, never fail open.** A provider outage costs the _explanation_, not
  the estimate. An invalid basis refuses to produce a number rather than
  producing a wrong one.
- **A stale basis is a VERIFY item, not a build break.** Staleness warns; only
  structural problems fail.
