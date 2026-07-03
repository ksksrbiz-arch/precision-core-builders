# Precision Core Builders: Digital Foreman Platform

A luxury construction management platform designed for Eric Tadlock and Precision Core Builders (CCB #246527). This is a **thinking operational engine** that automates field reporting, procurement, scheduling, and client communication—enabling a small team to operate with the velocity of a ten-person firm.

## Vision

Precision Core Builders is built on the **Cathedral Principle**: sequential, phased construction prioritizing automated infrastructure before scaling traffic. The platform embodies the company's core values—**Trust, Respect, and Diligence**—through transparent operations, real-time client visibility, and elimination of manual data entry.

## Core Features

### 1. AI-Powered Voice-to-Report Field Logging

Eric records voice memos on-site. The system automatically transcribes them free-first with Google Gemini or Groq Whisper (OpenAI Whisper optional/legacy), generates structured daily field reports using Claude/Gemini, and updates the client portal in real-time. No manual data entry required.

### 2. Smart Weather-Responsive Scheduling

The system monitors Eugene, OR weather forecasts and automatically adjusts Gantt charts. When rain is predicted, outdoor tasks (roofing, painting) are deprioritized, and interior tasks (cabinets, flooring) are moved up. Eric receives alerts of all changes.

### 3. Automated Material Procurement

The platform tracks project phases and drafts Purchase Orders automatically. AI-driven price monitoring flags budget impacts and suggests alternative vendors. Integration with n8n enables automated vendor outreach and delivery coordination.

### 4. High-End Client "Concierge" Portal

Clients experience a luxury portal featuring live site-cam access, a digital finish selection manager with real-time budget impact display, a transparent "Core Values" ledger of all decisions, and milestone-based automated billing.

### 5. Interactive AI Project Estimator

A sophisticated tool that provides real-time, high-level cost ranges based on project parameters (square footage, materials, complexity). It educates clients upfront on the "Precision Core" approach to budgeting.

### 6. Sub-Contractor Orchestration

Automated scheduling, site access codes, and safety briefings are sent to sub-contractors via SMS/Email through n8n workflows. No manual coordination required.

### 7. Owner "Command Center" Dashboard

Eric's operational hub features AI lead prioritization, resource orchestration, profitability tracking (estimated vs. actual costs), and LLM-powered search ("What was the total spend on the Spyglass project?").

### 8. Secure Authentication & Role-Based Access

Supabase Auth handles login/logout. Eric is `admin`; clients are `user`. Row-Level Security ensures data isolation.

### 9. Project Portfolio Showcase

Interactive 360-degree walkthroughs and high-fidelity before/after sliders showcase completed work. Designed to impress potential clients and demonstrate craftsmanship.

### 10. Blueprint.am Integration _(feature-flagged — `VITE_FEATURE_BLUEPRINT=true`)_

Connect Blueprint.am accounts for both Eric and clients. Attach plans and designs to PCB projects; control which artifacts are visible in the client portal. Supports deep-link, per-user API key, and OAuth flows — all with tokens encrypted at rest (AES-256-GCM). See [`docs/integrations/blueprint.md`](docs/integrations/blueprint.md) for setup instructions.

## Design System: "Quiet Luxury"

The visual language is **"Warm Modern"**—minimalist, high-contrast, utilizing natural textures (wood, stone, steel) in the UI. This aesthetic reflects Eric's 20+ years of craftsmanship.

- **Color Palette:** Warm beige backgrounds (#F5F1ED), warm steel accents (#8B7355), stone gray (#A9A9A9).
- **Typography:** Playfair Display for headings (editorial, luxury), Inter for body (clean, modern).
- **Micro-Interactions:** Smooth 300ms transitions, subtle scale on hover, animated gradient loading states.
- **Imagery:** Cinematic full-bleed video backgrounds, high-fidelity project photography, before/after sliders.

## Tech Stack

| Layer            | Technology                                         | Purpose                                                           |
| :--------------- | :------------------------------------------------- | :---------------------------------------------------------------- |
| **Frontend**     | React 19 / Vite 7 / Tailwind CSS 4 / Framer Motion | High-performance UI with tactile animations and PWA support.      |
| **Routing**      | Wouter 3                                           | Lightweight client-side router.                                   |
| **State/API**    | tRPC 11 + React Query 5                            | End-to-end type-safe API with server-state caching.               |
| **Backend**      | Netlify Functions (serverless)                     | Stateless compute — AI, voice, weather, OAuth callbacks, proxies. |
| **Database**     | Supabase (PostgreSQL)                              | Real-time subscriptions, Row-Level Security, Auth.                |
| **AI/LLM**       | Anthropic Claude / Google Gemini                   | Field report generation, lead scoring, cost estimation, chat.     |
| **Voice**        | Gemini / Groq Whisper (free); OpenAI Whisper (legacy) | Voice-to-text for field memos (free-tier first).              |
| **Automation**   | n8n                                                | Orchestration of leads, notifications, sub-contractor comms.      |
| **Deployment**   | GitHub → Netlify                                   | CI/CD with automatic builds and edge deployment.                  |
| **Storage**      | Supabase Storage                                   | Images, videos, documents, site-cam feeds.                        |
| **Package Mgr**  | pnpm 10.4.1                                        | Fast, strict, workspace-ready.                                    |
| **Integrations** | Blueprint.am _(feature-flagged)_                   | Plan/design attachment; see `docs/integrations/blueprint.md`.     |

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm 10+
- Supabase account (for database and auth)
- Netlify account (for deployment)
- GitHub account (for version control)

### Installation

```bash
# Clone the repository
git clone https://github.com/ksksrbiz-arch/precision-core-builders.git
cd precision-core-builders

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials, API keys, etc.

# Run database migrations (requires DATABASE_URL in .env.local)
pnpm db:push

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
precision-core-builders/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── pages/             # Page components (admin/, portal/, public)
│   │   ├── components/        # Reusable UI (ui/, layout/, DashboardLayout, etc.)
│   │   ├── _core/hooks/       # Core hooks (useAuth, useMutationWithToast)
│   │   ├── lib/               # Utilities (trpc.ts, utils.ts)
│   │   ├── hooks/             # Feature hooks
│   │   └── index.css          # Design system (colors, typography, animations)
│   └── public/                # Static assets (favicon, manifest, icons)
├── server/                    # Backend (tRPC routers)
│   ├── routers/               # Feature routers (projects, fieldReports, blueprint, …)
│   ├── routers.ts             # Root appRouter definition
│   ├── db.ts                  # Supabase admin client + query helpers
│   └── _core/                 # Framework internals (trpc, context, env, crypto, audit)
├── netlify/
│   └── functions/             # Serverless functions (ai-chat, voice-to-report, blueprint-proxy, …)
├── drizzle/                   # Database schema & migration files
├── shared/                    # Shared types and error classes
├── docs/integrations/         # Third-party integration guides
├── CLAUDE.md                  # Agent priming & implementation guardrails
├── README.md                  # This file
└── package.json
```

## Development Workflow

### 1. Common commands

```bash
pnpm dev              # Start dev server with HMR
pnpm build            # Production build
pnpm check            # TypeScript type check (0 errors required)
pnpm lint             # Type check + Prettier format check
pnpm format           # Auto-format with Prettier
pnpm test             # Run Vitest test suite
pnpm db:push          # Generate + apply Drizzle migration
pnpm db:studio        # Open Drizzle Studio (visual DB browser)
```

### 2. Database Changes

Update the schema in `drizzle/schema.ts`, then:

```bash
pnpm db:push   # generate SQL migration and apply to Supabase
```

### 3. Backend Procedures

Add or extend tRPC routers in `server/routers/`. Use `adminProcedure` for Eric-only logic, `protectedProcedure` for any authenticated user, and `publicProcedure` for unauthenticated access. Register new routers in `server/routers.ts`.

### 4. Netlify Functions

Add new functions under `netlify/functions/`. Each function exports a `handler`. Use the shared utilities in `netlify/functions/_utils/` for auth guarding, CORS, and rate limiting.

### 5. Testing

Write Vitest tests in `server/**/*.test.ts` or `netlify/functions/__tests__/`. Run with `pnpm test`.

### 6. Deployment

Push to GitHub. Netlify automatically builds and deploys on every commit to `main`.

## Key Files

| File                                            | Purpose                                                         |
| :---------------------------------------------- | :-------------------------------------------------------------- |
| `CLAUDE.md`                                     | Agent priming, architecture, implementation guardrails.         |
| `drizzle/schema.ts`                             | All database tables and TypeScript types.                       |
| `server/routers.ts`                             | Root tRPC router — assembles all feature routers.               |
| `server/routers/blueprintRouter.ts`             | Blueprint.am integration (status, OAuth, API key, artifacts).   |
| `server/_core/crypto.ts`                        | AES-256-GCM token encryption + HMAC OAuth state signing.        |
| `netlify/functions/blueprint-oauth-callback.ts` | Blueprint OAuth redirect handler (code exchange).               |
| `netlify/functions/blueprint-proxy.ts`          | Authenticated proxy to Blueprint API (tokens stay server-side). |
| `netlify/functions/_utils/`                     | Shared utilities: auth guard, CORS, rate limiter.               |
| `client/src/index.css`                          | Design system: colors, typography, animations.                  |
| `client/src/pages/admin/CommandCenter.tsx`      | Eric's admin dashboard.                                         |
| `client/src/pages/admin/BlueprintTools.tsx`     | Blueprint.am admin connection + artifact management.            |
| `client/src/pages/portal/PortalDashboard.tsx`   | Client project view.                                            |
| `client/src/pages/portal/PortalBlueprint.tsx`   | Blueprint.am client portal (onboarding + shared plans).         |
| `docs/integrations/blueprint.md`                | Blueprint setup guide, env vars, troubleshooting.               |

## Environment Variables

Required environment variables — set via **Netlify dashboard** (production) or `.env.local` (local dev). See `.env.example` for the full annotated list.

```
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # server-side only
VITE_SUPABASE_URL=https://...          # client-side (anon only)
VITE_SUPABASE_ANON_KEY=eyJ...

# AI / LLM (at least one required)
ANTHROPIC_API_KEY=sk-ant-...           # Claude (preferred)
GOOGLE_AI_API_KEY=AIza...             # Gemini (free fallback)
GROQ_API_KEY=gsk_...                   # Free Whisper transcription (https://console.groq.com/keys)
# OPENAI_API_KEY=sk-...                # Optional/legacy Whisper — free-tier (Gemini/Groq) preferred

# Weather (optional — Open-Meteo used automatically if omitted)
OPENWEATHERMAP_API_KEY=...

# Automation
N8N_WEBHOOK_URL=https://...
N8N_API_KEY=...

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Blueprint.am integration (optional — enable with VITE_FEATURE_BLUEPRINT=true)
VITE_FEATURE_BLUEPRINT=false
BLUEPRINT_ENCRYPTION_KEY=<64 hex chars>   # 32-byte AES-256-GCM key
BLUEPRINT_CLIENT_ID=                      # OAuth (when available)
BLUEPRINT_CLIENT_SECRET=
BLUEPRINT_BASE_URL=https://blueprint.am
BLUEPRINT_API_BASE_URL=https://api.blueprint.am
```

## Security & Compliance

- **Data Privacy:** All data encrypted at rest and in transit. Supabase Row-Level Security ensures clients see only their projects.
- **Token Storage:** Blueprint OAuth tokens and API keys encrypted with AES-256-GCM before being written to the database — plaintext never touches the database.
- **Audit Trails:** Comprehensive logging of all financial, contractual, and cross-service interactions via the immutable "Core Values" ledger.
- **CCB Compliance:** Transparent documentation of all project decisions and costs, supporting Oregon CCB #246527 compliance.
- **Rate Limiting:** All Netlify Functions are rate-limited per IP; the Blueprint proxy additionally enforces a strict API path allowlist.

## Success Metrics

| Metric                  | Target                                                             |
| :---------------------- | :----------------------------------------------------------------- |
| **Lead Quality**        | 30% increase in high-intent leads via AI Estimator.                |
| **Operational Speed**   | 50% reduction in manual project update communication.              |
| **Client Satisfaction** | 100% portal adoption rate for active projects.                     |
| **Field Efficiency**    | Voice-to-report reduces daily reporting time from 30 min to 5 min. |

## Contributing

This is a private project for Precision Core Builders. For questions or feature requests, contact Eric Tadlock directly.

## License

MIT License. See LICENSE file for details.

---

**Built with ❤️ for Eric Tadlock and Precision Core Builders**
