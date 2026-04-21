# Precision Core Builders — Enterprise Handover Guide

**Platform:** Digital Foreman  
**Owner (incoming):** Eric Tadlock — Precision Core Builders (CCB #246527)  
**Date:** April 2026  
**Build Status:** ✅ Passing | 0 TypeScript errors | 5 tests passing | ~10s build time

This document is the authoritative transfer guide. Work through each phase in order.
Store all credentials in a **secure password manager** (1Password, Bitwarden, etc.) —
never in email, Slack, spreadsheets, or any plain-text document.

---

## ⚠️ SECURITY — Do This First

Several partial API key prefixes were previously committed to
`COMPLETION_SUMMARY.md`. The keys have been redacted in the file but **the
fragments remain in git history**. The only safe remediation is to rotate all
affected keys immediately so the historical fragments are worthless.

| Key | Action | URL |
|-----|--------|-----|
| `OPENAI_API_KEY` | Delete old key; generate new one | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | Delete old key; generate new one | https://console.anthropic.com/settings/keys |
| `OPENWEATHERMAP_API_KEY` | Regenerate key | https://home.openweathermap.org/api_keys |

After generating new keys, add them to the Netlify dashboard (Phase 3, Step 5
below) **before** testing the platform.

---

## Phase 1 — Pre-Transfer Verification

Complete these checks before signing any transfer agreement.

### 1.1 Live Platform Smoke Test

Visit each URL and confirm it loads without errors:

| URL | Expected |
|-----|----------|
| `https://precision-core.netlify.app` | Public home page loads |
| `https://precision-core.netlify.app/about` | About page loads |
| `https://precision-core.netlify.app/services` | Services page loads |
| `https://precision-core.netlify.app/portfolio` | Portfolio page loads |
| `https://precision-core.netlify.app/estimator` | Estimator form loads |
| `https://precision-core.netlify.app/contact` | Contact form loads |
| `https://precision-core.netlify.app/admin` | Admin login / dashboard loads |
| `https://precision-core.netlify.app/portal` | Client portal login loads |

### 1.2 Feature Verification

- [ ] AI Estimator: submit a test form → confirm a cost estimate is returned
- [ ] Voice-to-Report: record a 30-second memo → confirm transcription + report appear
- [ ] Schedule/Gantt: drag a task → confirm position saves on reload
- [ ] Netlify build status is green: https://app.netlify.com → Sites → precision-core

### 1.3 Completion State Agreement

The platform is currently **~45% feature-complete**. Both parties must agree
in writing on the following before transfer:

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 — Foundation | Design system, routing, auth, all pages scaffolded | ✅ 95% delivered |
| Phase 2 — Operations | Voice reports, Gantt chart, weather scheduling | ⚠️ 40% delivered |
| Phase 3 — Client Experience | Client portal, estimator UI, finish showroom | ⚠️ 15–25% delivered |
| Phase 4 — Automation | Procurement, n8n workflows, billing | ⏳ Scaffolded only |
| Phase 5 — Analytics | Command Center data, portfolio showcase | ⏳ Scaffolded only |

Remaining phases (3–5) require additional development scope, timeline, and cost
to be negotiated separately.

### 1.4 Build Health Verification

Run locally (requires Node 20 + pnpm):

```bash
pnpm install
pnpm validate   # lint + type-check + test + build
```

Expected output: 0 TypeScript errors, 5 tests passing, build succeeds.

---

## Phase 2 — Credential Inventory

Use this table as a template. Fill in values in your password manager — do **not**
write actual keys into this document.

| Service | Purpose | Account to Create | Notes |
|---------|---------|-------------------|-------|
| **GitHub** | Source code + CI | github.com | Repo transfers to Eric's account |
| **Netlify** | Hosting + functions | netlify.com (business email) | Site transfers to Eric's team |
| **Supabase** | Database + auth | supabase.com | Project transfers to Eric's org |
| **OpenAI** | Whisper voice transcription | platform.openai.com | Generate fresh key (rotate existing) |
| **Anthropic** | Claude AI (estimator, chat, reports) | console.anthropic.com | Generate fresh key (rotate existing) |
| **OpenWeatherMap** | Weather scheduling | openweathermap.org | Regenerate key (rotate existing) |
| **Stripe** | Milestone billing (Phase 5) | dashboard.stripe.com | Eric creates account; use test keys first |
| **n8n** | Automation workflows (Phase 4) | n8n.io or self-hosted | Eric creates account |
| **Domain Registrar** | Custom domain DNS | Namecheap / Cloudflare / etc. | Eric purchases/owns domain |

### Netlify Environment Variables Checklist

After all services are under Eric's ownership, confirm every variable is set in
**Netlify → Site → Environment variables**:

```
ANTHROPIC_API_KEY          ← Anthropic (rotated)
OPENAI_API_KEY             ← OpenAI (rotated)
OPENWEATHERMAP_API_KEY     ← OpenWeatherMap (rotated)
DATABASE_URL               ← Supabase (from transferred project)
SUPABASE_URL               ← Supabase
SUPABASE_ANON_KEY          ← Supabase
SUPABASE_SERVICE_ROLE_KEY  ← Supabase (rotated after transfer)
VITE_SUPABASE_URL          ← Same as SUPABASE_URL
VITE_SUPABASE_ANON_KEY     ← Same as SUPABASE_ANON_KEY
VITE_SITE_URL              ← Your custom domain (e.g. https://precisioncorebuilders.com)
STRIPE_SECRET_KEY          ← Stripe (Phase 5)
STRIPE_PUBLISHABLE_KEY     ← Stripe (Phase 5)
VITE_STRIPE_PUBLISHABLE_KEY ← Stripe (Phase 5)
STRIPE_WEBHOOK_SECRET      ← Stripe (Phase 5)
N8N_WEBHOOK_URL            ← n8n (Phase 4)
N8N_API_KEY                ← n8n (Phase 4)
```

> ℹ️ Netlify does **not** transfer environment variables when a site is
> transferred between teams. You must re-enter all values manually after
> the site transfer.

---

## Phase 3 — Infrastructure Ownership Transfer

Complete steps in order. Do not proceed to the next step until the current one
is confirmed working.

### Step 1 — GitHub Repository Transfer

1. Eric creates (or confirms) a GitHub account at https://github.com
2. Developer navigates to:
   `https://github.com/ksksrbiz-arch/precision-core-builders` →
   **Settings → General → Danger Zone → Transfer repository**
3. Transfer to Eric's GitHub username or organization
4. Eric confirms the transfer via email
5. Verify: Eric can clone and push to the repo

### Step 2 — Netlify Site Transfer

1. Eric creates a Netlify account at https://netlify.com using his business email
2. Developer navigates to:
   **Netlify → Site → Site configuration → General → Transfer site**
3. Transfer to Eric's Netlify team
4. Eric accepts the transfer
5. In Eric's Netlify account: re-connect the GitHub App integration to the
   transferred repo (Sites → `precision-core` → Site configuration → Build &
   deploy → Link repository)
6. Re-enter all environment variables (they are wiped on transfer)
7. Trigger a manual deploy and confirm it succeeds

### Step 3 — Supabase Project Transfer

1. Eric creates a Supabase account at https://supabase.com
2. Developer navigates to:
   **Supabase → Project Settings → General → Transfer project**
3. Transfer to Eric's Supabase organization
4. Eric confirms access and can see the database
5. Verify all 12 tables are present in the Table Editor
6. Verify Row-Level Security policies are intact (Database → Policies)
7. Note any updated connection strings and update Netlify env vars accordingly

### Step 4 — Custom Domain Setup

1. Eric purchases a domain (e.g. `precisioncorebuilders.com`) at
   Namecheap, Cloudflare, or Google Domains if not already owned
2. In Netlify: **Site → Domain management → Add custom domain**
   Enter `precisioncorebuilders.com`
3. Netlify provides DNS records (typically NS records or a CNAME)
4. Update DNS at the registrar to point to Netlify
5. Wait for DNS propagation (5 min – 24 hours)
6. SSL certificate provisions automatically — wait for the green lock
7. Enable the `www` → apex redirect in `netlify.toml` (uncomment the block
   already present at the top of that file and replace `<your-domain>` with
   your actual domain, e.g. `precisioncorebuilders.com`)
8. Update `VITE_SITE_URL` in Netlify environment variables to the new domain

### Step 5 — Credential Rotation (Post-Transfer)

After all services are under Eric's control, rotate every credential:

| Credential | How to Rotate |
|------------|--------------|
| `OPENAI_API_KEY` | platform.openai.com → API Keys → Create new key → delete old |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys → Create new key → delete old |
| `OPENWEATHERMAP_API_KEY` | openweathermap.org → My API Keys → Generate |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → Reveal → Regenerate |
| Supabase JWT Secret | Supabase → Auth → Settings → JWT Secret → Generate new (invalidates all sessions) |

After rotating each key, update its value in **Netlify → Site → Environment
variables** and trigger a new deploy to confirm the functions still work.

---

## Phase 4 — Knowledge Transfer & Onboarding

### Training Session Agenda (screen-share or in-person, ~2 hours)

**Netlify Dashboard (15 min)**
- Show Eric the deploy log and how to check for build failures
- Show function logs: Functions → `voice-to-report`, `estimate-project`, `weather-schedule`
- Show environment variables screen
- Enable deploy failure email notifications:
  Netlify → Site → **Notifications** → Email → Add notification → Deploy failed

**Supabase Dashboard (20 min)**
- Table Editor: walk through all 12 tables
- Auth → Users: show how to create/reset client accounts
- Logs: show how to read API and database logs

**Admin Platform Walkthrough (45 min)**
- Create a test project end-to-end
- Record and submit a voice field report
- View and drag a Gantt chart task
- Submit a public estimator form; find the result in Admin → Estimates
- Create a test client user; log in as client and view portal
- Check Command Center dashboard

**Day-to-Day Rhythm (15 min)**
- Daily: field report from phone after site visits (3–5 min)
- Weekly: Command Center dashboard review, material/budget alerts
- Monthly: review pending estimates, check profitability

### Documentation Deliverables

All documents are in the repository:

| Document | Purpose |
|----------|---------|
| `docs/USER_GUIDE_ERIC.md` | Full feature guide — Eric's primary reference |
| `GETTING_STARTED_ERIC.md` | Quick-start checklist for first 48 hours |
| `docs/HANDOVER.md` | This document — transfer and operations reference |
| `.env.example` | Complete list of all required environment variables |
| `CLAUDE.md` | Technical architecture reference (for developers) |
| `PLATFORM_AUDIT_APRIL_2026.md` | Completion state audit (April 2026) |

> **Credential Reference Sheet:** Compile all account usernames, URLs, and
> keys into a 1Password vault or Bitwarden collection shared with Eric.
> This sheet must NOT be stored in the repository or sent via email.

---

## Phase 5 — Post-Transfer Smoke Tests

Run this checklist with Eric logged in under his own accounts:

### Infrastructure
- [ ] GitHub repo is accessible at Eric's account URL
- [ ] Netlify dashboard shows the site under Eric's team
- [ ] Supabase dashboard shows the project under Eric's organization
- [ ] All environment variables present in Netlify (count: 15 variables)
- [ ] Netlify deploy triggered by a test commit to `main` completes successfully

### Platform Features
- [ ] Visit `<your-domain>` in an incognito window — public home page loads
- [ ] Admin login works with Eric's credentials at `<your-domain>/admin`
- [ ] AI Estimator form at `<your-domain>/estimator` submits and returns a result
- [ ] Voice-to-Report records a memo on mobile and produces a report
- [ ] Weather schedule page loads and shows a 7-day Eugene, OR forecast
- [ ] Gantt chart renders tasks and drag-to-reschedule saves

### Security
- [ ] All three rotated keys (OpenAI, Anthropic, OpenWeatherMap) are active in Netlify
- [ ] Old keys are deleted from the previous developer's accounts
- [ ] No console errors on any core page (open browser DevTools → Console)

---

## Phase 6 — Ongoing Support Structure

### Support Agreement (Define Before Sign-Off)

Document answers to these questions before completing the handover:

1. **Bug fixes / outages** — Who is the first contact? What is the response time SLA?
2. **Feature requests** — How are Phases 3–5 features scoped and priced?
3. **Emergency access** — Does Eric have all credentials to operate independently?

### Monitoring Setup (Eric's Responsibility Post-Transfer)

**Uptime monitoring (free):**
1. Create account at https://uptimerobot.com
2. Add monitor → HTTP(s) → URL: `https://<your-domain>`
3. Alert: email + SMS when site goes down

**Netlify deploy alerts:**
1. Netlify → Site → Notifications → Email notifications
2. Add: Deploy failed, Function error

**Supabase backup policy:**
- Supabase Free tier: 7-day backups
- Supabase Pro tier: Point-in-Time Recovery (recommended for production)
- Confirm plan tier and upgrade if needed

**Status pages to bookmark:**
- Netlify status: https://www.netlifystatus.com
- Supabase status: https://status.supabase.com
- OpenAI status: https://status.openai.com
- Anthropic status: https://status.anthropic.com

---

## Platform Roadmap (Phases 3–5)

This section supports scoping future development work.

### Phase 3 — Client Experience (~25–40 hours estimated)
- Digital finish selection showroom with budget impact display
- Core Values Ledger (immutable decision log visible to clients)
- Client portal: live timeline, published field reports, messaging
- Stripe milestone-based billing integration (invoices + payment links)

### Phase 4 — Automation (~30–50 hours estimated)
- n8n workflows: sub-contractor scheduling SMS/email automation
- Material procurement UI with vendor comparison and PO generation
- Shortage alerts → automatic notifications
- Lead scoring algorithm with AI prioritization

### Phase 5 — Analytics & Portfolio (~20–30 hours estimated)
- Command Center: real profitability data (estimated vs. actual)
- AI-powered search ("What was total spend on the Spyglass project?")
- Portfolio showcase with before/after sliders and 360 walkthroughs
- LLM search across all projects, reports, and ledger entries

---

## Quick Reference: Day-to-Day Operations

| Task | Where | Time |
|------|-------|------|
| Record field report | Admin → Field Reports → New | 3–5 min |
| Check project status | Admin → Projects → [Project] | 1 min |
| View schedule / Gantt | Admin → Schedule | 2 min |
| Review new estimates | Admin → Estimates | 2 min |
| Check weather alerts | Admin → Schedule → Weather | 30 sec |
| Add a new client user | Supabase → Auth → Users → Invite | 2 min |
| Check deploy status | Netlify → Site → Deploys | 30 sec |
| View function logs | Netlify → Site → Functions | 2 min |

---

*This document should be reviewed and countersigned by both the developer and
Eric Tadlock before transfer is considered complete.*
