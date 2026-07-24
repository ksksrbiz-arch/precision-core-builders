# Precision Core Builders: Development TODO

**Last Updated:** July 23, 2026
**Overall Progress:** ~70% complete (Foundation ✅ | Operations ~60% | Portal/Features ~40% | Estimator UI, Lead Scoring, Stripe billing, Purchase Orders, Full-Text Search, Blueprint ✅ shipped)
**Next Milestone:** Finish Phase 2 real-time rollout to remaining pages (Gantt drag-and-drop ✅ shipped)

---

## 🤖 AUTONOMOUS AGENT QUEUE (dispatch-ready)

**How to work this queue (for the Cline agent):** Take ONE item at a time, top-down. Create branch `bot/BOT-<n>-<short-slug>` from `main`, implement following existing codebase patterns, verify with `pnpm check` and `pnpm test` (both must pass: 0 TypeScript errors, no new `any` types), commit with conventional messages (`feat:`, `fix:`, `test:`), open a PR to `main` titled `BOT-<n>: <title>`, and check the box below inside that PR. If an item requires credentials or external services (n8n, Stripe live keys, vendor APIs, Netlify, Blueprint OAuth), STOP and report instead of stubbing secrets. Mobile-first, match the "Quiet Luxury" design system, keep WCAG AA.

### [BOT-1] Realtime reconnection logic (finishes CRITICAL-2)

- **File:** `client/src/hooks/useRealtimeTable.ts`
- [ ] Handle `CHANNEL_ERROR`, `TIMED_OUT`, and `CLOSED` channel statuses: resubscribe with exponential backoff (1s → 2s → 4s, cap 30s, add jitter); reset backoff on successful `SUBSCRIBED`
- [ ] Clean up pending reconnect timers in the effect cleanup alongside `removeChannel`
- [ ] Surface reconnecting state via the existing `isLive` return (false while reconnecting)
- **Acceptance:** `pnpm check` + `pnpm test` pass; add a Vitest unit test for the backoff schedule (mock the supabase channel)

### [BOT-2] Gantt task edit modal (finishes CRITICAL-1)

- **Files:** `client/src/components/GanttChart.tsx` (+ new task edit dialog, wire into `client/src/pages/admin/ScheduleView.tsx`)
- [ ] Clicking a task bar opens a modal (use the existing `ui/dialog` component) showing title, status, dates, assignee, notes
- [ ] Edits call `schedule.update` with the same optimistic-update pattern already used for drag-and-drop
- [ ] `readOnly` mode opens a view-only dialog with no save action
- **Acceptance:** `pnpm check` + `pnpm test` pass; dialog is keyboard-navigable and mobile-friendly

### [BOT-3] ScheduleView weather widget + rain alert banner (PHASE2-3 partial)

- **Files:** `client/src/pages/admin/ScheduleView.tsx` (+ existing weather router — Open-Meteo is the no-key default per README)
- [ ] 7-day forecast widget for Eugene, OR (lat 44.0521, lon -123.0867): day, condition icon, hi/lo, precipitation %
- [ ] Alert banner when precipitation probability ≥ 50% on any day that has weather-sensitive tasks scheduled
- [ ] Loading + error states; degrade gracefully when the weather API is unreachable
- **Acceptance:** `pnpm check` + `pnpm test` pass; no new env vars required

### [BOT-4] ScheduleView: add-task form + task detail panel (PHASE2-3 partial)

- **Files:** `client/src/pages/admin/ScheduleView.tsx`, schedule tRPC router
- [ ] "Add task" form (title, dates, status, weather-sensitive toggle, assignee) calling `schedule.create`
- [ ] Task detail view on task select (complements BOT-2; if both exist keep ONE interaction model — prefer the modal)
- [ ] New tasks appear in the Gantt without manual refresh (invalidate the `schedule.list` query)
- **Acceptance:** `pnpm check` + `pnpm test` pass

### [BOT-5] Estimator: share-via-email + print-friendly (finishes CRITICAL-3)

- **File:** `client/src/pages/Estimator.tsx`
- [ ] "Share via email" button on the estimate result (`mailto:` with subject + plain-text summary of the 3 tiers and cost breakdown)
- [ ] Print-friendly result layout (`@media print` rules: hide nav/buttons, clean single-column breakdown)
- **Acceptance:** `pnpm check` + `pnpm test` pass; verify with browser print preview

### [BOT-6] Test coverage push: shared libs + hooks (moves SUCCESS METRICS coverage off ~10%)

