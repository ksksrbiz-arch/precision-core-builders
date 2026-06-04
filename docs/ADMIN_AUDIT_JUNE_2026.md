# Admin Tools Audit & Go-Live Checklist — June 2026

**Audience:** Eric Tadlock (owner/operator), platform maintainers
**Goal:** Make every admin tool reliable enough for day-to-day production use.
**Baseline (pre-fix):** `pnpm lint` ✅, `pnpm test` 157/157 ✅, `pnpm build` ✅.
**Post-fix:** `pnpm lint` ✅, `pnpm test` 159/159 ✅, `pnpm build` ✅.

---

## 1. Production-Ready Acceptance Criteria

Eric must be able to complete this loop end-to-end without help every day:

1. Log in at `/auth/login` and land on `/admin` with role=admin.
2. See live KPIs and active projects on the Command Center.
3. Create a new project (`/admin/projects/new`) and edit its details.
4. Record a field report at `/admin/field-reports/new` and publish it.
5. View and reschedule schedule items at `/admin/schedule`.
6. Track materials and shortages at `/admin/materials`.
7. Issue a billing invoice (Stripe or free PayPal/Venmo/Zelle link) at `/admin/billing`.
8. See client/owner notifications at `/admin/notifications`.
9. Dispatch a sub-contractor briefing tied to the correct project.

If any of those flows fails silently or routes to the wrong place, the platform is not production-ready.

---

## 2. Audit Matrix

26 admin pages audited. Routes wired in `client/src/App.tsx`; navigation in `client/src/components/DashboardLayout.tsx`. All tRPC procedure references resolved to existing routers; all `fetch("/api/*")` calls resolved to existing Netlify Functions.

| Route                        | Page                      | Data deps                                                                                                                 | Severity of issues found                 | Status                                      |
| ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| `/admin`                     | CommandCenter             | `projects.stats/list`, `fieldReports.list/weeklyStats`, `materials.list`, `/api/lead-score`                               | P1 (wrong "New Project" route)           | ✅ Fixed                                    |
| `/admin/projects`            | ProjectsList              | `projects.list`                                                                                                           | —                                        | ✅ Healthy                                  |
| `/admin/projects/new`        | ProjectNew                | `projects.create`, `clients.list`                                                                                         | —                                        | ✅ Healthy                                  |
| `/admin/projects/:id`        | ProjectDetail             | `projects.getById/profitability/update/updateProgress`, `fieldReports/schedule/materials/ledger.list`, `/api/n8n-webhook` | P1 (missing isError, slider write storm) | ✅ Fixed                                    |
| `/admin/field-reports`       | FieldReportsList          | `fieldReports.list`, `projects.list`                                                                                      | P1 (wrong click destination)             | ✅ Fixed                                    |
| `/admin/field-reports/new`   | FieldReportNew            | `projects.list`, `fieldReports.publish`, `/api/voice-to-report`, `/api/n8n-webhook`                                       | P2 (missing invalidate)                  | ✅ Fixed                                    |
| `/admin/field-reports/:id`   | FieldReportDetail         | `fieldReports.getById/publish/unpublish`                                                                                  | P1 (missing isError)                     | ✅ Fixed                                    |
| `/admin/schedule`            | ScheduleView              | `schedule.list/create/update/updateStatus`, `projects.list`, `/api/n8n-webhook`                                           | P1 latent (router column bug)            | ✅ Fixed                                    |
| `/admin/clients`             | ClientsList               | `clients.list/create/delete`                                                                                              | —                                        | ✅ Healthy                                  |
| `/admin/clients/:id`         | ClientDetail              | `clients.getById/update`                                                                                                  | P1 (missing isError)                     | ✅ Fixed                                    |
| `/admin/estimates`           | EstimatesList             | `estimates.list/markSent/markApproved`                                                                                    | —                                        | ✅ Healthy                                  |
| `/admin/materials`           | MaterialsView             | `materials.list/create`, `ledger.append`, `/api/material-procurement`, `/api/n8n-webhook`                                 | P2 (silent ledger errors)                | ✅ Fixed                                    |
| `/admin/sub-contractors`     | SubContractorsList        | `subContractors.list/create/delete/sendBriefing`                                                                          | **P0** (hardcoded projectId)             | ✅ Fixed                                    |
| `/admin/ledger`              | LedgerView                | `ledger.list/append`, `projects.list`                                                                                     | —                                        | ✅ Healthy                                  |
| `/admin/site-plans`          | SitePlanBuilder           | `sitePlans.list/create/update/delete`                                                                                     | —                                        | ✅ Healthy                                  |
| `/admin/billing`             | BillingView               | `projects.list`, `clients.list`, `/api/stripe-billing`, `/api/n8n-webhook`                                                | —                                        | ✅ Healthy (graceful Stripe fallback works) |
| `/admin/portfolio-cms`       | PortfolioAdmin            | `portfolio.listAdmin/create/update/togglePublished/delete`                                                                | P1 (no URL validation)                   | ✅ Fixed                                    |
| `/admin/finishes`            | FinishSelectionsAdmin     | `finishSelections.list/create/adminApprove/delete/calcBudgetImpact`, `projects.list`                                      | —                                        | ✅ Healthy                                  |
| `/admin/notifications`       | NotificationsView         | `notifications.adminList/send`, `clients.list`, `projects.list`                                                           | —                                        | ✅ Healthy                                  |
| `/admin/analytics`           | Analytics                 | `projects.stats/list`, `fieldReports.weeklyStats`, `materials.list`                                                       | P2 (silent error → zero-data)            | ✅ Fixed                                    |
| `/admin/activity-log`        | ActivityLog               | direct Supabase (ledger_entries)                                                                                          | —                                        | ✅ Healthy                                  |
| `/admin/vision-studio`       | VisionStudio              | `/.netlify/functions/vision-studio`                                                                                       | —                                        | ✅ Healthy                                  |
| `/admin/search`              | Search                    | `/api/search`                                                                                                             | —                                        | ✅ Healthy                                  |
| `/admin/guides`              | Guides                    | static guide content                                                                                                      | —                                        | ✅ Healthy                                  |
| `/admin/setup`               | SetupWizard (token-gated) | `/api/setup-env`, `/api/ai-chat`, `/api/platform-actions`, `/api/platform-health`                                         | —                                        | ✅ Healthy                                  |
| `/admin/blueprint` (flagged) | BlueprintTools            | `blueprint.*`                                                                                                             | —                                        | ✅ Healthy (off by default)                 |

