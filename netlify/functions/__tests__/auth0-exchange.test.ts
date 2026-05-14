import type { HandlerContext, HandlerEvent } from "@netlify/functions";
import { handler } from "../auth0-exchange";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
};

function mockEvent(method = "POST", body?: object): NetlifyEvent {
  return {
    httpMethod: method,
    headers: {
      origin: "https://precision-core.netlify.app",
    },
    body: body ? JSON.stringify(body) : null,
  };
}

describe("auth0-exchange function", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH0_DOMAIN", "");
    vi.stubEnv("AUTH0_ISSUER_BASE_URL", "");
    vi.stubEnv("AUTH0_CLIENT_ID", "auth0-client-id");
    vi.stubEnv("AUTH0_CLIENT_SECRET", "auth0-client-secret");
    vi.stubEnv("ADMIN_EMAIL", "eric@precisioncorebuilders.com");
    vi.stubEnv("ADMIN_SESSION_TOKEN", "session-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns 503 when domain and issuer config are missing", async () => {
    const res = await handler(
      mockEvent("POST", {
        code: "oauth-code",
        redirectUri: "https://precision-core.netlify.app/auth/callback",
      }) as unknown as HandlerEvent,
      {} as HandlerContext
    );

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe(
      "Auth0 is not configured. Set AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and either AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL in Netlify environment variables."
    );
  });

  it("uses AUTH0_ISSUER_BASE_URL when AUTH0_DOMAIN is unset", async () => {
    vi.stubEnv("AUTH0_ISSUER_BASE_URL", "https://dev-tenant.us.auth0.com/");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token-123" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: "eric@precisioncorebuilders.com",
          email_verified: true,
        }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const res = await handler(
      mockEvent("POST", {
        code: "oauth-code",
        redirectUri: "https://precision-core.netlify.app/auth/callback",
      }) as unknown as HandlerEvent,
      {} as HandlerContext
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body).toEqual({
      token: "session-token",
      email: "eric@precisioncorebuilders.com",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev-tenant.us.auth0.com/oauth/token",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev-tenant.us.auth0.com/userinfo",
      expect.any(Object)
    );
  });
});
