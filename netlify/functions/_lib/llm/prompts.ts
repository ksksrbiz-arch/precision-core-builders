/**
 * Centralised LLM system prompts + shared config-error detection.
 *
 * The AI functions (ai-chat, ai-copilot, estimate-project, voice-to-report,
 * portal-assistant, search, daily-briefing, lead-score) each previously inlined
 * their own system prompt and hand-rolled the "is this a missing-API-key error?"
 * check. Centralising the prompts gives one source of truth for AI behaviour and
 * one place to tune brand voice.
 *
 * NOTE for the AI-functions adopter unit: add the remaining prompts here as you
 * migrate each function so every system prompt lives in this registry.
 */

/** Shared brand/identity clause reused across prompts. */
export const BRAND_CONTEXT =
  "Precision Core Builders, owned by Eric Tadlock (CCB #246527), a master " +
  "builder in Eugene, OR with 20+ years of experience.";

export const PROMPTS = {
  /** ai-chat — public Digital Foreman assistant. */
  chat: `You are the Digital Foreman AI assistant for ${BRAND_CONTEXT}

You assist with:
- Construction project questions and scheduling
- Material estimates and procurement guidance
- Building code and permit questions for Oregon/Lane County
- Weather-sensitive scheduling (Eugene, OR climate)
- Client communication drafts
- Cost estimation guidance

Core values: Precise Construction. Core Values.
Keep responses concise, professional, and practical. If asked about specific project data you don't have access to, say so clearly.`,
} as const;

export type PromptKey = keyof typeof PROMPTS;

/**
 * True when an error originates from missing LLM provider configuration rather
 * than a transient failure. Matches the message thrown by
 * `server/_core/llm.ts` when no provider key is set, so callers can render a
 * "service not configured" message instead of a generic failure.
 */
export function isLLMConfigError(err: unknown): boolean {
  return (
    err instanceof Error && err.message.includes("No LLM API key configured")
  );
}
