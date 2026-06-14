/**
 * LLM client — free-first, multi-provider with automatic fallback.
 *
 * All AI features (field reports, estimator, lead scoring, chat, search) call
 * invokeLLM(). Providers are tried in priority order; if one is unconfigured,
 * rate-limited, or errors, the next is attempted automatically. This keeps the
 * platform resilient and cheap: free tiers are exhausted before paid Claude.
 *
 * Default priority (free-first, paid fallback):
 *   1. Groq          — free, ultra-fast LPU.  GROQ_API_KEY
 *                      https://console.groq.com/keys
 *   2. Google Gemini — free tier (no credit card).  GOOGLE_AI_API_KEY
 *                      https://aistudio.google.com/app/apikey
 *   3. OpenRouter    — free (:free) models + paid routing.  OPENROUTER_API_KEY
 *                      https://openrouter.ai/keys
 *   4. Anthropic     — paid, highest quality.  ANTHROPIC_API_KEY
 *
 * Override the order with LLM_PROVIDER_ORDER (e.g. "anthropic,groq,gemini").
 * Override any model with GROQ_MODEL / GEMINI_MODEL / OPENROUTER_MODEL /
 * ANTHROPIC_MODEL.
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
  /** When true, instructs the model to respond only in JSON. */
  jsonMode?: boolean;
};

export type LLMProvider = "groq" | "gemini" | "openrouter" | "anthropic";

export type LLMResult = {
  text: string;
  /** The concrete model id that produced the response. */
  model: string;
  /** Which provider served the request (for usage tracking / governance). */
  provider: LLMProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

type ResolvedParams = LLMInvokeParams & {
  system: string;
  conversationMsgs: LLMMessage[];
};

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_ORDER: LLMProvider[] = [
  "groq",
  "gemini",
  "openrouter",
  "anthropic",
];

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  anthropic: "claude-sonnet-4-6",
};

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

const MAX_ATTEMPTS_PER_PROVIDER = 2;
const RETRY_BASE_DELAY_MS = 400;

function apiKeyFor(provider: LLMProvider): string {
  switch (provider) {
    case "groq":
      return ENV.groqApiKey;
    case "gemini":
      return ENV.googleAiApiKey;
    case "openrouter":
      return ENV.openrouterApiKey;
    case "anthropic":
      return ENV.anthropicApiKey;
  }
}

function modelFor(provider: LLMProvider): string {
  const override = {
    groq: ENV.groqModel,
    gemini: ENV.geminiModel,
    openrouter: ENV.openrouterModel,
    anthropic: ENV.anthropicModel,
  }[provider];
  return override || DEFAULT_MODELS[provider];
}

/**
 * Resolve the ordered list of providers to attempt: the configured order
 * (or default free-first), filtered to those that actually have an API key.
 * Exported for testing.
 */
export function resolveProviderOrder(): LLMProvider[] {
  const known = new Set<LLMProvider>(DEFAULT_ORDER);
  let order: LLMProvider[];

  if (ENV.llmProviderOrder.trim()) {
    const requested = ENV.llmProviderOrder
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter((s): s is LLMProvider => known.has(s as LLMProvider));
    // Append any default providers not explicitly listed so a typo or partial
    // list never silently drops a configured fallback.
    order = [
      ...requested,
      ...DEFAULT_ORDER.filter(p => !requested.includes(p)),
    ];
  } else {
    order = [...DEFAULT_ORDER];
  }

  return order.filter(p => apiKeyFor(p).length > 0);
}

/** True when at least one provider is configured. */
export function isLLMConfigured(): boolean {
  return resolveProviderOrder().length > 0;
}

// ─── Retry helper ─────────────────────────────────────────────────────────

class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PROVIDER; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof ProviderError ? err.retryable : false;
      if (!retryable || attempt === MAX_ATTEMPTS_PER_PROVIDER - 1) throw err;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastErr;
}

// ─── OpenAI-compatible providers (Groq, OpenRouter) ──────────────────────────

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

