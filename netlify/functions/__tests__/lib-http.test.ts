import { describe, expect, it } from "vitest";
import type { HandlerEvent } from "@netlify/functions";
import { withGuards } from "../_lib/http";

function makeEvent(overrides: Partial<HandlerEvent>): HandlerEvent {
  return {
    httpMethod: "POST",
    headers: { origin: "https://precisioncorebuilders.com" },
    body: null,
    path: "/.netlify/functions/test",
    ...overrides,
  } as HandlerEvent;
}

const ok = withGuards({ methods: ["POST"] }, ({ json }) =>
  json(200, { ok: true })
);

describe("withGuards", () => {
  it("answers OPTIONS preflight with 204 + CORS headers", async () => {
    const res = await ok(makeEvent({ httpMethod: "OPTIONS" }), {} as never);
    expect(res?.statusCode).toBe(204);
    expect(res?.headers?.["Access-Control-Allow-Origin"]).toBeDefined();
  });

  it("rejects disallowed methods with 405", async () => {
    const res = await ok(makeEvent({ httpMethod: "GET" }), {} as never);
    expect(res?.statusCode).toBe(405);
  });

  it("runs the wrapped handler for an allowed request", async () => {
    const res = await ok(makeEvent({}), {} as never);
    expect(res?.statusCode).toBe(200);
    expect(JSON.parse(res?.body as string)).toEqual({ ok: true });
  });

  it("requires auth when configured and none is supplied", async () => {
    const guarded = withGuards({ auth: "user" }, ({ json }) =>
      json(200, { ok: true })
    );
    const res = await guarded(
      makeEvent({ headers: { origin: "https://precisioncorebuilders.com" } }),
      {} as never
    );
    expect(res?.statusCode).toBe(401);
  });

  it("enforces rate limits", async () => {
    const limited = withGuards(
      {
        methods: ["POST"],
        rateLimit: { key: () => "test-bucket", maxRequests: 1 },
      },
      ({ json }) => json(200, { ok: true })
    );
    const first = await limited(makeEvent({}), {} as never);
    const second = await limited(makeEvent({}), {} as never);
    expect(first?.statusCode).toBe(200);
    expect(second?.statusCode).toBe(429);
  });

  it("converts a thrown handler error into a 500", async () => {
    const boom = withGuards({ methods: ["POST"] }, () => {
      throw new Error("kaboom");
    });
    const res = await boom(makeEvent({}), {} as never);
    expect(res?.statusCode).toBe(500);
  });
});
