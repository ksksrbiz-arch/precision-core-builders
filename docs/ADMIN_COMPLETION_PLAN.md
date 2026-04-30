# Admin Completion Plan

_Last updated: 2026-04-30. Supersedes the Phase-2/3/4 status claims in `CLAUDE.md` §2 and `TODO.md`._

## Bottom line

The admin side is **substantially more complete than the project docs claim.** A line-by-line audit of the 26 admin pages (~17.5K LOC), 14 tRPC routers, and 19 Netlify Functions found:

- Every `trpc.*` call from an admin page resolves to a real procedure that persists to Supabase. No 404s, no dead endpoints.
- Every `/api/*` call from an admin page resolves to a deployed Netlify Function.
- The only literal mock outside test files is a `weather-schedule.ts` graceful-degradation fallback when the OpenWeather call fails.
- The "Gantt chart with drag-and-drop" listed in `CLAUDE.md` §2 as a critical blocker is **already implemented** — `client/src/components/GanttChart.tsx` ships drag-to-reschedule wired to `schedule.update`.

**The realistic gap to ship is operational (env vars, n8n workflow authoring, expanding Realtime coverage), not feature build.** A focused 2-3 day push closes it.

---

## State of the admin side

### Fully wired (real tRPC + DB persistence, no mocks)

| Page                                                              | Backend                                                                        | Notes                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `ProjectsList`, `ProjectNew`, `ProjectDetail`                     | `projectsRouter.ts` (9 procs incl. profitability/stats)                        | Real CRUD, ledger, n8n event emit                                            |
| `ClientsList`, `ClientDetail`                                     | `clientsRouter.ts`                                                             | Full CRUD                                                                    |
| `EstimatesList`                                                   | `estimatesRouter.ts`                                                           | list/markSent/markApproved persist                                           |
| `FieldReportsList`, `FieldReportNew`, `FieldReportDetail`         | `fieldReportsRouter.ts` + `voice-to-report.ts`                                 | Whisper → Claude → DB pipeline real; publish/unpublish work; Realtime active |
| `MaterialsView`                                                   | `materialsRouter.ts` + `material-procurement.ts`                               | Real DB; ledger writes; n8n emit                                             |
| `ScheduleView`                                                    | `scheduleRouter.ts` (7 procs) + `weather-schedule.ts` + `GanttChart.tsx`       | Drag-to-reschedule wired                                                     |
| `LedgerView`                                                      | `ledgerRouter.ts`                                                              | Append-only, real inserts                                                    |
| `FinishSelectionsAdmin`                                           | `finishSelectionsRouter.ts`                                                    | calcBudgetImpact, adminApprove                                               |
| `SubContractorsList`                                              | `subContractorsRouter.ts`                                                      | sendBriefing wired                                                           |
| `PortfolioAdmin`                                                  | `portfolioRouter.ts`                                                           | Full CRUD + togglePublished                                                  |
| `SitePlanBuilder` (1131 LOC)                                      | `sitePlansRouter.ts`                                                           | Canvas + saved-plans persistence                                             |
| `BlueprintTools`                                                  | `blueprintRouter.ts` (has tests)                                               | OAuth + API-key paths real                                                   |
| `Analytics`                                                       | Composes `projects.stats/list`, `fieldReports.weeklyStats`, `materials.list`   | All real, no hardcoded values                                                |
| `CommandCenter`                                                   | tRPC stats/list + `lead-score.ts` (real Claude call) + `useRealtimeTable`      | Realtime active                                                              |
| `ActivityLog`                                                     | Direct Supabase channel on `ledger_entries`                                    | Works                                                                        |
| `VisionStudio` (admin)                                            | `vision-studio.ts`                                                             | Real Claude vision calls                                                     |
| `Search`                                                          | `search.ts`                                                                    | Real                                                                         |
| `BillingView`                                                     | `stripe-billing.ts` + `stripe-webhook.ts`                                      | **Code-complete Stripe integration** with graceful no-key fallback           |
| `NotificationsView`                                               | `notificationsRouter.ts`                                                       | adminList/send/markRead all persist                                          |
| `SetupWizard` (1348 LOC)                                          | `platform-health`, `setup-env`, `platform-actions`, `onboarding-{provision,verify}` | All functions exist; `onboarding-verify` has 400+ LOC of tests           |

### Partial — config or polish, not feature build

- **n8n integration is wired but dormant.** All five emit sites (`ProjectDetail:1006`, `ScheduleView:221,446`, `MaterialsView:139`, `FieldReportNew:324`, `BillingView:143`) call `/api/n8n-webhook`. The function (`n8n-webhook.ts`) is real but **no-ops when `N8N_WEBHOOK_URL` is unset** (L72-86). The actual n8n workflows live outside this repo.
- **Realtime coverage is partial.** Wired on `CommandCenter`, `FieldReportsList`, `ActivityLog`. Missing on `ProjectDetail`, `ScheduleView`, `LedgerView`, `MaterialsView`, `NotificationsView` — schedule/budget changes won't push live to other open tabs.
- **`weather-schedule.ts:123`** uses a static fallback when the OpenWeather call fails. Degrades cleanly; not a blocker.
- **`onboarding-provision.ts:20`** has a `// TODO: wire in` for KV-backed rate limiting. Cosmetic given the token gate.

