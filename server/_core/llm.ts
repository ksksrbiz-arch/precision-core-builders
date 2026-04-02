/**
 * LLM client — Claude (Anthropic) via the official SDK.
 * All AI features (field reports, estimator, lead scoring) call invokeLLM().
 * Model: claude-sonnet-4-6 — fast, accurate, cost-efficient for structured tasks.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export type LLMRole = "system" | "user" | "assistant";

export type LLMMessage = {
  role: LLMRole;
  content: string;
};

export type LLMInvokeParams = {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  /** When true, instructs Claude to respond only in JSON. */
  jsonMode?: boolean;
};

export type LLMResult = {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

const MODEL = "claude-sonnet-4-6";

/**
 * Create an Anthropic SDK client, optionally routed through Cloudflare
 * AI Gateway for caching, retries, and analytics.
 *
 * Used by invokeLLM() and directly by vision-studio for image analysis.
 */
export function getAnthropicClient(): Anthropic {
  if (!ENV.anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured in Netlify environment variables."
    );
  }

  const cfAccountId = process.env.CF_ACCOUNT_ID;
  const cfGatewayId = process.env.CF_AI_GATEWAY_ID;

  // Route through Cloudflare AI Gateway when configured
  if (cfAccountId && cfGatewayId) {
    return new Anthropic({
      apiKey: ENV.anthropicApiKey,
      baseURL: `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/${cfGatewayId}/anthropic`,
    });
  }

  return new Anthropic({ apiKey: ENV.anthropicApiKey });
}

/**
 * Invoke Claude via the Anthropic SDK.
 * Handles system prompts, JSON mode prefix injection, and usage tracking.
 */
export async function invokeLLM(params: LLMInvokeParams): Promise<LLMResult> {
  const {
    messages,
    maxTokens = 4096,
    temperature = 0.3,
    jsonMode = false,
  } = params;

  const client = getAnthropicClient();

  // Separate system prompt from conversation messages
  const systemMsg = messages.find(m => m.role === "system");
  const conversationMsgs = messages.filter(m => m.role !== "system");

  // Build system string — append JSON-only instruction when jsonMode is set
  const systemParts = [
    systemMsg?.content ?? "",
    jsonMode
      ? "IMPORTANT: Respond with ONLY valid JSON. No markdown code fences, no preamble, no explanation — raw JSON only."
      : "",
  ].filter(Boolean);
  const system = systemParts.join("\n\n");

  // Cast messages to Anthropic SDK format (system is already separated)
  const sdkMessages: Anthropic.MessageParam[] = conversationMsgs.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: sdkMessages,
  });

  // Extract text from response content blocks
  const text = response.content
    .filter(block => block.type === "text")
    .map(block => (block as Anthropic.TextBlock).text)
    .join("");

  return {
    text,
    model: response.model,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
