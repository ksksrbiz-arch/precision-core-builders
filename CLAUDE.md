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

- OAuth authentication flow (login, logout, session management via JWT)
- Role-based access control (`admin` / `user`) with tRPC middleware
- `users` table in MySQL via Drizzle ORM
- Basic page routing (Home, 404) with Wouter
- 50+ shadcn/ui components pre-installed and ready to use
- DashboardLayout, ErrorBoundary, AIChatBox, Map components
- Tailwind CSS 4 design system with custom theme
- Netlify deployment configuration with security headers
- One test file (`server/auth.logout.test.ts`)

### What's Stubbed / Not Yet Implemented

- All feature routers (projects, clients, field reports, materials, etc.)
- Database tables beyond `users` (projects, clients, field_reports, etc.)
- Netlify Functions (voice-to-report, estimate-project, weather-schedule, etc.)
- Domain pages (CommandCenter, ClientPortal, FieldReporting, Estimator, Portfolio)
- AI/LLM integrations (Gemini, Whisper)
- n8n automation workflows

---

## 3. Technical Architecture (Actual Stack)

| Layer              | Technology                                                | Notes                                       |
| :----------------- | :-------------------------------------------------------- | :------------------------------------------ |
| **Frontend**       | React 19 / Vite 7 / Tailwind CSS 4 / Framer Motion       | shadcn/ui + Radix primitives for components  |
| **Routing**        | Wouter 3.3                                                | Lightweight client-side router               |
| **State/Data**     | tRPC 11 + React Query 5                                   | End-to-end type-safe API calls               |
| **Backend**        | Node.js / Express 4 / tRPC                                | Single process, serves both API and static   |
| **Database**       | MySQL (via mysql2 + Drizzle ORM)                          | **Not PostgreSQL/Supabase as originally planned** |
| **Authentication** | Manus OAuth + JWT (jose)                                  | Cookie-based sessions (`app_session_id`)     |
| **Forms**          | React Hook Form + Zod 4                                   | Type-safe validation                         |
| **Charts**         | Recharts 2                                                | Data visualization                           |
| **Deployment**     | GitHub → Netlify                                          | CI/CD with edge deployment                   |
| **Storage**        | AWS S3 (via @aws-sdk/client-s3)                           | File storage with presigned URLs             |
| **Package Manager**| pnpm 10.4.1                                               | Strict, fast, workspace-ready                |

### 3.1. Server Architecture

**Entry point:** `server/_core/index.ts`

```
Express app
├── Body parser (50MB limit)
├── OAuth callback: GET /api/oauth/callback
├── tRPC middleware: POST /api/trpc/*
├── Dev: Vite HMR middleware
└── Prod: Static file serving from dist/public
```

**tRPC Router structure** (`server/routers.ts`):

```typescript
appRouter = {
  system: { health, notifyOwner },
  auth: { me, logout },
  // Feature routers go here (not yet implemented)
}
```

**Middleware levels:**
- `publicProcedure` — No auth required
- `protectedProcedure` — Requires authenticated user (throws UNAUTHORIZED)
- `adminProcedure` — Requires `role = 'admin'` (throws FORBIDDEN)

### 3.2. Authentication Flow

1. User clicks login → redirects to OAuth portal (`VITE_OAUTH_PORTAL_URL`)
2. OAuth redirects back to `/api/oauth/callback?code=...&state=...`
3. Backend exchanges code for token, fetches user info
4. Upserts user in DB, creates JWT session token (HS256)
5. Sets `app_session_id` cookie (httpOnly, secure, sameSite=none, 1-year expiry)
6. Redirects to home page

### 3.3. Database Schema (MySQL via Drizzle)

**Currently only one table exists:**

