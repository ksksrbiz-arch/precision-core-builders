/**
 * AI usage logging — best-effort, fire-and-forget recording of every LLM call
 * into the ai_usage table for the cost / governance dashboard. Never throws:
 * logging must not break the AI feature that triggered it.
 */
import { db } from "../db";
import type { LLMProvider } from "./llm";

export type AiUsageEntry = {
  feature: string;
  provider: LLMProvider;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  userId?: string | null;
};

export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  if (!db) return;
  try {
    await db.from("ai_usage").insert({
      feature: entry.feature.slice(0, 60),
      provider: entry.provider,
      model: entry.model.slice(0, 120),
      prompt_tokens: entry.promptTokens ?? 0,
      completion_tokens: entry.completionTokens ?? 0,
      total_tokens: entry.totalTokens ?? 0,
      user_id: entry.userId ?? null,
    });
  } catch {
    // Swallow — usage logging is non-critical.
  }
}
