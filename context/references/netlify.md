# Reference: Netlify Platform & Functions

Loaded when: touching deployment, functions, headers, or env vars.

## 9. Netlify Platform

Netlify is the **sole infrastructure platform**. All services are managed through native Netlify extensions.

### 9.1. Build Configuration (`netlify.toml`)

- **Build command:** `pnpm install && pnpm build`
- **Publish directory:** `dist/public`
- **Node version:** 20
- **API routing:** `/api/*` → Netlify Functions

### 9.2. Netlify Extensions to Use

| Service            | Netlify Extension                       | Replaces                 |
| :----------------- | :-------------------------------------- | :----------------------- |
| **Auth**           | Netlify Identity                        | Custom OAuth / Manus SDK |
| **Database**       | Neon Postgres, PlanetScale, or Supabase | MySQL via mysql2         |
| **File Storage**   | Netlify Blobs                           | AWS S3                   |
| **Serverless**     | Netlify Functions                       | Express server           |
| **Forms**          | Netlify Forms (if needed)               | Custom form handling     |
| **Scheduled Jobs** | Netlify Scheduled Functions             | External cron / n8n      |
| **Analytics**      | Netlify Analytics                       | Custom tracking          |

### 9.3. Security Headers (auto-applied)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 9.4. Caching

- JS/CSS assets: immutable, 1-year cache
- Static files: 1-year cache

---

## 10. Netlify Functions

These functions are **implemented** in `netlify/functions/` (20+ total). A representative subset:

| Function                   | Purpose                                                                          |
| :------------------------- | :------------------------------------------------------------------------------- |
| `voice-to-report`          | Whisper transcription + AI report generation                                     |
| `estimate-project`         | Deterministic cost calculation + AI explanation (see `docs/ESTIMATING_BASIS.md`) |
| `weather-schedule`         | Eugene, OR weather → schedule adjustments                                        |
| `material-procurement`     | Shortage tracking + persisted purchase-order generation                          |
| `lead-score`               | AI lead prioritization by type/budget/location                                   |
| `stripe-billing`           | Invoice creation and billing actions                                             |
| `stripe-webhook`           | Stripe events → ledger/billing reconciliation                                    |
| `search`                   | Postgres full-text search across entities                                        |
| `daily-briefing`           | Scheduled morning operations briefing                                            |
| `blueprint-oauth-callback` | Blueprint.am OAuth redirect handler (token exchange)                             |
| `blueprint-proxy`          | Authenticated proxy to the Blueprint API (tokens server-side only)               |

---
