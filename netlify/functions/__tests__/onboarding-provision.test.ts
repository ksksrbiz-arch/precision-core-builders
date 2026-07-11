/**
 * Tests for onboarding-provision Netlify function.
 *
 * Covers:
 *  - HTTP method gates
 *  - Configuration checks (env vars)
 *  - Token authentication (timing-safe)
 *  - Phase allowlist enforcement
 *  - Payload validation
 *  - Netlify API interaction (mocked)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters?: Record<string, string> | null;
  isBase64Encoded?: boolean;
};

function mockEvent(
  method = "POST",
  body?: object,
  headers: Record<string, string> = {}
): NetlifyEvent {
  return {
    httpMethod: method,
    headers: {
      "content-type": "application/json",
      origin: "https://precision-core.netlify.app",
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: null,
  };
}

const VALID_TOKEN = "test-onboarding-token-abc123xyz";

async function loadHandler() {
  // Re-import for each test to pick up env changes
  vi.resetModules();
  const mod = await import("../onboarding-provision");
  return mod.handler;
}

describe("onboarding-provision function", () => {
  beforeEach(() => {
    vi.stubEnv("ONBOARDING_TOKEN", VALID_TOKEN);
    vi.stubEnv("NETLIFY_AUTH_TOKEN", "nfp_test_token");
    vi.stubEnv("NETLIFY_SITE_ID", "site-123");
    vi.stubEnv("NETLIFY_ACCOUNT_ID", "account-456");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        if (init?.method === "GET") {
          return new Response("not found", { status: 404 });
        }
        return new Response(JSON.stringify({ id: "deploy-789" }), {
          status: 201,
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("HTTP method handling", () => {
    it("returns 204 for OPTIONS preflight", async () => {
      const handler = await loadHandler();
      const res = await handler(mockEvent("OPTIONS") as any, {} as any);
      expect(res.statusCode).toBe(204);
    });

    it("returns 405 for GET", async () => {
      const handler = await loadHandler();
      const res = await handler(mockEvent("GET") as any, {} as any);
      expect(res.statusCode).toBe(405);
    });

    it("returns 405 for PUT", async () => {
      const handler = await loadHandler();
      const res = await handler(mockEvent("PUT") as any, {} as any);
      expect(res.statusCode).toBe(405);
    });
  });

  describe("Configuration checks", () => {
    it("returns 503 when NETLIFY_AUTH_TOKEN missing", async () => {
      vi.stubEnv("NETLIFY_AUTH_TOKEN", "");
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-test" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.body!).error).toMatch(/NETLIFY/);
    });

    it("returns 503 when ONBOARDING_TOKEN missing", async () => {
      vi.stubEnv("ONBOARDING_TOKEN", "");
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: "whatever",
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-test" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.body!).error).toMatch(/ONBOARDING_TOKEN/);
    });
  });

  describe("Token authentication", () => {
    it("rejects missing token with 401", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-test" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(401);
    });

    it("rejects wrong token with 401", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: "wrong-token-but-exact-right-length",
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-test" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(401);
    });

    it("rejects token of wrong length with 401", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: "short",
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-test" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(401);
    });

    it("rejects non-string token with 401", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: 12345,
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-test" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(401);
    });
  });

  describe("Phase allowlist", () => {
    it("rejects unknown phase with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "nuclear-launch-codes",
          vars: { FOO: "bar" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body!).error).toMatch(/Unknown phase/);
    });

    it("rejects keys not in the phase allowlist with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { STRIPE_SECRET_KEY: "sk_test_leak" }, // wrong phase
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body!).error).toMatch(/not allowed/);
    });

    it("accepts all six phases (ai, weather, supabase, stripe, n8n, voice)", async () => {
      const phases = [
        {
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-test" },
        },
        { phase: "weather", vars: { OPENWEATHERMAP_API_KEY: "abc123" } },
        {
          phase: "supabase",
          vars: {
            SUPABASE_URL: "https://x.supabase.co",
            SUPABASE_ANON_KEY: "anon",
          },
        },
        {
          phase: "stripe",
          vars: { STRIPE_SECRET_KEY: "sk_test_x" },
        },
        { phase: "n8n", vars: { N8N_WEBHOOK_URL: "https://x.n8n.cloud" } },
        { phase: "voice", vars: { ELEVENLABS_API_KEY: "eleven" } },
      ];

      for (const p of phases) {
        const handler = await loadHandler();
        const res = await handler(
          mockEvent("POST", {
            onboardingToken: VALID_TOKEN,
            ...p,
          }) as any,
          {} as any
        );
        expect(res.statusCode, `phase=${p.phase}`).toBeLessThan(400);
      }
    });
  });

  describe("Payload validation", () => {
    it("rejects missing vars with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body!).error).toMatch(/vars/);
    });

    it("rejects empty vars object with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: {},
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
    });

    it("rejects empty string values with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "   " }, // whitespace only
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body!).error).toMatch(/empty/);
    });

    it("rejects values over 2048 chars with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "x".repeat(3000) },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body!).error).toMatch(/2048/);
    });
  });

  describe("Happy path", () => {
    it("writes a single missing var via POST, returns 200", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("not found", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 201 })
        );
      vi.stubGlobal("fetch", fetchMock);

      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-api03-abc" },
        }) as any,
        {} as any
      );

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(true);
      expect(body.written).toEqual(["GROQ_API_KEY"]);
      // Verify GET (exists check) then POST (create) were called
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/env/GROQ_API_KEY"),
        expect.objectContaining({ method: "GET" })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/env?site_id="),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("creates on GET 404", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("not found", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 201 })
        );
      vi.stubGlobal("fetch", fetchMock);

      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-new" },
        }) as any,
        {} as any
      );

      expect(res.statusCode).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][1].method).toBe("GET");
      expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    });

    it("does not overwrite an existing env var", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ key: "GROQ_API_KEY" }), {
          status: 200,
        })
      );
      vi.stubGlobal("fetch", fetchMock);

      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk-existing" },
        }) as any,
        {} as any
      );

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(true);
      expect(body.written).toEqual([]);
      expect(body.skippedExisting).toEqual(["GROQ_API_KEY"]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    });

    it("triggers deploy when triggerDeploy=true", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("not found", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: "deploy-id-xyz" }), { status: 200 })
        );
      vi.stubGlobal("fetch", fetchMock);

      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk" },
          triggerDeploy: true,
        }) as any,
        {} as any
      );

      const body = JSON.parse(res.body!);
      expect(body.deployId).toBe("deploy-id-xyz");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/builds"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("does NOT trigger deploy when triggerDeploy is false or omitted", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("not found", { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 200 })
        );
      vi.stubGlobal("fetch", fetchMock);

      const handler = await loadHandler();
      await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "ai",
          vars: { GROQ_API_KEY: "gsk" },
        }) as any,
        {} as any
      );

      // Expected sequence: GET exists check, then POST create. No deploy call.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][1].method).toBe("GET");
      expect(fetchMock.mock.calls[1][1].method).toBe("POST");
      expect(
        fetchMock.mock.calls.some(call => String(call[0]).includes("/builds"))
      ).toBe(false);
    });

    it("returns 207 multi-status when some keys fail", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("not found", { status: 404 })) // key 1 exists check
        .mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 200 })
        ) // key 1 create succeeds
        .mockResolvedValueOnce(new Response("not found", { status: 404 })) // key 2 exists check
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: "rate limited" }), {
            status: 429,
          })
        ); // key 2 create fails
      vi.stubGlobal("fetch", fetchMock);

      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          phase: "stripe",
          vars: {
            STRIPE_SECRET_KEY: "sk_test_1",
            STRIPE_PUBLISHABLE_KEY: "pk_test_2",
          },
        }) as any,
        {} as any
      );

      expect(res.statusCode).toBe(207);
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(false);
      expect(body.written).toHaveLength(1);
      expect(body.failed).toHaveLength(1);
    });
  });

  describe("Error handling", () => {
    it("returns 500 on malformed JSON body", async () => {
      const handler = await loadHandler();
      const evt = mockEvent("POST");
      evt.body = "{not valid json";
      const res = await handler(evt as any, {} as any);
      expect(res.statusCode).toBe(500);
    });
  });
});
