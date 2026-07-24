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
  - [x] Call `/api/estimate-project` function on submit
  - [x] Display loading spinner while processing
  - [x] Show 3-tier results (Low/Mid/High)
  - [x] Render cost breakdown by category (Labor, Materials, Permits, Contingency)
  - [x] Show Claude's reasoning
  - [x] "Save Estimate" button (for authenticated users)
- **UI/UX:**
  - [x] Responsive design (mobile-first)
  - [x] Error messages for validation
  - [x] Success message after estimate
  - [ ] Share estimate via email (optional)
  - [ ] Print-friendly format
- **Testing:**
  - [x] Submit estimator form; verify API call succeeds
  - [x] Verify 3-tier pricing displays correctly
  - [x] Test with missing fields (should validate)
  - [x] Save estimate; verify stored in database
- **Acceptance Criteria:**
  - Form submits and returns estimate within 5 seconds
  - Cost breakdown totals match overall estimate
  - Form is mobile-friendly and accessible

---

## PHASE 2: Core Operations (Priority 1 — Week 1)

### [PHASE2-1] Implement Field Report Publishing Workflow

- **File:** `client/src/pages/admin/FieldReportNew.tsx`
- **UI Flow:**
  - [ ] Show VoiceRecorder component
  - [ ] Display transcription after recording
  - [ ] Auto-generate report via Claude
  - [ ] Show report preview (tasks, materials, issues)
  - [ ] Allow manual edits to report
  - [ ] "Publish to Client Portal" button
  - [ ] Confirmation dialog
- **Backend:**
  - [ ] Call `/api/voice-to-report` on audio upload
  - [ ] Get report from database
  - [ ] Allow edits via `fieldReportsRouter.update()`
  - [ ] Publish via `fieldReportsRouter.publish()`
- **Testing:**
  - [ ] Record audio → transcription appears
  - [ ] Report generates from transcription
  - [ ] Edit report → save changes
  - [ ] Publish → appears on client portal instantly
- **Acceptance Criteria:**
  - End-to-end voice→transcription→report→publish works
  - Report edits are saved correctly
  - Client portal updates in real-time

### [PHASE2-2] Build Client Portal Dashboard

- **File:** `client/src/pages/portal/PortalDashboard.tsx`
- **Components:**
  - [ ] Project timeline (vertical or horizontal)
  - [ ] Current milestone status
  - [ ] Budget tracker with % complete
  - [ ] Next 3 upcoming tasks
  - [ ] Latest field reports (3 most recent)
  - [ ] Document section (contracts, permits, inspections)
  - [ ] Quick contact button to Eric
- **Integration:**
  - [ ] Fetch project via `projectsRouter.get()`
  - [ ] Fetch latest field reports via `fieldReportsRouter.list()`
  - [ ] Fetch schedule via `scheduleRouter.list()`
  - [ ] Real-time updates (Supabase Realtime)
- **Testing:**
  - [ ] Verify correct project data displays
  - [ ] Real-time updates when Eric publishes report
  - [ ] Budget calculations accurate
  - [ ] Mobile responsive
- **Acceptance Criteria:**
  - Dashboard loads in <2 seconds
  - All data is real-time synchronized
  - Mobile and desktop layouts work

### [PHASE2-3] Complete Schedule View Admin Page

- **File:** `client/src/pages/admin/ScheduleView.tsx`
- **Components:**
  - [ ] GanttChart component (from CRITICAL-1)
  - [ ] Weather forecast widget (showing 7-day forecast for Eugene, OR)
  - [ ] Task detail panel (on task click)
  - [ ] Add new task form
  - [ ] Task dependency editor
  - [ ] Weather alert banner (if rain predicted)
- **Features:**
  - [ ] Drag tasks to reschedule
  - [ ] Auto-reschedule indoor tasks if rain predicted
  - [ ] Show crew availability (if tracking)
  - [ ] Show material availability
