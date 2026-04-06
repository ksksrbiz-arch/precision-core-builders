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

const VALID_EVENTS = [
  "lead_captured",
  "material_shortage",
  "sub_notification",
  "milestone_complete",
  "inspection_scheduled",
  "payment_received",
  "field_report_created",
  "project_status_changed",
] as const;

type WebhookEvent = (typeof VALID_EVENTS)[number];

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "" };
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
      payload: payload ?? {},
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
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        relayed: relaySuccess,
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
