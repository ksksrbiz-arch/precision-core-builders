# Admin System Audit & Remediation — October 2026

**Scope:** every admin surface — 31 pages under `client/src/pages/admin`, the 17 feature tRPC
routers + repositories they call, the Netlify functions the admin UI and the
portal depend on, the auth layer, and the AI tooling (Ops Co-pilot, Vision
Studio, daily briefing).
**Method:** read the code (not the docs), cross-checked every router procedure
against its UI callers, traced every client mutation payload against its Zod
schema, probed suspicious behavior with throw-away tests, and compared
`drizzle/schema.ts` against migrations/RLS.
**Baseline:** `tsc` clean, 977 tests passing. **After:** `tsc` clean,
`pnpm validate` (lint → estimating check → AI eval → tests → build) green,
1,198 tests passing (+221).
**Supersedes:** `docs/archive/ADMIN_AUDIT_JUNE_2026.md`, which marked most pages
"healthy" — the findings below are almost all things that audit could not see
from the page level (schema-level, cross-tenant, and write-path bugs).

> Cathedral read: everything below is **Foundation** — auth, tenant isolation,
> data integrity, and money correctness. The new features (§3) are the
> revenue-adjacent ones (an estimate that actually reaches the client; editable
> sub-contractor/material records). No new infrastructure was added.

---

## 1. Findings fixed

Severity: **P0** exploitable or silently corrupts production data · **P1**
broken feature or wrong money/records · **P2** misleading or fragile · **P3** hygiene.

### 1.1 Security / tenant isolation

| ID  | Sev | Finding                                                                                                                                                                                                                                                                                                                 | Fix                                                                                                                    |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| S1  | P0  | `verifyToken` fell back to **`user_metadata.role`** when the `users` row was missing. `user_metadata` is writable by the end user with the public anon key, so anyone could self-promote to admin. The client (`useAuth`, `Login`) mirrored the same trust.                                                             | Only `users.role` / `app_metadata.role` are trusted, server and client. Tests: metadata-role attacker stays `user`.    |
| S2  | P1  | Admin was granted on an allowlisted **email string** with no proof the caller controls it (trigger + `auth-sync-role` run at sign-up, before confirmation).                                                                                                                                                             | Admin requires `email_confirmed_at` in `verifyToken` and `auth-sync-role`.                                             |
| S3  | P0  | `ledger.listVisible(projectId)` had no ownership check — any signed-in client could read any project's client-visible ledger.                                                                                                                                                                                           | `assertProjectAccess`.                                                                                                 |
| S4  | P0  | `projects.list` was a `protectedProcedure` with no scoping: every portal client could list **all projects with client name/email/phone**. (Portal clients use `myProject`.)                                                                                                                                             | `adminProcedure`.                                                                                                      |
| S5  | P0  | `/api/search` was `auth: "user"` and queries the service-role DB unscoped — any signed-in client could search every client, budget, field report and vendor price.                                                                                                                                                      | `auth: "admin"`.                                                                                                       |
| S6  | P0  | `/api/voice-to-report` was `auth: "user"` (comment said "admin-submitted") and inserts a field report into **any `projectId`** via the service role.                                                                                                                                                                    | `auth: "admin"`.                                                                                                       |
| S7  | P0  | `fieldReports.listPublished` had no ownership check; `fieldReports.getById` let a client read their own project's **unpublished drafts** (internal notes, flagged issues).                                                                                                                                              | `assertProjectAccess`; `getById` requires `published_to_client`.                                                       |
| S8  | P1  | `blueprint.listArtifacts` had no ownership check; `blueprint.buildDeepLink` accepted `//evil.example` / absolute URLs (open redirect).                                                                                                                                                                                  | Ownership check; origin must stay on the Blueprint host.                                                               |
| S9  | P1  | `/api/estimate-project` is public (`auth: "none"`) but accepted `projectId`/`clientId` and **inserted an estimate through the service role**, returning the saved row. (The ids were also validated as UUIDs against integer columns, so the path never worked — an anonymous write surface with no legitimate caller.) | Persist only for an authenticated admin, with integer ids; insert errors logged.                                       |
| S10 | P1  | `ai_usage` was defined in `schema.ts` but had **no migration and no RLS**; the AI Usage panel told Eric to "run the 0005_ai_usage migration", which doesn't exist.                                                                                                                                                      | `drizzle/migrations/0010_ai_usage.sql` (table, indexes, RLS, admin-only read policy). **Apply it** (see §5).           |
| S11 | P2  | `/api/vision-studio` accepted any signed-in user and an unbounded base64 image / custom prompt to a paid model.                                                                                                                                                                                                         | Admin only; ~7 MB image cap; 2,000-char prompt cap.                                                                    |
| S12 | P2  | `platform-health` token travelled in the **query string** (access logs, history, Referer).                                                                                                                                                                                                                              | Setup Wizard sends `Authorization`; query form kept for monitors but logged as deprecated; `DEPLOYMENT_GUIDE` updated. |
| S13 | P3  | Admin session token compared with `===`.                                                                                                                                                                                                                                                                                | Constant-time compare.                                                                                                 |
| S14 | P2  | `projects.getById` threw a bare `Error("Unauthorized")` (HTTP 500) and leaked raw Supabase errors for unknown ids.                                                                                                                                                                                                      | `assertProjectAccess` → `FORBIDDEN`, no existence leak.                                                                |