- **Testing:**
  - [ ] Add new task; verify in Gantt
  - [ ] Drag task; verify date update
  - [ ] Check weather alerts trigger
  - [ ] Verify dependencies display correctly
- **Acceptance Criteria:**
  - Gantt displays all project tasks
  - Weather-responsive rescheduling works
  - Crew/material constraints respected

### [PHASE2-4] Implement Material Shortage Alerts

- **File:** Extend `netlify/functions/voice-to-report.ts`
- **Logic:**
  - [ ] After report generation, check `materialsUsed` array
  - [ ] Query `materials` table for current stock
  - [ ] Flag shortages (stock < usage)
  - [ ] Insert notification via `notificationsRouter.send()`
  - [ ] Send SMS/email via n8n webhook
- **Testing:**
  - [ ] Record field report mentioning "10 bags of concrete"
  - [ ] If stock < 10, verify shortage alert created
  - [ ] Verify notification sent to Eric
- **Acceptance Criteria:**
  - Shortages detected automatically
  - Notifications sent within 1 minute
  - Alert includes quantity gap

### [PHASE2-5] Build Sub-Contractor Notification Workflow

- **File:** New utility `server/_core/notifications.ts`
- **Integration:**
  - [ ] When task assigned to sub-contractor, trigger n8n webhook
  - [ ] n8n sends SMS with task details + site access code
  - [ ] n8n sends site plan (PDF or image)
  - [ ] n8n sends safety briefing (link or document)
- **Testing:**
  - [ ] Assign task to sub-contractor
  - [ ] Verify SMS sent (via n8n logs)
  - [ ] Verify correct task details in message
  - [ ] Verify sub-contractor can access site plan
- **Acceptance Criteria:**
  - Notifications sent automatically
  - All required info included in message
  - No duplicates or missed notifications

---

## PHASE 3: Client Experience (Priority 2 — Week 1-2)

### [PHASE3-1] Build Digital Finish Showroom

- **File:** `client/src/pages/portal/PortalFinishes.tsx`
- **Components:**
  - [ ] Product catalog (kitchen, bathroom, flooring, paint, fixtures)
  - [ ] Image gallery for each product
  - [ ] Cost for each option
  - [ ] Budget impact calculator (shows delta from baseline)
  - [ ] Selection workflow (add to cart, confirm)
  - [ ] Saved selections list
- **Database:**
  - [ ] Populate `finish_selections` table with sample products
  - [ ] Link to project budget
- **Integration:**
  - [ ] Fetch available finishes via `finishSelectionsRouter.list()`
  - [ ] Calculate budget impact via `finishSelectionsRouter.calcBudgetImpact()`
  - [ ] Save selection via `finishSelectionsRouter.create()`
  - [ ] Notify Eric of selection via n8n
- **Testing:**
  - [ ] Select finish; verify budget delta calculation
  - [ ] Confirm selection; verify saved to database
  - [ ] Verify Eric receives notification
- **Acceptance Criteria:**
  - Selections update project budget in real-time
  - Budget impact shown before confirmation
  - Selections visible to Eric immediately

### [PHASE3-2] Implement Core Values Ledger

- **File:** `client/src/pages/portal/PortalLedger.tsx` & admin version
- **Components:**
  - [ ] Timeline of all decisions (chronological)
  - [ ] Decision type badges (Change Order, Approval, Deviation, etc.)
  - [ ] Cost impact display
  - [ ] Stakeholder info (who approved, when)
  - [ ] Notes/comments from Eric
- **Database:**
  - [ ] Fetch ledger entries via `ledgerRouter.list()`
- **Integration:**
  - [ ] Auto-create ledger entry for every significant action
    - [ ] Finish selection
    - [ ] Change order approval
    - [ ] Milestone completion
    - [ ] Budget adjustment
- **Testing:**
  - [ ] Select finish → verify ledger entry created
  - [ ] Approve change order → verify entry logged
  - [ ] Ledger visible to client
