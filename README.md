# Precision Core Builders: Digital Foreman Platform

A luxury construction management platform designed for Eric Tadlock and Precision Core Builders (CCB #246527). This is a **thinking operational engine** that automates field reporting, procurement, scheduling, and client communication—enabling a small team to operate with the velocity of a ten-person firm.

## Vision

Precision Core Builders is built on the **Cathedral Principle**: sequential, phased construction prioritizing automated infrastructure before scaling traffic. The platform embodies the company's core values—**Trust, Respect, and Diligence**—through transparent operations, real-time client visibility, and elimination of manual data entry.

## Core Features

### 1. AI-Powered Voice-to-Report Field Logging
Eric records voice memos on-site. The system automatically transcribes them with Whisper, generates structured daily field reports using Gemini, and updates the client portal in real-time. No manual data entry required.

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

## Design System: "Quiet Luxury"

The visual language is **"Warm Modern"**—minimalist, high-contrast, utilizing natural textures (wood, stone, steel) in the UI. This aesthetic reflects Eric's 20+ years of craftsmanship.

- **Color Palette:** Warm beige backgrounds (#F5F1ED), warm steel accents (#8B7355), stone gray (#A9A9A9).
- **Typography:** Playfair Display for headings (editorial, luxury), Inter for body (clean, modern).
- **Micro-Interactions:** Smooth 300ms transitions, subtle scale on hover, animated gradient loading states.
- **Imagery:** Cinematic full-bleed video backgrounds, high-fidelity project photography, before/after sliders.

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 / Vite / Tailwind CSS 4 / Framer Motion | High-performance, SEO-optimized UI with tactile animations. |
| **Backend** | Node.js / Express.js / tRPC | Type-safe API layer, serverless-ready. |
| **Database** | Supabase (PostgreSQL) | Real-time subscriptions, Row-Level Security, Auth. |
| **AI/LLM** | Gemini-2.5-Flash | Field report generation, lead scoring, cost estimation. |
| **Voice** | Whisper API | Voice-to-text for field memos. |
| **Automation** | n8n | Orchestration of leads, notifications, sub-contractor comms. |
| **Deployment** | GitHub → Netlify | CI/CD with automatic builds and edge deployment. |
| **Storage** | Supabase Storage | Images, videos, documents, site-cam feeds. |

## Quick Start

### Prerequisites
- Node.js 20+ and pnpm
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

# Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
precision-core-builders/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/        # Reusable UI components
│   │   ├── lib/              # Utilities (tRPC, Supabase client)
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   └── index.css         # Design system (colors, typography)
│   └── public/               # Static assets (favicon, robots.txt only)
├── server/                   # Backend
│   ├── routers.ts           # tRPC procedures
│   ├── db.ts                # Database query helpers
│   ├── functions/           # Netlify Functions (serverless)
│   └── _core/               # Framework internals
├── drizzle/                 # Database schema & migrations
├── CLAUDE.md                # Agent priming & implementation guardrails
├── README.md                # This file
└── package.json
```

## Development Workflow

### 1. Database Changes
Update the schema in `drizzle/schema.ts`, generate migrations, and apply them:

```bash
pnpm drizzle-kit generate
# Review the generated SQL, then apply via Supabase dashboard or CLI
```

### 2. Backend Procedures
Add or extend tRPC procedures in `server/routers.ts`. Use `protectedProcedure` for admin-only logic, `publicProcedure` for client-facing endpoints.

### 3. Frontend Components
Create components in `client/src/components/` and pages in `client/src/pages/`. Use shadcn/ui components for consistency. Call backend procedures via `trpc.*.useQuery()` or `trpc.*.useMutation()`.

### 4. Testing
Write Vitest tests for critical procedures in `server/*.test.ts`. Run tests with `pnpm test`.

### 5. Deployment
Push to GitHub. Netlify automatically builds and deploys on every commit to `main`.

## Key Files

| File | Purpose |
| :--- | :--- |
| `CLAUDE.md` | Agent priming, architecture, implementation guardrails. |
| `drizzle/schema.ts` | Database tables and types. |
| `server/routers.ts` | tRPC procedures (all backend logic). |
| `server/functions/` | Netlify Functions for serverless compute (AI, voice, etc.). |
| `client/src/index.css` | Design system: colors, typography, animations. |
| `client/src/pages/Home.tsx` | Landing page with "Quiet Luxury" aesthetic. |
| `client/src/pages/CommandCenter.tsx` | Eric's admin dashboard. |
| `client/src/pages/ClientPortal.tsx` | Client project view. |

## Environment Variables

Required environment variables (set via Netlify dashboard or `.env.local`):

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI/LLM
GEMINI_API_KEY=your-gemini-api-key
OPENWEATHERMAP_API_KEY=your-weather-api-key

# n8n (for automation workflows)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/...

# Netlify Functions
NETLIFY_AUTH_TOKEN=your-netlify-token
```

## Security & Compliance

- **Data Privacy:** All data encrypted at rest and in transit. Supabase Row-Level Security ensures clients see only their projects.
- **Federal Scrutiny:** Architecture designed with OMB M-25-21/22 principles (security-by-design).
- **Audit Trails:** Comprehensive logging of all financial and contractual interactions via the "Core Values" ledger.
- **CCB Compliance:** Transparent documentation of all project decisions and costs, supporting Oregon CCB #246527 compliance.

## Success Metrics

| Metric | Target |
| :--- | :--- |
| **Lead Quality** | 30% increase in high-intent leads via AI Estimator. |
| **Operational Speed** | 50% reduction in manual project update communication. |
| **Client Satisfaction** | 100% portal adoption rate for active projects. |
| **Field Efficiency** | Voice-to-report reduces daily reporting time from 30 min to 5 min. |

## Contributing

This is a private project for Precision Core Builders. For questions or feature requests, contact Eric Tadlock directly.

## License

MIT License. See LICENSE file for details.

---

**Built with ❤️ for Eric Tadlock and Precision Core Builders**
