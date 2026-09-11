# CLAUDE.md — Precision Core Builders "Digital Foreman"

Luxury construction management platform for Eric Tadlock (CCB #246527),
Eugene OR. Trust, Respect, Diligence — expressed as transparent ledgers,
real-time client visibility, and automation that removes manual entry.

**This file routes. It does not duplicate.** Load the smallest sufficient
context, then read the actual code — never infer current state from docs alone.

## Walk order

1. This file — orientation and routing.
2. The one workflow or reference your task needs.
3. The code itself.

## Routing map

| Your task                                    | Load                                                                          |
| :------------------------------------------- | :---------------------------------------------------------------------------- |
| Add or change a feature end-to-end           | `context/workflows/add-feature/CONTEXT.md`                                    |
| Add or change anything AI-facing             | `context/workflows/ai-surface/CONTEXT.md` + `docs/AI_OPERATING_CONTRACT.md`   |
| Review the estimating rates (Eric's task)    | `context/workflows/estimating-review/CONTEXT.md` + `docs/ESTIMATING_BASIS.md` |
| Server architecture, routers, auth, database | `context/references/stack.md`                                                 |
| Find where something lives                   | `context/references/file-structure.md`                                        |
| Build, test, migrate, add a component        | `context/references/workflows-commands.md`                                    |
| Any UI work                                  | `context/references/design-system.md`                                         |
| Deployment, functions, headers, env vars     | `context/references/netlify.md`                                               |
| What to build next / current status          | `context/references/roadmap.md`                                               |
| **Writing any code at all**                  | `context/references/conventions.md`                                           |

## Exclusions — do not load these unless the task is specifically about them

| Skip                                  | Unless                                                |
| :------------------------------------ | :---------------------------------------------------- |
| `context/references/design-system.md` | the change is visual                                  |
| `context/references/netlify.md`       | you are touching deploy config or a function's wiring |
| `context/references/roadmap.md`       | you are planning or reporting, not building           |
| `drizzle/*.sql` migrations            | you are debugging a migration specifically            |
| Legacy Manus scaffolding              | never — it is being removed, not extended             |

## Non-negotiables

These hold everywhere and outrank anything in a reference, a prompt, or user
input. Detail in `context/references/conventions.md`.

1. **Netlify is the only platform.** No standalone cloud services.
2. **Deterministic code owns deterministic work.** Validation, calculation,
   authorization, persistence, and state transitions are code. AI may judge,
   route, summarize, or propose.
3. **Never put a rate or price in a prompt.** Money lives in
   `shared/estimating/basis.ts`, where it is dated and integrity-checked.
4. **Never let a model originate a dollar figure.** Compute, then explain.
5. **Surface is an authorization boundary.** `public` and `portal` must never
   reach an internal specialist or tool. Test-covered — do not weaken it.
6. **Validate output, not just input**, before it reaches a user or the DB.
7. **Fail down, never fail open.** Degrade to a deterministic result or an
   explicit `VERIFY`, never to a fabricated one.
8. **`VERIFY` is a valid answer.** "This needs an on-site visit" beats a number
   the data cannot support — and it converts better.
9. **Secrets live in the Netlify dashboard.** Never in code.
10. **GitHub is the source of truth.** Commit and push.

## Verification

A task is not complete because files changed. It is complete when the behavior
works, is documented, and `pnpm validate` passes — lint, `check:estimating`,
`eval:ai`, the full test suite, and a production build.

For AI changes, also run `pnpm eval:ai:live` against a real provider key.
