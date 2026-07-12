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
        const { amountCents, description, projectName, clientEmail } = params;
        if (!amountCents || !description) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: "amountCents and description required",
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
          unit_amount: Math.round(amountCents),
          currency: "usd",
        });

        // Create payment link
        const link = await stripeRequest("POST", "/payment_links", {
          "line_items[0][price]": price.id,
          "line_items[0][quantity]": 1,
          ...(clientEmail && { customer_creation: "always" }),
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
          amountCents,
          description,
          projectName,
          projectId,
          dueDate,
        } = params;
        if (!clientEmail || !amountCents || !description) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: "clientEmail, amountCents, description required",
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
          unit_amount: Math.round(amountCents),
          currency: "usd",
        });

        // Create invoice. When a projectId is supplied we stamp it into the
        // invoice metadata so the webhook can reconcile the payment against the
        // right project ledger once the client pays.
        const invoice = await stripeRequest("POST", "/invoices", {
          customer: customerId,
          collection_method: "send_invoice",
          days_until_due: dueDate ? undefined : 14,
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
        const { limit = 20 } = params;
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
