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
import { logAiUsage } from "./aiUsage";

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
  /** Calling feature label, recorded for usage/cost tracking (e.g. "ai-chat"). */
  feature?: string;
  /** Optional user id to attribute the call to in usage logs. */
  userId?: string | null;
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
      const result = await withRetries(() => callProvider(provider, resolved));
      // Best-effort usage logging (never blocks or throws on failure).
      await logAiUsage({
        feature: params.feature ?? "unknown",
        provider: result.provider,
        model: result.model,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        totalTokens: result.usage?.totalTokens,
        userId: params.userId ?? null,
      });
      return result;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(
    `All LLM providers failed (${order.join(", ")}): ${errors.join(" | ")}`
  );
}

// ─── Streaming API ──────────────────────────────────────────────────────────

/**
 * Final metadata yielded once a streamed response completes. Mirrors the
 * non-text fields of `LLMResult` so callers can log usage / surface the
 * concrete model + provider after the text has finished streaming.
 */
export type LLMStreamDone = {
  model: string;
  provider: LLMProvider;
  usage?: LLMResult["usage"];
};

/**
 * A chunk in the streaming protocol shared by the LLM client, the SSE Netlify
 * functions, and the browser hook:
 *   - `text`  — an incremental token delta to append to the assistant message.
 *   - `done`  — terminal metadata (model / provider / usage); emitted by
 *               `streamLLM` once the model finishes.
 *   - `error` — a fatal error surfaced mid-stream by a function after the first
 *               token has already been sent (so it can't fall back to JSON).
 *               `streamLLM` itself never yields this — it throws instead — but
 *               the transport and client both understand it.
 */
export type LLMStreamChunk =
  | { type: "text"; text: string }
  | { type: "done"; done: LLMStreamDone }
  | { type: "error"; error: string };

const SSE_DATA_PREFIX = "data:";

/**
 * Stream tokens from an OpenAI-compatible provider (Groq, OpenRouter) using the
 * `stream: true` Server-Sent-Events protocol. Yields text deltas as they
 * arrive, then the final metadata.
 */
async function* streamOpenAICompatible(
  provider: "groq" | "openrouter",
  baseUrl: string,
  params: ResolvedParams
): AsyncGenerator<LLMStreamChunk> {
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
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as OpenAIChatResponse;
      message = data.error?.message ?? message;
    } catch {
      // body was not JSON — keep statusText
    }
    throw new ProviderError(
      `${provider} error: ${message}`,
      isRetryableStatus(res.status)
    );
  }

  let resolvedModel = model;
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let sawUsage = false;
  let emitted = false;

  for await (const line of iterateSseLines(res.body)) {
    if (!line.startsWith(SSE_DATA_PREFIX)) continue;
    const payload = line.slice(SSE_DATA_PREFIX.length).trim();
    if (!payload || payload === "[DONE]") continue;

    let parsed: {
      choices?: Array<{ delta?: { content?: string } }>;
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
      error?: { message?: string };
    };
    try {
      parsed = JSON.parse(payload);
    } catch {
      continue;
    }

    if (parsed.error) {
      throw new ProviderError(
        `${provider} error: ${parsed.error.message ?? "stream error"}`,
        true
      );
    }
    if (parsed.model) resolvedModel = parsed.model;
    if (parsed.usage) {
      sawUsage = true;
      usage.promptTokens = parsed.usage.prompt_tokens ?? usage.promptTokens;
      usage.completionTokens =
        parsed.usage.completion_tokens ?? usage.completionTokens;
      usage.totalTokens = parsed.usage.total_tokens ?? usage.totalTokens;
    }
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) {
      emitted = true;
      yield { type: "text", text: delta };
    }
  }

  if (!emitted) {
    throw new ProviderError(`${provider} returned an empty stream`, true);
  }

  yield {
    type: "done",
    done: {
      model: resolvedModel,
      provider,
      usage: sawUsage ? usage : undefined,
    },
  };
}

/**
 * Stream tokens from Anthropic using the SDK's `.stream()` helper, which emits
 * `content_block_delta` events as text arrives.
 */
