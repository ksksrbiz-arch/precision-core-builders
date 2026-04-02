# CLAUDE.md: Precision Core Builders "Digital Foreman" Platform

## Agent Priming & Implementation Guardrails

This document primes AI assistants with the codebase structure, development workflows, conventions, and architectural vision for the Precision Core Builders platform. It reflects the **actual current state** of the implementation alongside the target roadmap.

---

## 1. Project Vision & Core Mandate

**Precision Core Builders** is a luxury construction management platform for Eric Tadlock (CCB #246527) that transforms how small-to-mid construction firms operate. The platform is a **thinking operational engine** that automates field reporting, procurement, scheduling, and client communication.

**Core Values Embedded in Code:**

- **Trust:** Transparent, immutable ledgers of all project decisions and costs.
- **Respect:** Clients see real-time progress; Eric controls operations with precision.
- **Diligence:** Automated workflows eliminate manual data entry and human error.

---

## 2. Current Implementation Status

> **Phase 1 is partially complete.** Auth, basic layout, design system foundations, and landing page exist. Feature routers, domain-specific pages, and Netlify Functions are all stubbed but not yet implemented.

### What's Built

- Basic page routing (Home, 404) with Wouter
- 50+ shadcn/ui components pre-installed and ready to use
- DashboardLayout, ErrorBoundary, Map components
- Tailwind CSS 4 design system with custom theme
- Netlify deployment configuration with security headers
- tRPC router scaffolding with role-based middleware (public/protected/admin)
- One test file (`server/auth.logout.test.ts`)

### What Needs Replacing (Legacy Manus Scaffolding)

- Custom OAuth flow (`server/_core/oauth.ts`, `sdk.ts`) → replace with Netlify Identity
- MySQL database + `users` table (`drizzle/schema.ts`, `server/db.ts`) → replace with Netlify DB extension
- AWS S3 storage (`server/storage.ts`) → replace with Netlify Blobs
- Express server entry point (`server/_core/index.ts`) → migrate to Netlify Functions
- Manus-specific files (`ManusDialog.tsx`, `client/public/__manus__/`, `dataApi.ts`)

### What's Stubbed / Not Yet Implemented

- All feature routers (projects, clients, field reports, materials, etc.)
- Database tables beyond `users` (projects, clients, field_reports, etc.)
- Netlify Functions (voice-to-report, estimate-project, weather-schedule, etc.)
- Domain pages (CommandCenter, ClientPortal, FieldReporting, Estimator, Portfolio)
- AI/LLM integrations (Gemini, Whisper)
- n8n automation workflows

---

## 3. Technical Architecture (Actual Stack)

| Layer               | Technology                                           | Notes                                        |
| :------------------ | :--------------------------------------------------- | :------------------------------------------- |
| **Frontend**        | React 19 / Vite 7 / Tailwind CSS 4 / Framer Motion   | shadcn/ui + Radix primitives for components  |
| **Routing**         | Wouter 3.3                                           | Lightweight client-side router               |
| **State/Data**      | tRPC 11 + React Query 5                              | End-to-end type-safe API calls               |
| **Backend**         | Netlify Functions                                    | Serverless; Express scaffolding is legacy    |
| **Database**        | Netlify extension (e.g., Neon Postgres, PlanetScale) | Use whichever Netlify DB extension fits best |
| **Authentication**  | Netlify Identity                                     | Native Netlify auth extension                |
| **Storage**         | Netlify Blobs                                        | Native Netlify file/object storage           |
| **Forms**           | React Hook Form + Zod 4                              | Type-safe validation                         |
| **Charts**          | Recharts 2                                           | Data visualization                           |
| **Platform**        | GitHub → Netlify                                     | CI/CD with edge deployment                   |
| **Package Manager** | pnpm 10.4.1                                          | Strict, fast, workspace-ready                |

### 3.0. Service Architecture Principle

**Use native Netlify extensions for all web services.** Do not introduce standalone cloud services (AWS S3, external OAuth providers, self-hosted databases, etc.). If Netlify offers an extension or integration for a capability, use it. This keeps infrastructure unified, secrets managed in one place (Netlify dashboard), and deployment simple.

### 3.0.1. Development & Deployment Workflow

- **GitHub** is the single source of truth for all code.
- All development happens via **Claude Chat** or **Claude Code** connections, pushing directly to the GitHub repo.
- Netlify auto-deploys from GitHub on push.
- Claude may use available connections (GitHub MCP tools, etc.) to create branches, open PRs, manage issues, and enhance the development workflow as needed.

### 3.1. Server Architecture

Backend logic runs as **Netlify Functions** (serverless). The existing Express server in `server/_core/index.ts` is legacy scaffolding from the initial Manus setup and will be replaced.

**Target architecture:**

```
Netlify Functions (netlify/functions/)
├── API endpoints (tRPC or REST, routed via netlify.toml)
├── AI/LLM calls (Gemini, Whisper)
├── Scheduled tasks (weather checks, procurement)
└── Webhooks (n8n, notifications)
```

**tRPC Router structure** (`server/routers.ts`) — carried forward into Netlify Functions:

```typescript
appRouter = {
  system: { health, notifyOwner },
  auth: { me, logout },
  // Feature routers go here (not yet implemented)
};
```

**Middleware levels:**

- `publicProcedure` — No auth required
- `protectedProcedure` — Requires authenticated user (throws UNAUTHORIZED)
- `adminProcedure` — Requires `role = 'admin'` (throws FORBIDDEN)

### 3.2. Authentication

Use **Netlify Identity** for authentication. The existing custom OAuth flow (`server/_core/oauth.ts`, `server/_core/sdk.ts`) is legacy Manus scaffolding to be replaced.

- Eric is `role = 'admin'`; clients are `role = 'user'`
- Netlify Identity handles signup, login, password reset, OAuth providers
- Access control enforced via tRPC middleware and Netlify Identity JWT

### 3.3. Database

Use a **Netlify database extension** (e.g., Neon Postgres, PlanetScale, Supabase) managed via the Netlify dashboard. The current MySQL schema in `drizzle/schema.ts` is legacy scaffolding — the Drizzle ORM setup will be adapted to whichever Netlify DB extension is chosen.

**Current schema** (legacy, single `users` table — to be rebuilt):

```
users (legacy Manus table, to be replaced with Netlify Identity)
```

**Planned tables** (add to `drizzle/schema.ts` as features are built):

- `projects` — Project metadata, budget, timeline, status
- `clients` — Client contact info, project history
- `field_reports` — Voice memos, transcriptions, summaries
- `materials` — Inventory, vendors, pricing
- `schedule_items` — Gantt chart tasks, dependencies
- `estimates` — Project cost breakdowns
- `ledger_entries` — Immutable decision/cost log
- `portfolio_projects` — Completed project showcase

---

## 4. File Structure (Actual)

```
precision-core-builders/
├── client/
│   ├── src/
│   │   ├── _core/hooks/         # useAuth.ts (core auth hook)
│   │   ├── components/
│   │   │   ├── ui/              # 50+ shadcn/ui components (button, card, dialog, etc.)
│   │   │   ├── AIChatBox.tsx    # AI chat interface
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── Map.tsx          # Google Maps integration
│   │   ├── contexts/            # ThemeContext.tsx
│   │   ├── hooks/               # useMobile, useComposition, usePersistFn
│   │   ├── lib/
│   │   │   ├── trpc.ts          # tRPC client setup
│   │   │   └── utils.ts         # cn() utility (clsx + tailwind-merge)
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Landing page
│   │   │   ├── NotFound.tsx     # 404 page
│   │   │   └── ComponentShowcase.tsx
│   │   ├── App.tsx              # Router (Wouter)
│   │   ├── main.tsx             # React + tRPC + React Query setup
│   │   ├── const.ts             # getLoginUrl(), COOKIE_NAME
│   │   └── index.css            # Tailwind theme + custom styles
│   └── public/                  # Static assets
├── server/
│   ├── _core/
│   │   ├── index.ts             # Express entry point (LEGACY — migrate to Netlify Functions)
│   │   ├── trpc.ts              # Router, publicProcedure, protectedProcedure, adminProcedure
│   │   ├── context.ts           # TrpcContext, createContext
│   │   ├── oauth.ts             # OAuth callback (LEGACY — replace with Netlify Identity)
│   │   ├── sdk.ts               # Manus OAuth SDK (LEGACY — replace with Netlify Identity)
│   │   ├── cookies.ts           # Session cookie options (LEGACY)
│   │   ├── env.ts               # Environment variable aggregation
│   │   ├── vite.ts              # Vite dev server setup
│   │   ├── systemRouter.ts      # health, notifyOwner endpoints
│   │   ├── llm.ts               # LLM types (stubbed)
│   │   ├── voiceTranscription.ts # Voice-to-text interface (stubbed)
│   │   ├── imageGeneration.ts   # Image generation (stubbed)
│   │   ├── notification.ts      # Notification delivery (stubbed)
│   │   ├── map.ts               # Map utilities
│   │   └── dataApi.ts           # Manus data API (LEGACY — remove)
│   ├── routers.ts               # appRouter definition
│   ├── db.ts                    # Drizzle ORM, user queries (adapt to Netlify DB extension)
│   ├── storage.ts               # AWS S3 helpers (LEGACY — replace with Netlify Blobs)
│   └── auth.logout.test.ts      # Test file
├── shared/
│   ├── _core/errors.ts          # HttpError, BadRequestError, UnauthorizedError, ForbiddenError
│   ├── const.ts                 # COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, error messages
│   └── types.ts                 # Shared TypeScript types
├── drizzle/
│   ├── schema.ts                # Database schema (users table)
│   ├── relations.ts             # Table relationships
│   └── 0000_rapid_donald_blake.sql  # Initial migration
├── netlify/
│   └── functions/               # Serverless functions (planned, not implemented)
├── patches/                     # pnpm patches (wouter@3.7.1)
├── .env.example                 # Environment variable template
├── drizzle.config.ts            # Drizzle Kit config (MySQL dialect)
├── vite.config.ts               # Vite config
├── vitest.config.ts             # Test config
├── tsconfig.json                # TypeScript config
├── netlify.toml                 # Netlify deployment config
├── components.json              # shadcn/ui config
├── .prettierrc                  # 80 chars, 2 spaces, trailing commas
└── package.json                 # Scripts, dependencies
```

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

---

## 5. Development Workflows

### 5.1. Common Commands

```bash
pnpm dev              # Start dev server (tsx watch, Vite HMR)
pnpm build            # Production build (vite build + esbuild server)
pnpm start            # Run production server

pnpm check            # TypeScript type checking (tsc --noEmit)
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting
pnpm lint             # Type check + format check

pnpm test             # Run tests (vitest run)
pnpm test:watch       # Watch mode tests
pnpm test:coverage    # Tests with coverage report

pnpm db:generate      # Generate Drizzle migration
pnpm db:migrate       # Run Drizzle migration
pnpm db:push          # Generate + migrate in one step
pnpm db:studio        # Open Drizzle Studio GUI

pnpm validate         # Full validation: lint + test + build
pnpm clean            # Remove dist/, cache, logs
```

### 5.2. Adding a New Feature (End-to-End)

1. **Schema:** Add table(s) to `drizzle/schema.ts`, run `pnpm db:push`
2. **Server:** Add query helpers to `server/db.ts`
3. **Router:** Add tRPC router in a new file, register in `server/routers.ts`
4. **Client page:** Create page in `client/src/pages/`, add route in `App.tsx`
5. **Components:** Use existing shadcn/ui components from `client/src/components/ui/`
6. **Tests:** Add `*.test.ts` files in `server/` (Vitest, node environment)

### 5.3. Adding a shadcn/ui Component

The project uses shadcn/ui with the `components.json` config. 50+ components are already installed in `client/src/components/ui/`. Check there before adding new ones.

### 5.4. Database Migrations

Drizzle Kit manages schema changes:

```bash
# 1. Edit drizzle/schema.ts
# 2. Generate SQL migration
pnpm db:generate
# 3. Apply migration
pnpm db:migrate
```

### 5.5. Testing

- Test files: `server/**/*.test.ts` or `server/**/*.spec.ts`
- Environment: Node (not jsdom)
- Framework: Vitest
- Config: `vitest.config.ts`

---

## 6. Design System: "Quiet Luxury"

The visual language is **"Warm Modern"** — minimalist, high-contrast, natural textures.

### 6.1. Color Palette (in `client/src/index.css`)

- **Primary (Warm Beige):** `#F5F1ED` (background), `#2D2D2D` (text)
- **Accent (Warm Steel):** `#8B7355` (wood/bronze tones)
- **Secondary (Stone Gray):** `#A9A9A9` (subtle accents)
- **Success (Earthy Green):** `#6B8E23` (project milestones)
- **Warning (Warm Amber):** `#D4A574` (alerts, budget impacts)

### 6.2. Typography

- **Headings:** `'Playfair Display', serif` (luxury, editorial)
- **Body:** `'Inter', sans-serif` (clean, modern)
- **Monospace:** `'Courier Prime', monospace` (data, ledgers)

### 6.3. Micro-Interactions

- Smooth transitions (300ms easing) on all interactive elements.
- Hover states: subtle scale (1.02x) and shadow elevation.
- Loading states: animated gradient pulse (not spinners).
- Tactile feedback: button press animations using Framer Motion.

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Design System + Auth) — **In Progress**

