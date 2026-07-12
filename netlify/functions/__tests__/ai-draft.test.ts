/**
 * Tests for the ai-draft Netlify Function.
 * Covers HTTP method gating, admin authentication, and input validation.
 * (The actual LLM call is not exercised — it requires live API keys, and the
 * validation/lookup guards short-circuit before any provider call.)
 */
import { describe, expect, it } from "vitest";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters?: Record<string, string> | null;
};

const ORIGIN = "https://precision-core.netlify.app";
// Dev bypass token recognised by authGuard (admin) outside production.
const DEV_TOKEN = "dev-admin-token";

function mockEvent(
  method = "POST",
  body?: object,
  headers: Record<string, string> = {}
): NetlifyEvent {
  return {
    httpMethod: method,
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: null,
  };
}

const auth = { authorization: `Bearer ${DEV_TOKEN}` };

describe("ai-draft function", () => {
  it("responds to OPTIONS preflight", async () => {
    const { handler } = await import("../ai-draft");
    const res = await handler(mockEvent("OPTIONS") as any, {} as any);
    expect([200, 204]).toContain(res.statusCode);
    expect(res.headers).toHaveProperty("Access-Control-Allow-Origin");
  });

  it("returns 405 for non-POST requests", async () => {
    const { handler } = await import("../ai-draft");
    const res = await handler(mockEvent("GET") as any, {} as any);
    expect(res.statusCode).toBe(405);
  });

  it("requires authentication (401 without a token)", async () => {
    const { handler } = await import("../ai-draft");
    const res = await handler(
      mockEvent("POST", { kind: "client-update", projectId: 1 }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(401);
  });

  it("rejects an invalid draft kind", async () => {
    const { handler } = await import("../ai-draft");
    const res = await handler(
      mockEvent("POST", { kind: "bogus", projectId: 1 }, auth) as any,
      {} as any
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/kind/i);
  });

  it("requires a valid projectId", async () => {
    const { handler } = await import("../ai-draft");
    const res = await handler(
      mockEvent("POST", { kind: "client-update" }, auth) as any,
      {} as any
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/projectId/i);
  });
});
