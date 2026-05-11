import type { Handler } from "@netlify/functions";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";

const DEFAULT_SUPER_SPLAT_URL = "https://superspl.at";
const DEFAULT_SUPER_SPLAT_DEMO_URL =
  "https://supersplat-demo.vercel.app/?model=https://huggingface.co/spaces/nerfstudio-office/nerf_assets/resolve/main/splat-data/office.splat";

const ALLOWED_ACCOUNT_ORIGINS = new Set(["https://superspl.at"]);
const ALLOWED_DEMO_ORIGINS = new Set([
  "https://superspl.at",
  "https://supersplat-demo.vercel.app",
]);

function safeUrl(
  value: string | undefined,
  fallback: string,
  allowedOrigins: Set<string>
): string {
  if (!value) return fallback;

  try {
    const url = new URL(value);
    if (url.protocol === "https:" && allowedOrigins.has(url.origin)) {
      return url.toString();
    }
  } catch {
    // Fall back to the known-safe default below.
  }

  return fallback;
}

export const handler: Handler = async event => {
  const origin = event.headers.origin ?? event.headers.Origin;
  const headers = {
    ...corsHeaders(origin),
    "Cache-Control": "public, max-age=300",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`supersplat-config:${ip}`, {
    maxRequests: 120,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "Too many SuperSplat config requests. Please try again soon.",
      }),
    };
  }

  const accountUrl = safeUrl(
    process.env.SUPERSPLAT_ACCOUNT_URL,
    DEFAULT_SUPER_SPLAT_URL,
    ALLOWED_ACCOUNT_ORIGINS
  );
  const demoUrl = safeUrl(
    process.env.SUPERSPLAT_DEMO_URL,
    DEFAULT_SUPER_SPLAT_DEMO_URL,
    ALLOWED_DEMO_ORIGINS
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      provider: "SuperSplat",
      accountUrl,
      demoUrl,
      features: [
        "Create a free SuperSplat account.",
        "Upload and publish 3D Gaussian splat scenes.",
        "Share interactive project links with clients and teams.",
      ],
      generatedAt: new Date().toISOString(),
    }),
  };
};
