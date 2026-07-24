/**
 * Tests for the distributed (Upstash-backed) rate limiter.
 *
 * Covers:
 *  - Env-gated activation: no Upstash env → in-memory fallback, zero fetch
 *  - Allowed path: INCR result under the limit
 *  - Denied path: over-limit with Retry-After derived from PTTL
 *  - Fail-open: Upstash HTTP/command errors fall back to in-memory
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimitDistributed } from "../_utils/rateLimiter";

describe("checkRateLimitDistributed", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the in-memory limiter when Upstash env is unset", async () => {
    vi.unstubAllEnvs();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const rl = await checkRateLimitDistributed(`mem:${crypto.randomUUID()}`, {
      maxRequests: 2,
    });
    expect(rl.allowed).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows requests under the distributed limit", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), {
          status: 200,
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const rl = await checkRateLimitDistributed("dist:under", {
      maxRequests: 5,
    });
    expect(rl.allowed).toBe(true);
    expect(rl.remaining).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://upstash.test/pipeline");
    expect((opts as RequestInit).method).toBe("POST");
    const sentBody = JSON.parse(
      String((opts as RequestInit).body)
    ) as unknown[][];
    expect(sentBody[0]![0]).toBe("INCR");
    expect(sentBody[1]![0]).toBe("PEXPIRE");
  });

  it("denies when over the limit and reports retry-after from PTTL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 9 }]), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: 42000 }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    const rl = await checkRateLimitDistributed("dist:over", {
      maxRequests: 5,
    });
    expect(rl.allowed).toBe(false);
    expect(rl.remaining).toBe(0);
    expect(rl.retryAfter).toBe(42);
  });

  it("falls back to in-memory when Upstash returns an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 }))
    );
    const rl = await checkRateLimitDistributed(`dist:${crypto.randomUUID()}`, {
      maxRequests: 3,
    });
    expect(rl.allowed).toBe(true);
  });

  it("falls back to in-memory when a pipeline command errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify([{ error: "ERR broken pipe" }]), {
            status: 200,
          })
      )
    );
    const rl = await checkRateLimitDistributed(`dist:${crypto.randomUUID()}`, {
      maxRequests: 3,
    });
    expect(rl.allowed).toBe(true);
  });
});
