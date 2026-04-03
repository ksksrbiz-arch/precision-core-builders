/**
 * LLM client — Cloudflare Workers AI (free tier).
 * All AI features (field reports, estimator, lead scoring, chat) call invokeLLM().
 * Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast — best free-tier quality.
 *
 * Falls back to Anthropic Claude if CF_API_TOKEN is not set but ANTHROPIC_API_KEY is.
 */
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

const CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * Invoke LLM via Cloudflare Workers AI REST API.
 * Free tier: 10,000 neurons/day — plenty for daily construction ops.
 *
 * If Cloudflare is not configured, falls back to Anthropic SDK.
 */
export async function invokeLLM(params: LLMInvokeParams): Promise<LLMResult> {
  const {
    messages,
    maxTokens = 4096,
    temperature = 0.3,
    jsonMode = false,
  } = params;

  const cfAccountId = ENV.cfAccountId;
  const cfApiToken = process.env.CF_API_TOKEN;

  // ── Cloudflare Workers AI (primary — free) ──────────────────────
  if (cfAccountId && cfApiToken) {
    return invokeCloudflareLLM(
      cfAccountId,
      cfApiToken,
      messages,
      maxTokens,
      temperature,
      jsonMode
    );
  }

  // ── Anthropic fallback (paid) ───────────────────────────────────
  if (ENV.anthropicApiKey) {
    return invokeAnthropicLLM(messages, maxTokens, temperature, jsonMode);
  }

  throw new Error(
    "No LLM provider configured. Set CF_API_TOKEN for Cloudflare Workers AI (free) or ANTHROPIC_API_KEY for Claude."
  );
}

// ── Cloudflare Workers AI ───────────────────────────────────────────
async function invokeCloudflareLLM(
  accountId: string,
  apiToken: string,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  jsonMode: boolean
): Promise<LLMResult> {
  // Inject JSON-only instruction into system prompt
  const cfMessages = messages.map(m => {
    if (m.role === "system" && jsonMode) {
      return {
        role: m.role,
        content: `${m.content}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown code fences, no preamble, no explanation — raw JSON only.`,
      };
    }
    return { role: m.role, content: m.content };
  });

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: cfMessages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Cloudflare Workers AI ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    success: boolean;
    result?: { response?: string };
    errors?: Array<{ message: string }>;
  };

  if (!data.success || !data.result?.response) {
    const errMsg =
      data.errors?.map(e => e.message).join("; ") ?? "Empty response";
    throw new Error(`Cloudflare Workers AI: ${errMsg}`);
  }

  // Coerce to string — CF API can return unexpected types
  let text = String(data.result.response ?? "");

  // Clean markdown fences — Llama models often wrap JSON in various fence styles
  if (jsonMode) {
    // Remove leading fences: ```json, ```, ~~~json, ~~~
    text = text.replace(/^[\s]*```[\w]*\s*\n?/i, "");
    text = text.replace(/^[\s]*~~~[\w]*\s*\n?/i, "");
    // Remove trailing fences
    text = text.replace(/\n?\s*```[\s]*$/i, "");
    text = text.replace(/\n?\s*~~~[\s]*$/i, "");
    text = text.trim();

    // If still not valid JSON, try to extract JSON object from the text
    if (!text.startsWith("{") && !text.startsWith("[")) {
      const jsonMatch = text.match(/(\{[\s\S]*)/);
      if (jsonMatch) {
        text = jsonMatch[1];
      }
    }

    // Balance braces — Llama models sometimes omit the closing }
    const opens = (text.match(/\{/g) || []).length;
    const closes = (text.match(/\}/g) || []).length;
    if (opens > closes) {
      // Remove trailing comma if present before adding closing braces
      text = text.replace(/,\s*$/, "");
      text += "\n" + "}".repeat(opens - closes);
    }
  }

  return {
    text,
    model: CF_MODEL,
  };
}

// ── Anthropic fallback ──────────────────────────────────────────────
async function invokeAnthropicLLM(
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  jsonMode: boolean
): Promise<LLMResult> {
  // Dynamic import to avoid bundling Anthropic SDK when using CF
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const systemMsg = messages.find(m => m.role === "system");
  const conversationMsgs = messages.filter(m => m.role !== "system");

  const systemParts = [
    systemMsg?.content ?? "",
    jsonMode
      ? "IMPORTANT: Respond with ONLY valid JSON. No markdown code fences, no preamble, no explanation — raw JSON only."
      : "",
  ].filter(Boolean);
  const system = systemParts.join("\n\n");

  const sdkMessages = conversationMsgs.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: sdkMessages,
  });

  const text = response.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
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

/**
 * Backward compat export for vision-studio.
 * Returns a simple object with a chat method that routes through invokeLLM.
 */
export function getAnthropicClient() {
  // This is only used by vision-studio as a fallback.
  // Vision features require a vision-capable model (Anthropic/OpenAI).
  // CF Workers AI does not have strong vision models on free tier.
  const Anthropic = require("@anthropic-ai/sdk").default;
  if (!ENV.anthropicApiKey) {
    throw new Error(
      "Vision analysis requires ANTHROPIC_API_KEY — Cloudflare Workers AI free tier does not include vision models."
    );
  }
  return new Anthropic({ apiKey: ENV.anthropicApiKey });
}