- **Acceptance Criteria:**
  - All project decisions tracked immutably
  - Client sees transparent decision history
  - Entries cannot be modified or deleted

### [PHASE3-3] Build Stripe Billing Integration

- **File:** `netlify/functions/stripe-billing.ts` + `BillingView.tsx`
- **Features:**
  - [ ] Milestone-based invoice generation
  - [ ] Invoice PDF download
  - [ ] Payment form (Stripe Elements)
  - [ ] Recurring payment setup (if retainer)
  - [ ] Payment status tracking
  - [ ] Automatic receipt email
- **Database:**
  - [ ] Store invoices in new `invoices` table (project_id, amount, status, paid_at)
- **Integration:**
  - [ ] Call Stripe API to create payment intent
  - [ ] On successful payment, mark invoice as paid
  - [ ] Create ledger entry for payment
- **Testing:**
  - [ ] Create invoice for completed milestone
  - [ ] Client submits payment via Stripe
  - [ ] Payment processed; invoice marked paid
  - [ ] Receipt emailed to client
- **Acceptance Criteria:**
  - Invoices generated and sent to clients
  - Payments processed securely via Stripe
  - No manual invoice entry required

---

## PHASE 3.5: Blueprint.am Integration ✅ _Shipped — gated by `VITE_FEATURE_BLUEPRINT=true`_

See [`docs/integrations/blueprint.md`](docs/integrations/blueprint.md) for full setup and troubleshooting.

### [BLUEPRINT-1] Connection management — ✅ Done

- [x] `blueprint_connections` table in `drizzle/schema.ts` (tokens AES-256-GCM encrypted at rest)
- [x] `blueprint_artifacts` table for project-scoped Blueprint resource references
- [x] `server/_core/crypto.ts` — AES-256-GCM encrypt/decrypt + HMAC OAuth `state` signing
- [x] `blueprintRouter` — `getConnectionStatus`, `startOAuth`, `completeOAuth`, `saveApiKey`, `disconnect`
- [x] `BLUEPRINT_ENCRYPTION_KEY` env var in `server/_core/env.ts` and `.env.example`
- [x] Admin page `/admin/blueprint` (OAuth + API-key connect, status indicator, disconnect)
- [x] Client portal page `/portal/blueprint` (onboarding guard + read-only artifact list)
- [x] Nav entry in `DashboardLayout` + portal nav link in `PortalLayout` (both flag-gated)

### [BLUEPRINT-2] Netlify Functions — ✅ Done

- [x] `blueprint-oauth-callback` — verifies signed state, exchanges code, persists encrypted tokens
- [x] `blueprint-proxy` — PCB-JWT auth, strict path allowlist, per-IP rate limit, tokens stay server-side

### [BLUEPRINT-3] Artifact sharing — ✅ Done

- [x] `attachArtifact` / `removeArtifact` admin procedures (ledger-logged)
- [x] `listArtifacts` — admins see all; clients see only `visible_to_client = true` rows
- [x] 16 Vitest tests covering auth, crypto round-trip, state tamper/expiry, input validation

### [BLUEPRINT-4] Pending / Future

- [ ] Activate OAuth button once Blueprint publishes `BLUEPRINT_CLIENT_ID` / `_SECRET`
- [ ] Token-refresh flow in `blueprint-proxy` (exchange refresh token when access token expires)
- [ ] Expand `ALLOWED_PATH_PATTERNS` in `blueprint-proxy.ts` as API surface is documented
- [ ] Write-back / sync actions (import Blueprint plans as PCB schedule items) — read path must be stable first
- [ ] Client portal E2E test: connect → view artifact → disconnect → verify cleanup

---

## PHASE 4: Automation & Procurement (Priority 2 — Week 2)

### [PHASE4-1] Implement AI Lead Scoring ✅ _Shipped_

AI lead scoring + capture is live; scored leads persist in the `leads` table.

