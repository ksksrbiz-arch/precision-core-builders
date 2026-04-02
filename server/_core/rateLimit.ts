/**
 * Rate limiting for AI endpoints.
 * Uses in-memory store for Netlify Functions (stateless per invocation,
 * so limits are per-instance). For true global rate limiting, integrate
 * Cloudflare KV via the REST API.
 *
 * Default: 10 requests per minute per IP for AI endpoints.
 */

const CF_KV_ACCOUNT_ID = process.env.CF_ACCOUNT_ID ?? "";
const CF_KV_NAMESPACE_ID = process.env.CF_KV_RATE_LIMIT_NS ?? "";
const CF_API_TOKEN = process.env.CF_API_TOKEN ?? "";

const USE_CF_KV = !!(CF_KV_ACCOUNT_ID && CF_KV_NAMESPACE_ID && CF_API_TOKEN);

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check rate limit for a given key (typically IP or user ID).
 * @param key - unique identifier (e.g. IP address)
 * @param limit - max requests per window
 * @param windowMs - time window in milliseconds (default 60s)
 */
export async function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): Promise<RateLimitResult> {
  if (USE_CF_KV) {
    return checkRateLimitKV(key, limit, windowMs);
  }
  // Fallback: always allow (Netlify Functions are stateless)
  return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
}

/**
 * Cloudflare KV-backed rate limiting via REST API.
 * Stores a counter per key with TTL matching the window.
 */
async function checkRateLimitKV(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const kvKey = `rl:${key}`;
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_KV_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}`;
  const headers = {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    // Read current count
    const getRes = await fetch(
      `${baseUrl}/values/${encodeURIComponent(kvKey)}`,
      {
        headers,
      }
    );
    let count = 0;
    if (getRes.ok) {
      const text = await getRes.text();
      count = parseInt(text, 10) || 0;
    }

    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + windowMs,
      };
    }

    // Increment counter with TTL
    const ttlSeconds = Math.ceil(windowMs / 1000);
    await fetch(
      `${baseUrl}/values/${encodeURIComponent(kvKey)}?expiration_ttl=${ttlSeconds}`,
      {
        method: "PUT",
        headers,
        body: String(count + 1),
      }
    );

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: Date.now() + windowMs,
    };
  } catch (err) {
    console.warn("[rateLimit] KV check failed, allowing request:", err);
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }
}

/**
 * Helper to extract client IP from Netlify Function event headers.
 */
export function getClientIP(
  headers: Record<string, string | undefined>
): string {
  return (
    headers["x-nf-client-connection-ip"] ??
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    headers["client-ip"] ??
    "unknown"
  );
}
