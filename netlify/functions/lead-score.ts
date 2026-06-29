import { scoreLead } from "../../server/_core/leadScoring";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { withGuards } from "./_lib/http";
import { isLLMConfigError } from "./_lib/llm/prompts";

export const handler = withGuards(
  { methods: ["POST"], auth: "none" },
  async ({ event, json, error }) => {
    // Rate limit: 30 requests per minute per IP (admin-only feature).
    const ip = getClientIp(event.headers);
    const rl = checkRateLimit(`lead-score:${ip}`, {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return error(
        429,
        "Too many scoring requests. Please wait before trying again.",
        rateLimitHeaders(rl)
      );
    }

    try {
      const lead = JSON.parse(event.body ?? "{}");

      if (!lead.name && !lead.projectType) {
        return error(
          400,
          "Please provide at least a lead name or project type."
        );
      }

      const score = await scoreLead(lead);
      return json(200, score);
    } catch (err) {
      console.error("[lead-score]", err);
      return error(
        500,
        isLLMConfigError(err)
          ? "AI service is not configured. Please contact the site administrator."
          : "Lead scoring temporarily unavailable. Please try again."
      );
    }
  }
);
