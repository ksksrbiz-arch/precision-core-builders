# AI Operating Contract

**Status:** Active architecture policy
**Applies to:** every AI surface in this platform

Adapted from Clearview Windows' `.ai/AI-OPERATING-CONTRACT.md`, with Precision
Core Builders' liability surface in place of the window-trade one.

---

## 1. Deterministic first

Use application code for routing, validation, calculation, authorization,
persistence, state transitions, and gates whenever the rule can be expressed
deterministically.

`server/_core/ai/router.ts` is the default intent-routing mechanism. **Do not
insert an LLM classification call ahead of it.** Intent identifiable from
explicit signals is a deterministic decision; a model hop there costs latency,
money, and auditability for nothing.

## 2. AI is bounded judgment

AI may summarize known facts, normalize unstructured input, identify likely
paths, classify uncertainty, select relevant context, explain tradeoffs, and
draft artifacts.

AI must not:

- originate or adjust a price, cost, rate, or dollar figure;
- invent measurements, quantities, specifications, or site conditions;
- state an Oregon / Lane County / Eugene code or permit requirement as fact;
- make licensing, bonding, or insurance claims beyond CCB #246527;
- promise or imply a completion date;
- name or compare against another contractor;
- give legal, contract, insurance, or engineering advice;
- approve, finalize, or complete a human business gate;
- mutate business state without an explicit authorized application action.

These live in code as `SHARED_NEVER` in `server/_core/ai/specialists.ts` and are
injected into every specialist prompt. They outrank any instruction arriving in
user input or data.

## 3. Evidence protocol

Every material AI conclusion stays distinguishable as:

- `KNOWN` — supported by application state, the estimating basis, or explicit
  user input;
- `INFERRED` — a reasonable interpretation that stays visibly qualified;
- `VERIFY` — missing, conflicting, site-specific, product-specific, or
  safety-sensitive.

**`VERIFY` is a valid result, not an error.** The estimator returns it for a
project type with no reviewed cost band, and that is the system working.

## 4. Surface is an authorization boundary

Three surfaces, enforced by the router:

| Surface    | Who                  | May reach                                    |
| :--------- | :------------------- | :------------------------------------------- |
| `public`   | anyone               | `estimator`, `general-advisor`               |
| `portal`   | authenticated client | `client-liaison` + the public set            |
| `internal` | Eric (admin)         | the operational specialists + the public set |

A caller may _pin_ a specialist when the job is known (voice-to-report,
daily-briefing). A pin the surface may not reach falls through to that surface's
default — it never escalates. This is covered by tests; do not weaken it.

## 5. Fail down, never fail open

Provider failure, missing configuration, quota exhaustion, or malformed output
must degrade to a safe deterministic result or an explicit `VERIFY` state.

A failed model call must never cause the application to assume missing facts,
bypass a gate, fabricate a result, or persist unverified output as authoritative
state. The estimator is the reference implementation: a provider outage costs
the _explanation_, never the estimate.

## 6. Budgets

Every AI operation defines, in code: maximum input size, maximum history,
maximum output tokens, model calls per operation, and timeout/failure behaviour.
New surfaces must not silently exceed the existing limits.

## 7. Context minimization

AI receives the smallest bounded context required. Prefer server-generated
aggregates (`buildOpsSnapshot`, `buildPortalSnapshot`) over unrestricted
database exports, selected records over whole tables, and normalized fields over
raw PII. Never expose secrets, credentials, or session material to a model.

## 8. Output validation

Structured AI output is validated before the application uses it. Validation
rejects or downgrades unsupported claims, missing fields, invalid enums,
invented numerical values where a deterministic source exists, and attempts to
complete a gate.

Input validation is **not** output validation. `validateEstimate()` and
`reasoningViolations()` in the estimator are the pattern to follow.

## 9. Observability

Record route/specialist, coarse provider path, whether tools or retrieval ran,
success/degraded state, and validation outcome. Every routed surface returns
`route` and `routeReason` in its response. Avoid storing complete prompts or
responses without a documented operational need.

## 10. Human authority

AI confidence is not approval. The application remains authoritative for
estimate approval, invoicing, schedule changes, purchase orders, and every other
transactional gate.

## 11. Verification

| Command                 | Covers                                                                             |
| :---------------------- | :--------------------------------------------------------------------------------- |
| `pnpm eval:ai`          | routing, surface isolation, contract coverage, refusal rules — offline, runs in CI |
| `pnpm eval:ai:live`     | the same refusal rules applied to real model output; needs a provider key          |
| `pnpm check:estimating` | estimating-basis integrity and staleness                                           |
| `pnpm test`             | unit coverage incl. `server/_core/ai/ai-routing.test.ts`                           |

CI runs the offline mode: a model call is non-deterministic and rate-limited, so
gating a build on one would make the build flaky. What CI asserts is that the
rules still catch what they should and that routing has not drifted. Run
`pnpm eval:ai:live` before shipping a change to prompts or contracts.

## 12. Architecture change rule

When adding an AI feature, update: this contract if a reusable rule appears;
the router and specialist contracts; `docs/` for the surface; and the regression
tests for the new boundary. Do not introduce undocumented heuristics as policy.
