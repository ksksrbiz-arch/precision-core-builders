import type { Handler } from "@netlify/functions";
import { scoreLead } from "../../server/_core/leadScoring";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Rate limit: 30 requests per minute per IP (admin-only feature).
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`lead-score:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error: "Too many scoring requests. Please wait before trying again.",
      }),
    };
  }

  try {
    const lead = JSON.parse(event.body ?? "{}");

    if (!lead.name && !lead.projectType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Please provide at least a lead name or project type.",
        }),
      };
    }

    const score = await scoreLead(lead);
    return { statusCode: 200, headers, body: JSON.stringify(score) };
  } catch (err) {
    console.error("[lead-score]", err);
    const isConfigError =
      err instanceof Error && err.message.includes("No LLM API key configured");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: isConfigError
          ? "AI service is not configured. Please contact the site administrator."
          : "Lead scoring temporarily unavailable. Please try again.",
      }),
    };
  }
};
