/**
 * AI Ops Co-pilot — POST /api/ai-copilot
 *
 * An admin-only conversational assistant that answers natural-language
 * questions over Eric's REAL operational data (projects, estimates, schedule,
 * ledger, leads, materials, field reports). Rather than embeddings, it injects
 * a compact, bounded snapshot of the current business state as context — fast,
 * accurate, and free-tier friendly for a single firm's data volume.
 *
 * Reads private business data via the service-role DB, so it requires an
 * authenticated admin (auth: "admin").
 */
import { invokeLLM } from "../../server/_core/llm";
import { buildOpsSnapshot } from "../../server/_core/opsSnapshot";
import { withGuards } from "./_lib/http";
import { PROMPTS, isLLMConfigError } from "./_lib/llm/prompts";

export const handler = withGuards(
  {
    methods: ["POST"],
    // Exposes the full private dataset — admin only.
    auth: "admin",
    // Rate limit: 20 questions per minute per admin.
    rateLimit: {
      key: ({ user }) => `ai-copilot:${user?.id}`,
      maxRequests: 20,
      windowMs: 60_000,
    },
  },
  async ({ event, user, json, error }) => {
    try {
      const body = JSON.parse(event.body ?? "{}") as {
        messages?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      const messages = (body.messages ?? [])
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-12); // keep the last few turns to bound tokens

      if (!messages.length) {
        return error(400, "No messages provided.");
      }

      const snapshot = await buildOpsSnapshot();

      const result = await invokeLLM({
        feature: "ai-copilot",
        userId: user!.id,
        messages: [
          { role: "system", content: `${PROMPTS.copilot}\n\n${snapshot.text}` },
          ...messages,
        ],
        maxTokens: 900,
        temperature: 0.3,
      });

      return json(200, {
        text: result.text,
        model: result.model,
        provider: result.provider,
      });
    } catch (err) {
      console.error("[ai-copilot]", err);
      const isConfigError = isLLMConfigError(err);
      return error(
        isConfigError ? 503 : 500,
        isConfigError
          ? "AI is not configured yet. Add a free GROQ_API_KEY or GOOGLE_AI_API_KEY."
          : "Co-pilot is temporarily unavailable. Please try again."
      );
    }
  }
);