### Mocked

None of substance. Only the weather-schedule fallback above.

### Broken

None found. Every endpoint reference checks out.

---

## Top 5 highest-impact ship items

Ordered by user-visible impact per hour of work. Effort: S = <½ day, M = 1-2 days, L = 3+ days.

### 1. Wire production secrets in the Netlify dashboard — S

Code is ready; this single config pass unlocks billing, weather, and automation simultaneously. Set in **Site → Environment variables** with the scopes documented in `netlify.toml` L21-31:

- `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- `OPENWEATHERMAP_API_KEY`
- `N8N_WEBHOOK_URL`, `N8N_API_KEY`
- `ANTHROPIC_API_KEY` (or `GOOGLE_AI_API_KEY` for free-tier fallback)

After setting, validate end-to-end: file a test estimate, run a Stripe payment-link flow against test mode, and check `platform-health.ts` reports green for each.

### 2. Author the five n8n workflows — M

Workflow templates the codebase is already emitting events for:

| Event                    | Emit site                  | Workflow purpose                                |
| ------------------------ | -------------------------- | ----------------------------------------------- |
| `project_status_changed` | `projectsRouter.ts:1006`   | Notify owner + client on phase transitions      |
| `schedule_changed`       | `scheduleRouter.ts:221,446`| SMS sub-contractors when their tasks shift      |
| `material_shortage`      | `materialsRouter.ts:139`   | Auto-draft PO + ping Eric for approval          |
| `field_report_published` | `fieldReportsRouter.ts`    | Push to client portal + email if subscribed     |
| `invoice_created`        | `stripe-billing.ts:143`    | Email client with payment link + log to ledger  |

These workflows live in n8n itself, not the repo. Once authored and the URL is set, the existing `n8n-webhook.ts` proxy starts dispatching automatically — no code change.

### 3. Expand `useRealtimeTable` to four more pages — S

The hook works (`client/src/hooks/useRealtimeTable.ts`); it just needs to be called from places where another open tab would benefit:

- `ProjectDetail.tsx` — subscribe to `schedule_items` and `ledger_entries` filtered by `project_id` so the schedule and budget tabs update live.
- `ScheduleView.tsx` — subscribe to `schedule_items` so the Gantt repaints when a task is added or moved by another session.
- `MaterialsView.tsx` — subscribe to `materials` so deliveries Eric marks received from his phone show up on the desktop view.
- `NotificationsView.tsx` — subscribe to `notifications` for inbox-style live drop-ins.

Each is one `useRealtimeTable({ table, onUpdate })` call plus a query invalidation in the callback. ~15 LOC per page.

### 4. Stripe end-to-end smoke test + webhook verification — S

`stripe-billing.ts` and `stripe-webhook.ts` are written but unverified end-to-end. Validate:

1. Create a test customer + payment link from `BillingView`.
2. Pay with a test card (`4242…`).
3. Confirm `stripe-webhook.ts` fires, the ledger entry is appended, and the project's paid-to-date updates.
4. Repeat with a refund and confirm reversal logic.

Bake the test cases into `server/routers/__tests__/billing.test.ts` so regressions are caught.

### 5. Production hardening for onboarding — S

- Wire KV-backed rate limiting in `onboarding-provision.ts:20` (the existing `_utils/rateLimiter.ts` pattern is in-memory; promote to Netlify KV or Upstash for cross-invocation persistence).
- Audit `setup-env.ts` to confirm provisioned secrets aren't logged or echoed back in responses.
- Rotate the `ONBOARDING_TOKEN` after Eric completes setup; the wizard already invalidates `sessionStorage`, but the env var lives forever until manually rotated.

---

## Stretch items (post-launch polish)

These are not on the critical path and shouldn't gate go-live:

- **Gantt enhancements** — dependencies, critical-path highlighting, milestone rollups. Current drag-to-reschedule already covers the daily workflow.
- **Integration tests for routers** — most routers have happy-path coverage via the page-level tests; targeted Vitest coverage for edge cases (concurrent edits, RLS denial paths, tRPC error mapping) would harden Phase-2 features.
- **Bundle size** — the build emits one chunk over 1.8 MB (`chunk-EIO257PC`). Code-splitting Mermaid/diagram plugins out of the public bundle would meaningfully improve LCP for marketing visitors. Not user-visible inside the admin app.
- **`weather-schedule.ts` static fallback removal** — once a paid OpenWeather key is in place, remove the L123 fallback so failures surface clearly instead of silently degrading.

---

## Suggested ordering

A realistic two-day plan:

**Day 1 (config + verification, half-day each):**
- Item 1 — production secrets, validate via `platform-health`.
- Item 4 — Stripe smoke test against live mode.

**Day 2 (code, half-day each):**
- Item 3 — wire Realtime into the four pages.
- Item 5 — onboarding rate limit + secret hygiene.

**Item 2 (n8n workflows)** runs in parallel as an off-repo track once the webhook URL is set on Day 1; it doesn't block code work.

After this, Phases 1-4 are operationally live. Phase 5 (analytics polish, portfolio CMS expansion, 360 walkthroughs) is genuine net-new work and a separate scoping conversation.
