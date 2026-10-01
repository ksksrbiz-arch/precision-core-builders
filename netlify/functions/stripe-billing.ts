/**
 * stripe-billing — Create Stripe payment links and invoices for project milestones.
 * Uses Stripe API directly via fetch (no SDK dependency needed).
 * POST /api/stripe-billing with action: "create_payment_link" | "create_invoice" | "list_invoices"
 */
import type { Handler } from "@netlify/functions";
import { ENV } from "../../server/_core/env";
import { checkOrigin, corsHeaders } from "./_utils/corsGuard";
import { verifyAdmin } from "./_utils/authGuard";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(
  method: string,
  path: string,
  body?: Record<string, string | number | boolean | undefined>
) {
  const key = ENV.stripeSecretKey;
  if (!key)
    throw new Error("STRIPE_SECRET_KEY not configured in Netlify environment.");

  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body && method !== "GET") {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) params.set(k, String(v));
    }
    opts.body = params.toString();
  }

  const res = await fetch(`${STRIPE_API}${path}`, opts);
  const data = (await res.json()) as any;
  if (!res.ok)
    throw new Error(data?.error?.message ?? `Stripe error ${res.status}`);
  return data;
}

/** Stripe's maximum single charge is 99,999,999 minor units ($999,999.99). */
const MAX_AMOUNT_CENTS = 99_999_999;

/**
 * A usable amount: a finite whole number of cents within Stripe's limits.
 * Rejects NaN/Infinity/negatives/strings, so `Math.round(amountCents)` can
 * never turn junk into `NaN`/`0` and reach the Stripe API.
 */
function parseAmountCents(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n);
  return cents >= 1 && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

/**
 * Convert a client-supplied due date (ISO date/datetime) to the Unix-seconds
 * `due_date` Stripe expects. Must be in the future. Returns `null` when absent
 * or unusable so the caller can fall back to net-14.
 */
