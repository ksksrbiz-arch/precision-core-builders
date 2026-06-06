/**
 * Tests for the vision-studio Netlify Function.
 * Covers HTTP method gating, authentication, and input validation.
 * (The actual LLM call is not exercised — it requires live API keys.)
 */
import { describe, expect, it } from "vitest";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters?: Record<string, string> | null;
};

const ORIGIN = "https://precision-core.netlify.app";
// Dev bypass token recognised by authGuard outside production.
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

describe("vision-studio function", () => {
  it("responds to OPTIONS preflight", async () => {
    const { handler } = await import("../vision-studio");
    const res = await handler(mockEvent("OPTIONS") as any, {} as any);
    expect([200, 204]).toContain(res.statusCode);
    expect(res.headers).toHaveProperty("Access-Control-Allow-Origin");
  });

  it("returns 405 for non-POST requests", async () => {
    const { handler } = await import("../vision-studio");
    const res = await handler(mockEvent("GET") as any, {} as any);
    expect(res.statusCode).toBe(405);
  });

  it("requires authentication", async () => {
    const { handler } = await import("../vision-studio");
    const res = await handler(
      mockEvent("POST", { image: "abc" }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(401);
  });

  it("validates that an image is provided", async () => {
    const { handler } = await import("../vision-studio");
    const res = await handler(
      mockEvent("POST", {}, { authorization: `Bearer ${DEV_TOKEN}` }) as any,
      {} as any
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/image/i);
  });

  it("rejects unsupported media types", async () => {
    const { handler } = await import("../vision-studio");
    const res = await handler(
      mockEvent(
        "POST",
        { image: "abc", mediaType: "image/heic" },
        { authorization: `Bearer ${DEV_TOKEN}` }
      ) as any,
      {} as any
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/unsupported media type/i);
  });
});
