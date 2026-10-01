/**
 * n8n-webhook inbound authorization.
 *
 * Three kinds of caller:
 *   - n8n / server-to-server: shared N8N_WEBHOOK_SECRET
 *   - admin pages in the browser: an admin session (they can't hold the secret;
 *     before this fix every admin-triggered event was rejected 401/503)
 *   - the anonymous public estimator: `lead_captured` ONLY, rate-limited and
 *     reduced to a whitelisted payload
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_utils/authGuard", () => ({
  verifyAdmin: vi.fn(async (headers: Record<string, string | undefined>) =>
    headers["authorization"] === "Bearer admin-session"
      ? { ok: true, user: { id: "admin", email: "a@x.com", role: "admin" } }
      : { ok: false, statusCode: 401, message: "no" }
  ),
}));

const relayed: Array<{ url: string; body: any }> = [];

async function call(opts: {
  body: object;
  headers?: Record<string, string>;
  ip?: string;
  env?: Record<string, string>;
}) {
  vi.resetModules();
  vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/webhook");
  vi.stubEnv("N8N_WEBHOOK_SECRET", opts.env?.N8N_WEBHOOK_SECRET ?? "");
  vi.stubEnv("NODE_ENV", opts.env?.NODE_ENV ?? "production");
  const { handler } = await import("../n8n-webhook");
  const res = await handler(
    {
      httpMethod: "POST",
      headers: {
        origin: "https://precision-core.netlify.app",
        "x-forwarded-for": opts.ip ?? "203.0.113.7",
        ...opts.headers,
      },
      body: JSON.stringify(opts.body),
    } as never,
    {} as never
  );
  return { statusCode: res!.statusCode, body: JSON.parse(res!.body as string) };
}

beforeEach(() => {
  relayed.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      relayed.push({ url, body: JSON.parse(String(init.body)) });
      return { ok: true, status: 200, statusText: "OK" } as Response;
    })
  );
});

describe("shared secret", () => {
  it("accepts the secret via X-N8N-Signature", async () => {
    const r = await call({
      body: { event: "material_shortage", payload: { projectId: 1 } },
      headers: { "x-n8n-signature": "s3cret" },
      env: { N8N_WEBHOOK_SECRET: "s3cret" },
    });
    expect(r.statusCode).toBe(200);
    expect(relayed[0].url).toBe(
      "https://n8n.example/webhook/material_shortage"
    );
    expect(relayed[0].body.payload).toEqual({ projectId: 1 });
  });

  it("rejects a wrong secret with 401", async () => {
    const r = await call({
      body: { event: "material_shortage" },
      headers: { "x-n8n-signature": "nope" },
      env: { N8N_WEBHOOK_SECRET: "s3cret" },
    });
    expect(r.statusCode).toBe(401);
    expect(relayed).toHaveLength(0);
  });
});

describe("admin session (browser)", () => {
  it("is accepted even when no shared secret is configured in production", async () => {
    const r = await call({
      body: { event: "milestone_complete", payload: { projectId: 9 } },
      headers: { authorization: "Bearer admin-session" },
    });
    expect(r.statusCode).toBe(200);
    expect(relayed[0].body.event).toBe("milestone_complete");
    // Admin payloads are forwarded as-is (not whitelisted).
    expect(relayed[0].body.payload).toEqual({ projectId: 9 });
  });

  it("does not accept an arbitrary bearer token", async () => {
    const r = await call({
      body: { event: "milestone_complete" },
      headers: { authorization: "Bearer guess" },
      env: { N8N_WEBHOOK_SECRET: "s3cret" },
    });
    expect(r.statusCode).toBe(401);
    expect(relayed).toHaveLength(0);
  });
});

describe("anonymous callers", () => {
  it("fails closed for non-lead events in production without a secret (503)", async () => {
    const r = await call({ body: { event: "milestone_complete" } });
    expect(r.statusCode).toBe(503);
    expect(relayed).toHaveLength(0);
  });

  it("returns 401 for non-lead events when a secret is configured", async () => {
    const r = await call({
      body: { event: "payment_received" },
      env: { N8N_WEBHOOK_SECRET: "s3cret" },
    });
    expect(r.statusCode).toBe(401);
  });

  it("relays lead_captured with only the whitelisted, capped fields", async () => {
    const r = await call({
      body: {
        event: "lead_captured",
        payload: {
          name: "Jane",
          email: "jane@example.com",
          estimatedMid: 42000,
          squareFootage: 1200,
          notes: "x".repeat(50),
          // Injection attempts / junk must be dropped:
          admin: true,
          webhookUrl: "https://evil.example",
          phone: "5".repeat(500),
        },
      },
      ip: "198.51.100.1",
    });
    expect(r.statusCode).toBe(200);
    const sent = relayed[0].body.payload;
    expect(sent).toMatchObject({
      name: "Jane",
      email: "jane@example.com",
      estimatedMid: 42000,
      squareFootage: 1200,
    });
    expect(sent).not.toHaveProperty("admin");
    expect(sent).not.toHaveProperty("webhookUrl");
    expect(sent).not.toHaveProperty("notes");
    expect(sent.phone).toHaveLength(200);
  });

  it("rate-limits anonymous lead_captured per IP (429 on the 6th)", async () => {
    // Drive the limiter within a single module instance (state is per-import).
    vi.resetModules();
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/webhook");
    vi.stubEnv("N8N_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const { handler } = await import("../n8n-webhook");
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await handler(
        {
          httpMethod: "POST",
          headers: {
            origin: "https://precision-core.netlify.app",
            "x-forwarded-for": "198.51.100.99",
          },
          body: JSON.stringify({ event: "lead_captured", payload: {} }),
        } as never,
        {} as never
      );
      codes.push(res!.statusCode);
    }
    expect(codes.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(codes[5]).toBe(429);
  });
});

describe("validation", () => {
  it("rejects an unknown event type", async () => {
    const r = await call({
      body: { event: "drop_tables" },
      headers: { authorization: "Bearer admin-session" },
    });
    expect(r.statusCode).toBe(400);
  });
});
