/**
 * `withGuards` — a composable Netlify Function wrapper that applies the
 * cross-cutting concerns every handler previously repeated by hand:
 *   - CORS headers + OPTIONS preflight
 *   - Origin allow-list enforcement
 *   - HTTP method allow-list
 *   - Optional authentication ('user' / 'admin')
 *   - Optional rate limiting (keyed by IP or authenticated user)
 *   - Uniform JSON / error responses and a top-level try/catch
 *
 * It composes the existing `_utils` helpers (corsGuard, authGuard, rateLimiter)
 * rather than reimplementing them, so behaviour is unchanged — only the
 * boilerplate moves out of the individual functions.
 *
 * @example
 * export const handler = withGuards(
 *   { methods: ["POST"], auth: "admin",
 *     rateLimit: { key: ({ user }) => `copilot:${user?.id}`, maxRequests: 20 } },
 *   async ({ event, json, user }) => {
 *     const body = JSON.parse(event.body ?? "{}");
 *     return json(200, { ok: true });
 *   }
 * );
 */
import type {
  Handler,
  HandlerEvent,
  HandlerResponse,
} from "@netlify/functions";
import { corsHeaders, checkOrigin } from "../_utils/corsGuard";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  type RateLimitConfig,
} from "../_utils/rateLimiter";
import { verifyAuth, verifyAdmin, type AuthUser } from "../_utils/authGuard";

export type GuardedContext = {
  event: HandlerEvent;
  /** CORS headers to spread onto every response. */
  headers: Record<string, string>;
  origin: string | undefined;
  /** The authenticated user, or `null` for public (`auth: "none"`) handlers. */
  user: AuthUser | null;
  ip: string;
  /** Build a JSON response with CORS headers applied. */
  json: (
    statusCode: number,
    payload: unknown,
    extraHeaders?: Record<string, string>
  ) => HandlerResponse;
  /** Build a `{ error }` JSON response with CORS headers applied. */
  error: (
    statusCode: number,
    message: string,
    extraHeaders?: Record<string, string>
  ) => HandlerResponse;
};

export type GuardRateLimit = RateLimitConfig & {
  /** Build the rate-limit bucket key from the request context. */
  key: (ctx: { ip: string; user: AuthUser | null }) => string;
};

export type GuardOptions = {
  /** Allowed HTTP methods. Default: `["POST"]`. OPTIONS is always handled. */
  methods?: string[];
  /** Authentication requirement. Default: `"none"`. */
  auth?: "none" | "user" | "admin";
  /** Optional rate-limit configuration. */
  rateLimit?: GuardRateLimit;
};

export function withGuards(
  options: GuardOptions,
  handler: (ctx: GuardedContext) => Promise<HandlerResponse> | HandlerResponse
): Handler {
  const methods = options.methods ?? ["POST"];

  return async (event: HandlerEvent): Promise<HandlerResponse> => {
    const origin = event.headers["origin"];
    const headers = corsHeaders(origin);

    const json: GuardedContext["json"] = (statusCode, payload, extra) => ({
      statusCode,
      headers: { ...headers, ...extra },
      body: JSON.stringify(payload),
    });
    const error: GuardedContext["error"] = (statusCode, message, extra) =>
      json(statusCode, { error: message }, extra);

    // Preflight.
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers, body: "" };
    }

    // Origin allow-list.
    const originBlock = checkOrigin(origin);
    if (originBlock) return originBlock;

    // Method allow-list.
    if (!methods.includes(event.httpMethod)) {
      return error(405, "Method not allowed");
    }

    const ip = getClientIp(event.headers);

    // Authentication (runs before rate limiting so limits can key on user id).
    let user: AuthUser | null = null;
    if (options.auth === "user" || options.auth === "admin") {
      const result =
        options.auth === "admin"
          ? await verifyAdmin(event.headers)
          : await verifyAuth(event.headers);
      if (!result.ok) return error(result.statusCode, result.message);
      user = result.user;
    }

    // Rate limiting.
    if (options.rateLimit) {
      const bucket = options.rateLimit.key({ ip, user });
      const rl = checkRateLimit(bucket, options.rateLimit);
      if (!rl.allowed) {
        return error(
          429,
          "Too many requests. Please slow down.",
          rateLimitHeaders(rl)
        );
      }
    }

    try {
      return await handler({ event, headers, origin, user, ip, json, error });
    } catch (err) {
      console.error(`[${event.path ?? "function"}]`, err);
      return error(500, "Internal server error");
    }
  };
}
