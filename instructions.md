# instructions.md — Agent Quality Bar for Precision Core Builders

**Audience:** Claude, Grok, Mistral, and any other coding agent working this repo.
**Authority:** Complements `CLAUDE.md` (product/architecture) and `TODO.md` (task queue). When this file conflicts with stale claims in older docs, prefer *this file* + the live code.
**Last updated:** 2026-08-16

---

## 0. Why this file exists

Agent quality varies. The BOT-1 realtime commit (Mistral / Vibe Nuage, PR #222) was *mostly solid* but still needed a follow-up for control-flow honesty, immediate channel teardown on error, and reconnect observability. This document encodes the bar so future work does not reintroduce the same class of issues — and so stronger agents (Claude / Grok) do not regress into weaker patterns either.

Read this before writing code. Treat it as mandatory, not advisory.

---

## 1. Non-negotiable operating rules

1. **One focused change per PR/commit.** Do not mix feature work, drive-by refactors, and doc cleanup unless the user explicitly asked for a bundled pass.
2. **Stay inside the stated scope.** If blocked by secrets, third-party credentials, Netlify dashboard settings, or off-repo systems (n8n workflows), *stop and report*. Do not stub live secrets or invent credentials.
3. **Match existing patterns first.** Before inventing a new abstraction, find the nearest working example in-tree and mirror it.
4. **Never break the public API of a shared hook/component without an explicit migration plan.** Prefer additive, backward-compatible returns.
5. **Verify before claiming done.** Minimum gate for any code change:
   - `pnpm check` (0 TypeScript errors)
   - `pnpm test` (full suite green; report before/after counts if tests were added)
   - `pnpm format:check` / Prettier clean on touched files
6. **No `any` expansion.** Do not introduce new `any` types. Pre-existing `as any` on third-party surfaces (e.g. Supabase realtime event names) may remain only when the library forces it — leave a short comment, do not spread it.
7. **Mobile-first + Quiet Luxury.** UI must work on phone widths; follow the design system in `CLAUDE.md` §6. WCAG AA for interactive controls.
8. **Security defaults.** Public/unauthenticated Netlify functions need zod bounds + rate limits. Never hardcode secrets. Never weaken auth gates "for convenience."

---

## 2. Definition of done (every change)

A change is not done until all of the following are true:

| Gate | Requirement |
|------|-------------|
| **Intent** | Commit message states *what* and *why*; references BOT-n / issue when applicable |
| **Types** | `pnpm check` clean |
| **Tests** | `pnpm test` clean; new behavior has focused unit tests |
| **Lifecycle** | Effects clean up timers, subscriptions, listeners, and channels on unmount |
| **Control flow** | Every branch either `return`s or intentionally falls through — no accidental double work |
| **Observability** | Recoverable failures log enough to debug in production without spamming |
| **API shape** | Shared exports remain backward-compatible unless the user approved a break |
| **Docs** | If you change agent workflow or quality rules, update *this file* in the same PR |

Do not write "Verified: …" in the commit message unless you actually ran the commands.

---

## 3. Code patterns that must be preserved

### 3.1 React effects & subscriptions

- Hold mutable subscription handles in **refs** (`channelRef`, `timerRef`), not only in locals that the status callback cannot see later.
- Use a **`disposedRef`** (or equivalent) so async callbacks and delayed timers no-op after unmount.
- Clear **every** `setTimeout` / `setInterval` in the effect cleanup.
- Tear down external resources **as soon as they are known dead**, not only at the start of the next attempt.
- Keep callback props on a ref (`onUpdateRef.current = onUpdate`) so identity changes do not resubscribe.

### 3.2 Backoff / retry

When implementing reconnect or retry:

- Exponential backoff with a **hard cap**.
- **Jitter** to avoid thundering herds.
- **Reset attempt counter** on a confirmed healthy state.
- Export pure delay helpers when they need unit tests without a React tree.
- Log recoverable retries at `console.warn` with attempt index, reason/status, and delay — low noise, high signal.

### 3.3 Control flow honesty

```ts
// BAD — recoverable path falls through and double-calls setState
if (isRecoverable(status)) {
  setIsLive(false);
  scheduleReconnect();
}
setIsLive(false);

// GOOD — each branch owns its outcome
if (status === "SUBSCRIBED") {
  setIsLive(true);
  return;
}
if (isRecoverable(status)) {
  setIsLive(false);
  scheduleReconnect();
  return;
}
setIsLive(false);
```

### 3.4 Testing expectations

- Prefer pure functions for schedules, formatters, validators, crypto helpers.
- Use Vitest + Testing Library patterns already in the repo.
- Fake timers for backoff/reconnect tests; always restore real timers.
- Mock `Math.random` only inside `[0, 1)` — do not assert on `random() === 1` unless documenting a synthetic bound.
- Cover: happy path, recoverable failure, recovery/reset, unmount during pending work, and at least one non-recoverable path.

### 3.5 Security (Netlify functions & data access)

- Public endpoints: zod schema + per-IP rate limit before any LLM/DB work.
- Bound string lengths and array sizes; never feed unbounded user text into prompts or filters.
- Escape user terms before interpolating into PostgREST `.or()` filter strings (`escapePostgrestFilterTerm`).
- Dev-only auth bypasses must require an explicit local env flag — never `NODE_ENV !== "production"` alone on Netlify preview/branch deploys.
- Prefer reusing shared guards (`corsGuard`, `authGuard`, `rateLimiter`) over copying logic.

### 3.6 Stack constraints

- Package manager: **pnpm** only (no `package-lock.json`).
- Backend: Netlify Functions + tRPC + Drizzle + Supabase.
- Do not introduce AWS S3, custom OAuth stacks, or parallel cloud platforms.
- Client path aliases: `@/*`, `@shared/*`.

---

## 4. Lessons from the Mistral BOT-1 commit (required reading)

**Commit:** `a3baec0` / PR #222 — realtime exponential backoff in `useRealtimeTable`.

### What was good (repeat this)

- Scoped to one file + tests; public `{ isLive, lastEvent }` unchanged.
- Pure `nextReconnectDelay()` exported for direct unit tests.
- `disposedRef` + timer cleanup + backoff reset on `SUBSCRIBED`.
- Six focused Vitest cases with fake timers and a scripted status queue.

### What was insufficient (do not repeat)

| Issue | Why it mattered | Required fix |
|-------|-----------------|--------------|
| Recoverable branch fell through to a second `setIsLive(false)` | Accidental control flow; confuses readers and future edits | `return` after each terminal branch |
| Dead channel only removed at the *next* `subscribe()` | Resource lingered for the full backoff window | `removeChannel` immediately on recoverable status |
| Recoverable retries were silent | Production flaps are undebuggable | `console.warn` with table, status, attempt, delay |
| Test mocked `Math.random` → `1` | Real RNG is `[0, 1)`; assertion documented an impossible value | Keep jitter tests inside `[0, 1)` |

### Follow-up landed in-repo

The hardened `useRealtimeTable` behavior (immediate teardown + return + reconnect log) is the reference implementation. Copy that pattern for any future subscription/retry work.

---

## 5. Agent workflow checklist (copy into PR body)

```markdown
## Scope
- [ ] Single concern; no unrelated drive-byes
- [ ] No secret/credential stubs; blockers reported instead

## Implementation
- [ ] Matched existing in-repo patterns
- [ ] Effects clean up timers/subscriptions/channels
- [ ] Control flow has explicit returns on terminal branches
- [ ] Recoverable failures are observable (log or user-visible state)
- [ ] No new `any` types

## Verification
- [ ] `pnpm check` — 0 errors
- [ ] `pnpm test` — green (note count if tests added)
- [ ] Touched files Prettier-clean
- [ ] Manual path checked if UI (mobile width + keyboard)

## Risk
- [ ] Auth/security surface reviewed if endpoints or filters changed
- [ ] Public API of shared modules unchanged (or migration noted)
```

---

## 6. How to use the task queue

1. Prefer items in `TODO.md` **Autonomous Agent Queue** (BOT-n) when the user asks for "next work."
2. Create branch `bot/BOT-<n>-<short-slug>` from `main` when doing queue work.
3. Conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `security:`.
4. PR title: `BOT-<n>: <title>` when applicable.
5. Credential-gated work (n8n authoring, Stripe live keys, vendor APIs, Blueprint OAuth client secrets, Netlify DNS) is **human-owned** — agents prepare code/docs only.

---

## 7. Document map

| File | Use for |
|------|---------|
| `instructions.md` (this file) | Quality bar, agent process, anti-patterns |
| `CLAUDE.md` | Product vision, stack, architecture, design system |
| `TODO.md` | Prioritized backlog + BOT queue |
| `docs/ADMIN_COMPLETION_PLAN.md` | Admin ship gaps vs ops |
| `docs/PHASE5_SCOPING.md` | Post-launch feature tracks |
| `docs/PLATFORM_AUDIT_2026-07-23.md` | Snapshot of what was already code-complete |
| `SECURITY.md` | Security policy / reporting |

If product status in `CLAUDE.md` disagrees with a newer audit or with `main`, trust `main` + the newest audit, then update the stale doc in a dedicated chore commit.

---

## 8. Tone for commit messages

Write like a careful human maintainer:

- Lead with the user-visible or system-visible outcome.
- Mention verification commands only if run.
- Call out residual risk honestly (e.g. "does not stop curl attackers who omit Origin").
- Prefer depth over buzzwords. Short is fine; vague is not.

---

**End of instructions.md**