### 1.2 Data corruption & silent no-ops

| ID  | Sev | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fix                                                                                                                                                                                  |
| --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | P0  | **Zod 4 applies `.default()` inside `.partial()`.** `projects.update`, `schedule.update`, `portfolio.update`, `finishCatalog.update` were `Create.partial()`, so every update silently wrote the create defaults: renaming a project reset `status` to `"lead"`, `state` to `"OR"` and **re-enabled a client portal Eric had switched off**; **dragging a Gantt bar reset the task to `pending`, `other`, not weather-sensitive, sort 0** (un-completing finished work); editing a portfolio/catalog item **unpublished** it. A test even documented the portfolio case as a "latent footgun". | Defaults live only on the create schemas; update schemas are built from a defaults-free `*Fields` object. Regression tests per router, plus the convention in `conventions.md` §8.4. |
| F2  | P1  | **Blank fields could never be cleared.** Edit forms sent `undefined` ("unchanged") for blanks while the toast said "Saved" (clients, projects, estimates, materials, portfolio, finish catalog, sub-contractors; the Gantt modal converted `null` back to `undefined`).                                                                                                                                                                                                                                                                                                                        | Update schemas accept `null` for clearable columns; forms send `null` on edit, `undefined` on create. Optimistic Gantt state fixed.                                                  |
| F3  | P1  | The shared admin session (`id: "admin"`) and dev bypass (`dev-admin-local`) are not UUIDs, but ledger/audit/field-report/site-plan/lead/AI-usage writes put `ctx.user.id` into uuid FK columns — Postgres rejected the whole row. `notifications.list` errored the same way.                                                                                                                                                                                                                                                                                                                   | `authorUuid()` / `isUuid()` (`server/_core/identity.ts`); null author for those sessions; empty inbox instead of an error.                                                           |
| F4  | P1  | Sub-contractor **create failed for any sub without an email**: the form sent `email: ""`, which `z.string().email()` rejects (only the name is marked required).                                                                                                                                                                                                                                                                                                                                                                                                                               | Blanks omitted on create (`buildSubPayload`).                                                                                                                                        |
| F5  | P1  | `create-admin` (setup action) inserted `{email, full_name, role}` into `profiles`, which only has `(id, display_name, created_at)` — it always failed and could never have granted access. DB integrity/health checks probed `profiles` instead of `users`.                                                                                                                                                                                                                                                                                                                                    | Allowlists the email in `admin_emails` and promotes an existing `users` row; checks probe `users` + the real core tables.                                                            |
| F6  | P2  | `clear-demo-data` left orphaned demo **estimates / site plans** (FK is `SET NULL`) and deleted the demo client even if it owned a real project (FK is `RESTRICT`, so it failed halfway).                                                                                                                                                                                                                                                                                                                                                                                                       | Deletes children first; deletes a client only if no projects remain.                                                                                                                 |
| F7  | P2  | Deleting a client with projects surfaced a raw FK-violation message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `CONFLICT` with an actionable message, shown in the toast (`showServerMessageFor`).                                                                                                  |
| F8  | P2  | Notifications "Send" toasted **"dispatched successfully"** when the server recorded the message as `failed` (no provider / no address).                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `useMutationWithToast` `failed()` hook shows the failure reason.                                                                                                                     |
| F9  | P2  | PO status changes weren't idempotent — a second "partial" **added the line quantity again** (double-counting inventory) and wrote a duplicate ledger entry. Receipt events were typed `cost_adjustment` with no amount.                                                                                                                                                                                                                                                                                                                                                                        | Same-status is a no-op; events are `milestone`.                                                                                                                                      |
| F10 | P2  | `material-procurement` compared quantities that can arrive as numeric strings (`"9.00" < "12.00"` is lexicographic → shortage missed).                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Numeric coercion.                                                                                                                                                                    |
| F11 | P1  | Estimate editor couldn't save a `$0` permit/contingency (`z.number().positive()`); an estimate the client **approved was still freely editable/deletable** even though the UI toasts "approved and locked".                                                                                                                                                                                                                                                                                                                                                                                    | Cost lines `nonnegative`; approved estimates are refused server-side (`PRECONDITION_FAILED`).                                                                                        |
| F12 | P3  | `vitest.config.ts` didn't include `client/src/_core/**`, so `validation.test.ts` never ran in CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Glob added (and the new hook tests live there).                                                                                                                                      |

