# Reference: Technical Stack & Architecture

Loaded when: changing server architecture, routers, auth, or the database.

## 3. Technical Architecture (Actual Stack)

| Layer               | Technology                                         | Notes                                          |
| :------------------ | :------------------------------------------------- | :--------------------------------------------- |
| **Frontend**        | React 19 / Vite 7 / Tailwind CSS 4 / Framer Motion | shadcn/ui + Radix primitives for components    |
| **Routing**         | Wouter 3.3                                         | Lightweight client-side router                 |
| **State/Data**      | tRPC 11 + React Query 5                            | End-to-end type-safe API calls                 |
| **Backend**         | Netlify Functions                                  | Serverless; legacy Express scaffolding retired |
| **Database**        | Supabase (PostgreSQL) via Drizzle ORM              | RLS-enforced; migrations via `pnpm db:push`    |
| **Authentication**  | Supabase Auth                                      | JWT-based, admin/user roles, single verifier   |
| **Storage**         | Supabase Storage                                   | Media/object storage (image + PDF URLs)        |
| **Forms**           | React Hook Form + Zod 4                            | Type-safe validation                           |
| **Charts**          | Recharts 2                                         | Data visualization                             |
| **Platform**        | GitHub → Netlify                                   | CI/CD with edge deployment                     |
| **Integrations**    | blueprint.am (optional, feature-flagged)           | See `docs/integrations/blueprint.md`           |
| **Package Manager** | pnpm 10.4.1                                        | Strict, fast, workspace-ready                  |

### 3.0. Service Architecture Principle

**Use native Netlify extensions for all web services.** Do not introduce standalone cloud services (AWS S3, external OAuth providers, self-hosted databases, etc.). If Netlify offers an extension or integration for a capability, use it. This keeps infrastructure unified, secrets managed in one place (Netlify dashboard), and deployment simple.

### 3.0.1. Development & Deployment Workflow

- **GitHub** is the single source of truth for all code.
- All development happens via **Claude Chat** or **Claude Code** connections, pushing directly to the GitHub repo.
- Netlify auto-deploys from GitHub on push.
- Claude may use available connections (GitHub MCP tools, etc.) to create branches, open PRs, manage issues, and enhance the development workflow as needed.

### 3.1. Server Architecture

Backend logic runs as **Netlify Functions** (serverless). The tRPC app router is served from `netlify/functions/trpc.ts`; the legacy Manus Express server has been retired.

**Architecture:**

```
Netlify Functions (netlify/functions/)
├── tRPC handler (trpc.ts) exposing the app router
├── AI/LLM calls (free-tier LLM router — Groq/Gemini/OpenRouter, Whisper transcription)
├── Feature endpoints (estimate-project, lead-score, search, stripe-*, etc.)
├── Scheduled tasks (daily-briefing, weather checks, procurement)
└── Webhooks (Stripe, n8n, Netlify form submissions, notifications)
```

**tRPC Router structure** (`server/routers.ts`) — served via Netlify Functions:

```typescript
appRouter = {
  system, // health, notifyOwner
  auth, // me
  // 15 feature routers:
  projects,
  clients,
  fieldReports,
  schedule,
  estimates,
  ledger,
  leads,
  materials,
  purchaseOrders,
  subContractors,
  finishSelections,
  notifications,
  portfolio,
  sitePlans,
  blueprint,
};
```

### 3.1.1. AI Architecture

Every AI surface routes deterministically to **one bounded specialist contract**
before the model is called. See `docs/AI_OPERATING_CONTRACT.md`.

```
request → routeAi(surface, message) → specialistPrompt(id) → data context → model → validate
```

- `server/_core/ai/router.ts` — deterministic routing. **Never put an LLM
  classification call in front of it.**
- `server/_core/ai/specialists.ts` — the eight contracts, the evidence protocol
  (KNOWN / INFERRED / VERIFY), and `SHARED_NEVER` (the prohibitions that outrank
  any user input).

**Surface is an authorization boundary**, not just a routing hint:

| Surface    | Who                  | May reach                                                                                    |
| :--------- | :------------------- | :------------------------------------------------------------------------------------------- |
| `public`   | anyone               | `estimator`, `general-advisor`                                                               |
| `portal`   | authenticated client | `client-liaison` + the public set                                                            |
| `internal` | Eric (admin)         | `ops-copilot`, `field-reporter`, `procurement`, `scheduler`, `lead-analyst` + the public set |

A caller may pin a specialist when the job is known (`voice-to-report`,
`daily-briefing`); a pin the surface may not reach falls through to that
surface's default rather than escalating. This is test-covered — do not weaken
it.

**Tools** (`server/_core/ai/tools.ts`) are gated by the same boundary. Public
and portal get `estimate_project` only; the operational tools (`find_projects`,
`project_detail`, `material_shortages`, `project_schedule`) are internal-only,
and `executeTool()` re-checks the surface at execution time so a hallucinated
tool name never reaches the database. `runToolLoop()` bounds rounds at 2 and
withholds tools on the last one to force an answer.

**Middleware levels:**

- `publicProcedure` — No auth required
- `protectedProcedure` — Requires authenticated user (throws UNAUTHORIZED)
- `adminProcedure` — Requires `role = 'admin'` (throws FORBIDDEN)

### 3.2. Authentication

Authentication is handled by **Supabase Auth** (JWT-based). Auth verification is consolidated onto a single server-side verifier; the legacy Manus OAuth flow has been removed.

- Eric is `role = 'admin'`; clients are `role = 'user'`
- Supabase Auth handles signup, login, password reset, and sessions
- Admin role is resolved via the `users.role` column and the `admin_emails` allowlist
- Access control enforced via tRPC middleware (`protectedProcedure` / `adminProcedure`) against the Supabase JWT

### 3.3. Database

The database is **Supabase (PostgreSQL)**, accessed via **Drizzle ORM**. The schema in `drizzle/schema.ts` is Postgres (not MySQL), with row-level security (RLS) policies enforced. Migrations run via `pnpm db:push` once `SUPABASE_URL` + `DATABASE_URL` are set.

**Live schema** (`drizzle/schema.ts`) — 15+ tables, all with RLS:

- `users`, `admin_emails`, `profiles` — identity (extends Supabase Auth) + admin allowlist
- `clients` — Client contact info, project history
- `projects` — Project metadata, budget, timeline, status
- `field_reports` — Voice memos, transcriptions, summaries
- `schedule_items` — Gantt tasks, dependencies, weather sensitivity
- `estimates` — Project cost breakdowns (3-tier + category costs)
- `ledger_entries` — Immutable decision/cost log
- `materials` — Inventory, vendors, pricing, shortages
- `purchase_orders` / `purchase_order_items` — Persisted, vendor-bucketed POs
- `leads` — AI-scored lead prioritization board
- `sub_contractors`, `finish_selections`, `notifications`, `portfolio_projects`
- `site_plans` — Excalidraw canvas data
- `vision_studio_requests`, `ai_usage` — AI analysis + usage tracking
- `billing_events` — Stripe webhook records
- `blueprint_connections` / `blueprint_artifacts` — Blueprint.am integration (tokens encrypted at rest)

---
