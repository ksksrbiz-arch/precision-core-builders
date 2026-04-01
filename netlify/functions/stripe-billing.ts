/**
 * stripe-billing — Create Stripe payment links and invoices for project milestones.
 * Uses Stripe API directly via fetch (no SDK dependency needed).
 * POST /api/stripe-billing with action: "create_payment_link" | "create_invoice" | "list_invoices"
 */
import type { Handler } from "@netlify/functions";
import { ENV } from "../../server/_core/env";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(method: string, path: string, body?: Record<string, string | number | boolean | undefined>) {
  const key = ENV.stripeSecretKey;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured in Netlify environment.");

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
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe error ${res.status}`);
  return data;
}

export const handler: Handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "" };

  try {
    const { action, ...params } = JSON.parse(event.body ?? "{}");

    switch (action) {
      // Create a one-time payment link for a milestone amount
      case "create_payment_link": {
        const { amountCents, description, projectName, clientEmail } = params;
        if (!amountCents || !description) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "amountCents and description required" }) };
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
          ...(clientEmail && { "customer_creation": "always" }),
        });

        return {
          statusCode: 200, headers,
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
        const { clientEmail, clientName, amountCents, description, projectName, dueDate } = params;
        if (!clientEmail || !amountCents || !description) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "clientEmail, amountCents, description required" }) };
        }

        // Find or create customer
        const customers = await stripeRequest("GET", `/customers?email=${encodeURIComponent(clientEmail)}&limit=1`);
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

        // Create invoice
        const invoice = await stripeRequest("POST", "/invoices", {
          customer: customerId,
          collection_method: "send_invoice",
          days_until_due: dueDate ? undefined : 14,
          description: `${projectName ?? "Project"} — ${description}`,
        });

        // Add line item
        await stripeRequest("POST", "/invoiceitems", {
          customer: customerId,
          price: price.id,
          invoice: invoice.id,
        });

        // Finalize
        const finalized = await stripeRequest("POST", `/invoices/${invoice.id}/finalize`, {});

        return {
          statusCode: 200, headers,
          body: JSON.stringify({
            invoiceId: finalized.id,
            invoiceUrl: finalized.hosted_invoice_url,
            invoicePdf: finalized.invoice_pdf,
            status: finalized.status,
            amountDue: finalized.amount_due,
            clientEmail,
          }),
        };
      }

      // List recent invoices
      case "list_invoices": {
        const { limit = 20 } = params;
        const invoices = await stripeRequest("GET", `/invoices?limit=${limit}&expand[]=data.customer`);
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ invoices: invoices.data ?? [] }),
        };
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }
  } catch (err) {
    console.error("[stripe-billing]", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
