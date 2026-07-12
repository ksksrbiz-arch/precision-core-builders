/**
 * tRPC Netlify Function — serves all /api/trpc/* requests in production.
 *
 * In local dev, the Express server (server/_core/index.ts) handles /api/trpc.
 * On Netlify, this function takes over via the redirect rule:
 *   /api/* → /.netlify/functions/:splat
 *
 * Uses @trpc/server/adapters/fetch which converts Netlify's event into a
 * standard Fetch API Request and returns a standard Fetch API Response.
 */
import type { Handler } from "@netlify/functions";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";
import type { TrpcContext, SessionUser } from "../../server/_core/context";
import { verifyToken } from "../../server/_core/auth/verifyToken";

// ─── Auth context helper ─────────────────────────────────────────────────────

/**
 * Resolve the authenticated user from a bearer token, delegating to the
 * canonical `verifyToken` foundation (admin session token, dev bypass, and
 * Supabase JWT). Any verification failure maps to an anonymous request.
 */
async function resolveUser(token: string | null): Promise<SessionUser | null> {
  const result = await verifyToken(token);
  return result.ok ? result.user : null;
}

// ─── Netlify → Fetch Request conversion ──────────────────────────────────────

function netlifyEventToRequest(event: Parameters<Handler>[0]): Request {
  const protocol =
    event.headers["x-forwarded-proto"] ??
    event.headers["x-forwarded-protocol"] ??
    "https";
  const host = event.headers["host"] ?? "localhost";
  // `event.rawUrl` is ALREADY an absolute URL on Netlify. Prefixing it with the
  // origin again produced a doubled URL (e.g.
  // `https://host` + `https://host/api/trpc/clients.list`), which parsed to a
  // pathname of `//host/api/trpc/...`. The fetch adapter then stripped its
  // 9-char `/api/trpc` endpoint off the front, mangling the procedure path into
  // `on-core.netlify.app/api/trpc/clients.list` → "No procedure found" (404) on
  // every uncached request. Use the absolute rawUrl as-is; only synthesize an
  // origin when we have just a path (older runtimes / local dev).
  const rawUrl = event.rawUrl ?? event.path;
  const url = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `${protocol}://${host}${rawUrl}`;

  const body =
    event.body == null
      ? undefined
      : event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;

  return new Request(url, {
    method: event.httpMethod,
    headers: event.headers as Record<string, string>,
    body:
      event.httpMethod !== "GET" && event.httpMethod !== "HEAD"
        ? body
        : undefined,
  });
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async event => {
  const request = netlifyEventToRequest(event);

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async ({ req }): Promise<TrpcContext> => {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      const user = await resolveUser(token);
      return { user };
    },
    onError({ error, path }) {
      // Surface server-side errors in Netlify Function logs.
      console.error(`[tRPC] Error on /${path ?? "unknown"}:`, error.message);
    },
  });

  const body = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body,
  };
};
