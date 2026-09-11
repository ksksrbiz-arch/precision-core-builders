# Workflow: Add or Change an AI Surface

Governed by `docs/AI_OPERATING_CONTRACT.md`. Read that first — it is policy,
this is the procedure.

## Input

- The job the surface performs, and **which surface** it runs on:
  `public` | `portal` | `internal`.
- The bounded data context it needs (a server-generated aggregate, never a
  table dump).

## Process

1. **Route deterministically.** Call `routeAi({ surface, message })`, or pin a
   specialist when the job is fixed. Never put an LLM classifier ahead of it.
2. **Inject the contract before any data.** `specialistPrompt(route.id)` goes
   into the system message ahead of the snapshot, so the boundary is set before
   the model sees anything.
3. **Add a specialist** in `server/_core/ai/specialists.ts` if no existing
   contract fits: one job, one evidence boundary, one output shape, a
   never-list.
4. **Add tools** in `server/_core/ai/tools.ts` only if the model needs data it
   cannot be given up front. Declare `surfaces` narrowly.
5. **Validate the output** before it reaches a user or the database. Input
   validation is not output validation.
6. **Define the budget**: max input, max history, max output tokens, max tool
   rounds, timeout behaviour.

## Output

- A surface that returns `route` and `routeReason` for observability.
- A contract that is data in code, not prose in a handler.
- Degradation to a deterministic result or `VERIFY` on any failure.

## Completion

- `pnpm eval:ai` passes (routing, surface isolation, refusal rules).
- `pnpm eval:ai:live` run once against a real provider key.
- Unit tests cover the surface boundary for both specialists and tools.

## Stop conditions

Stop and surface `VERIFY` rather than guessing when:

- a figure would have to be originated by the model;
- a code or permit requirement would be stated as settled fact;
- a completion date would be implied;
- the data needed simply is not in the supplied context.
