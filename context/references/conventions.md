# Reference: Critical Rules & Conventions

Loaded when: writing any code in this repo. This is the rules surface.

## 8. Critical Rules & Conventions

### 8.1. Do NOT

- Introduce standalone cloud services (AWS S3, external OAuth, self-hosted DB) — **use Netlify extensions for everything**
- Store images/videos in `client/public/` or `client/src/assets/` — use Netlify Blobs
- Hardcode API keys or secrets in code — use Netlify environment variables
- Use external map libraries — use the built-in `Map.tsx` component
- Manually manipulate cookies or roll custom auth — use Netlify Identity
- Use or extend any Manus-specific code (`ManusDialog.tsx`, `client/public/__manus__/`, `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/storage.ts`) — these are legacy scaffolding to be replaced
- **Put an LLM classification call ahead of the deterministic router** (`server/_core/ai/router.ts`) — intent identifiable from explicit signals is a code decision
- **Widen what a surface can reach.** `public` and `portal` must never route into an operational specialist
- **Put a rate, price, or cost benchmark in an LLM prompt.** Anything that affects money belongs in a validated data module (`shared/estimating/basis.ts`), where it can be dated, integrity-checked, and flagged when stale
- **Let an LLM originate, adjust, or restate a dollar figure.** Compute it deterministically, then ask the model to explain it
- **Write LLM output to the database without validating it.** Input validation is not output validation

### 8.2. DO

- Use **native Netlify extensions** for all services (auth, DB, storage, forms, scheduling)
- Store all secrets via the **Netlify dashboard** (environment variables)
- Use tRPC `protectedProcedure` / `adminProcedure` for access control
- Use shadcn/ui components from `client/src/components/ui/` before building custom ones
- Write Vitest tests for all critical procedures
- **Fail down, never fail open** on any AI path: a provider outage, a malformed response, or an invalid basis must degrade to a safe deterministic result or an explicit VERIFY state — never a fabricated one, and never a bypassed check
- **Route every AI surface through `routeAi()` and inject `specialistPrompt()` before any data context** — a bounded contract beats a kitchen-sink prompt
- **Run `pnpm eval:ai` after touching prompts, contracts, or routing**, and `pnpm eval:ai:live` before shipping such a change
- **Treat VERIFY as a valid answer.** "This needs an on-site visit" is a better response than a number the data can't support, and it converts better
- Use Zod schemas for input validation on tRPC procedures
- Follow Prettier formatting (80 chars, 2 spaces, trailing commas)
- Use path aliases (`@/*`, `@shared/*`) for imports
- Commit and push to **GitHub** — it is the single source of truth

### 8.3. Code Style

- **Formatting:** Prettier — 80 char width, 2-space indent, trailing commas, double quotes
- **Types:** Leverage tRPC's end-to-end type safety; all procedures must have clear input/output types
- **Errors:** Use error classes from `shared/_core/errors.ts` (HttpError, BadRequestError, etc.)
- **Constants:** Shared constants go in `shared/const.ts`
- **State management:** React Query (via tRPC) for server state; React context for UI state

### 8.4. Admin write paths & access control

Rules learned from the October 2026 admin audit (`docs/ADMIN_AUDIT_2026-10.md`).
Each one was a shipped bug; each is test-covered.

- **Never derive an update schema from a default-bearing create schema.** Zod 4
  applies `.default()` inside `.partial()`, so `Create.partial()` silently wrote
  `status: "lead"`, `published: false`, … on every update. Define a `*Fields`
  object with no defaults, `extend()` it with defaults for create, and
  `.partial()` the defaults-free one for update.
- **`undefined` = unchanged, `null` = clear.** An update schema must make every
  user-clearable column `.nullable().optional()`, and edit forms send `null` for
  blanks (create sends `undefined`). Otherwise a blanked field is a silent no-op
  behind a "Saved" toast.
- **Never trust `user_metadata`.** It is user-writable. Roles come from
  `public.users.role` or `app_metadata.role` only, and admin additionally needs a
  confirmed email (`server/_core/auth/verifyToken.ts`).
- **Every `protectedProcedure` that takes a `projectId` must call
  `assertProjectAccess(ctx, projectId)`.** A procedure that returns the whole
  table (e.g. `projects.list`) is `adminProcedure`.
- **A Netlify function that reads/writes through the service-role DB without
  scoping to the caller must be `auth: "admin"`**, not `"user"` (`search`,
  `voice-to-report`, `vision-studio` were wrong).
- **Write actor/author columns with `authorUuid(ctx.user)`**
  (`server/_core/identity.ts`). The shared-admin and dev sessions have non-UUID
  ids; inserting them into a uuid FK fails the whole row.
- **Browser → n8n goes through `relayAdminEvent()`** (`client/src/lib/relayEvent.ts`),
  which sends the admin session. A bare `fetch("/api/n8n-webhook")` is rejected.
- **A table that exists in `drizzle/schema.ts` ships with a migration _and_ RLS.**
- **Projects are archived, not deleted.** `projects.archive` / `unarchive` set
  `archived_at`; lists, pickers and dashboard stats exclude archived rows
  (`projects.list({ archived: "only" | "include" })` opts in). `projects.delete`
  refuses a project with ledger entries — deleting cascades into the immutable
  ledger. No UI calls delete.
- **Schedule dependencies** are `schedule_items.depends_on` = comma-separated
  predecessor ids, finish-to-start (`shared/scheduleDeps.ts`). The router
  rejects self/unknown/circular links and unlinks a deleted task from its
  dependents. `schedule.updateOrder` renumbers `sort_order` (list + Gantt order).
- **A server-enforced rule beats a toast.** If the UI says "approved and locked",
  the router must refuse the edit (`estimates.update` does).

### 8.5. Environment Variables

All environment variables are managed via the **Netlify dashboard** and injected at build/runtime. Only `VITE_`-prefixed variables are accessible in client code via `import.meta.env`.

Netlify extensions (Identity, DB, Blobs) automatically provision their own env vars. Additional app-specific variables (API keys for Gemini, Whisper, OpenWeatherMap, etc.) are added manually in the Netlify dashboard.

The `.env.example` file lists variables from the legacy Manus setup and will be updated as Netlify extensions are connected.

---
