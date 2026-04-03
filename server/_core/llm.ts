/**
 * LLM client — OpenAI GPT-4o via the official SDK.
 * All AI features (field reports, estimator, lead scoring) call invokeLLM().
 * Model: gpt-4o — fast, accurate, cost-efficient for structured tasks.
 *
 * Switched from Anthropic (admin key incompatible) to OpenAI.
 * Same interface — all consuming functions work without changes.
 */
import OpenAI from "openai";
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
  /** When true, instructs the model to respond only in JSON. */
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

const MODEL = "gpt-4o";

/**
 * Create an OpenAI client.
 * Optionally routes through Cloudflare AI Gateway when configured.
 */
export function getOpenAIClient(): OpenAI {
  if (!ENV.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured in Netlify environment variables."
    );
  }

  const cfAccountId = process.env.CF_ACCOUNT_ID;
  const cfGatewayId = process.env.CF_AI_GATEWAY_ID;

  // Route through Cloudflare AI Gateway when configured
  if (cfAccountId && cfGatewayId) {
    return new OpenAI({
      apiKey: ENV.openaiApiKey,
      baseURL: `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/${cfGatewayId}/openai`,
    });
  }

  return new OpenAI({ apiKey: ENV.openaiApiKey });
}

/**
 * Backward compat: getAnthropicClient() alias → returns OpenAI client.
 * Prevents import errors in any file that imported the old name.
 */
export const getAnthropicClient = getOpenAIClient;

/**
 * Invoke GPT-4o via the OpenAI SDK.
 * Handles system prompts, JSON mode, and usage tracking.
 * Same interface as the previous Anthropic version.
 */
export async function invokeLLM(params: LLMInvokeParams): Promise<LLMResult> {
  const {
    messages,
    maxTokens = 4096,
    temperature = 0.3,
    jsonMode = false,
  } = params;

  const client = getOpenAIClient();

  // Build messages array — OpenAI accepts system role directly
  const chatMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(m => ({
    role: m.role,
    content:
      m.role === "system" && jsonMode
        ? `${m.content}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown code fences, no preamble, no explanation — raw JSON only.`
        : m.content,
  }));

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: chatMessages,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  const choice = response.choices[0];
  const text = choice?.message?.content ?? "";

  return {
    text,
    model: response.model,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}
