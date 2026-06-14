import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";

const LEAD_SCORE_SYSTEM_PROMPT = `You are an AI lead scoring assistant for Precision Core Builders, a licensed Oregon contractor (CCB #246527) in Eugene, OR.
Score incoming project leads from 0-100 based on:
- Project type fit (custom homes, remodels, additions score highest)
- Budget alignment (higher budget = higher score, especially $75k+)
- Location proximity to Eugene, OR (Lane County scores best)
- Timeline (projects starting within 6 months score higher)
- Specificity of request (detailed requests score higher than vague)

Return ONLY valid JSON:
{
  "score": <0-100>,
  "priority": "low"|"medium"|"high"|"urgent",
  "reasoning": "1-2 sentence explanation",
  "suggestedAction": "Specific next action for Eric to take",
  "estimatedValue": <estimated project value in dollars or null>
}`;

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

    const prompt = [
      `Name: ${lead.name ?? "Unknown"}`,
      `Project type: ${lead.projectType ?? "Not specified"}`,
      `Budget: ${lead.budget ?? "Not specified"}`,
      `Location: ${lead.location ?? "Not specified"}`,
      `Timeline: ${lead.timeline ?? "Not specified"}`,
      `Description: ${lead.message ?? lead.description ?? "None"}`,
    ].join("\n");

    const result = await invokeLLM({
      feature: "lead-score",
      messages: [
        { role: "system", content: LEAD_SCORE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      maxTokens: 400,
      temperature: 0.1,
    });

    let score: Record<string, unknown>;
    try {
      score = JSON.parse(result.text);
    } catch {
      console.error("[lead-score] LLM returned invalid JSON:", result.text);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Lead scoring returned an unexpected response. Please retry.",
        }),
      };
    }
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
