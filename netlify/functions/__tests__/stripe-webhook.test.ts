/**
 * Tests for stripe-webhook Netlify function.
 *
 * Covers:
 *  - HTTP gating (POST only)
 *  - Webhook secret config check (503 when missing)
 *  - Signature verification: valid, missing, tampered, expired
 *  - Event dispatch: invoice.paid / checkout.session.completed /
 *    invoice.payment_failed / unknown
 *  - Database insertion via Supabase service role
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "../stripe-webhook";

const WEBHOOK_SECRET = "whsec_test_abc123";

function signPayload(
  body: string,
  secret = WEBHOOK_SECRET,
  timestamp = Math.floor(Date.now() / 1000)
): string {
  const sig = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function mockEvent(opts: {
  method?: string;
  body?: object | string;
  signature?: string;
}) {
  const rawBody =
    typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body ?? {});
  return {
    httpMethod: opts.method ?? "POST",
    headers: opts.signature ? { "stripe-signature": opts.signature } : {},
    body: rawBody,
  };
}

const insertMock = vi.fn(() => Promise.resolve({ error: null }));
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

async function loadHandler() {
  vi.resetModules();
  const mod = await import("../stripe-webhook");
  return mod.handler;
}

describe("verifyStripeSignature", () => {
  it("accepts a freshly signed payload", () => {
    const body = JSON.stringify({ type: "ping" });
    const header = signPayload(body);
    expect(verifyStripeSignature(body, header, WEBHOOK_SECRET)).toBe(true);
  });

  it("rejects a missing signature header", () => {
    expect(verifyStripeSignature("{}", undefined, WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects a missing secret", () => {
    const body = "{}";
    const header = signPayload(body);
    expect(verifyStripeSignature(body, header, "")).toBe(false);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const body = JSON.stringify({ type: "tampered" });
    const header = signPayload(body, "whsec_attacker");
    expect(verifyStripeSignature(body, header, WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects when the body has been tampered with after signing", () => {
    const original = JSON.stringify({ type: "invoice.paid", amount: 100 });
    const tampered = JSON.stringify({ type: "invoice.paid", amount: 999999 });
    const header = signPayload(original);
    expect(verifyStripeSignature(tampered, header, WEBHOOK_SECRET)).toBe(false);
  });

  it("rejects timestamps outside the tolerance window", () => {
    const body = "{}";
    const tenMinAgo = Math.floor(Date.now() / 1000) - 600;
    const header = signPayload(body, WEBHOOK_SECRET, tenMinAgo);
    expect(verifyStripeSignature(body, header, WEBHOOK_SECRET, 300)).toBe(
      false
    );
  });

  it("rejects malformed signature headers", () => {
    expect(
      verifyStripeSignature("{}", "not-a-real-header", WEBHOOK_SECRET)
    ).toBe(false);
    expect(verifyStripeSignature("{}", "t=abc,v1=zzz", WEBHOOK_SECRET)).toBe(
      false
    );
  });
});

describe("stripe-webhook handler", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    insertMock.mockClear();
    fromMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects non-POST methods", async () => {
    const handler = await loadHandler();
    const res = await handler(mockEvent({ method: "GET" }) as any, {} as any);
    expect(res!.statusCode).toBe(405);
  });

  it("returns 503 when STRIPE_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const handler = await loadHandler();
    const res = await handler(
      mockEvent({ body: { type: "invoice.paid" } }) as any,
      {} as any
    );
    expect(res!.statusCode).toBe(503);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects an unsigned request with 400", async () => {
    const handler = await loadHandler();
    const res = await handler(
      mockEvent({ body: { type: "invoice.paid" } }) as any,
      {} as any
    );
    expect(res!.statusCode).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a tampered body with 400", async () => {
    const handler = await loadHandler();
    const original = JSON.stringify({
      id: "evt_1",
      type: "invoice.paid",
      data: { object: { id: "in_1", amount_paid: 1000 } },
    });
    const sig = signPayload(original);
    const tampered = original.replace("1000", "999999");
    const res = await handler(
      {
        httpMethod: "POST",
        headers: { "stripe-signature": sig },
        body: tampered,
      } as any,
      {} as any
    );
    expect(res!.statusCode).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("records an invoice.paid event into billing_events", async () => {
    const handler = await loadHandler();
    const body = JSON.stringify({
      id: "evt_paid_1",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_123",
          amount_paid: 250000,
          currency: "usd",
          customer: "cus_1",
          customer_email: "client@example.com",
          customer_name: "Test Client",
          number: "INV-001",
          hosted_invoice_url: "https://stripe.test/invoice",
          invoice_pdf: "https://stripe.test/invoice.pdf",
          description: "Milestone 1",
        },
      },
    });
    const sig = signPayload(body);

    const res = await handler(
      mockEvent({ body, signature: sig }) as any,
      {} as any
    );

    expect(res!.statusCode).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("billing_events");
    expect(insertMock).toHaveBeenCalledTimes(1);
    const inserted = insertMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(inserted.event_type).toBe("invoice.paid");
    expect(inserted.amount_cents).toBe(250000);
    expect(inserted.client_email).toBe("client@example.com");
    expect(inserted.stripe_invoice_id).toBe("in_123");
  });

  it("records a checkout.session.completed event", async () => {
    const handler = await loadHandler();
    const body = JSON.stringify({
      id: "evt_co_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          amount_total: 50000,
          currency: "usd",
          payment_intent: "pi_1",
          payment_link: "plink_1",
          customer_details: { email: "buyer@example.com", name: "Buyer" },
        },
      },
    });
    const sig = signPayload(body);

    const res = await handler(
      mockEvent({ body, signature: sig }) as any,
      {} as any
    );

    expect(res!.statusCode).toBe(200);
    const inserted = insertMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(inserted.event_type).toBe("checkout.completed");
    expect(inserted.amount_cents).toBe(50000);
  });

  it("records an invoice.payment_failed event", async () => {
    const handler = await loadHandler();
    const body = JSON.stringify({
      id: "evt_fail_1",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_fail",
          amount_due: 100000,
          attempt_count: 2,
          last_finalization_error: { message: "card_declined" },
        },
      },
    });
    const sig = signPayload(body);

    const res = await handler(
      mockEvent({ body, signature: sig }) as any,
      {} as any
    );

    expect(res!.statusCode).toBe(200);
    const inserted = insertMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(inserted.event_type).toBe("payment_failed");
    expect(inserted.amount_cents).toBe(100000);
  });

  it("acknowledges unknown event types without writing to the DB", async () => {
    const handler = await loadHandler();
    const body = JSON.stringify({
      id: "evt_skip_1",
      type: "customer.created",
      data: { object: { id: "cus_skip" } },
    });
    const sig = signPayload(body);

    const res = await handler(
      mockEvent({ body, signature: sig }) as any,
      {} as any
    );

    expect(res!.statusCode).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
    const parsed = JSON.parse(res!.body as string);
    expect(parsed.ignored).toBe("customer.created");
  });
});
