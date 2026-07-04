# Precision Core Builders — Compliance & Security Documentation

**License:** Oregon CCB #246527  
**Owner:** Eric Tadlock  
**Last Updated:** April 2026

---

## 1. Oregon Contractor Board (CCB) Compliance

Precision Core Builders operates under **Oregon CCB License #246527**, issued by the Oregon Construction Contractors Board. This license requires compliance with ORS 701 (Construction Contractors) and applicable Lane County / City of Eugene building codes.

### 1.1 Digital Records

Oregon CCB rules require contractors to retain certain project records for **6 years** after project completion (OAR 812-003-0200). The platform supports this requirement via:

- **Immutable Ledger:** All project decisions, change orders, and milestone events are recorded in the `ledger_entries` table with append-only semantics. No records may be deleted via the application UI.
- **Field Reports:** Archived in the `field_reports` table with full audit trail.
- **Estimates & Contracts:** Stored in the `estimates` table with expiration date tracking.
- **Audit Log:** All admin create/update/delete actions write a `[AUDIT]` entry to the ledger for the affected project.

### 1.2 Client Communication Records

All client-facing communications (portal messages, field report publications, ledger entries visible to clients) are timestamped and retained indefinitely. The `client_portal_enabled` flag ensures clients only see data they are authorized to access.

---

## 2. Data Protection & Privacy

### 2.1 Data Categories

| Data Category      | Examples                           | Storage                          | Access Control                |
| ------------------ | ---------------------------------- | -------------------------------- | ----------------------------- |
| **Client PII**     | Name, email, phone, address        | Supabase PostgreSQL              | Admin + owning client via RLS |
| **Project Data**   | Budget, timeline, scope            | Supabase PostgreSQL              | Admin + owning client via RLS |
| **Voice Memos**    | Audio recordings                   | Netlify Blobs / Supabase Storage | Admin only                    |
| **Site Photos**    | Construction images                | Netlify Blobs / Supabase Storage | Admin + authenticated users   |
| **Financial Data** | Invoices, payments, billing events | Supabase PostgreSQL              | Admin only                    |

### 2.2 Data Retention

| Data Type            | Retention Period                                | Basis                       |
| -------------------- | ----------------------------------------------- | --------------------------- |
| Project records      | 6+ years post-completion                        | Oregon CCB OAR 812-003-0200 |
| Financial records    | 7 years                                         | IRS / Oregon DOR guidance   |
| Audit logs           | 6 years                                         | CCB compliance / liability  |
| Voice memos          | 2 years (or until transcribed and report saved) | Internal policy             |
| Client portal access | Duration of active project + 1 year             | Client agreement            |

### 2.3 Data Minimization

The platform collects only the minimum data necessary to operate each feature:

- AI transcription uses audio temporarily; the audio is not stored after transcription.
- Estimates are stored for 30 days by default unless a client account is linked.
- Vision Studio photos are not persisted after analysis unless explicitly saved.

---

## 3. Authentication & Access Control

### 3.1 Authentication Method

The platform uses **Supabase Auth with magic links (OTP)**. Password-based login is not supported by default to eliminate password breach risks.

- Magic links expire in **60 minutes**.
- Sessions use **JWT tokens** with a 1-hour expiry + automatic refresh.
- Session inactivity timeout: **60 minutes** (configurable via `useSessionTimeout` hook).

### 3.2 Role-Based Access Control

Two roles are enforced at every layer:

| Role    | Access                                                           |
| ------- | ---------------------------------------------------------------- |
| `admin` | Eric (owner). Full access to all platform features and all data. |
| `user`  | Clients. Access restricted to their own project data via RLS.    |

Access is enforced by:

1. **Client-side:** `AdminRoute` and `ProtectedRoute` guards redirect unauthorized users.
2. **tRPC layer:** `adminProcedure` and `protectedProcedure` throw `UNAUTHORIZED` / `FORBIDDEN` errors.
3. **Database layer:** PostgreSQL Row-Level Security (RLS) policies prevent cross-tenant data access even if the API layer were bypassed.
4. **Function layer:** `verifyAuth()` and `verifyAdmin()` guards in Netlify Functions validate JWTs before any operation.

### 3.3 Row-Level Security

RLS policies are defined in `drizzle/rls-policies.sql` and must be applied to the Supabase project after each schema migration. Key rules:

- **Users** can only read/update their own row.
- **Clients** can only read projects where `client_portal_enabled = true` and they are the linked client.
- **Portfolio projects** are readable by the public only if `is_published = true`.
- **Materials, sub-contractors, billing events** are admin-only.
- The **service-role key** (server-side only) bypasses RLS — it must never be exposed to client code.

> **Post-migration audit (required).** After applying any migration, run
> `drizzle/anon-policy-audit.sql` in the Supabase SQL editor. It must return
> **zero** anonymous-role policies and **zero** RLS-disabled tables. The app
> never relies on `anon`-role access — public data (the portfolio) is served
> via tRPC `publicProcedure`s using the service-role key server-side, and
> admins act as the `authenticated` role. A generic policy template once added
> an `anon` INSERT policy to `leads`; this audit catches any recurrence. Drop
> offenders with `DROP POLICY IF EXISTS "<name>" ON <table>;`.

