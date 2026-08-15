import { scoreLead } from "../../server/_core/leadScoring";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { withGuards } from "./_lib/http";
import { isLLMConfigError } from "./_lib/llm/prompts";
import { z } from "zod";

// Public, unauthenticated endpoint whose fields feed straight into an LLM
// prompt (server/_core/leadScoring.ts) — bound every field so a caller can't
// inflate token cost with an oversized field, even within the rate limit.
const leadSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    projectType: z.string().trim().max(200).optional(),
    budget: z.string().trim().max(100).optional(),
    location: z.string().trim().max(200).optional(),
    timeline: z.string().trim().max(100).optional(),
    message: z.string().trim().max(3_000).optional(),
    description: z.string().trim().max(3_000).optional(),
  })
  .refine(v => v.name || v.projectType, {
    message: "Please provide at least a lead name or project type.",
  });

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
      const rawLead = JSON.parse(event.body ?? "{}");
      const parsed = leadSchema.safeParse(rawLead);
      if (!parsed.success) {
        return error(
          400,
          parsed.error.issues[0]?.message ?? "Invalid lead data."
        );
      }

      const score = await scoreLead(parsed.data);
      return json(200, score);
    } catch (err) {
      console.error("[lead-score]", err);
      const configError = isLLMConfigError(err);
      return error(
        configError ? 503 : 500,
        configError
          ? "AI service is not configured. Please contact the site administrator."
          : "Lead scoring temporarily unavailable. Please try again."
      );
    }
  }
);
