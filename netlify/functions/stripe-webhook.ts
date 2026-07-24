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
 * - charge.refunded → record refund + post negative ledger reversal
 */
import type { Handler } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "../../server/_core/env";
import { requireSupabaseAdmin } from "../../server/_core/supabase";

/**
 * Coerce a Stripe metadata value into a positive integer project id.
 * Stripe metadata values arrive as strings; anything non-numeric → null.
 */
function parseProjectId(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Resolve the PCB project id for a paid Stripe invoice. We look at the invoice
 * metadata first, then fall back to the first line item's metadata (Stripe
 * copies subscription/line metadata there). Returns null when unresolvable.
 */
function resolveInvoiceProjectId(data: Record<string, any>): number | null {
  return (
    parseProjectId(data.metadata?.project_id) ??
    parseProjectId(data.metadata?.projectId) ??
    parseProjectId(data.lines?.data?.[0]?.metadata?.project_id) ??
    null
  );
}

/**
 * Idempotency guard: has this Stripe event id already been recorded in
 * billing_events? Called before inserting the current event, so a `true`
 * result means a prior delivery of the same event already landed and we must
 * not post the ledger entry again. Fails open (returns false) on read errors so
 * a transient DB hiccup never silently drops a real payment reconciliation.
 */
async function eventAlreadyRecorded(
  db: SupabaseClient,
  stripeEventId: string | undefined
): Promise<boolean> {
  if (!stripeEventId) return false;
  const { data, error } = await db
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .limit(1);
  if (error) {
    console.error("[stripe-webhook] idempotency check failed:", error);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * Record a client payment in the project ledger so the immutable ledger and the
 * portal financials reflect real money received. Uses the "milestone" entry
 * type (the closest existing enum value for a payment milestone) and stores the
 * amount in dollars, matching the decimal columns elsewhere in the schema.
 */
async function recordLedgerPayment(
  db: SupabaseClient,
  input: {
    projectId: number;
    amountCents: number;
    currency: string;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    invoiceUrl?: string | null;
    source: string;
  }
): Promise<void> {
  const dollars = (input.amountCents / 100).toFixed(2);
  const currency = (input.currency || "usd").toUpperCase();
  const ref = input.invoiceNumber || input.invoiceId || "";
  const title = ref ? `Payment received — ${ref}` : "Payment received";
  const description = ref
    ? `Client payment of $${dollars} ${currency} received via Stripe for ${input.source} ${ref}.`
    : `Client payment of $${dollars} ${currency} received via Stripe (${input.source}).`;

  const { error } = await db.from("ledger_entries").insert({
    project_id: input.projectId,
    author_id: null,
    entry_type: "milestone",
    title,
    description,
    amount_delta: dollars,
    document_url: input.invoiceUrl ?? null,
    document_name: ref ? `Invoice ${ref}` : null,
    visible_to_client: true,
  });
  if (error) console.error("[stripe-webhook] Ledger insert error:", error);
}

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
        const projectId = resolveInvoiceProjectId(data);
        // Check for a prior delivery BEFORE we insert this event's row, so the
        // ledger entry is posted at most once per Stripe event.
        const alreadyRecorded =
          projectId !== null ? await eventAlreadyRecorded(db, body.id) : false;

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
          project_id: projectId,
          metadata: {
            stripe_customer_id: data.customer,
            invoice_number: data.number,
          },
        });
        if (error) console.error("[stripe-webhook] Insert error:", error);

        // Reconcile the payment into the project ledger. Skip when we can't
        // resolve a project or when this event was already processed.
        if (projectId !== null && !alreadyRecorded) {
          await recordLedgerPayment(db, {
            projectId,
            amountCents: data.amount_paid ?? 0,
            currency: data.currency ?? "usd",
            invoiceId: data.id,
            invoiceNumber: data.number,
            invoiceUrl: data.hosted_invoice_url,
            source: "invoice",
          });
        }
        break;
      }

      case "checkout.session.completed": {
        const projectId = parseProjectId(data.metadata?.project_id);
        const alreadyRecorded =
          projectId !== null ? await eventAlreadyRecorded(db, body.id) : false;

        const { error } = await db.from("billing_events").insert({
          stripe_event_id: body.id,
          event_type: "checkout.completed",
          amount_cents: data.amount_total ?? 0,
          currency: data.currency ?? "usd",
          client_email: data.customer_details?.email ?? null,
          client_name: data.customer_details?.name ?? null,
          description: `Payment link completion`,
          project_id: projectId,
          metadata: {
            payment_intent: data.payment_intent,
            payment_link: data.payment_link,
            session_id: data.id,
          },
        });
        if (error) console.error("[stripe-webhook] Insert error:", error);

        if (projectId !== null && !alreadyRecorded) {
          await recordLedgerPayment(db, {
            projectId,
            amountCents: data.amount_total ?? 0,
            currency: data.currency ?? "usd",
            invoiceId: data.invoice ?? null,
            invoiceNumber: null,
            invoiceUrl: null,
            source: "payment link",
          });
        }
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

      case "charge.refunded": {
        const projectId =
          parseProjectId(data.metadata?.project_id) ??
          parseProjectId(data.metadata?.projectId);
        const alreadyRecorded =
          projectId !== null ? await eventAlreadyRecorded(db, body.id) : false;

        // Amount of THIS refund: prefer the newest refund object's amount.
        // data.amount_refunded is cumulative across all refunds on the
        // charge, so it would double-count on repeated partial-refund events.
        const latestRefund = data.refunds?.data?.[0];
        const refundCents: number =
          latestRefund?.amount ?? data.amount_refunded ?? 0;

        const { error } = await db.from("billing_events").insert({
          stripe_event_id: body.id,
          event_type: "charge.refunded",
          amount_cents: refundCents,
          currency: data.currency ?? "usd",
          client_email:
            data.billing_details?.email ?? data.receipt_email ?? null,
          client_name: data.billing_details?.name ?? null,
          description: `Refund issued: ${latestRefund?.reason ?? "requested_by_customer"}`,
          project_id: projectId,
          metadata: {
            charge_id: data.id,
            refund_id: latestRefund?.id ?? null,
            payment_intent: data.payment_intent,
            amount_refunded_cumulative: data.amount_refunded ?? 0,
          },
        });
        if (error) console.error("[stripe-webhook] Insert error:", error);

        // Post a negative ledger entry so the immutable ledger and the portal
        // financials reflect the reversal. Same idempotency guard as payments.
        if (projectId !== null && !alreadyRecorded && refundCents > 0) {
          const dollars = (-(refundCents / 100)).toFixed(2);
          const currency = (data.currency || "usd").toUpperCase();
          const { error: ledgerError } = await db
            .from("ledger_entries")
            .insert({
              project_id: projectId,
              author_id: null,
              entry_type: "milestone",
              title: "Refund issued",
              description: `Refund of ${(refundCents / 100).toFixed(2)} ${currency} issued via Stripe (charge ${data.id}).`,
              amount_delta: dollars,
              document_url: null,
              document_name: null,
              visible_to_client: true,
            });
          if (ledgerError)
            console.error("[stripe-webhook] Ledger insert error:", ledgerError);
        }
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