---

## 3. Per-Page Check Standards

Every admin page now meets these baselines:

- **Load states:** `isLoading` → skeleton/placeholder; data ready → render; query error → error UI with retry.
- **Read/write:** Mutations wrapped in `useMutationWithToast` for consistent success/error messaging; invalidate matching query cache.
- **Validation:** Required fields blocked client-side; URLs validated before round-trip.
- **Permissions:** All admin routes wrapped in `<AdminRoute>`; non-admin auth users redirected to `/portal`; unauthenticated redirected to `/auth/login`. (`client/src/components/RouteGuards.tsx`).
- **Degradation:**
  - Stripe absent → free PayPal/Venmo/Zelle billing path (already wired in `BillingView`).
  - n8n absent → fire-and-forget, no UI break (`.catch(() => {})` pattern).
  - Anthropic absent → server falls back to Gemini.
  - OpenAI Whisper absent → server falls back to Gemini audio.
  - OpenWeatherMap absent → server falls back to Open-Meteo.
- **Mobile:** All forms/tables use responsive Tailwind classes (`sm:`, `md:`); bottom nav for quick switching.

---

## 4. Remediation Waves

### Wave 1 — P0/P1 (this PR) ✅

- Sub-contractor briefing: real project picker (was hardcoded to project #1)
- ProjectDetail: error/retry + progress-slider commit-on-release
- FieldReportDetail / ClientDetail: error/retry UI
- FieldReportsList: open report detail directly
- CommandCenter: New Project header → `/admin/projects/new`
- PortfolioAdmin: client-side URL validation
- scheduleRouter: `sort_order` column fix (latent)

### Wave 2 — P2 polish (this PR) ✅

- FieldReportNew: list cache invalidation on publish
- Analytics: partial-load error banner
- MaterialsView: surfaced ledger-append errors

### Wave 3 — Backlog (not blocking daily use)

- Schedule reorder UI (router now correct; UI still TBD)
- BillingView: clearer Stripe vs free-link selection on mobile
- More targeted unit tests on every mutation flow
- Bundle-size code-splitting (mermaid chunk 1.8 MB)

---

## 5. Production Hardening Checklist

Before sign-off:

- [x] `pnpm lint` clean
- [x] `pnpm test` clean (159/159 — includes 2 new tests for the briefing project requirement)
- [x] `pnpm build` clean
- [x] Verified all admin nav targets map to live routes in `App.tsx`
- [x] Verified all `trpc.*` calls in admin pages resolve to procedures in `server/routers/*`
- [x] Verified all `fetch("/api/*")` calls in admin pages resolve to a Netlify function
- [x] Graceful fallbacks for absent integrations (Stripe / Anthropic / Whisper / OpenWeatherMap / n8n) verified
- [x] AdminRoute guard verified: unauthenticated → `/auth/login`, non-admin → `/portal`

### Pre-go-live smoke test (Eric's daily loop)

Run through this on staging or with seed data before declaring production-ready:

1. Sign in via magic link at `/auth/login` → land on `/admin`.
2. Click **New Project** on Command Center → form opens at `/admin/projects/new`.
3. Create project; verify it shows in `/admin/projects`.
4. Open project; drag progress slider 0→50; verify **one** "Progress Saved" toast (not 10).
5. Record a voice memo at `/admin/field-reports/new`; publish; verify it appears in `/admin/field-reports` immediately.
6. Click the report card → lands on `/admin/field-reports/:id` (not project page).
7. Open `/admin/materials`, generate a PO; if ledger append fails, toast appears (not silent).
8. Open `/admin/sub-contractors`, click **Send Briefing**; dialog requires choosing a real project before sending.
9. Open `/admin/clients/:id` with a broken token → see "Could not load this client" with retry.
10. Open `/admin/portfolio-cms`; paste a bad URL → see "Invalid Image URL" toast immediately.

### Rollback plan

This PR is additive (no DB schema changes, no env-var changes). To roll back, revert the merge commit on `main`; Netlify will redeploy the previous build within ~3 minutes. No data migration needed.

### Known non-blockers

- Mermaid bundle chunk is 1.8 MB pre-gzip (744 KB gzipped). Only loaded on Site Plans / Guides routes with diagrams. Plan: dynamic `import()` follow-up.
- BlueprintTools: feature-flagged off (`VITE_FEATURE_BLUEPRINT=true` to enable).
- Some pages reference partially built features (`profitability` tab in ProjectDetail) — they render gracefully when empty.
