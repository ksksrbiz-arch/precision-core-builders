/**
 * CORS and origin validation utilities for Netlify Functions.
 *
 * Protects API endpoints from cross-site request forgery by validating the
 * `Origin` header against a whitelist of trusted origins.  Also centralises
 * CORS header generation so every function returns consistent headers.
 */

/** Origins that are always allowed regardless of env vars. */
const ALWAYS_ALLOWED: ReadonlySet<string> = new Set([
  "https://precisioncorebuilders.com",
  "https://www.precisioncorebuilders.com",
  "https://precision-core.netlify.app",
]);

/**
 * Build the ordered list of trusted origins at module load time.
 * Additional origins can be injected via the `ALLOWED_ORIGINS` env var
 * (comma-separated list).
 */
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>(ALWAYS_ALLOWED);

  const extra = process.env.ALLOWED_ORIGINS;
  if (extra) {
    for (const o of extra.split(",")) {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  // Netlify deploy previews follow the pattern https://<slug>.netlify.app
  const deployUrl = process.env.DEPLOY_PRIME_URL ?? process.env.URL;
  if (deployUrl) origins.add(deployUrl);

  return origins;
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

/**
 * Determine whether `origin` is trusted.
 * `null`/`undefined` origins (direct/server-to-server calls) are allowed.
 */
export function isOriginAllowed(origin: string | undefined | null): boolean {
  if (!origin) return true; // server-to-server or curl — allow
  if (ALLOWED_ORIGINS.has(origin)) return true;

  // Allow localhost variants in development
  if (process.env.NODE_ENV !== "production") {
    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Build a full set of CORS response headers.
 *
 * - Allowed origins get a matching `Access-Control-Allow-Origin`.
 * - Disallowed origins still get headers but with the primary allowed origin,
 *   which causes the browser's CORS check to fail — the validation is
 *   enforced by the caller returning a 403.
 */
export function corsHeaders(
  origin: string | undefined | null
): Record<string, string> {
  const allowed = isOriginAllowed(origin);
  const allowOrigin =
    allowed && origin ? origin : "https://precisioncorebuilders.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}

/**
 * Validate the `Origin` header and return a 403 response body if disallowed.
 * Call this inside your handler after handling OPTIONS preflight.
 *
 * @returns `null` if the origin is allowed, or a ready-to-return 403 object.
 *
 * @example
 * const origin = event.headers["origin"];
 * const forbidden = checkOrigin(origin);
 * if (forbidden) return forbidden;
 */
export function checkOrigin(
  origin: string | undefined
): { statusCode: 403; headers: Record<string, string>; body: string } | null {
  if (isOriginAllowed(origin)) return null;

  return {
    statusCode: 403,
    headers: corsHeaders(origin),
    body: JSON.stringify({ error: "Origin not allowed" }),
  };
}
