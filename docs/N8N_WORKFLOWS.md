# n8n Workflow Authoring Guide

_The last off-repo piece of the automation layer. Once these workflows exist in n8n and `N8N_WEBHOOK_URL` + `N8N_WEBHOOK_SECRET` are set in Netlify, the platform dispatches automatically — no code changes needed._

## Architecture

Two channels, both already implemented:

| Direction | Path | Auth |
| --- | --- | --- |
| Platform → n8n (events) | `POST {N8N_WEBHOOK_URL}/<event-path>` | n8n webhook node's own secret path |
| n8n → Platform (relay) | `POST /.netlify/functions/n8n-webhook` `{ event, payload }` | `X-N8N-Signature: <N8N_WEBHOOK_SECRET>` or `Authorization: Bearer <secret>` |

Inbound relay accepts these event types (`netlify/functions/n8n-webhook.ts`):
`lead_captured`, `material_shortage`, `sub_notification`, `milestone_complete`, `inspection_scheduled`, `payment_received`, `field_report_created`, `project_status_changed`, `client_notification`.

Outbound owner alerts (`server/_core/notification.ts` → `notifyOwner`):
`POST {N8N_WEBHOOK_URL}/owner-notify` with body `{ title, content, timestamp }` — needs a matching webhook path in n8n.

## Workflows to author

### 1. Owner notify (highest value — powers all `notifyOwner` calls)

- **Trigger:** Webhook node, path `owner-notify`, POST
- **Steps:** format message → send SMS (Twilio) and/or email to Eric
- **Payload in:** `{ title, content, timestamp }`
- **Used by:** project events, materials shortage alerts, ledger milestones

### 2. Lead captured → instant follow-up

- **Trigger:** Webhook node, path `lead-captured`
- **Steps:** notify Eric (SMS) → auto-reply email to the lead ("we'll call within 1 business day") → optional: add row to a Google Sheet CRM backup
- **Fired by:** estimator lead form, contact form

### 3. Sub-contractor briefing

- **Trigger:** Webhook node, path `sub-notification`
- **Steps:** format schedule/access briefing → SMS + email to the sub
- **Fired by:** `subContractorsRouter.sendBriefing`

### 4. Material shortage alert

- **Trigger:** Webhook node, path `material-shortage`
- **Steps:** notify Eric with item + shortfall; optional vendor price-check task
- **Fired by:** materials router when received qty < needed qty

### 5. Milestone complete → client update

- **Trigger:** Webhook node, path `milestone-complete`
- **Steps:** email client a plain-English progress note with portal link

### 6. Payment received → thank-you + receipt

- **Trigger:** Webhook node, path `payment-received`
- **Steps:** email client receipt confirmation; post internal note

## Setup checklist

1. Create the workflows above in n8n (cloud or self-hosted). Note each webhook node's full URL — n8n assembles them as `{base}/webhook/<path>` (production URL, not the test URL).
2. Netlify env: set `N8N_WEBHOOK_URL` to the n8n base webhook URL (no trailing slash).
3. Generate `N8N_WEBHOOK_SECRET` (any long random string); set it in Netlify **and** as a header credential in n8n for relay calls back into the platform.
4. Test: `curl -X POST https://<site>/.netlify/functions/n8n-webhook -H "Content-Type: application/json" -H "X-N8N-Signature: <secret>" -d '{"event":"client_notification","payload":{"message":"test"}}'` → expect `200`.
5. Flip each n8n workflow from **test** to **active**.
