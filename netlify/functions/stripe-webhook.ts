/**
 * stripe-webhook — Receives Stripe webhook events and records payment
 * completions in Supabase. Configure this endpoint in Stripe Dashboard:
 * https://precision-core.netlify.app/.netlify/functions/stripe-webhook
 *
 * Events handled:
 * - invoice.paid → record payment in billing_events
 * - checkout.session.completed → record payment link completion
 * - invoice.payment_failed → flag for follow-up
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "../../server/_core/env";

function getDb() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error("Supabase not configured");
  }
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const handler: Handler = async event => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const eventType: string = body.type ?? "";
    const data = body.data?.object;

    if (!data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No event data" }),
      };
    }

    const db = getDb();

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
        error: err instanceof Error ? err.message : "Webhook processing failed",
      }),
    };
  }
};
