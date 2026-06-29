/**
 * stripe-webhook — Receives Stripe webhook events and records payment
 * completions in Supabase. Configure this endpoint in Stripe Dashboard:
 *   <your-site-url>/.netlify/functions/stripe-webhook
 * where <your-site-url> is the value of VITE_SITE_URL (e.g.
 * https://precisioncorebuilders.com or https://precision-core.netlify.app).
 *
 * Security: every request is verified with the Stripe-Signature header
 * against STRIPE_WEBHOOK_SECRET. Unsigned or tampered events are rejected
 * before any database write happens.
 *
 * Events handled:
 * - invoice.paid → record payment in billing_events
 * - checkout.session.completed → record payment link completion
 * - invoice.payment_failed → flag for follow-up
 */
import type { Handler } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "../../server/_core/env";
import { requireSupabaseAdmin } from "../../server/_core/supabase";

/**
 * Verify a Stripe webhook signature.
 * Mirrors `stripe.webhooks.constructEvent` so we don't pull in the SDK.
 *
 * @returns true when the signature is valid AND the timestamp is within
 *          `toleranceSeconds` of now (default 5 minutes — Stripe default).
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!signatureHeader || !secret) return false;

  // Header format: "t=<timestamp>,v1=<sig1>,v1=<sig2>,..."
  let timestamp: string | null = null;
  const v1Sigs: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") timestamp = v ?? null;
    else if (k === "v1" && v) v1Sigs.push(v);
  }
  if (!timestamp || v1Sigs.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  return v1Sigs.some(sig => {
    const sigBuf = Buffer.from(sig, "hex");
    return (
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

export const handler: Handler = async event => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "" };
  }

  // Reject unsigned events outright. Without a secret in the env we can't
  // trust anything that arrives — fail closed.
  if (!ENV.stripeWebhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "Webhook secret not configured" }),
    };
  }

  const rawBody = event.body ?? "";
  const sigHeader =
    (event.headers as Record<string, string | undefined>)["stripe-signature"] ??
    (event.headers as Record<string, string | undefined>)["Stripe-Signature"];

  if (!verifyStripeSignature(rawBody, sigHeader, ENV.stripeWebhookSecret)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid signature" }),
    };
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch (err) {
    console.warn("[stripe-webhook] invalid JSON payload", err);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON in webhook body" }),
    };
  }
  const eventType: string = body.type ?? "";
  const data = body.data?.object;

  if (!data) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "No event data" }),
    };
  }

  const db = requireSupabaseAdmin();

  try {
    switch (eventType) {
      case "invoice.paid": {
        const { error } = await db.from("billing_events").insert({
          stripe_event_id: body.id,
          stripe_invoice_id: data.id,
          event_type: "invoice.paid",
          amount_cents: data.amount_paid ?? 0,
          currency: data.currency ?? "usd",
          client_email: data.customer_email ?? null,
          client_name: data.customer_name ?? null,
          description: data.description ?? data.lines?.data?.[0]?.description,
          invoice_url: data.hosted_invoice_url ?? null,
          invoice_pdf: data.invoice_pdf ?? null,
          metadata: {
            stripe_customer_id: data.customer,
            invoice_number: data.number,
          },
        });
        if (error) console.error("[stripe-webhook] Insert error:", error);
        break;
      }

      case "checkout.session.completed": {
        const { error } = await db.from("billing_events").insert({
          stripe_event_id: body.id,
          event_type: "checkout.completed",
          amount_cents: data.amount_total ?? 0,
          currency: data.currency ?? "usd",
          client_email: data.customer_details?.email ?? null,
          client_name: data.customer_details?.name ?? null,
          description: `Payment link completion`,
          metadata: {
            payment_intent: data.payment_intent,
            payment_link: data.payment_link,
            session_id: data.id,
          },
        });
        if (error) console.error("[stripe-webhook] Insert error:", error);
        break;
      }

      case "invoice.payment_failed": {
        const { error } = await db.from("billing_events").insert({
          stripe_event_id: body.id,
          stripe_invoice_id: data.id,
          event_type: "payment_failed",
          amount_cents: data.amount_due ?? 0,
          currency: data.currency ?? "usd",
          client_email: data.customer_email ?? null,
          client_name: data.customer_name ?? null,
          description: `Payment failed: ${data.last_finalization_error?.message ?? "unknown reason"}`,
          metadata: {
            attempt_count: data.attempt_count,
            next_attempt: data.next_payment_attempt,
          },
        });
        if (error) console.error("[stripe-webhook] Insert error:", error);
        break;
      }

      default:
        // Acknowledge but don't process unhandled events
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ received: true, ignored: eventType }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, type: eventType }),
    };
  } catch (err) {
    console.error("[stripe-webhook] Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Webhook processing failed",
      }),
    };
  }
};
