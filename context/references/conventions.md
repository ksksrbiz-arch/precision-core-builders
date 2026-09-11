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

### 8.4. Environment Variables

All environment variables are managed via the **Netlify dashboard** and injected at build/runtime. Only `VITE_`-prefixed variables are accessible in client code via `import.meta.env`.

Netlify extensions (Identity, DB, Blobs) automatically provision their own env vars. Additional app-specific variables (API keys for Gemini, Whisper, OpenWeatherMap, etc.) are added manually in the Netlify dashboard.

The `.env.example` file lists variables from the legacy Manus setup and will be updated as Netlify extensions are connected.

---