async function* streamAnthropic(
  params: ResolvedParams
): AsyncGenerator<LLMStreamChunk> {
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

  let stream: ReturnType<Anthropic.Messages["stream"]>;
  try {
    stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: sdkMessages,
    });
  } catch (err) {
    throw toAnthropicProviderError(err);
  }

  let emitted = false;
  let resolvedModel = model;
  try {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const text = event.delta.text;
        if (text) {
          emitted = true;
          yield { type: "text", text };
        }
      } else if (event.type === "message_start") {
        if (event.message.model) resolvedModel = event.message.model;
      }
    }
  } catch (err) {
    throw toAnthropicProviderError(err);
  }

  const final = await stream.finalMessage().catch(() => null);
  if (final?.model) resolvedModel = final.model;

  if (!emitted) {
    throw new ProviderError("anthropic returned an empty stream", true);
  }

  yield {
    type: "done",
    done: {
      model: resolvedModel,
      provider: "anthropic",
      usage: final
        ? {
            promptTokens: final.usage.input_tokens,
            completionTokens: final.usage.output_tokens,
            totalTokens: final.usage.input_tokens + final.usage.output_tokens,
          }
        : undefined,
    },
  };
}

function toAnthropicProviderError(err: unknown): ProviderError {
  const status =
    err instanceof Anthropic.APIError && typeof err.status === "number"
      ? err.status
      : 0;
  return new ProviderError(
    `anthropic error: ${err instanceof Error ? err.message : String(err)}`,
    status === 0 ? true : isRetryableStatus(status)
  );
}

/**
 * Gemini has a streaming endpoint, but to keep the surface small and reliable
 * we fall back to the buffered call and emit its text as a single chunk. This
 * still works end-to-end behind the SSE plumbing; the response simply arrives
 * in one piece rather than token-by-token.
 */
async function* streamGeminiBuffered(
  params: ResolvedParams
): AsyncGenerator<LLMStreamChunk> {
  const result = await invokeGemini(params);
  if (result.text) yield { type: "text", text: result.text };
  yield {
    type: "done",
    done: {
      model: result.model,
      provider: result.provider,
      usage: result.usage,
    },
  };
}

function streamProvider(
  provider: LLMProvider,
  params: ResolvedParams
): AsyncGenerator<LLMStreamChunk> {
  switch (provider) {
    case "groq":
      return streamOpenAICompatible("groq", GROQ_API_BASE, params);
    case "openrouter":
      return streamOpenAICompatible("openrouter", OPENROUTER_API_BASE, params);
    case "gemini":
      return streamGeminiBuffered(params);
    case "anthropic":
      return streamAnthropic(params);
  }
}

/**
 * Parse a fetch `ReadableStream<Uint8Array>` body into individual SSE lines,
 * buffering across chunk boundaries so a `data:` line split mid-frame is never
 * truncated.
 */
async function* iterateSseLines(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
        buffer = buffer.slice(newlineIdx + 1);
        if (line) yield line;
      }
    }
    const tail = (buffer + decoder.decode()).replace(/\r$/, "").trim();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream the best available LLM token-by-token, trying providers in free-first
 * priority order. Falls back to the next provider only BEFORE any text has been
 * emitted (once tokens have streamed to the client we cannot cleanly restart on
 * a different provider). Yields `{ type: "text" }` deltas followed by a single
 * `{ type: "done" }` with the resolved model/provider/usage. Usage is logged
 * best-effort once the stream completes.
 *
 * Throws (before yielding anything) if no provider is configured or every
 * provider fails before producing output — callers can catch this and fall back
 * to the buffered `invokeLLM` JSON response so behaviour never regresses.
 */
export async function* streamLLM(
  params: LLMInvokeParams
): AsyncGenerator<LLMStreamChunk> {
  const { messages, jsonMode = false } = params;

  const systemMsg = messages.find(m => m.role === "system");
  const conversationMsgs = messages.filter(m => m.role !== "system");

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
    let started = false;
    try {
      for await (const chunk of streamProvider(provider, resolved)) {
        if (chunk.type === "text") started = true;
        if (chunk.type === "done") {
          // Best-effort usage logging (never blocks or throws).
          await logAiUsage({
            feature: params.feature ?? "unknown",
            provider: chunk.done.provider,
            model: chunk.done.model,
            promptTokens: chunk.done.usage?.promptTokens,
            completionTokens: chunk.done.usage?.completionTokens,
            totalTokens: chunk.done.usage?.totalTokens,
            userId: params.userId ?? null,
          });
        }
        yield chunk;
      }
      return;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      // Once any text has reached the consumer we can't switch providers
      // mid-stream — surface the failure rather than corrupt the output.
      if (started) {
        throw new Error(
          `LLM stream failed mid-response (${provider}): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  throw new Error(
    `All LLM providers failed (${order.join(", ")}): ${errors.join(" | ")}`
  );
}