- [x] Tailwind CSS 4 with custom color palette and typography
- [x] OAuth authentication with role-based access (admin/user)
- [x] DashboardLayout component
- [ ] Landing page with full "Quiet Luxury" aesthetic (basic Home.tsx exists)

### Phase 2: Core Operations (Field Reporting + Scheduling)

- [ ] Voice-to-report system (Whisper + Gemini via Netlify Functions)
- [ ] Gantt chart component with weather-responsive logic
- [ ] Field report UI for Eric to review and publish
- [ ] Real-time updates to client portal

### Phase 3: Client Experience (Portal + Estimator)

- [ ] Client portal with live project timeline
- [ ] Digital finish selection manager with budget impact display
- [ ] AI Project Estimator with real-time cost calculations
- [ ] "Core Values" ledger for transparent decision tracking

### Phase 4: Automation (Procurement + Sub-Contractors)

- [ ] Material procurement system with vendor integration
- [ ] n8n workflows for sub-contractor scheduling and comms
- [ ] Automated billing and milestone-based invoicing
- [ ] SMS/Email notification system

### Phase 5: Analytics & Portfolio (Command Center + Showcase)

- [ ] Owner Command Center dashboard with AI lead prioritization
- [ ] Profitability tracking (estimated vs. actual costs)
- [ ] Project portfolio showcase with 360 walkthroughs
- [ ] LLM-powered search for operational queries