### 1.3 Money & reporting correctness

| ID  | Sev | Finding                                                                                                                                                                                                                                                                                                                                          | Fix                                                                                                                                                                          |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | P1  | **Ops Co-pilot read a stale column.** Actual cost is ledger-derived (`cost_adjustment` entries) and `projects.actual_cost` "is no longer kept in sync", but `opsSnapshot` and the AI tools still read it (and `progress`, `start_date`, `target_end_date`, which don't exist). The copilot saw every project as free; "over budget" never fired. | Snapshot and tools use `getCostAdjustmentTotals` / `getProjectActualCost` and the real columns; `project_detail` reports "not found" instead of throwing.                    |
| M2  | P1  | **Dashboard Gross Margin was fiction.** Command Center compared _all_ estimated value (every lead and un-started job) with costs logged _so far_: $1.05M quoted / $100k spent read as 90% "on track". Analytics/Profitability's blended margin had the same flaw.                                                                                | Margin is measured only over projects that have logged costs, against their own budget basis. (`stats.costedBasis`, `profitabilitySummary.totals.marginPct`.)                |
| M3  | P1  | Stripe **payment links never reconciled** (`checkout.session.completed` needs `metadata.project_id`, which was never set) and **refunds on invoice/link payments never reached the ledger** (charge metadata is empty). `BillingView` never sent `projectId` at all.                                                                             | `projectId` sent and stamped on invoices _and_ payment links; refunds resolve the project from the original `billing_events` row by invoice id / payment intent.             |
| M4  | P1  | `stripe-billing`: a supplied `dueDate` blanked `days_until_due` without ever sending `due_date`, so Stripe rejected the invoice; `amountCents` and `limit` were unvalidated.                                                                                                                                                                     | `due_date` (future dates only, else net-14); amount must be a whole 1–99,999,999¢; `limit` clamped.                                                                          |
| M5  | P1  | **Vision Studio "Estimate" mode asked the model to produce material and labor dollar figures** — the AI Operating Contract and CLAUDE.md non-negotiables #3/#4 forbid exactly this.                                                                                                                                                              | Mode is now a scope-of-work takeoff ("no prices"), the system prompt carries the hard limits, and a deterministic `redactDollarFigures` guard strips any amount from output. |
| M6  | P2  | Portal "Upcoming schedule" read `planned_start_date` / `planned_end_date` (no such columns): dates never rendered and the sort was `NaN`.                                                                                                                                                                                                        | Uses `planned_start` / `planned_end`.                                                                                                                                        |

### 1.4 Broken integrations

| ID  | Sev | Finding                                                                                                                                                                                                                                                                | Fix                                                                                                                                                                                        |
| --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I1  | P1  | **Every admin → n8n event was silently dropped.** Six admin pages `fetch("/api/n8n-webhook")` with no credentials; the function fails closed (401/503) and `.catch(() => {})` can't see an HTTP error. The public estimator's `lead_captured` event had the same fate. | The function accepts an admin session (or the shared secret); admin pages use `relayAdminEvent()`; anonymous callers may send **only** `lead_captured`, rate-limited, whitelisted, capped. |
| I2  | P2  | `estimates.markSent` only flipped a flag while the UI said "Estimate sent to client" — nothing was delivered. And the admin **Notifications** page can send `in_app` notices that **no portal screen ever displayed** (`notifications.list` had no caller).            | `markSent` notifies the client (portal notice + email when Resend is configured; first send only, never fails the action); new `PortalNotifications` card on the portal dashboard.         |

---

## 2. Regression coverage added

+221 tests, including: `verifyToken` Supabase-path tests (metadata escalation,
unconfirmed email), cross-tenant refusal for every fixed procedure, a "defaults
must not leak into updates" test per router, null-clearing per router and per
form (ClientDetail, EstimateEditor, ProjectDetail, SubContractors, Materials),
`admin-only-guards` (search / voice / vision → 403 for a client), `n8n-webhook`
auth matrix, `stripe-billing` payloads, refund project resolution,
`clear-demo-data` / `create-admin`, `material-procurement`, `opsSnapshot`,
estimate notifications, PO idempotency, `redactDollarFigures`, Gantt delete,
`PortalNotifications`, and the Command Center margin card.

## 3. Unfinished features now finished

| Feature         | What was missing                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Sub-contractors | `update` existed with no UI: edit, 1–5 rating, active flag, **insurance expiry with expired / expiring badges**           |
| Materials       | `update` / `delete` had no UI: edit (incl. ordered / received quantities, which also recompute the shortage flag), delete |
| Estimates       | Delete (drafts only); approved estimates show **Locked**; "Send" actually notifies the client                             |
| Schedule        | Delete a task from the edit modal (`schedule.delete` had no caller)                                                       |
| Field reports   | Delete (`fieldReports.delete` had no caller)                                                                              |
| Portal          | Notification feed so admin-sent in-app notices (and the estimate notice) are visible; mark read / mark all read           |

## 4. Not changed — decisions for Keith

These are deliberate omissions, not oversights.

1. **`admin-auth` (shared-password login) is orphaned.** No page calls it, yet it
   is a live credential endpoint that returns a **static, non-expiring master
   token** (rate limit is in-memory, reset per cold start). Recommendation:
   _retire it_ (delete `admin-auth.ts`, the `ADMIN_*` env vars, and the `pcb_admin_session`
   path in `useAuth`/`authHeader`) rather than wire a weaker second login. Not done
   because removing an auth path is your call.
2. **Portal finish selections carry hard-coded upgrade prices in the client**
   (`PortalFinishes.tsx`, e.g. `+$1,200`) and `finishSelections.select` writes the
   client-supplied `budgetImpact` into the **immutable ledger**. That is money
   living outside `shared/estimating/basis.ts` and a client-tamperable ledger
   figure. Fix = price options server-side from the finish catalog. Out of the
   admin scope, so only flagged.
3. ~~Purchase-order receipts~~ — quantity input **done** (§9); cost policy still open. Was: "Partial" applies the _full_ line quantity (there
   is no received-quantity input), and receipt value is not posted to actual
   cost. Needs a receive-quantity UI and a policy on when PO cost counts.
4. ~~Pickers are capped~~ — **done** (§9). Was: capped at 50–100 rows (`projects.list`/`clients.list`
   `pageSize`) in Schedule, Materials, Ledger, Billing, ProjectNew,
   Notifications…; the 101st client/project is silently unselectable. Fine at
   today's volume; will bite.
5. ~~No project-delete UI, schedule dependency lines and reorder UI~~ —
   **done**, see §7.
6. **The `handle_new_admin_user` DB trigger** (`0003_admin_allowlist.sql`) still
   writes `role = 'admin'` into `public.users` at _sign-up_ for an allowlisted
   address, before confirmation. The API layer now refuses to honor an
   unconfirmed admin, but RLS policies that read `users.role` directly do not
   check confirmation. Safe while Supabase "Confirm email" stays on (no session
   exists until confirmed); consider tightening the trigger to require
   `NEW.email_confirmed_at IS NOT NULL` and re-running it on confirmation.
7. ~~`vision-studio` calls the provider directly~~ — **done**, see §7.

## 5. Before you deploy

1. **Apply `drizzle/migrations/0010_ai_usage.sql`** in Supabase (the
   `scripts/setup-database.sh` loop picks it up automatically). Until then the
   AI Usage panel keeps showing "table not available".
2. **Confirm your own account has a confirmed email.** Admin now requires
   `email_confirmed_at`. Dashboard-created and "Auto Confirm" users are
   confirmed; an account created with confirmation off would be treated as a
   plain user. If you're ever locked out: confirm the email in Supabase → Auth.
3. No new environment variables. `RESEND_API_KEY` (already optional) now also
   enables the estimate-ready email. `N8N_WEBHOOK_SECRET` stays as is.
4. If an uptime monitor calls `/api/platform-health?adminToken=…`, switch it to
   an `Authorization: Bearer` header (the query form still works but logs a warning).

### Behavior changes you may notice

- Editing a project/task/portfolio item no longer resets status, flags or
  published state — and a blanked field now really clears.
- Approved estimates can't be edited or deleted (create a revised one).
- Dashboard / Analytics **Gross Margin is lower and more honest**: it now means
  "margin on projects with logged costs".
- Re-selecting a PO's current status does nothing.
- Portal clients can no longer call `projects.list`, `/api/search`, or
  `/api/voice-to-report`.

## 6. Follow-up: login, loading screens, redirects, 404 (same PR)

- **Login is password-only.** Magic link, the password-form toggle and Facebook
  OAuth are gone from `/auth/login`; `/auth/callback`, `/callback` and
  `/auth/resend` (pages deleted) now 302 to the login page. Sign-in logic lives
  in `client/src/lib/signIn.ts` (tested). `/dev-login` is unchanged — it is
  gated by `VITE_DEV_MODE` and is a developer tool, not part of this page.
- **No bare first render.** `client/index.html` paints a branded splash (logo +
  gold bar, inline critical CSS, `<noscript>` message, "still loading" note
  after 12 s) inside `#root`. `<BrandLoader />` has the same markup and replaces
  it for every Suspense/auth loading state, so there is no flash between them.
  The `ErrorBoundary` fallback is branded too.
- **Redirects were dead.** Netlify reads `_redirects` before `netlify.toml`, and
  the `/* /index.html 200` line there shadowed every toml rule: legacy
  `/expertise/*` 301s and the www→apex redirect never fired, and every unknown
  URL answered 200. All rules now come from `shared/siteRoutes.ts` →
  generated `client/public/_redirects` (host canonicalisation → API → legacy →
  explicit SPA routes → `/* /404.html 404`). `netlify.toml` has no redirects.
- **Real 404s.** The prerendered in-app `NotFound` page (`dist/public/404.html`, built by
  `scripts/prerender-marketing.ts`) is served with status 404;
  in-app `NotFound` suggestions now use the shared route list. The sitemap uses
  the same list (two blog posts that were missing from it are now included).
- **Verify after deploy:** `curl -sI https://precisioncorebuilders.com/nope`
  → 404; `/expertise/roofing` → 301 `/services/roofing`;
  `https://www.…/about` → 301 to the apex.

## 7. Follow-up: archive, schedule dependencies, Vision Studio

- **Projects are archived, not deleted.** New `projects.archived_at`
  (`drizzle/migrations/0011_project_archive.sql` — **apply it**). Archive /
  Restore on the project page, an Active / Archived toggle on the list; archived
  jobs drop out of lists, pickers and the dashboard but nothing is deleted. Policy:
  `projects.delete` now refuses any project with ledger entries ("archive it
  instead"); it remains available only for ledger-free mistakes (e.g. an empty
  lead) and has no UI. Archiving does not touch client-portal access — that is
  the separate `clientPortalEnabled` switch.
- **Schedule dependencies + reorder.** Task editor has a "Starts after"
  checklist (loops are disabled client-side and rejected server-side); the Gantt
  draws finish-to-start connectors, red where a task starts before its
  predecessor ends; the task list has Up/Down reorder (`schedule.updateOrder`,
  which had no caller). Deleting a task unlinks it from its dependents.
  Format: `depends_on` = "12,15" (see `shared/scheduleDeps.ts`).
- **Vision Studio under the AI router.** Pinned to a new pin-only
  `vision-analyst` specialist (photo ≠ measurement, no dollar figures, safety /
  code concerns are VERIFY, no engineering conclusions); contract injected
  before the photo; mode prompts moved into the prompt registry; usage now
  logged to `ai_usage`; 45 s timeout; provider failures return a plain
  502/504 instead of raw provider text. `pnpm eval:ai`'s "every LLM caller
  injects a contract" sweep now also catches raw OpenRouter calls, which is how
  this one escaped it. Not changed: field-report photo tagging
  (`server/_core/visionTagging.ts`) is a separate JSON-output job with its own
  prompt (tracked in `TODO.md`).

## 8. Follow-up: photos flashing on first load

**Cause (measured, Pixel 5 profile, 4× CPU, slow-4G, `/portfolio`):** public
pages ship prerendered HTML, but the app used `createRoot`, which discards it.
When React booted, ~20 photos disappeared (the new `ResponsiveImage` elements
start at opacity 0), the root briefly emptied to the route loader, and then the
photos were re-created and faded back in — roughly 3 s of blank/flashing photos
on slower devices.

**Fix:**

- `client/src/lib/mountBehindPrerender.ts` — when `#root` is marked
  `data-prerendered` (set by `scripts/prerender-marketing.ts`), the app mounts
  into an offscreen container behind the prerendered page and swaps in only
  when the live page has content and the photos in view have loaded and
  finished fading in (8 s hard cap so a failed boot can't strand the user).
  Re-measured: the visible photo count never drops and the loader never shows.
  Client-rendered routes (`/admin`, `/portal`, `/auth/login`) are unchanged.
- `ResponsiveImage` — an image that loaded before React attached `onLoad`
  (cache, replaced markup) now shows immediately instead of staying at opacity
  0, and a failed image no longer leaves an invisible hole.

## 9. Follow-up: uncapped pickers and PO receiving

- **Pickers.** `useAllPages` (`client/src/hooks/useAllPages.ts`) walks every page
  of `projects.list` / `clients.list` (100 per request, 20-page safety cap) and
  returns the same `{ data: { data, total } }` shape, so the 13 pickers that
  asked for one page of 50–100 are drop-in replacements — the 101st project or
  client is no longer unselectable. Archived projects stay out of pickers.
- **PO receiving.** New `purchase_order_items.quantity_received`
  (`drizzle/migrations/0012_po_item_received_qty.sql` — **apply it**; it also
  back-fills lines of orders already marked received/partial, which the old code
  had fully applied to inventory). A **Receive** dialog on each issued/partial PO
  takes the quantity that arrived per line; `purchaseOrders.receive` (rules in
  `shared/poReceipt.ts`) bumps inventory by exactly that, refuses to over-receive
  a line, and marks the PO `received` only when every line is complete.
  "Received" from the status menu now means "everything still outstanding
  arrived" (never double-counted); "partial" can't be picked by hand; an order
  with receipts can't go back to draft/issued (cancel it instead). **Not
  decided:** when received PO cost should count toward project actual cost —
  today it still doesn't (actual cost = ledger `cost_adjustment` entries).
