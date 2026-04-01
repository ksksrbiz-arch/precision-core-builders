# CLAUDE.md: Precision Core Builders "Digital Foreman" Platform
## Agent Priming & Implementation Guardrails

This document primes the Claude agent with the architectural vision, technical constraints, and implementation strategy for the Precision Core Builders platform. It ensures deterministic, high-velocity development aligned with the "Cathedral Principle."

---

## 1. Project Vision & Core Mandate

**Precision Core Builders** is a luxury construction management platform for Eric Tadlock (CCB #246527) that transforms how small-to-mid construction firms operate. The platform is not a static website; it is a **thinking operational engine** that automates field reporting, procurement, scheduling, and client communication.

**Core Values Embedded in Code:**
- **Trust:** Transparent, immutable ledgers of all project decisions and costs.
- **Respect:** Clients see real-time progress; Eric controls operations with precision.
- **Diligence:** Automated workflows eliminate manual data entry and human error.

---

## 2. Design System: "Quiet Luxury"

The visual language is **"Warm Modern"**—minimalist, high-contrast, utilizing natural textures (wood, stone, steel) in the UI. This aesthetic reflects Eric's 20+ years of craftsmanship.

### 2.1. Color Palette (CSS Variables in `client/src/index.css`)
- **Primary (Warm Beige):** `#F5F1ED` (background), `#2D2D2D` (text)
- **Accent (Warm Steel):** `#8B7355` (wood/bronze tones)
- **Secondary (Stone Gray):** `#A9A9A9` (subtle accents)
- **Success (Earthy Green):** `#6B8E23` (project milestones)
- **Warning (Warm Amber):** `#D4A574` (alerts, budget impacts)

### 2.2. Typography
- **Headings:** `font-family: 'Playfair Display', serif;` (luxury, editorial)
- **Body:** `font-family: 'Inter', sans-serif;` (clean, modern)
- **Monospace:** `font-family: 'Courier Prime', monospace;` (data, ledgers)

### 2.3. Micro-Interactions
- Smooth transitions (300ms easing) on all interactive elements.
- Hover states: subtle scale (1.02x) and shadow elevation.
- Loading states: animated gradient pulse (not spinners).
- Tactile feedback: button press animations using Framer Motion.

### 2.4. Imagery & Video
- Full-bleed cinematic video backgrounds on landing and key pages.
- High-fidelity project photography with subtle vignettes.
- Before/After sliders with smooth transitions.
- 360-degree project walkthroughs (if feasible via Three.js or similar).

---

## 3. Technical Architecture

### 3.1. Stack
| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19 / Vite / Tailwind CSS 4 / Framer Motion | High-performance, SEO-optimized, tactile animations. |
| **Backend API** | Node.js / Express.js / tRPC | Serverless-ready, type-safe end-to-end. |
| **Database** | Supabase (PostgreSQL) | Real-time subscriptions, Row-Level Security, Auth. |
| **Authentication** | Supabase Auth (OAuth + Email) | Role-based access (admin/user), secure session management. |
| **AI/LLM** | Gemini-2.5-Flash (via Netlify Functions) | Field report generation, lead scoring, cost estimation. |
| **Voice Transcription** | Whisper API (via Netlify Functions) | Voice-to-text for field memos. |
| **Automation** | n8n (self-hosted or cloud) | Orchestration of leads, notifications, sub-contractor comms. |
| **Deployment** | GitHub → Netlify | CI/CD with automatic builds and edge deployment. |
| **Storage** | Supabase Storage / Netlify Blob | Images, videos, documents, site-cam feeds. |

### 3.2. Netlify Functions (Serverless Backend)
All backend logic runs as Netlify Functions, replacing traditional Express.js server. Key functions:

- **`/api/voice-to-report`:** Accepts audio file, transcribes with Whisper, generates field report with Gemini.
- **`/api/estimate-project`:** Calculates real-time cost ranges based on project parameters.
- **`/api/weather-schedule`:** Fetches Eugene, OR weather, adjusts Gantt chart priorities.
- **`/api/material-procurement`:** Monitors project phases, drafts POs, checks vendor pricing.
- **`/api/lead-score`:** AI-prioritizes incoming leads by project type, budget, location.

### 3.3. Database Schema (Supabase PostgreSQL)
Core tables:

- **`users`:** Admin (Eric) and client accounts with role-based access.
- **`projects`:** Project metadata, budget, timeline, status.
- **`clients`:** Client contact info, project history, preferences.
- **`field_reports`:** Voice memos, transcriptions, auto-generated summaries.
- **`materials`:** Inventory, vendors, pricing, procurement status.
- **`schedule_items`:** Gantt chart tasks, dependencies, weather-adjusted priorities.
- **`estimates`:** Saved project estimates with cost breakdowns.
- **`ledger_entries`:** Immutable log of all decisions, approvals, cost changes.
- **`portfolio_projects`:** Completed projects with media, before/after, testimonials.

---

## 4. Implementation Strategy: Phase-by-Phase

### Phase 1: Foundation (Design System + Auth)
1. Set up Tailwind CSS 4 with custom color palette and typography.
2. Implement Supabase Auth with role-based access (admin/user).
3. Create DashboardLayout for Eric's Command Center.
4. Build landing page with "Quiet Luxury" aesthetic.

### Phase 2: Core Operations (Field Reporting + Scheduling)
1. Implement voice-to-report system (Whisper + Gemini).
2. Build Gantt chart component with weather-responsive logic.
3. Create field report UI for Eric to review and publish.
4. Integrate real-time updates to client portal.

### Phase 3: Client Experience (Portal + Estimator)
1. Build client portal with live project timeline.
2. Create digital finish selection manager with budget impact display.
3. Implement AI Project Estimator with real-time cost calculations.
4. Add "Core Values" ledger for transparent decision tracking.

### Phase 4: Automation (Procurement + Sub-Contractors)
1. Build material procurement system with vendor integration.
2. Implement n8n workflows for sub-contractor scheduling and comms.
3. Create automated billing and milestone-based invoicing.
4. Add SMS/Email notification system.

### Phase 5: Analytics & Portfolio (Command Center + Showcase)
1. Build owner Command Center dashboard with AI lead prioritization.
2. Implement profitability tracking (estimated vs. actual costs).
3. Create project portfolio showcase with 360 walkthroughs.
4. Add LLM-powered search for operational queries.

---

## 5. Critical Implementation Rules

### 5.1. Voice-to-Report Workflow
```
Eric records voice memo on mobile → 
Whisper transcribes → 
Gemini generates structured report → 
Auto-updates client portal + creates ledger entry → 
Flags material shortages to n8n for procurement
```

### 5.2. Weather-Responsive Scheduling
- Fetch Eugene, OR weather daily via OpenWeatherMap API.
- If rain > 60% probability in next 24h: deprioritize outdoor tasks (roofing, painting).
- Automatically shift interior tasks (cabinets, flooring) up in Gantt chart.
- Notify Eric of changes via Command Center dashboard.

### 5.3. Material Procurement
- Track project phases and auto-generate PO drafts.
- Monitor vendor pricing via API integrations (e.g., Home Depot, Lowe's APIs if available).
- Flag budget impacts to Eric with alternative vendor suggestions.
- Integrate with n8n for automated vendor outreach.

### 5.4. Client Portal Real-Time Updates
- Use Supabase Realtime subscriptions for live project timeline.
- Every field report, milestone completion, or cost change updates the client view instantly.
- Clients can approve change orders and make finish selections in real-time.

### 5.5. Authentication & Security
- Supabase Auth handles login/logout and session management.
- Eric is `role = 'admin'`; clients are `role = 'user'`.
- Row-Level Security (RLS) ensures clients see only their projects.
- All financial data encrypted at rest and in transit.

---

## 6. File Structure & Guardrails

```
precision-core-builders/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx (Landing with "Quiet Luxury" aesthetic)
│   │   │   ├── CommandCenter.tsx (Eric's admin dashboard)
│   │   │   ├── ClientPortal.tsx (Client project view)
│   │   │   ├── FieldReporting.tsx (Voice-to-report UI)
│   │   │   ├── Estimator.tsx (AI Project Estimator)
│   │   │   ├── Portfolio.tsx (Project showcase)
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── GanttChart.tsx (Weather-responsive scheduling)
│   │   │   ├── FinishSelector.tsx (Digital showroom)
│   │   │   ├── CoreValuesLedger.tsx (Transparent log)
│   │   │   ├── SiteCamViewer.tsx (Live camera feed)
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── trpc.ts (tRPC client)
│   │   │   ├── supabase.ts (Supabase client)
│   │   │   └── ...
│   │   └── index.css (Design system: colors, typography, animations)
│   └── public/
│       ├── favicon.ico
│       └── robots.txt
├── server/
│   ├── routers.ts (tRPC procedures for all features)
│   ├── db.ts (Database query helpers)
│   ├── functions/
│   │   ├── voice-to-report.ts (Whisper + Gemini)
│   │   ├── estimate-project.ts (Cost calculations)
│   │   ├── weather-schedule.ts (Weather API integration)
│   │   ├── material-procurement.ts (Vendor management)
│   │   └── lead-score.ts (AI prioritization)
│   └── ...
├── drizzle/
│   └── schema.ts (Database schema)
├── CLAUDE.md (This file)
├── README.md (Project overview)
└── package.json
```

### 6.1. Do NOT:
- Store images/videos in `client/public/` or `client/src/assets/`.
- Hardcode API keys or secrets in code.
- Use external map libraries; use the built-in Map component.
- Create new REST endpoints; use tRPC procedures.
- Manually manipulate cookies; use Supabase Auth.

### 6.2. DO:
- Upload assets via `manus-upload-file --webdev` and use returned CDN URLs.
- Store all secrets in environment variables via `webdev_request_secrets`.
- Use Supabase Realtime for live updates.
- Leverage Netlify Functions for serverless logic.
- Write Vitest tests for all critical procedures.

---

## 7. Success Metrics

| Metric | Target |
| :--- | :--- |
| **Lead Quality** | 30% increase in high-intent leads via AI Estimator. |
| **Operational Speed** | 50% reduction in manual project update communication. |
| **Client Satisfaction** | 100% portal adoption rate for active projects. |
| **Infrastructure Cost** | Maintain serverless "pay-as-you-go" efficiency. |
| **Field Efficiency** | Voice-to-report reduces daily reporting time from 30 min to 5 min. |

---

## 8. Agent Execution Guidelines

1. **Deterministic Development:** Follow the phase-by-phase roadmap. Each phase builds on the previous one.
2. **Type Safety:** Leverage tRPC's end-to-end type safety. All procedures must have clear input/output types.
3. **Testing:** Write Vitest tests for all critical procedures (voice transcription, cost calculations, scheduling logic).
4. **Documentation:** Inline code comments for complex logic (AI prompts, scheduling algorithms, security rules).
5. **Performance:** Optimize for edge deployment. Use Netlify Functions for compute-heavy tasks (AI, transcription).
6. **Security:** Never expose API keys. Always validate inputs. Use Supabase RLS for data access control.

---

**End of CLAUDE.md**