async function invokeOpenAICompatible(
  provider: "groq" | "openrouter",
  baseUrl: string,
  params: ResolvedParams
): Promise<LLMResult> {
  const {
    system,
    conversationMsgs,
    maxTokens = 4096,
    temperature = 0.3,
  } = params;
  const model = modelFor(provider);

  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  for (const m of conversationMsgs) {
    messages.push({ role: m.role, content: m.content });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKeyFor(provider)}`,
  };
  // OpenRouter attribution headers (optional but recommended).
  if (provider === "openrouter") {
    if (ENV.siteUrl) headers["HTTP-Referer"] = ENV.siteUrl;
    headers["X-Title"] = "Precision Core Builders";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as OpenAIChatResponse;

  if (!res.ok || data.error) {
    throw new ProviderError(
      `${provider} error: ${data.error?.message ?? res.statusText}`,
      isRetryableStatus(res.status)
    );
  }

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new ProviderError(`${provider} returned an empty response`, true);
  }

  return {
    text,
    model: data.model ?? model,
    provider,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined,
  };
}

// ─── Google Gemini ──────────────────────────────────────────────────────────

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string; status?: string };
};

async function invokeGemini(params: ResolvedParams): Promise<LLMResult> {
  const {
    system,
    conversationMsgs,
    maxTokens = 4096,
    temperature = 0.3,
  } = params;
  const model = modelFor("gemini");

  // Build Gemini contents array (no "system" role — prepend to first user msg)
  const contents: GeminiContent[] = [];
  let systemInjected = false;

  for (const msg of conversationMsgs) {
    if (msg.role === "user") {
      const text =
        !systemInjected && system ? `${system}\n\n${msg.content}` : msg.content;
      if (!systemInjected) systemInjected = true;
      contents.push({ role: "user", parts: [{ text }] });
    } else if (msg.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  // Gemini requires alternating user/model turns; ensure starts with user
  if (contents.length === 0 || contents[0].role !== "user") {
    if (!system)
      throw new ProviderError(
        "gemini: no messages and no system prompt",
        false
      );
    contents.unshift({ role: "user", parts: [{ text: system }] });
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKeyFor("gemini")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;

  if (!res.ok || data.error) {
    throw new ProviderError(
      `gemini error: ${data.error?.message ?? res.statusText}`,
      isRetryableStatus(res.status)
    );
  }

  const text =
    data.candidates
      ?.flatMap(c => c.content?.parts ?? [])
      .map(p => p.text ?? "")
      .join("") ?? "";
  if (!text) {
    throw new ProviderError("gemini returned an empty response", true);
  }

  return {
    text,
    model,
    provider: "gemini",
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined,
  };
}

// ─── Anthropic (Claude) ──────────────────────────────────────────────────────

async function invokeAnthropic(params: ResolvedParams): Promise<LLMResult> {
  const {
    system,
    conversationMsgs,
    maxTokens = 4096,
    temperature = 0.3,
  } = params;
  const model = modelFor("anthropic");
  const client = new Anthropic({ apiKey: apiKeyFor("anthropic") });

  const sdkMessages: Anthropic.MessageParam[] = conversationMsgs.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: sdkMessages,
    });
  } catch (err) {
    const status =
      err instanceof Anthropic.APIError && typeof err.status === "number"
        ? err.status
        : 0;
    throw new ProviderError(
      `anthropic error: ${err instanceof Error ? err.message : String(err)}`,
      status === 0 ? true : isRetryableStatus(status)
    );
  }

  const text = response.content
    .filter(block => block.type === "text")
    .map(block => (block as Anthropic.TextBlock).text)
    .join("");

  return {
    text,
    model: response.model,
    provider: "anthropic",
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

// ─── Dispatch ─────────────────────────────────────────────────────────────

function callProvider(
  provider: LLMProvider,
  params: ResolvedParams
): Promise<LLMResult> {
  switch (provider) {
    case "groq":
      return invokeOpenAICompatible("groq", GROQ_API_BASE, params);
    case "openrouter":
      return invokeOpenAICompatible("openrouter", OPENROUTER_API_BASE, params);
    case "gemini":
      return invokeGemini(params);
    case "anthropic":
      return invokeAnthropic(params);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Invoke the best available LLM, trying providers in free-first priority order
 * and falling back automatically on missing keys, rate limits, or errors.
 * Throws only if no provider is configured or all configured providers fail.
 */
export async function invokeLLM(params: LLMInvokeParams): Promise<LLMResult> {
  const { messages, jsonMode = false } = params;

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

  const resolved: ResolvedParams = { ...params, system, conversationMsgs };
  const order = resolveProviderOrder();

  if (order.length === 0) {
    throw new Error(
      "No LLM API key configured. Set a free key — GROQ_API_KEY " +
        "(https://console.groq.com/keys) or GOOGLE_AI_API_KEY " +
        "(https://aistudio.google.com/app/apikey) — or ANTHROPIC_API_KEY / " +
        "OPENROUTER_API_KEY in your Netlify environment variables."
    );
  }

  const errors: string[] = [];
  for (const provider of order) {
    try {
      return await withRetries(() => callProvider(provider, resolved));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(
    `All LLM providers failed (${order.join(", ")}): ${errors.join(" | ")}`
  );
}
