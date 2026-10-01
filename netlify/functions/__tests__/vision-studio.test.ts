/**
 * Tests for the vision-studio Netlify Function.
 * Covers HTTP method gating, authentication, input validation, and the AI
 * contract: pinned `vision-analyst` route, contract injected ahead of the
 * photo, dollar-figure output guard, usage logging, and fail-down errors. The
 * provider is a stubbed `fetch` — no live key needed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logAiUsage = vi.fn(async (_entry: unknown) => {});
vi.mock("../../../server/_core/aiUsage", () => ({
  logAiUsage: (entry: unknown) => logAiUsage(entry),
}));
// The handler needs a provider key to attempt the call; the call itself is a
// stubbed global fetch.
vi.mock("../../../server/_core/env", async () => {
  const actual = await vi.importActual<
    typeof import("../../../server/_core/env")
  >("../../../server/_core/env");
  return {
    ...actual,
    ENV: {
      ...actual.ENV,
      openrouterApiKey: "test-key",
      openrouterVisionModel: "",
    },
  };
});

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

describe("vision-studio — AI contract", () => {
  const fetchMock = vi.fn();

  function providerReply(content: string) {
    return {
      ok: true,
      statusText: "OK",
      json: async () => ({
        choices: [{ message: { content } }],
        model: "vision-model",
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
  }

  async function analyse(body: object = {}) {
    const { handler } = await import("../vision-studio");
    const res = await handler(
      mockEvent(
        "POST",
        { image: "aGVsbG8=", ...body },
        {
          authorization: `Bearer ${DEV_TOKEN}`,
          "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
        }
      ) as any,
      {} as any
    );
    return { status: res.statusCode, body: JSON.parse(res.body) };
  }

  beforeEach(() => {
    fetchMock.mockReset();
    logAiUsage.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pins the vision-analyst specialist and injects its contract before the photo", async () => {
    fetchMock.mockResolvedValue(providerReply("Framing is visible. KNOWN."));
    const { status, body } = await analyse({ mode: "progress" });
    expect(status).toBe(200);
    expect(body.route).toBe("vision-analyst");
    expect(body.routeReason).toBe("caller-pinned");
    expect(body.mode).toBe("progress");

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    const [system, user] = sent.messages;
    expect(system.role).toBe("system");
    expect(system.content).toContain("SPECIALIST CONTRACT");
    expect(system.content).toContain("not a measurement");
    expect(system.content).toContain("ABSOLUTE PROHIBITIONS");
    // The photo only appears in the user turn, after the contract.
    expect(
      user.content.some((p: { type: string }) => p.type === "image_url")
    ).toBe(true);
    expect(sent.max_tokens).toBe(4096);
  });

  it("uses the registry's prompt for the requested mode and falls back to general", async () => {
    fetchMock.mockResolvedValue(providerReply("ok"));
    await analyse({ mode: "safety" });
    let user = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1];
    expect(user.content[0].text).toMatch(/safety concerns/i);

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(providerReply("ok"));
    const { body } = await analyse({ mode: "toString" });
    user = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1];
    expect(user.content[0].text).toMatch(/comprehensive analysis/i);
    expect(body.mode).toBe("general");
  });

  it("redacts any dollar figure the model produces", async () => {
    fetchMock.mockResolvedValue(
      providerReply("Replacing the deck would run $12,500 for materials.")
    );
    const { body } = await analyse({ mode: "estimate" });
    expect(body.analysis).not.toMatch(/\$12,500/);
    expect(body.redactedAmounts).toBeGreaterThan(0);
  });

  it("logs usage for the governance panel", async () => {
    fetchMock.mockResolvedValue(providerReply("ok"));
    await analyse();
    expect(logAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "vision-studio",
        provider: "openrouter",
        model: "vision-model",
        totalTokens: 15,
      })
    );
  });

  it("fails down with a plain message instead of leaking provider text", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: "Bad Gateway",
      json: async () => ({
        error: { message: "upstream key sk-secret rejected" },
      }),
    });
    const { status, body } = await analyse();
    expect(status).toBe(502);
    expect(body.error).toMatch(/unavailable/i);
    expect(JSON.stringify(body)).not.toMatch(/sk-secret/);
    expect(logAiUsage).not.toHaveBeenCalled();
  });

  it("reports a timeout as 504", async () => {
    const err = new Error("The operation was aborted due to timeout");
    err.name = "TimeoutError";
    fetchMock.mockRejectedValue(err);
    const { status, body } = await analyse();
    expect(status).toBe(504);
    expect(body.error).toMatch(/timed out/i);
  });
});