```
users
├── id: int (auto-increment PK)
├── openId: varchar(64) (unique, OAuth identifier)
├── name: text
├── email: varchar(320)
├── loginMethod: varchar(64)
├── role: enum('user', 'admin') default 'user'
├── createdAt: timestamp
├── updatedAt: timestamp (auto-update)
└── lastSignedIn: timestamp
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
│   │   │   ├── ManusDialog.tsx
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
│   │   ├── index.ts             # Express app entry point
│   │   ├── trpc.ts              # Router, publicProcedure, protectedProcedure, adminProcedure
│   │   ├── context.ts           # TrpcContext, createContext
│   │   ├── oauth.ts             # OAuth callback handler
│   │   ├── sdk.ts               # OAuthService, JWT session management
│   │   ├── cookies.ts           # Session cookie options
│   │   ├── env.ts               # Environment variable aggregation
│   │   ├── vite.ts              # Vite dev server setup
│   │   ├── systemRouter.ts      # health, notifyOwner endpoints
│   │   ├── llm.ts               # LLM types (stubbed)
│   │   ├── voiceTranscription.ts # Voice-to-text interface (stubbed)
│   │   ├── imageGeneration.ts   # Image generation (stubbed)
│   │   ├── notification.ts      # Notification delivery (stubbed)
│   │   ├── map.ts               # Map utilities
│   │   └── dataApi.ts           # Data API integration
│   ├── routers.ts               # appRouter definition
│   ├── db.ts                    # Drizzle ORM, user queries
│   ├── storage.ts               # AWS S3 helpers (storagePut, storageGet)
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

- Store images/videos in `client/public/` or `client/src/assets/`
- Hardcode API keys or secrets in code
- Use external map libraries — use the built-in `Map.tsx` component
- Create REST endpoints — use tRPC procedures only
- Manually manipulate cookies — use the auth system in `server/_core/`
- Use PostgreSQL/Supabase syntax — the database is **MySQL**

### 8.2. DO

- Upload assets via `manus-upload-file --webdev` and use returned CDN URLs
- Store all secrets in environment variables (see `.env.example`)
- Use tRPC `protectedProcedure` / `adminProcedure` for access control
- Use shadcn/ui components from `client/src/components/ui/` before building custom ones
- Write Vitest tests for all critical procedures
- Use Zod schemas for input validation on tRPC procedures
- Follow Prettier formatting (80 chars, 2 spaces, trailing commas)
- Use path aliases (`@/*`, `@shared/*`) for imports

### 8.3. Code Style

- **Formatting:** Prettier — 80 char width, 2-space indent, trailing commas, double quotes
- **Types:** Leverage tRPC's end-to-end type safety; all procedures must have clear input/output types
- **Errors:** Use error classes from `shared/_core/errors.ts` (HttpError, BadRequestError, etc.)
- **Constants:** Shared constants go in `shared/const.ts`
- **State management:** React Query (via tRPC) for server state; React context for UI state

### 8.4. Environment Variables

Key variables (see `.env.example` for full list):

```
VITE_APP_ID            # App identifier (VITE_ prefix = exposed to client)
VITE_OAUTH_PORTAL_URL  # OAuth login portal URL
JWT_SECRET             # JWT signing secret (32+ chars)
OWNER_OPEN_ID          # Admin user's OAuth ID
DATABASE_URL           # MySQL connection string
```

Only `VITE_`-prefixed variables are accessible in client code via `import.meta.env`.

---

## 9. Netlify Deployment

### Build Configuration (`netlify.toml`)

- **Build command:** `pnpm install && pnpm build`
- **Publish directory:** `dist/public`
- **Node version:** 20
- **API routing:** `/api/*` → Netlify Functions

### Security Headers (auto-applied)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Caching

- JS/CSS assets: immutable, 1-year cache
- Static files: 1-year cache

---

## 10. Planned Netlify Functions

These functions are documented in `netlify/functions/` but **not yet implemented**:

| Function                 | Purpose                                          |
| :----------------------- | :----------------------------------------------- |
| `voice-to-report`        | Whisper transcription + Gemini report generation |
| `estimate-project`       | Real-time cost calculation from project params   |
| `weather-schedule`       | Eugene, OR weather → Gantt chart adjustments     |
| `material-procurement`   | Phase tracking, PO drafts, vendor pricing        |
| `lead-score`             | AI lead prioritization by type/budget/location   |

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
