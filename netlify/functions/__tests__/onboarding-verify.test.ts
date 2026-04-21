/**
 * Tests for onboarding-verify Netlify function.
 *
 * Covers:
 *  - Auth gating
 *  - Service dispatch (anthropic, openweather, stripe, n8n, supabase, elevenlabs, cloudflare_ai)
 *  - Upstream response handling (success / 401 / network error)
 *  - Helpful error messages for common failure modes
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type NetlifyEvent = {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
};

function mockEvent(method = "POST", body?: object): NetlifyEvent {
  return {
    httpMethod: method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  };
}

const VALID_TOKEN = "test-onboarding-token-abc123xyz";

async function loadHandler() {
  vi.resetModules();
  const mod = await import("../onboarding-verify");
  return mod.handler;
}

describe("onboarding-verify function", () => {
  beforeEach(() => {
    vi.stubEnv("ONBOARDING_TOKEN", VALID_TOKEN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("HTTP + auth", () => {
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

    it("returns 503 when ONBOARDING_TOKEN not set", async () => {
      vi.stubEnv("ONBOARDING_TOKEN", "");
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: "anything",
          service: "anthropic",
          credentials: {},
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(503);
    });

    it("rejects wrong token with 401", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: "wrong-token-but-right-length-here",
          service: "anthropic",
          credentials: { ANTHROPIC_API_KEY: "sk" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(401);
    });

    it("rejects missing service/credentials with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
    });

    it("rejects unknown service with 400", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "blockchain-ai",
          credentials: {},
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(400);
    });
  });

  describe("Anthropic verification", () => {
    it("returns ok=true on successful API response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ content: [{ text: "pong" }] }), {
            status: 200,
          })
        )
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "anthropic",
          credentials: { ANTHROPIC_API_KEY: "sk-ant-real" },
        }) as any,
        {} as any
      );
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(true);
      expect(body.service).toBe("anthropic");
    });

    it("returns ok=false with clear message on 401", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }))
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "anthropic",
          credentials: { ANTHROPIC_API_KEY: "sk-ant-bad" },
        }) as any,
        {} as any
      );
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(false);
      expect(body.message).toMatch(/Invalid/i);
    });

    it("treats 429 rate-limit as a valid key", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }))
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "anthropic",
          credentials: { ANTHROPIC_API_KEY: "sk-ant-rate-limited" },
        }) as any,
        {} as any
      );
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(true);
    });
  });

  describe("OpenWeatherMap verification", () => {
    it("returns temp-aware message on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              name: "Eugene",
              main: { temp: 285 }, // Kelvin
            }),
            { status: 200 }
          )
        )
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "openweather",
          credentials: { OPENWEATHERMAP_API_KEY: "valid" },
        }) as any,
        {} as any
      );
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(true);
      expect(body.message).toMatch(/Eugene/);
      expect(body.message).toMatch(/°F/);
    });

    it("returns helpful message about 10-min activation on 401", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }))
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "openweather",
          credentials: { OPENWEATHERMAP_API_KEY: "freshly-created" },
        }) as any,
        {} as any
      );
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(false);
      expect(body.message).toMatch(/10 min/i);
    });
  });

  describe("Stripe verification", () => {
    it("distinguishes test vs live mode in message", async () => {
      const makeStripeResponse = () =>
        new Response(
          JSON.stringify({
            business_profile: { name: "Precision Core Builders" },
            charges_enabled: true,
          }),
          { status: 200 }
        );

      // Test mode
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeStripeResponse()));
      const handler1 = await loadHandler();
      const testRes = await handler1(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "stripe",
          credentials: { STRIPE_SECRET_KEY: "sk_test_abc" },
        }) as any,
        {} as any
      );
      expect(JSON.parse(testRes.body!).message).toMatch(/TEST mode/);

      // Live mode — re-stub after loadHandler's resetModules
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeStripeResponse()));
      const handler2 = await loadHandler();
      const liveRes = await handler2(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "stripe",
          credentials: { STRIPE_SECRET_KEY: "sk_live_xyz" },
        }) as any,
        {} as any
      );
      expect(JSON.parse(liveRes.body!).message).toMatch(/LIVE mode/);
    });

    it("flags charges-disabled accounts", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              business_profile: { name: "PCB" },
              charges_enabled: false,
            }),
            { status: 200 }
          )
        )
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "stripe",
          credentials: { STRIPE_SECRET_KEY: "sk_test_x" },
        }) as any,
        {} as any
      );
      expect(JSON.parse(res.body!).message).toMatch(/NOT enabled/);
    });
  });

  describe("n8n webhook verification", () => {
    it("rejects malformed URLs", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "n8n",
          credentials: { N8N_WEBHOOK_URL: "not-a-url" },
        }) as any,
        {} as any
      );
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(false);
      expect(body.message).toMatch(/valid URL/i);
    });

    it("accepts valid HTTPS URL with reachable endpoint", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("", { status: 200 }))
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "n8n",
          credentials: {
            N8N_WEBHOOK_URL: "https://skdev1.app.n8n.cloud/webhook/test",
          },
        }) as any,
        {} as any
      );
      expect(JSON.parse(res.body!).ok).toBe(true);
    });
  });

  describe("Supabase verification", () => {
    it("rejects malformed URL", async () => {
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "supabase",
          credentials: {
            SUPABASE_URL: "not-a-url",
            SUPABASE_ANON_KEY: "anon",
          },
        }) as any,
        {} as any
      );
      expect(JSON.parse(res.body!).ok).toBe(false);
    });

    it("rejects invalid anon key with 401", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("", { status: 401 }))
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "supabase",
          credentials: {
            SUPABASE_URL: "https://abc.supabase.co",
            SUPABASE_ANON_KEY: "bad-key",
          },
        }) as any,
        {} as any
      );
      expect(JSON.parse(res.body!).ok).toBe(false);
    });
  });

  describe("ElevenLabs verification", () => {
    it("returns subscription tier on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ subscription: { tier: "creator" } }),
              { status: 200 }
            )
          )
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "elevenlabs",
          credentials: { ELEVENLABS_API_KEY: "sk_valid" },
        }) as any,
        {} as any
      );
      const body = JSON.parse(res.body!);
      expect(body.ok).toBe(true);
      expect(body.message).toMatch(/creator/);
    });
  });

  describe("Cloudflare Workers AI verification", () => {
    it("rejects bad account ID + token combo", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("", { status: 403 }))
      );
      const handler = await loadHandler();
      const res = await handler(
        mockEvent("POST", {
          onboardingToken: VALID_TOKEN,
          service: "cloudflare_ai",
          credentials: {
            CLOUDFLARE_ACCOUNT_ID: "bad",
            CLOUDFLARE_WORKERS_AI_TOKEN: "bad",
          },
        }) as any,
        {} as any
      );
      expect(JSON.parse(res.body!).ok).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("returns 500 on malformed JSON body", async () => {
      const handler = await loadHandler();
      const evt = mockEvent("POST");
      evt.body = "{garbage";
      const res = await handler(evt as any, {} as any);
      expect(res.statusCode).toBe(500);
    });
  });
});