> **Schema drift.** Objects created directly in the Supabase SQL editor
> without a matching file under `drizzle/` are invisible to this repo and
> to code review — the July 2026 linter pass found five (two functions,
> three tables) that existed live but nowhere in git. See
> `drizzle/security-linter-followup.sql` for the reconciliation status and
> the diagnostics to pull them back into version control.

### 3.4 Ledger Immutability

The Core Values ledger (`ledger_entries`) is append-only. Because the
server uses the service-role key (which bypasses RLS), append-only is
enforced at the **database layer** by triggers defined in
`drizzle/ledger-immutability.sql`, which must be applied to the Supabase
project once (Supabase SQL editor or `psql`). The triggers:

- **Block** any `UPDATE` that changes a recorded entry's content, and any
  direct `DELETE` of an entry whose project still exists.
- **Allow** the legitimate FK-maintenance flows: `ON DELETE CASCADE` when a
  project is removed, and `ON DELETE SET NULL` of `author_id` when a user is
  removed.

This makes recorded decisions and cost adjustments tamper-evident even if the
API layer or service-role key were misused.

---

## 4. API Security

### 4.1 Rate Limiting

All AI-powered endpoints enforce per-IP and per-user rate limits to prevent abuse and control API costs:

| Endpoint                | Anonymous Limit | Authenticated Limit | Window   |
| ----------------------- | --------------- | ------------------- | -------- |
| `/api/estimate-project` | 10 requests     | 30 requests         | 1 minute |
| `/api/ai-chat`          | 20 requests     | 20 requests         | 1 minute |
| `/api/vision-studio`    | Auth required   | 15 analyses         | 1 hour   |
| `/api/voice-to-report`  | Auth required   | 5 reports           | 1 hour   |

Clients that exceed limits receive a `429 Too Many Requests` response with a `Retry-After` header.

### 4.2 CORS Policy

The API only allows requests from trusted origins:

- `https://precisioncorebuilders.com`
- `https://www.precisioncorebuilders.com`
- `https://precision-core.netlify.app`
- Current Netlify deploy preview URL (injected automatically)
- Localhost variants in development mode

Requests from other origins receive a `403 Forbidden` response.

### 4.3 Input Validation

All tRPC procedure inputs are validated with **Zod schemas** before any database or AI operation. Validation failures return `400 Bad Request` with descriptive error messages.

### 4.4 Secret Management

- All API keys and secrets are stored in the **Netlify dashboard** (Environment Variables section).
- No secrets appear in source code or git history.
- Client-side code only receives `VITE_`-prefixed variables (Supabase public anon key, Supabase URL).
- The Supabase service-role key is server-side only and never exposed to browsers.

---

## 5. Infrastructure Security

### 5.1 Security Headers

The following headers are applied to all responses via `netlify.toml`:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 5.2 HTTPS

All traffic is served over HTTPS. Netlify provides automatic SSL/TLS certificates via Let's Encrypt. HTTP requests are automatically redirected to HTTPS.

### 5.3 Database Security

- Supabase PostgreSQL with Row-Level Security enabled on all 12 application tables.
- Database connections use SSL by default.
- The service-role key is rotated quarterly or immediately if compromised.
- Regular backups managed by Supabase (point-in-time recovery).

---

## 6. Incident Response

### 6.1 Data Breach Procedure

In the event of a suspected data breach:

1. **Immediately:** Rotate all API keys in the Netlify dashboard.
2. **Within 1 hour:** Revoke the Supabase service-role key and generate a new one.
3. **Within 24 hours:** Review Netlify function logs and Supabase audit logs to determine scope.
4. **Within 72 hours:** Notify affected clients if PII was exposed (Oregon ORS 646A.600 breach notification).

### 6.2 Key Rotation Schedule

| Secret                    | Rotation Frequency                  |
| ------------------------- | ----------------------------------- |
| Supabase service-role key | Quarterly                           |
| Anthropic API key         | Annually or on personnel change     |
| OpenWeatherMap API key    | Annually                            |
| Stripe keys               | Annually or on suspected compromise |
| n8n webhook secret        | Annually                            |

---

## 7. Oregon-Specific Requirements

### 7.1 Oregon Consumer Privacy Act (OCPA)

Oregon's OCPA (effective July 2024) applies to businesses that meet certain thresholds. As a small construction contractor, Precision Core Builders likely falls below the threshold (100,000 consumers/year), but the platform is designed to be OCPA-ready:

- Clients can request deletion of their personal data (contact Eric directly).
- Client data is not sold to third parties.
- Data processing is limited to platform operations only.

### 7.2 Oregon CCB Public Records

The CCB license number (CCB #246527) is displayed publicly on the website and in client-facing documents as required by ORS 701.305.

### 7.3 Payment Processing

All payment processing is handled by **Stripe**, a PCI DSS Level 1 certified processor. No payment card data is stored in the Precision Core Builders database. Stripe webhook events are logged to `billing_events` for reconciliation.

---

## 8. Security Contact

For security issues, vulnerabilities, or data requests, contact:

**Eric Tadlock**  
Precision Core Builders  
CCB #246527  
Eugene, OR 97401

---

_This document should be reviewed annually and updated after any significant infrastructure change._
