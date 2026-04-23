# Blueprint.am Integration

Precision Core Builders can link to [blueprint.am](https://blueprint.am) so
Eric and clients can attach plans/designs to PCB projects.

The integration supports **three modes** that coexist:

| Mode             | Works today?      | Requires                                                 |
| ---------------- | ----------------- | -------------------------------------------------------- |
| Deep-link        | ✅ Yes            | Nothing                                                  |
| Per-user API key | ✅ Yes            | Blueprint API key + `BLUEPRINT_ENCRYPTION_KEY`           |
| OAuth            | 🟡 Wired, dormant | `BLUEPRINT_CLIENT_ID` / `_SECRET` published by Blueprint |

## Feature flag

The UI is hidden by default. Enable it in the Netlify dashboard:

```
VITE_FEATURE_BLUEPRINT=true
```

This toggles:

- `/admin/blueprint` route and the **Blueprint** nav item under Business.
- `/portal/blueprint` route and the **Blueprints** link in the client portal nav.

## Required secrets

Add these in **Netlify → Site settings → Environment variables** (never in
the repo):

```
# 32-byte AES-256-GCM key (64 hex chars) — required to store any credential.
# Generate once and keep it stable; losing it invalidates all stored tokens.
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BLUEPRINT_ENCRYPTION_KEY=<64 hex chars>

# OAuth (optional — enables the "Connect with blueprint.am" button).
BLUEPRINT_CLIENT_ID=
BLUEPRINT_CLIENT_SECRET=

# Endpoints (override only if Blueprint publishes different hosts).
BLUEPRINT_BASE_URL=https://blueprint.am
BLUEPRINT_API_BASE_URL=https://api.blueprint.am

# Used to build the OAuth redirect URI. Set to the canonical site URL.
SITE_URL=https://precisioncorebuilders.com
```

## How it works

1. **Status** — `trpc.blueprint.getConnectionStatus` returns one of
   `connected`, `expired`, `disconnected` without exposing any secret.
2. **Connect (OAuth)** — `trpc.blueprint.startOAuth` returns an authorization
   URL with an HMAC-signed `state` parameter. The user is redirected to
   `blueprint.am`. Blueprint redirects back to
   `/.netlify/functions/blueprint-oauth-callback`, which verifies state,
   exchanges the code for tokens, encrypts them with AES-256-GCM, and
   upserts a row in `blueprint_connections`.
3. **Connect (API key)** — `trpc.blueprint.saveApiKey` lets a user paste a
   personal API key from their Blueprint account. The key is encrypted with
   AES-256-GCM before being written to `blueprint_connections.api_key_enc`.
4. **Calls to Blueprint** — use
   `/.netlify/functions/blueprint-proxy?path=/v1/...`. The proxy verifies
   the PCB JWT, loads the caller's connection, decrypts the credential, and
   forwards the request. Tokens never enter the browser.
5. **Artifacts** — once linked, admins attach Blueprint resources to a PCB
   project via `trpc.blueprint.attachArtifact`. Each attachment has a
   `visibleToClient` flag — clients only see rows where it's `true`.

## Security

- Tokens and API keys are encrypted at rest using AES-256-GCM
  (`server/_core/crypto.ts`).
- OAuth `state` is HMAC-signed and expires after 10 minutes.
- The proxy function enforces a path allowlist (`/v1/projects`, `/v1/designs`,
  `/v1/me`). Expand `ALLOWED_PATH_PATTERNS` in
  `netlify/functions/blueprint-proxy.ts` as use cases grow.
- Both Netlify Functions are rate-limited per IP.
- All connect/disconnect/attach/remove actions are written to the immutable
  ledger via `logAdminAction`.
- Rotating `BLUEPRINT_ENCRYPTION_KEY` invalidates all stored credentials; on
  next page load the status will read as `disconnected` and users will
  reconnect.

## Troubleshooting

| Symptom                                                 | Likely cause                                           |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `BLUEPRINT_ENCRYPTION_KEY is not configured`            | Env var missing or not 64 hex chars.                   |
| `OAuth is not configured` in the admin UI               | `BLUEPRINT_CLIENT_ID` / `_SECRET` not set yet.         |
| Callback redirects with `blueprint_error=invalid_state` | State expired (>10 min) or tampered with.              |
| Proxy returns `401 Blueprint token expired`             | OAuth access token past `expires_at`; user reconnects. |
| Proxy returns `400 Disallowed or missing path`          | Add the Blueprint API path to `ALLOWED_PATH_PATTERNS`. |

## Database tables

`blueprint_connections` — one row per PCB user.
`blueprint_artifacts` — project-scoped references to Blueprint resources.

Both are defined in `drizzle/schema.ts`. After editing, run:

```
pnpm db:push
```

to generate and apply the migration via Supabase.
