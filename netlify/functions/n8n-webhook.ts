/**
 * n8n-webhook — Relay platform events to n8n for automation.
 * POST /api/n8n-webhook with { event, payload }
 *
 * Events:
 * - lead_captured: New estimator submission or contact form
 * - material_shortage: Inventory below threshold
 * - sub_notification: Schedule/access update for subcontractor
 * - milestone_complete: Project milestone reached
 * - inspection_scheduled: Inspection date set
 * - payment_received: Stripe payment confirmed
 */
import type { Handler } from "@netlify/functions";
import { ENV } from "../../server/_core/env";
import { checkOrigin, corsHeaders } from "./_utils/corsGuard";
import { timingSafeEqualStr } from "./_lib/crypto";
import { verifyAdmin } from "./_utils/authGuard";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";

const VALID_EVENTS = [
  "lead_captured",
  "material_shortage",
  "sub_notification",
  "milestone_complete",
  "inspection_scheduled",
  "payment_received",
  "field_report_created",
  "project_status_changed",
  "client_notification",
] as const;

type WebhookEvent = (typeof VALID_EVENTS)[number];

/**
 * The public estimator fires `lead_captured` from an anonymous browser, so it
 * can't carry a secret or a session. It is the ONLY event accepted without
 * authentication, and only with this allow-listed, length-capped shape — never
 * arbitrary caller-supplied JSON forwarded to the automation backend.
 */
const PUBLIC_LEAD_FIELDS = [
  "name",
  "email",
  "phone",
  "projectType",
  "complexity",
  "squareFootage",
  "estimatedLow",
  "estimatedMid",
  "estimatedHigh",
  "source",
] as const;

function sanitizePublicLeadPayload(
  payload: Record<string, unknown> | undefined
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const key of PUBLIC_LEAD_FIELDS) {
    const v = payload?.[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, 200);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out;
}

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  // n8n webhooks arrive server-to-server (no Origin header) so checkOrigin
  // allows them; browser requests from allowed origins are also permitted.
  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "" };
  }

  // Inbound authentication. checkOrigin deliberately allows server-to-server
  // (no-Origin) calls, so on its own it does not stop anyone who can reach this
  // URL from injecting platform events. A caller is authorized when it presents
  // EITHER:
  //   - the shared N8N_WEBHOOK_SECRET (n8n / server-to-server) via
  //       X-N8N-Signature: <secret>   or   Authorization: Bearer <secret>
  //     (timing-safe comparison), OR
  //   - a valid admin session (Supabase admin JWT / admin session token) — this
  //     is how the admin pages relay events from the browser. They cannot hold
  //     the shared secret, so before this every admin-triggered event (task
  //     complete, field report published, milestone billed, ...) was rejected.
  // Anonymous callers may only send `lead_captured` (see below).
  const configuredSecret = process.env.N8N_WEBHOOK_SECRET ?? "";
  const bearer = event.headers["authorization"] ?? "";
  const bearerSecret = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7).trim()
    : "";
  const providedSecret = event.headers["x-n8n-signature"] ?? bearerSecret;

  let authorized =
    configuredSecret !== "" &&
    providedSecret !== "" &&
    timingSafeEqualStr(providedSecret, configuredSecret);
  if (!authorized && bearerSecret) {
    // The bearer may be an admin session token rather than the shared secret.
    authorized = (await verifyAdmin(event.headers)).ok;
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const { event: eventType, payload } = body as {
      event?: string;
      payload?: Record<string, unknown>;
    };

    if (!eventType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'event' field" }),
      };
    }

    if (!VALID_EVENTS.includes(eventType as WebhookEvent)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Invalid event type: ${eventType}`,
          validEvents: VALID_EVENTS,
        }),
      };
    }

    // Unauthenticated callers: only the public estimator's `lead_captured`,
    // rate-limited per IP and reduced to a whitelisted payload. Everything else
    // keeps the previous fail-closed behaviour.
    let relayPayload: Record<string, unknown> = payload ?? {};
    if (!authorized) {
      if (eventType === "lead_captured") {
        const ip = getClientIp(
          event.headers as Record<string, string | undefined>
        );
        const rl = checkRateLimit(`n8n-lead:${ip}`, {
          maxRequests: 5,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          return {
            statusCode: 429,
            headers: { ...headers, ...rateLimitHeaders(rl) },
            body: JSON.stringify({ error: "Too many requests" }),
          };
        }
        relayPayload = sanitizePublicLeadPayload(payload);
      } else if (configuredSecret) {
        console.warn(
          "[n8n-webhook] Rejected inbound request: bad/missing secret"
        );
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      } else if (ENV.isProduction) {
        // Fail closed in production: an unset secret must not leave
        // platform-event injection open.
        console.error(
          "[n8n-webhook] N8N_WEBHOOK_SECRET is not set in production — refusing " +
            "unauthenticated inbound requests. Configure the secret or call with an admin session."
        );
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Webhook not configured" }),
        };
      } else {
        console.warn(
          "[n8n-webhook] N8N_WEBHOOK_SECRET not set — inbound endpoint is " +
            "UNAUTHENTICATED (non-production). Configure the secret to require " +
            "request signing."
        );
      }
    }

    const webhookUrl = ENV.n8nWebhookUrl;
    if (!webhookUrl) {
      // n8n not configured — log but don't fail
      console.warn(
        "[n8n-webhook] N8N_WEBHOOK_URL not configured, skipping relay"
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          relayed: false,
          reason: "n8n webhook URL not configured",
          event: eventType,
        }),
      };
    }

    // Relay to n8n with event routing path
    const n8nUrl = webhookUrl.endsWith("/")
      ? `${webhookUrl}${eventType}`
      : `${webhookUrl}/${eventType}`;

    const n8nPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      source: "precision-core-builders",
      payload: relayPayload,
    };

    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    const relaySuccess = res.ok;
    if (!relaySuccess) {
      console.error(
        `[n8n-webhook] Relay failed: ${res.status} ${res.statusText}`
      );
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: `n8n relay failed with status ${res.status}`,
          event: eventType,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        relayed: true,
        event: eventType,
        n8nStatus: res.status,
      }),
    };
  } catch (err) {
    console.error("[n8n-webhook] Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Webhook relay failed",
      }),
    };
  }
};