- **File:** `netlify/functions/lead-score.ts`
- **Algorithm:**
  - [x] Score based on project type (residential > commercial)
  - [x] Score based on budget (higher budget = higher priority)
  - [x] Score based on timeline (urgent = higher priority)
  - [x] Score based on complexity (high-end = higher priority)
  - [ ] Score based on Eric's past success with similar projects
- **Integration:**
  - [x] Call `lead-score` function when lead intake form submitted
  - [x] Store score in database (`leads` table)
  - [x] Sort leads by score in Command Center
- **Testing:**
  - [x] Submit lead → verify score calculated
  - [x] Scores sort correctly (high to low)
  - [x] Score reasonably reflects lead quality
- **Acceptance Criteria:**
  - Leads automatically prioritized by score
  - Scoring algorithm transparent (show reasoning)
  - High-value leads highlighted for Eric

### [PHASE4-2] Build Material Procurement UI — _PO generation shipped_

Shortage detection and persisted, vendor-bucketed purchase orders are live
(`purchase_orders` / `purchase_order_items` tables). Live vendor-pricing API
integration and delivery tracking remain pending.

- **File:** `client/src/pages/admin/MaterialsView.tsx`
- **Components:**
  - [x] Inventory table (item, quantity, unit cost, vendor, status)
  - [x] Add new material form
  - [ ] Vendor multi-select
  - [ ] Bulk import from project estimate
  - [x] Generate Purchase Order (persisted, vendor-bucketed)
  - [ ] Delivery tracking (expected vs actual)
- **Integration:**
  - [x] Fetch materials via `materialsRouter.list()`
  - [x] Create new material via `materialsRouter.create()`
  - [x] Call `/api/material-procurement` to generate PO
  - [ ] Track delivery status in database
- **Testing:**
  - [ ] Add material → saves to database
  - [ ] Generate PO → creates PDF or email
  - [ ] Verify PO includes quantity, cost, vendor
- **Acceptance Criteria:**
  - Materials tracked from purchase to delivery
  - Vendors contacted automatically
  - POs generated without manual data entry

### [PHASE4-3] Create n8n Workflows

- **Workflows to Build:**
  - [ ] **Lead Intake:** Contact form → lead score → email to Eric
  - [ ] **Project Milestone:** Milestone reached → invoice generated → email sent
  - [ ] **Sub-Contractor Assignment:** Task assigned → SMS with details
  - [ ] **Material Shortage:** Shortage detected → vendor contact → PO generation
  - [ ] **Client Approval Request:** Change order → email to client → approval → ledger entry
  - [ ] **Weekly Summary:** Friday summary email → all projects status
- **Testing:**
  - [ ] Trigger each workflow; verify execution
  - [ ] Verify correct recipients receive notifications
  - [ ] Verify data accuracy in outgoing messages
- **Acceptance Criteria:**
  - All core workflows automated
  - No manual email/SMS required
  - Workflows handle errors gracefully

### [PHASE4-4] Implement Vendor Pricing API Integration

- **File:** Extend `netlify/functions/material-procurement.ts`
- **Integrations:**
  - [ ] Home Depot API (inventory + pricing)
  - [ ] Lowe's API (inventory + pricing)
  - [ ] Supplier APIs (if applicable)
- **Features:**
  - [ ] Auto-fetch current prices
  - [ ] Alert if prices spike >10%
  - [ ] Suggest alternative vendors if price drops
  - [ ] Track price history for cost tracking
- **Testing:**
  - [ ] Query material pricing → returns current rates
  - [ ] Verify price alerts trigger
  - [ ] Verify alternative vendors suggested
- **Acceptance Criteria:**
  - Material pricing always current
  - Cost estimates accurate within 5%
  - Vendor suggestions data-driven

---

## PHASE 5: Analytics & Portfolio (Priority 3 — Week 2-3)

### [PHASE5-1] Complete Command Center Dashboard

