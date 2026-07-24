/**
 * Rate limiter for Netlify Functions.
 *
 * Uses an in-memory sliding-window counter. Because Netlify Functions are
 * stateless, each cold start resets the counter — this is intentional.
 * The limiter effectively throttles hot-path abuse within a single function
 * invocation lifecycle and provides a meaningful barrier against rapid bursts.
 *
 * For production at scale, swap the `store` Map for an Upstash Redis call.
 */

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

export type RateLimitConfig = {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets (only set when denied). */
  retryAfter?: number;
};

/**
 * Check whether `identifier` (IP address or user ID) is within its rate limit.
 * Call at the very top of each Netlify Function handler.
 *
 * @example
 * const ip = getClientIp(event);
 * const rl = checkRateLimit(`estimate:${ip}`, { maxRequests: 10, windowMs: 60_000 });
 * if (!rl.allowed) {
 *   return { statusCode: 429, headers: rateLimitHeaders(rl), body: "Too Many Requests" };
 * }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs = 60_000 } = config;
  const now = Date.now();

  let entry = store.get(identifier);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    entry = { count: 1, windowStart: now };
    store.set(identifier, entry);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count += 1;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil(
      (windowMs - (now - entry.windowStart)) / 1_000
    );
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Build rate-limit response headers to include in denied (429) responses.
 * Also useful on allowed responses to communicate limit state to clients.
 */
export function rateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = String(result.retryAfter);
    headers["X-RateLimit-Reset"] = String(
      Math.floor(Date.now() / 1_000) + result.retryAfter
    );
  }
  return headers;
}

/**
 * Extract the best available client IP from a Netlify Function event.
 * Prefers Netlify's `x-nf-client-connection-ip`, falls back through common
 * proxy headers, then the remote address.
 */
export function getClientIp(
  headers: Record<string, string | undefined>
): string {
  return (
    headers["x-nf-client-connection-ip"] ??
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    headers["x-real-ip"] ??
    "unknown"
  );
}

/**
 * checkRateLimitDistributed — cross-invocation rate limiting via Upstash
 * Redis REST. Active only when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are configured; otherwise falls back to the
 * in-memory sliding-window limiter. Fails OPEN on Redis errors (logs and
 * falls back) so a Redis outage never takes public endpoints down with it.
 *
 * Uses a fixed window: INCR the key, then PEXPIRE NX on the first hit.
 */
export async function checkRateLimitDistributed(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return checkRateLimit(identifier, config);

  const { maxRequests, windowMs = 60_000 } = config;
  const key = `rl:${identifier}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, windowMs, "NX"],
      ]),
    });
    if (!res.ok) throw new Error(`Upstash pipeline ${res.status}`);
    const results = (await res.json()) as Array<{
      result?: number;
      error?: string;
    }>;
    const cmdError = results.find(r => r.error);
    if (cmdError) throw new Error(`Upstash: ${cmdError.error}`);

    const count = Number(results[0]?.result ?? 1);
    if (count > maxRequests) {
      // Fetch the real TTL for an accurate Retry-After.
      const ttlRes = await fetch(`${url}/pttl/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ttlJson = ttlRes.ok
        ? ((await ttlRes.json()) as { result?: number })
        : null;
      const retryAfter = Math.max(
        1,
        Math.ceil((ttlJson?.result ?? windowMs) / 1_000)
      );
      return { allowed: false, remaining: 0, retryAfter };
    }
    return { allowed: true, remaining: maxRequests - count };
  } catch (err) {
    console.warn(
      "[rateLimiter] distributed check failed, using in-memory fallback:",
      err
    );
    return checkRateLimit(identifier, config);
  }
}
