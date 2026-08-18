# Platform Audit — 2026-07-23

**Platform:** Digital Foreman — Precision Core Builders (Eric Tadlock, Oregon CCB #246527)
**Audited against:** `main` @ `2e2fdfd` (local + origin identical, clean tree)

---

## Health Check (validated live)

| Check                     | Result                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| TypeScript (`pnpm check`) | ✅ Clean — 0 errors                                                     |
| Tests (`pnpm test`)       | ✅ 588/588 passing (41 files, ~11s)                                     |
| Local repo state          | ✅ Clean, synced with origin/main                                       |
| Open PRs / Issues         | None                                                                    |
| Local `.env`              | Absent (only `.env.example` / `.env.template`; secrets live in Netlify) |

## Repo Vitals

- **554 commits** since bootstrap (2026-03-31); **173 merged PRs**
- Activity by month: Mar 6 · Apr 202 · May 74 · Jun 202 · Jul 70 (through 07-23)
- Quiet period: no commits Jul 13–22; resumed today with docs archival

## Stack

React 19 + Vite 8 + Tailwind 4 + Radix UI · tRPC 11 + TanStack Query 5 · Drizzle ORM + Supabase (Auth / Realtime / RLS) · Netlify Functions (serverless prod, Express dev) · Vitest · pnpm 10.34.4.
**AI is free-tier only** (Groq / OpenRouter; paid Claude removed in #187).

## What's Built

- **Marketing site:** Home, About, Services, Portfolio, Estimator, Contact, FAQ
- **Admin (29 pages):** Projects, Clients, Estimates + Editor, Field Reports (voice→AI pipeline), Materials, Gantt Schedule (drag-to-reschedule), Ledger, Finish Selections, SubContractors, Vendors, Analytics, Profitability, Billing, Blueprint Tools, Site Plan Builder, Vision Studio, Command Center, Search, Notifications, Guides, Setup Wizard, Activity Log
- **Client Portal (6 pages):** Dashboard, Reports, Finishes, Ledger, Payments, Blueprint
- **Backend:** 16 tRPC routers (all with test suites) + 29 Netlify functions (AI chat/copilot/draft/usage, voice-to-report, estimate-project, lead-score, material-procurement, Stripe billing + webhook, n8n webhook, weather-schedule, platform-health, portal assistant, vision studio, onboarding)
- **DB:** Drizzle schema + migrations, RLS policies, ledger immutability, anon-policy audit SQL

## Recent Arc (July 2026)

1. **Test coverage blitz** (07-10/11): router suites (#171–#191), hooks, GanttChart + OpsCopilot component tests (#195)
2. **Realtime everywhere:** portal (#180) + admin list pages (#182, #192) — closes item 3 of the April completion plan
3. **Vendors catalog + PO linking** (#173–#178)
4. **Profitability analytics, server-side** (#181, #194; variance-basis fix in #206)
5. **Security hardening:** admin auth/access gaps (#204), portal caller-scoping (#205), webhook fail-closed + LLM-insert whitelist + masked errors (#206)
6. **Free-tier AI:** consolidation to Groq/OpenRouter (#200), vision auto-tagging of field photos (#207)
7. **Docs:** archived stale phase-plan `todo.md` → `docs/initial-project-plan.md` (07-23, `2e2fdfd`)

## Branch Hygiene

| Branch                                                | vs main             | Verdict                                      |
| ----------------------------------------------------- | ------------------- | -------------------------------------------- |
| `chore/new-supabase-keys-and-free-tier-transcription` | 0 ahead / 64 behind | Safe to delete                               |
| `chore/remove-auth0`                                  | 0 ahead / 67 behind | Safe to delete                               |
| `chore/doc-triage-2026-07`                            | 1 ahead / 68 behind | Review the 1 unmerged commit before deleting |

## Remaining Gaps

**Operational (not code):**

1. Validate production secrets via `platform-health` function
2. Author n8n workflows (off-repo; `n8n-webhook.ts` proxy dispatches once URL is set)
3. Stripe end-to-end smoke test: test card → `stripe-webhook` → ledger entry → paid-to-date; include refund reversal; bake into `billing.test.ts`
4. Onboarding hardening: KV/Upstash-backed rate limiting (currently in-memory), rotate `ONBOARDING_TOKEN` post-setup

**Stretch / polish:**

- Code-split Mermaid/diagram plugins out of the public bundle (one chunk > 1.8 MB)
- Gantt dependencies, critical-path highlighting, milestone rollups
- Remove `weather-schedule.ts` static fallback once a paid OpenWeather key exists
- Targeted router edge-case tests (concurrent edits, RLS denial paths)

**Phase 5 (net-new scope):**

- 360° walkthroughs, before/after sliders, portfolio CMS expansion, testimonials/case studies

## Bottom Line

Phases 1–4 are **code-complete and stable** (clean typecheck, 588 green tests, no dead endpoints). What remains is operational verification (Stripe, secrets, n8n) and Phase 5 feature work.