- **File:** `client/src/pages/admin/CommandCenter.tsx`
- **Widgets:**
  - [ ] Active projects count + revenue
  - [ ] YTD revenue + margin %
  - [ ] Average project duration
  - [ ] Client satisfaction score (if tracking reviews)
  - [ ] Lead pipeline (by stage)
  - [ ] Team utilization (crew availability)
  - [ ] Material costs vs budget
  - [ ] Upcoming milestones (next 30 days)
- **Charts (Recharts):**
  - [ ] Revenue trend (monthly)
  - [ ] Project status pie chart
  - [ ] Lead conversion funnel
  - [ ] Crew utilization heatmap
- **Integration:**
  - [ ] Fetch data via multiple tRPC procedures
  - [ ] Real-time updates (Supabase Realtime)
  - [ ] Drill-down to detailed views
- **Testing:**
  - [ ] Verify all widgets populate correctly
  - [ ] Charts render without errors
  - [ ] Real-time updates work
- **Acceptance Criteria:**
  - Dashboard loads in <2 seconds
  - All metrics accurate
  - Mobile responsive

### [PHASE5-2] Build Profitability Tracking Dashboard

- **File:** New page `client/src/pages/admin/ProfitabilityView.tsx`
- **Metrics:**
  - [ ] Estimated vs Actual cost comparison
  - [ ] Project margin % (by project)
  - [ ] Labor productivity (hours vs cost)
  - [ ] Material waste tracking
  - [ ] Crew efficiency (cost per task)
  - [ ] Profitability trend (monthly)
- **Integration:**
  - [ ] Calculate estimated costs from estimates table
  - [ ] Calculate actual costs from ledger entries
  - [ ] Track labor hours from schedule items
- **Testing:**
  - [ ] Verify margin calculations accurate
  - [ ] Trend shows realistic data
  - [ ] Drill-down to project level
- **Acceptance Criteria:**
  - Profitability transparent at all levels
  - Variance analysis highlights problem areas
  - Actionable insights for pricing adjustments

### [PHASE5-3] Build Portfolio Showcase

- **File:** `client/src/pages/Portfolio.tsx` + `PortfolioAdmin.tsx`
- **Features:**
  - [ ] Project gallery (grid layout)
  - [ ] Filter by project type
  - [ ] Sort by date, rating, cost
  - [ ] Detailed project page with:
    - [ ] Before/after image slider
    - [ ] Project details (duration, budget, scope)
    - [ ] Client testimonial (if available)
    - [ ] Material list
    - [ ] Timeline of work phases
  - [ ] Admin: upload images, write description, publish
- **Database:**
  - [ ] Populate `portfolio_projects` with completed projects
  - [ ] Link to original project for cost/timeline data
- **Integration:**
  - [ ] Fetch portfolio via `portfolioRouter.list()`
  - [ ] Get project details via `projectsRouter.get()`
- **Testing:**
  - [ ] Portfolio loads all projects
  - [ ] Filters work correctly
  - [ ] Project detail page displays all info
  - [ ] Before/after sliders work smoothly
- **Acceptance Criteria:**
  - Portfolio showcases Eric's best work
  - Loads quickly with images optimized
  - Generates high-quality leads

### [PHASE5-4] Implement Client Testimonials

- **File:** New component `client/src/components/TestimonialSlider.tsx`
- **Features:**
  - [ ] Testimonial form for clients (post-project)
  - [ ] Rating system (1-5 stars)
  - [ ] Photo upload (optional)
  - [ ] Approval workflow (Eric approves before publishing)
  - [ ] Display on portfolio + home page
- **Database:**
  - [ ] New `testimonials` table (client_id, project_id, rating, text, photo_url, approved_at)
- **Integration:**
  - [ ] Show testimonial form in portal post-completion
  - [ ] Send approval request to Eric via n8n
  - [ ] Display approved testimonials on public site
- **Testing:**
  - [ ] Client submits testimonial → saved to database
  - [ ] Unapproved testimonials not visible publicly
  - [ ] Approved testimonials display on portfolio
