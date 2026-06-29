/**
 * Portal Assistant — POST /api/portal-assistant
 *
 * A client-facing conversational assistant for the project portal. Answers a
 * client's questions about THEIR OWN project (status, schedule, recent updates,
 * finish selections, client-visible decisions) using a strictly client-scoped,
 * client-safe snapshot. Requires an authenticated user; data is scoped to the
 * caller's own client record, so internal cost/margin/vendor/lead data is never
 * exposed.
 */
import { invokeLLM } from "../../server/_core/llm";
import { buildPortalSnapshot } from "../../server/_core/portalSnapshot";
import { withGuards } from "./_lib/http";
import { PROMPTS, isLLMConfigError } from "./_lib/llm/prompts";

export const handler = withGuards(
  {
    methods: ["POST"],
    // Any authenticated user — data is scoped to their own client record.
    auth: "user",
    // Rate limit: 15 questions per minute per user.
    rateLimit: {
      key: ({ user }) => `portal-assistant:${user?.id}`,
      maxRequests: 15,
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
        .slice(-12);

      if (!messages.length) {
        return error(400, "No messages provided.");
      }

      const snapshot = await buildPortalSnapshot(user!.id);

      const result = await invokeLLM({
        feature: "portal-assistant",
        userId: user!.id,
        messages: [
          {
            role: "system",
            content: `${PROMPTS.portalAssistant}\n\n${snapshot.text}`,
          },
          ...messages,
        ],
        maxTokens: 700,
        temperature: 0.4,
      });

      return json(200, {
        text: result.text,
        provider: result.provider,
        hasProjects: snapshot.hasProjects,
      });
    } catch (err) {
      console.error("[portal-assistant]", err);
      const isConfigError = isLLMConfigError(err);
      return error(
        isConfigError ? 503 : 500,
        isConfigError
          ? "The assistant isn't available right now. Please check back soon."
          : "The assistant is temporarily unavailable. Please try again."
      );
    }
  }
);
