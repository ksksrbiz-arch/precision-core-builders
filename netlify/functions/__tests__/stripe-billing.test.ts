/**
 * stripe-billing — request validation and the Stripe payloads it builds.
 * Stripe itself is a mocked `fetch`; auth is a mocked admin.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_utils/authGuard", () => ({
  verifyAdmin: vi.fn(async () => ({
    ok: true,
    user: { id: "admin", email: "a@x.com", role: "admin" },
  })),
}));

const stripeCalls: Array<{
  method: string;
  path: string;
  body: URLSearchParams;
}> = [];

function stubStripe() {
  stripeCalls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = url.replace("https://api.stripe.com/v1", "");
      stripeCalls.push({
        method: init.method ?? "GET",
        path,
        body: new URLSearchParams(String(init.body ?? "")),
      });
      const json = (data: unknown) =>
        ({ ok: true, status: 200, json: async () => data }) as Response;
      if (path.startsWith("/customers?")) return json({ data: [] });
      if (path.startsWith("/customers")) return json({ id: "cus_1" });
      if (path.startsWith("/products")) return json({ id: "prod_1" });
      if (path.startsWith("/prices")) return json({ id: "price_1" });
      if (path.startsWith("/payment_links"))
        return json({ id: "plink_1", url: "https://pay" });
      if (path.endsWith("/finalize") || path.endsWith("/send"))
        return json({ id: "in_1", status: "open", amount_due: 5000 });
      if (path.startsWith("/invoiceitems")) return json({ id: "ii_1" });
      if (path.startsWith("/invoices?")) return json({ data: [] });
      if (path.startsWith("/invoices")) return json({ id: "in_1" });
      return json({});
    })
  );
}

async function call(body: object) {
  vi.resetModules();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  const { handler } = await import("../stripe-billing");
  const res = await handler(
    {
      httpMethod: "POST",
      headers: {
        origin: "https://precision-core.netlify.app",
        authorization: "Bearer t",
      },
      body: JSON.stringify(body),
    } as never,
    {} as never
  );
  return { statusCode: res!.statusCode, body: JSON.parse(res!.body as string) };
}

beforeEach(() => {
  stubStripe();
});

describe("create_payment_link validation", () => {
  it.each([
    ["NaN-ish string", "abc"],
    ["zero", 0],
    ["negative", -500],
    ["above Stripe's maximum", 100_000_000],
    ["Infinity", "Infinity"],
    ["null", null],
  ])("rejects an amount that is %s", async (_label, amountCents) => {
    const { statusCode } = await call({
      action: "create_payment_link",
      amountCents,
      description: "Deposit",
    });
    expect(statusCode).toBe(400);
    expect(stripeCalls).toHaveLength(0);
  });

  it("stamps projectId into payment-link metadata so the webhook can reconcile", async () => {
    await call({
      action: "create_payment_link",
      amountCents: 5000,
      description: "Deposit",
      projectId: 42,
    });
    const link = stripeCalls.find(c => c.path === "/payment_links")!;
    expect(link.body.get("metadata[project_id]")).toBe("42");
  });

  it("omits payment-link metadata when no project is given", async () => {
    await call({
      action: "create_payment_link",
      amountCents: 5000,
      description: "Deposit",
    });
    const link = stripeCalls.find(c => c.path === "/payment_links")!;
    expect(link.body.has("metadata[project_id]")).toBe(false);
  });

  it("rounds a fractional amount to whole cents", async () => {
    const { statusCode } = await call({
      action: "create_payment_link",
      amountCents: 1234.6,
      description: "Deposit",
    });
    expect(statusCode).toBe(200);
    const price = stripeCalls.find(c => c.path === "/prices")!;
    expect(price.body.get("unit_amount")).toBe("1235");
  });
});

describe("create_invoice", () => {
  const base = {
    action: "create_invoice",
    clientEmail: "c@example.com",
    amountCents: 5000,
    description: "Milestone 1",
  };

  it("defaults to net-14 when no due date is given", async () => {
    const { statusCode } = await call(base);
    expect(statusCode).toBe(200);
    const inv = stripeCalls.find(c => c.path === "/invoices")!;
    expect(inv.body.get("days_until_due")).toBe("14");
    expect(inv.body.has("due_date")).toBe(false);
  });

  it("sends a valid future dueDate as Stripe's due_date (unix seconds)", async () => {
    const due = new Date(Date.now() + 10 * 86_400_000);
    const { statusCode } = await call({ ...base, dueDate: due.toISOString() });
    expect(statusCode).toBe(200);
    const inv = stripeCalls.find(c => c.path === "/invoices")!;
    expect(inv.body.get("due_date")).toBe(
      String(Math.floor(due.getTime() / 1000))
    );
    // Stripe rejects send_invoice with both; and it needs one of the two.
    expect(inv.body.has("days_until_due")).toBe(false);
  });

  it.each(["not a date", "2001-01-01"])(
    "falls back to net-14 for an unusable dueDate (%s)",
    async dueDate => {
      await call({ ...base, dueDate });
      const inv = stripeCalls.find(c => c.path === "/invoices")!;
      expect(inv.body.get("days_until_due")).toBe("14");
      expect(inv.body.has("due_date")).toBe(false);
    }
  );

  it("stamps projectId into metadata so the webhook can reconcile payment", async () => {
    await call({ ...base, projectId: 42 });
    const inv = stripeCalls.find(c => c.path === "/invoices")!;
    expect(inv.body.get("metadata[project_id]")).toBe("42");
  });

  it("requires an email and a valid amount", async () => {
    expect((await call({ ...base, clientEmail: "" })).statusCode).toBe(400);
    expect((await call({ ...base, amountCents: -1 })).statusCode).toBe(400);
  });
});

describe("list_invoices", () => {
  it.each([
    [undefined, "20"],
    [30, "30"],
    [9999, "100"],
    [0, "1"],
    ["5&customer=cus_other", "20"],
  ])("clamps limit %j to %s", async (limit, expected) => {
    await call({ action: "list_invoices", limit });
    const req = stripeCalls.find(c => c.path.startsWith("/invoices?"))!;
    expect(new URL(`https://x${req.path}`).searchParams.get("limit")).toBe(
      expected
    );
    // No smuggled extra query params.
    expect(new URL(`https://x${req.path}`).searchParams.has("customer")).toBe(
      false
    );
  });
});