---

## 8. Critical Rules & Conventions

### 8.1. Do NOT

- Introduce standalone cloud services (AWS S3, external OAuth, self-hosted DB) — **use Netlify extensions for everything**
- Store images/videos in `client/public/` or `client/src/assets/` — use Netlify Blobs
- Hardcode API keys or secrets in code — use Netlify environment variables
- Use external map libraries — use the built-in `Map.tsx` component
- Manually manipulate cookies or roll custom auth — use Netlify Identity
- Use or extend any Manus-specific code (`ManusDialog.tsx`, `client/public/__manus__/`, `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/storage.ts`) — these are legacy scaffolding to be replaced

### 8.2. DO

- Use **native Netlify extensions** for all services (auth, DB, storage, forms, scheduling)
- Store all secrets via the **Netlify dashboard** (environment variables)
- Use tRPC `protectedProcedure` / `adminProcedure` for access control
- Use shadcn/ui components from `client/src/components/ui/` before building custom ones
- Write Vitest tests for all critical procedures
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

## 9. Netlify Platform

Netlify is the **sole infrastructure platform**. All services are managed through native Netlify extensions.

### 9.1. Build Configuration (`netlify.toml`)

- **Build command:** `pnpm install && pnpm build`
- **Publish directory:** `dist/public`
- **Node version:** 20
- **API routing:** `/api/*` → Netlify Functions

