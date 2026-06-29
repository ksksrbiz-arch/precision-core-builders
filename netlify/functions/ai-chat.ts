import { invokeLLM } from "../../server/_core/llm";
import { withGuards } from "./_lib/http";
import { PROMPTS, isLLMConfigError } from "./_lib/llm/prompts";

export const handler = withGuards(
  {
    methods: ["POST"],
    auth: "none",
    // Rate limit: 20 requests per minute per IP.
    rateLimit: {
      key: ({ ip }) => `ai-chat:${ip}`,
      maxRequests: 20,
      windowMs: 60_000,
    },
  },
  async ({ event, json, error }) => {
    try {
      const body = JSON.parse(event.body ?? "{}");
      const messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }> = body.messages ?? [];

      if (!messages.length) {
        return error(400, "messages array is required");
      }

      // Prepend system prompt
      const fullMessages = [
        { role: "system" as const, content: PROMPTS.chat },
        ...messages.filter(m => m.role !== "system"),
      ];

      const result = await invokeLLM({
        messages: fullMessages,
        maxTokens: 600,
        temperature: 0.4,
        feature: "ai-chat",
      });

      return json(200, {
        text: result.text,
        model: result.model,
        provider: result.provider,
      });
    } catch (err) {
      console.error("[ai-chat]", err);
      return error(
        500,
        isLLMConfigError(err)
          ? "AI service is not configured. Please contact the site administrator."
          : "AI service temporarily unavailable. Please try again in a moment."
      );
    }
  }
);