- **Files:** new `*.test.ts(x)` beside `client/src/hooks/`, `client/src/lib/`, `shared/`, `server/_core/` utilities
- [ ] Follow the existing Vitest + Testing Library pattern (see the 16 Blueprint tests)
- [ ] Prioritize pure functions: Gantt date math, estimator pricing/aggregation, crypto round-trip edge cases, form validators
- [ ] Report before/after coverage % in the PR description
- **Acceptance:** `pnpm test` green; no snapshot-only tests

### [BOT-7] SEO + social meta (POLISH-2 subset)

- **Files:** `client/index.html` and/or the app's head/SEO component
- [ ] Unique `<title>` + meta description per public page (home, estimator, portfolio)
- [ ] Open Graph + Twitter card tags (site name, image from `/public`)
- [ ] JSON-LD `GeneralContractor`/`LocalBusiness` schema (Precision Core Builders, Eugene OR, CCB #246527)
- **Acceptance:** `pnpm check` + `pnpm build` pass; tags verifiable in built page source

### [BOT-8] Bundle diet: lazy-load Mermaid + KaTeX (POLISH-1 subset)

- [ ] Convert Mermaid and KaTeX imports to dynamic `import()` with a lazy fallback wherever they are used
- [ ] Run `pnpm build`; report before/after bundle size in the PR (TODO notes estimate ~500KB + ~76KB savings)
- **Acceptance:** `pnpm check` + `pnpm build` pass; no regression on pages rendering diagrams/math

### [BOT-9] CI: GitHub Actions for check + tests (INFRA-3 subset)

- **File:** new `.github/workflows/ci.yml`
- [ ] On push/PR to `main`: setup Node LTS + pnpm, `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`
- [ ] Cache the pnpm store
- **Acceptance:** workflow runs green (or PR documents any pre-existing failures)

### [BOT-10] Materials: vendor multi-select + bulk import from estimate (PHASE4-2 partial)

- **Files:** `client/src/pages/admin/MaterialsView.tsx`, materials router
- [ ] Vendor multi-select on the material form (check the drizzle schema for a vendor field/table first; if a migration is needed, add it via drizzle-kit and include the generated SQL in the PR)
- [ ] "Import from estimate" button that bulk-adds materials from a saved estimate's line items
- **Acceptance:** `pnpm check` + `pnpm test` pass

> **Explicitly OUT OF SCOPE for the agent (human/credential-gated):** n8n workflow creation, Stripe live-mode testing, Home Depot/Lowe's vendor keys, Netlify env/DNS setup, Blueprint OAuth credentials, site-cam/hardware. If a queue item is blocked by one of these, stop and report — do not fake it.

---

## CRITICAL PATH: Next 48 Hours

### [CRITICAL-1] Complete Gantt Chart Component ✅ _Shipped_

Drag-and-drop Gantt is live in `client/src/components/GanttChart.tsx`, wired
into `ScheduleView.tsx` via `schedule.update` with optimistic updates.

- **Why Critical:** Unlocks schedule management, weather integration, field reporting workflow
- **Files:**
  - [x] Create `client/src/components/GanttChart.tsx` (Recharts-based)
  - [x] Implement task bar rendering with date ranges
  - [x] Add drag-and-drop rescheduling (custom mousedown/mousemove drag-to-reschedule)
  - [x] Highlight weather-dependent tasks
  - [ ] Show dependencies as connecting lines
  - [ ] Add task edit modal on click
- **Integration:**
  - [x] Wire up to the schedule router (`schedule.list` / `schedule.update`)
  - [x] Implement optimistic updates on drag-end
  - [x] Call `schedule.update` on drop
  - [x] Show loading state during update
- **Testing:**
  - [x] Manual test: drag task, verify Supabase update
  - [x] Manual test: weather-dependent highlighting
  - [x] Verify date range calculations
- **Acceptance Criteria:**
  - Gantt renders tasks with correct dates ✅
  - Drag-and-drop rescheduling works smoothly ✅
  - Weather-dependent tasks visually distinct ✅
  - Real-time updates reflected in UI ✅

### [CRITICAL-2] Implement Real-Time Updates via Supabase Realtime — _Live, rollout in progress_

Realtime is live via `client/src/hooks/useRealtimeTable.ts` across all portal
pages and several admin pages; rollout to the remaining pages continues.

- **Why Critical:** Portal and admin pages need live data; clients see progress in real-time
- **Pages to Update:**
  - [x] `PortalDashboard.tsx` — Real-time project timeline
  - [x] `ProjectDetail.tsx` — Real-time budget/milestone updates
  - [x] `FieldReportsList.tsx` — New reports appear instantly
  - [x] `CommandCenter.tsx` — Dashboard metrics update live
  - [x] `ScheduleView.tsx` — Gantt updates propagate to all viewers
- **Implementation:**
  - [x] Create the realtime subscription hook (`client/src/hooks/useRealtimeTable.ts`)
  - [x] Subscribe to `projects` table changes in ProjectDetail
  - [x] Subscribe to `field_reports` table for new reports
  - [x] Subscribe to `schedule_items` for Gantt updates
  - [x] Unsubscribe on component unmount (cleanup)
  - [ ] Handle reconnection logic
- **Testing:**
  - [ ] Open same project in 2 browser windows
  - [ ] Update schedule in one; verify real-time change in other
  - [ ] Publish field report; verify instant appearance on portal
  - [ ] Verify no infinite loops or excessive subscriptions
- **Acceptance Criteria:**
  - Changes to project data visible in <1s across all connected clients
  - No console errors on subscription
  - Graceful handling of disconnections

### [CRITICAL-3] Complete Project Estimator UI Form ✅ _Shipped_

Public estimator form plus admin estimate authoring/edit UI are live.

- **Why Critical:** Public-facing lead generation tool; drives client acquisition
- **File:** `client/src/pages/Estimator.tsx`
- **Form Fields:**
  - [x] Project Type dropdown (New Home, Remodel, Addition, Repair, Custom)
  - [x] Square Footage input (optional, for sizing)
  - [x] Complexity selector (Basic, Standard, High-End)
  - [x] Material Preferences multi-select (budget-friendly, mid-range, premium)
  - [x] Location input (default: Eugene, OR)
  - [x] Additional Notes textarea
  - [x] Submit button
- **Integration:**
  - [x] Call `estimator.generate` mutation on submit
  - [x] Show loading state during calculation
  - [x] Display results with cost breakdown
  - [x] Add "Request Detailed Quote" CTA → stores lead + opens contact modal with reference
  - [x] Admin authoring: `EstimateEditor.tsx` + `estimate.saveDraft` / `estimate.send`
- **Testing:**
  - [x] Test all project types generate estimates
  - [x] Test edge cases (0 sq ft, 10000+ sq ft)
  - [x] Verify cost calculations are reasonable
- **Acceptance Criteria:**
  - Form submits successfully ✅
  - Estimate displays in <5 seconds ✅
  - Results are itemized and professional ✅
  - Mobile responsive ✅

### [CRITICAL-4] Add Lead Scoring to Estimate Submissions ✅ _Shipped_

AI lead scoring is live in the Command Center Leads tab.

- **Why Critical:** Prioritizes high-value leads automatically
- **File:** `client/src/pages/admin/LeadsView.tsx` (in Command Center)
- **Implementation:**
  - [x] Fetch all estimates from `estimates` table
  - [x] Score each estimate (budget range, timeline, project type)
  - [x] Display score as badge (Hot 🔥, Warm ⚡, Cold ❄️)
  - [x] Sort by score (highest first)
  - [x] Add filter by score
- **Scoring Logic (already in `server/routers/estimator.ts`):**
  - Budget >$500K: +30 points
  - Timeline <3 months: +20 points
  - New Home construction: +25 points
  - High-end materials: +15 points
  - Decision-maker contact: +10 points
- **Acceptance Criteria:**
  - All estimates appear in leads view ✅
  - Scores calculated correctly ✅
  - Hot leads sorted to top ✅

---

## PHASE 2: Core Operations (Week 2-3)

### [PHASE2-1] Enhance Field Report Workflow

- **Current:** Voice memo → transcription → structured report
- **Enhancements:**
  - [ ] Add photo upload to field reports (before/after shots)
  - [ ] Auto-tag photos with project/date via AI vision
  - [ ] Add "Client Visible" toggle per report (default: true)
  - [ ] Email notification to client when new report published
  - [ ] PDF export of daily report
- **Files:**
  - `client/src/pages/admin/FieldReports.tsx`
  - `client/src/pages/portal/FieldReportsList.tsx`
  - `server/routers/fieldReports.ts`

### [PHASE2-2] Weather Integration & Smart Scheduling

- **Current:** Placeholder for weather API
- **Implementation:**
  - [ ] Integrate OpenWeatherMap API (free tier: 1000 calls/day)
  - [ ] Add weather forecast widget to `ScheduleView.tsx`
  - [ ] Create `weather.getForecast` endpoint
  - [ ] Add "Weather Alert" banner when rain predicted
  - [ ] Auto-suggest task rescheduling based on forecast
- **Logic:**
  - If precipitation >50% on outdoor task date, highlight in red
  - Suggest moving to next clear day
  - Update Gantt automatically (with Eric's approval)
- **Files:**
  - `server/routers/weather.ts`
  - `client/src/components/WeatherWidget.tsx`

### [PHASE2-3] Schedule Management

- [ ] Add new task form in `ScheduleView.tsx`
- [ ] Edit task details (title, dates, status, dependencies)
- [ ] Delete task with confirmation
- [ ] Add task dependencies (e.g., "Foundation" must complete before "Framing")
- [ ] Visualize dependencies in Gantt (connecting lines)
- [ ] Weather forecast widget showing 7-day forecast for Eugene, OR
- [ ] Weather alert banner when precipitation >50% and outdoor tasks scheduled
- [ ] Add weather-sensitive task flag to task creation/edit form

### [PHASE2-4] Weather Dashboard Integration ✅ _Core logic shipped_

Implemented in `client/src/components/WeatherImpactDashboard.tsx`:

- [x] Weather-sensitive task indicators (weather icon on outdoor tasks)
- [x] Weather alert dashboard component
- [x] Integrate OpenWeatherMap API (fetch forecast for next 7 days)
- [x] Display weather alerts when precipitation >50% probability
- [x] Show suggested schedule adjustments (postpone outdoor tasks to next clear day)
- [x] Create notifications when weather affects multiple tasks
- [ ] Verify end-to-end behavior against live forecast data in production

---

## PHASE 3: Client Portal & Communication (Week 3-4)

### [PHASE3-1] Client Portal Dashboard

- [ ] Project progress bar (% complete based on milestones)
- [ ] Latest field reports (last 3)
- [ ] Upcoming milestones (next 30 days)
- [ ] Budget summary (spent vs. remaining)
- [ ] Photo gallery (latest site photos)
- [ ] Message center (client ↔ Eric communication)

### [PHASE3-2] Client Notifications

- [ ] Email when new field report published
- [ ] Email when milestone completed
- [ ] Email when invoice ready
- [ ] SMS option for urgent updates (via n8n/Twilio)
- [ ] Notification preferences in client settings

### [PHASE3-3] Document Sharing

- [ ] Upload contracts, permits, change orders
- [ ] Client can view/download (PDF viewer)
- [ ] E-signature integration (DocuSign or HelloSign)
- [ ] Version history for documents

---

## PHASE 4: Financial Management (Week 4-5)

### [PHASE4-1] Invoicing System

- [ ] Create invoice from milestone
- [ ] Line items with cost codes
- [ ] Tax calculation (Oregon has no sales tax, but track for subs)
- [ ] PDF generation
- [ ] Email to client
- [ ] Track payment status (sent, viewed, paid, overdue)
- [ ] Stripe payment link integration

### [PHASE4-2] Expense Tracking

- [ ] Receipt photo upload
- [ ] OCR to extract vendor, amount, date
- [ ] Categorize by cost code (labor, materials, permits, subs)
- [ ] Link to project
- [ ] Monthly expense report

### [PHASE4-3] Profitability Dashboard

- [ ] Estimated vs. actual costs per project
- [ ] Profit margin by project type
- [ ] Labor hours tracking (crew check-in/out)
- [ ] Subcontractor cost tracking
- [ ] Cash flow projection

---

## PHASE 5: AI & Automation (Week 5-6)

### [PHASE5-1] LLM-Powered Search

- [ ] Natural language query: "What was the total spend on Spyglass?"
- [ ] Search across projects, expenses, field reports
- [ ] Generate summary reports on demand
- [ ] "Ask the Foreman" chatbot in Command Center

### [PHASE5-2] Automated Purchase Orders

- [ ] Generate PO when materials low (based on schedule)
- [ ] Draft email to vendor with PO attached
- [ ] Track PO status (drafted, sent, confirmed, delivered)
- [ ] Integration with supplier APIs (Home Depot, Lowe's)

### [PHASE5-3] Sub-Contractor Orchestration

- [ ] Sub-contractor database (contact, trade, insurance, rates)
- [ ] Automated scheduling emails/SMS
- [ ] Site access codes (generate unique codes per sub)
- [ ] Safety briefing PDF auto-sent before first day
- [ ] Track sub performance (on-time %, quality rating)

---

## TECHNICAL DEBT & INFRASTRUCTURE

### [INFRA-1] Testing

- [ ] Unit tests for `estimator.ts` calculations
- [ ] Integration tests for tRPC routers
- [ ] E2E tests for critical flows (submit estimate, create field report, update schedule)
- [ ] Test coverage target: >80%

### [INFRA-2] Performance

- [ ] Image optimization (lazy loading, WebP format)
- [ ] Code splitting for admin routes
- [ ] Database query optimization (N+1 queries)
- [ ] Add Redis cache for weather API responses

### [INFRA-3] Security

- [ ] Rate limiting on public endpoints
- [ ] CORS configuration review
- [ ] Environment variable audit
- [ ] Supabase RLS policy testing

### [INFRA-4] Deployment

- [ ] Set up staging environment on Netlify
- [ ] Configure custom domain (precisioncorebuilders.com)
- [ ] SSL certificate
- [ ] Database backups (daily)

---

## NICE-TO-HAVE FEATURES (Low Priority)

### [NICE-1] Advanced Features

- [ ] Live site-cam integration (security camera feed)
- [ ] 360-degree project walkthroughs (Three.js)
- [ ] AI-powered change order management
- [ ] Automated warranty tracking
- [ ] Punch list / defect tracking
- [ ] Client satisfaction survey workflow
- [ ] Automated review request emails (Google, Yelp)

### [NICE-2] Mobile App (Future Phase)

- [ ] React Native version for iOS/Android
- [ ] Offline-first field reporting
- [ ] Push notifications
- [ ] Native camera integration

### [NICE-3] Marketing Automations

- [ ] Google Ads integration
- [ ] Lead magnet (free estimate PDF)
- [ ] Email nurture sequences
- [ ] SMS marketing opt-in
- [ ] Referral program tracking

---

## KNOWN BLOCKERS & DEPENDENCIES

| Blocker                              | Impact               | Owner       | Status                                                                       |
| ------------------------------------ | -------------------- | ----------- | ---------------------------------------------------------------------------- |
| Supabase Realtime setup              | Real-time features   | Claude      | ✅ Live (all portal + several admin); rollout to remaining pages in progress |
| n8n workflow creation                | Automation           | Eric/Claude | ⏳ Pending                                                                   |
| Stripe API integration               | Billing              | Claude      | ✅ Shipped (invoicing + webhook)                                             |
| Vendor API keys (Home Depot, Lowe's) | Material procurement | Eric        | ⏳ Pending                                                                   |
| Supabase Auth setup                  | Authentication       | Claude      | ✅ Shipped (single JWT verifier)                                             |
| Project photography                  | Portfolio            | Eric        | ⏳ Waiting for completed projects                                            |
| Blueprint.am API credentials         | Blueprint OAuth      | Eric        | ⏳ Contact Blueprint for partner access                                      |

---

## SUCCESS METRICS

| Metric                   | Target          | Current     | Owner  |
| ------------------------ | --------------- | ----------- | ------ |
| Build time               | <15s            | 10.82s ✅   | Claude |
| Bundle size (gzip)       | <1.2MB          | 744KB ✅    | Claude |
| TypeScript errors        | 0               | 0 ✅        | Claude |
| Test coverage            | >80%            | ~10%        | Claude |
| Lighthouse (Performance) | >85             | ~85 (est.)  | Claude |
| Lighthouse (SEO)         | >80             | ~75 (est.)  | Claude |
| Field report publishing  | <30s end-to-end | Pending     | Claude |
| Estimate generation      | <5s             | ~3s ✅      | Claude |
| Client portal load       | <2s             | Pending     | Claude |
| WCAG AA compliance       | 100%            | ~90% (est.) | Claude |

---

## NOTES & REMINDERS

- **Branch Strategy:** All work via `main` branch with Git commits after each feature
- **Type Safety:** Maintain 100% TypeScript coverage; no `any` types
- **Testing:** Write tests before features (TDD where possible)
- **Naming:** Use camelCase for variables/functions, PascalCase for components/types
- **Commits:** Descriptive messages (e.g., `feat: add gantt chart with drag-and-drop`)
- **Documentation:** Update CLAUDE.md as architecture evolves
- **Security:** Never hardcode secrets; use Netlify env vars only
- **Mobile First:** All new features must work on mobile

---

**Last Reviewed:** July 23, 2026
**Next Review:** July 30, 2026 (weekly sync)
**Estimated Completion:** August 2026