### 9.2. Netlify Extensions to Use

| Service            | Netlify Extension                       | Replaces                 |
| :----------------- | :-------------------------------------- | :----------------------- |
| **Auth**           | Netlify Identity                        | Custom OAuth / Manus SDK |
| **Database**       | Neon Postgres, PlanetScale, or Supabase | MySQL via mysql2         |
| **File Storage**   | Netlify Blobs                           | AWS S3                   |
| **Serverless**     | Netlify Functions                       | Express server           |
| **Forms**          | Netlify Forms (if needed)               | Custom form handling     |
| **Scheduled Jobs** | Netlify Scheduled Functions             | External cron / n8n      |
| **Analytics**      | Netlify Analytics                       | Custom tracking          |

### 9.3. Security Headers (auto-applied)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 9.4. Caching

- JS/CSS assets: immutable, 1-year cache
- Static files: 1-year cache

---

## 10. Planned Netlify Functions

These functions are documented in `netlify/functions/` but **not yet implemented**:

| Function               | Purpose                                          |
| :--------------------- | :----------------------------------------------- |
| `voice-to-report`      | Whisper transcription + Gemini report generation |
| `estimate-project`     | Real-time cost calculation from project params   |
| `weather-schedule`     | Eugene, OR weather → Gantt chart adjustments     |
| `material-procurement` | Phase tracking, PO drafts, vendor pricing        |
| `lead-score`           | AI lead prioritization by type/budget/location   |

---

## 11. Success Metrics

| Metric                  | Target                                                             |
| :---------------------- | :----------------------------------------------------------------- |
| **Lead Quality**        | 30% increase in high-intent leads via AI Estimator.                |
| **Operational Speed**   | 50% reduction in manual project update communication.              |
| **Client Satisfaction** | 100% portal adoption rate for active projects.                     |
| **Infrastructure Cost** | Maintain serverless "pay-as-you-go" efficiency.                    |
| **Field Efficiency**    | Voice-to-report reduces daily reporting time from 30 min to 5 min. |

---

**End of CLAUDE.md**

# Auth Configuration Updated: 2026-04-02T13:58:32Z
# - VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE set on Netlify
# - VITE_SUPABASE_PUBLISHABLE_KEY set on Netlify
# - Admin user created: erictadlock@precisioncorebuilders.com
# - handle_new_user trigger fixed for proper enum casting