- **Acceptance Criteria:**
  - Testimonials automatically collected
  - Social proof visible to potential clients
  - Improves conversion rate

---

## POLISH & OPTIMIZATION (Priority 3 — Week 3)

### [POLISH-1] Performance Optimization

- [ ] Dynamic import for Mermaid diagram library (500KB reduction)
- [ ] Dynamic import for KaTeX math library (76KB reduction)
- [ ] Image lazy loading for portfolio
- [ ] Code splitting for admin routes
- [ ] Service worker caching strategy (stale-while-revalidate)
- [ ] Bundle analysis and optimization
- **Target:** Lighthouse 85+ across all metrics

### [POLISH-2] Accessibility & SEO Audit

- [ ] WCAG 2.1 AA audit using axe DevTools
- [ ] Fix any accessibility issues
- [ ] Add meta tags (title, description) to all pages
- [ ] Add structured data (JSON-LD) for projects
- [ ] Add Open Graph tags for social sharing
- [ ] Verify mobile responsiveness on actual devices
- [ ] Test keyboard navigation on all forms
- [ ] **Target:** 100% WCAG AA compliance

### [POLISH-3] Error Tracking & Monitoring

- [ ] Set up Sentry for error tracking
- [ ] Add Sentry to Netlify environment
- [ ] Log all Netlify Function errors
- [ ] Set up alerts for critical errors
- [ ] Create runbook for common errors

### [POLISH-4] Testing & Documentation

- [ ] Write E2E tests for:
  - [ ] Voice recording → field report → publish
  - [ ] Estimator form → quote → save
  - [ ] Field report publication → client portal real-time update
  - [ ] Finish selection → budget impact → ledger entry
- [ ] Write API documentation (tRPC procedures)
- [ ] Create user guides:
  - [ ] Eric (admin) guide
  - [ ] Client portal guide
  - [ ] Estimator guide
- [ ] Create deployment runbook

### [POLISH-5] Cross-Browser & Mobile Testing

- [ ] Test on Chrome, Safari, Firefox, Edge
- [ ] Test on iOS (iPhone 12+, iPhone SE)
- [ ] Test on Android (Pixel 6+, Samsung S21+)
- [ ] Fix any layout/functionality issues
- [ ] Verify PWA installation on mobile
- [ ] Test offline functionality

---

## INFRASTRUCTURE & DEVOPS

### [INFRA-1] Database Maintenance

- [ ] Review RLS policies for security
- [ ] Add indexes to frequently queried columns
- [ ] Set up automated backups
- [ ] Test data restore procedures
- [ ] Document schema and migration process

### [INFRA-2] Environment Variables

- [ ] Verify all required env vars in Netlify dashboard:
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] ANTHROPIC_API_KEY
  - [ ] OPENAI_API_KEY
  - [ ] OPENWEATHERMAP_API_KEY
  - [ ] STRIPE_SECRET_KEY
  - [ ] N8N_WEBHOOK_URL
  - [ ] BLUEPRINT*ENCRYPTION_KEY *(required to enable Blueprint integration)\_
  - [ ] BLUEPRINT*CLIENT_ID / BLUEPRINT_CLIENT_SECRET *(optional — enables OAuth button)\_
- [ ] Rotate secrets quarterly
- [ ] Document env var purpose and retrieval

### [INFRA-3] CI/CD Pipeline Enhancement

- [ ] Add pre-commit hooks (prettier, eslint)
- [ ] Add automated unit test execution in GitHub Actions
- [ ] Add E2E tests to CI/CD (Playwright or Cypress)
- [ ] Add security scanning (Snyk, OWASP)
- [ ] Add lighthouse performance check
- [ ] Add staging environment deployment

### [INFRA-4] Domain & SSL Setup

- [ ] Verify domain points to Netlify
- [ ] SSL certificate auto-generated by Netlify
- [ ] Set up www redirect (www.precisioncorebuilders.com → precisioncorebuilders.com)
- [ ] Configure DNS records if needed

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
