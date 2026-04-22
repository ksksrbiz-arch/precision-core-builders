import type { Handler } from "@netlify/functions";
import { invokeLLM } from "../../server/_core/llm";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";

const SYSTEM_PROMPT = `You are the Digital Foreman AI assistant for Precision Core Builders, owned by Eric Tadlock (CCB #246527), a master builder in Eugene, OR with 20+ years of experience.

You assist with:
- Construction project questions and scheduling
- Material estimates and procurement guidance
- Building code and permit questions for Oregon/Lane County
- Weather-sensitive scheduling (Eugene, OR climate)
- Client communication drafts
- Cost estimation guidance

Core values: Precise Construction. Core Values.
Keep responses concise, professional, and practical. If asked about specific project data you don't have access to, say so clearly.`;

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "" };
  }

  // Rate limit: 20 requests per minute per IP.
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`ai-chat:${ip}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({ error: "Too many requests. Please slow down." }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }> = body.messages ?? [];

    if (!messages.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "messages array is required" }),
      };
    }

    // Prepend system prompt
    const fullMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.filter(m => m.role !== "system"),
    ];

    const result = await invokeLLM({
      messages: fullMessages,
      maxTokens: 600,
      temperature: 0.4,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: result.text, model: result.model }),
    };
  } catch (err) {
    console.error("[ai-chat]", err);
    const isConfigError =
      err instanceof Error &&
      err.message.includes("No LLM API key configured");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: isConfigError
          ? "AI service is not configured. Please contact the site administrator."
          : "AI service temporarily unavailable. Please try again in a moment.",
      }),
    };
  }
};