function parseDueDate(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms <= Date.now()) return null;
  return Math.floor(ms / 1000);
}

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST")
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };

  // Admin-only: these actions create Stripe charges/payment links, send
  // invoices, and list invoices with customer PII. Must never be reachable
  // unauthenticated (previously only CORS + IP rate limiting gated it).
  const auth = await verifyAdmin(event.headers);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.message }),
    };
  }

  // Rate limit: 20 billing requests per minute per admin.
  const rl = checkRateLimit(`stripe-billing:${auth.user.id}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "Too many requests. Please wait a minute and try again.",
      }),
    };
  }

  try {
    const { action, ...params } = JSON.parse(event.body ?? "{}");

    switch (action) {
      // Create a one-time payment link for a milestone amount
      case "create_payment_link": {
        const { description, projectName, clientEmail, projectId } = params;
        const amountCents = parseAmountCents(params.amountCents);
        if (amountCents === null || !description) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error:
                "amountCents (whole cents, 1–99,999,999) and description required",
            }),
          };
        }

        // Create product
        const product = await stripeRequest("POST", "/products", {
          name: `${projectName ?? "Project"} — ${description}`,
        });

        // Create price
        const price = await stripeRequest("POST", "/prices", {
          product: product.id,
          unit_amount: amountCents,
          currency: "usd",
        });

        // Create payment link
        const link = await stripeRequest("POST", "/payment_links", {
          "line_items[0][price]": price.id,
          "line_items[0][quantity]": 1,
          ...(clientEmail && { customer_creation: "always" }),
          // Copied onto the checkout session so stripe-webhook can post the
          // payment to this project's ledger (checkout.session.completed reads
          // metadata.project_id). Without it payment links never reconciled.
          ...(projectId != null && projectId !== ""
            ? { "metadata[project_id]": projectId }
            : {}),
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            paymentLinkUrl: link.url,
            paymentLinkId: link.id,
            priceId: price.id,
            productId: product.id,
            amountCents,
            description,
          }),
        };
      }

      // Create a formal Stripe invoice and send to client
      case "create_invoice": {
        const {
          clientEmail,
          clientName,
          description,
          projectName,
          projectId,
          dueDate,
        } = params;
        const amountCents = parseAmountCents(params.amountCents);
        if (!clientEmail || amountCents === null || !description) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error:
                "clientEmail, amountCents (whole cents, 1–99,999,999), description required",
            }),
          };
        }

        // Find or create customer
        const customers = await stripeRequest(
          "GET",
          `/customers?email=${encodeURIComponent(clientEmail)}&limit=1`
        );
        let customerId: string;
        if (customers.data?.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await stripeRequest("POST", "/customers", {
            email: clientEmail,
            name: clientName,
          });
          customerId = customer.id;
        }

        // Create product & price
        const product = await stripeRequest("POST", "/products", {
          name: `${projectName ?? "Construction"} — ${description}`,
        });
        const price = await stripeRequest("POST", "/prices", {
          product: product.id,
          unit_amount: amountCents,
          currency: "usd",
        });

        // `send_invoice` requires EITHER days_until_due OR due_date. A supplied
        // dueDate used to blank days_until_due without ever sending due_date,
        // so Stripe rejected the invoice outright. Use the date when it is a
        // valid future one, otherwise net-14.
        const dueDateUnix = parseDueDate(dueDate);

        // Create invoice. When a projectId is supplied we stamp it into the
        // invoice metadata so the webhook can reconcile the payment against the
        // right project ledger once the client pays.
        const invoice = await stripeRequest("POST", "/invoices", {
          customer: customerId,
          collection_method: "send_invoice",
          ...(dueDateUnix !== null
            ? { due_date: dueDateUnix }
            : { days_until_due: 14 }),
          description: `${projectName ?? "Project"} — ${description}`,
          ...(projectId != null && projectId !== ""
            ? { "metadata[project_id]": projectId }
            : {}),
        });

        // Add line item
        await stripeRequest("POST", "/invoiceitems", {
          customer: customerId,
          price: price.id,
          invoice: invoice.id,
        });

        // Finalize
        const finalized = await stripeRequest(
          "POST",
          `/invoices/${invoice.id}/finalize`,
          {}
        );

        // Send the invoice so Stripe emails it to the client. Without this the
        // invoice would sit "open" in Stripe and the client would never be
        // notified — even though the admin UI already toasts "Invoice sent".
        const sent = await stripeRequest(
          "POST",
          `/invoices/${finalized.id}/send`,
          {}
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            invoiceId: sent.id ?? finalized.id,
            invoiceUrl: sent.hosted_invoice_url ?? finalized.hosted_invoice_url,
            invoicePdf: sent.invoice_pdf ?? finalized.invoice_pdf,
            status: sent.status ?? finalized.status,
            amountDue: sent.amount_due ?? finalized.amount_due,
            clientEmail,
          }),
        };
      }

      // List recent invoices
      case "list_invoices": {
        // Clamp to Stripe's 1–100 page size; an unvalidated value was
        // interpolated straight into the query string.
        const requested = Number(params.limit);
        const limit = Number.isFinite(requested)
          ? Math.min(100, Math.max(1, Math.floor(requested)))
          : 20;
        const invoices = await stripeRequest(
          "GET",
          `/invoices?limit=${limit}&expand[]=data.customer`
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ invoices: invoices.data ?? [] }),
        };
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` }),
        };
    }
  } catch (err) {
    console.error("[stripe-billing]", err);
    const message = err instanceof Error ? err.message : String(err);
    // Preserve the not-configured signal the client keys on; mask everything
    // else (raw Stripe/DB error text) behind a generic message.
    const notConfigured = message.includes("STRIPE_SECRET_KEY");
    return {
      statusCode: notConfigured ? 503 : 500,
      headers,
      body: JSON.stringify({
        error: notConfigured
          ? "STRIPE_SECRET_KEY not configured."
          : "Billing action failed. Please try again.",
      }),
    };
  }
};
