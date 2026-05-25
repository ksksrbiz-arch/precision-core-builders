import type { HandlerContext, HandlerEvent } from "@netlify/functions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
};

function mockEvent(
  method = "POST",
  body?: object,
  ip = "203.0.113.10"
): NetlifyEvent {
  return {
    httpMethod: method,
    headers: {
      origin: "https://precision-core.netlify.app",
      "x-forwarded-for": ip,
    },
    body: body ? JSON.stringify(body) : null,
  };
}

async function loadHandler() {
  vi.resetModules();
  const mod = await import("../admin-auth");
  return mod.handler;
}

describe("admin-auth function", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", "");
    vi.stubEnv("ADMIN_PASSWORD", "correct-password");
    vi.stubEnv("ADMIN_SESSION_TOKEN", "session-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows skdev@1commerce.online as a built-in admin", async () => {
    const handler = await loadHandler();
    const res = await handler(
      mockEvent("POST", {
        email: "skdev@1commerce.online",
        password: "correct-password",
      }) as unknown as HandlerEvent,
      {} as HandlerContext
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({
      token: "session-token",
    });
  });

  it("rejects non-admin email with the admin password", async () => {
    const handler = await loadHandler();
    const res = await handler(
      mockEvent(
        "POST",
        {
          email: "client@example.com",
          password: "correct-password",
        },
        "203.0.113.11"
      ) as unknown as HandlerEvent,
      {} as HandlerContext
    );

    expect(res.statusCode).toBe(401);
  });
});
