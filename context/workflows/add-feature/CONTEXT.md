# Workflow: Add a Feature (End-to-End)

## Input

- A described capability, and which surface it belongs to (public site, client
  portal, or admin command center).
- `context/references/stack.md` — where each layer lives.
- `context/references/conventions.md` — the rules that constrain the change.

## Process

1. **Schema** — add table(s) to `drizzle/schema.ts`, run `pnpm db:push`.
2. **Data** — add query helpers to `server/_data/<name>Repo.ts`.
3. **Router** — add a tRPC router, register it in `server/routers.ts`. Pick the
   middleware level deliberately: `publicProcedure` / `protectedProcedure` /
   `adminProcedure`.
4. **Client** — page in `client/src/pages/`, route in `App.tsx`.
5. **Components** — check `client/src/components/ui/` before building new ones.
6. **Tests** — `*.test.ts` beside the code. Cover the authorization boundary,
   not just the happy path.

## Output

- A working feature reachable from its intended surface only.
- Tests that fail if the authorization boundary regresses.
- Updated reference docs when the change alters architecture.

## Completion

`pnpm validate` passes: lint, estimating check, AI eval, 859+ tests, build.

## Stop conditions

Stop and ask rather than guessing when:

- the feature needs a new third-party service (see the Netlify-only rule);
- it would let a client surface read another client's data;
- it requires a schema change that drops or rewrites existing columns.
