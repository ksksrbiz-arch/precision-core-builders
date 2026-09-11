/**
 * LLM client — free-first, multi-provider with automatic fallback.
 *
 * All AI features (field reports, estimator, lead scoring, chat, search) call
 * invokeLLM(). Providers are tried in priority order; if one is unconfigured,
 * rate-limited, or errors, the next is attempted automatically. This keeps the
 * platform resilient and cheap: every provider is a free tier.
 *
 * Providers are all free-tier (free-first priority):
 *   1. Groq          — free, ultra-fast LPU.  GROQ_API_KEY
 *                      https://console.groq.com/keys
 *   2. OpenRouter    — free (:free) models.  OPENROUTER_API_KEY
 *                      https://openrouter.ai/keys
 *
 * Override the order with LLM_PROVIDER_ORDER (e.g. "openrouter,groq").
 * Override any model with GROQ_MODEL / OPENROUTER_MODEL.
 */
import { ENV } from "./env";
import { logAiUsage } from "./aiUsage";

export type LLMRole = "system" | "user" | "assistant" | "tool";

export type LLMMessage = {
  role: LLMRole;
  content: string;
  /** Set on assistant messages that requested tools, so the model sees its own call. */
  toolCalls?: LLMToolCall[];
  /** Set on `tool` messages, linking the result back to the request. */
  toolCallId?: string;
};

/** An OpenAI-style function tool the model may request. */
export type LLMTool = {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
};

/** A tool the model asked to run. */
export type LLMToolCall = {
  id: string;
  name: string;
  /** Raw argument JSON as the model produced it; may be malformed. */
  rawArguments: string;
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
  /**
   * Tools the model may call. Presence of this array switches the request into
   * tool-calling mode; the caller is responsible for executing any returned
   * calls and invoking again with the results (see `runToolLoop`).
   */
  tools?: LLMTool[];
};

export type LLMProvider = "groq" | "openrouter";

export type LLMResult = {
  text: string;
  /** Tool calls the model requested, when tools were supplied. */
  toolCalls?: LLMToolCall[];
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

const DEFAULT_ORDER: LLMProvider[] = ["groq", "openrouter"];

// gpt-oss-120b is markedly better at tool calling than llama-3.3-70b, which
// matters now that ai-chat and ai-copilot run a tool loop. It is the model
// Clearview runs on Groq in production. Both remain free tier.
// Override per-provider with GROQ_MODEL / OPENROUTER_MODEL.
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  groq: "openai/gpt-oss-120b",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
};

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

const MAX_ATTEMPTS_PER_PROVIDER = 2;
const RETRY_BASE_DELAY_MS = 400;

function apiKeyFor(provider: LLMProvider): string {
  switch (provider) {
    case "groq":
      return ENV.groqApiKey;
    case "openrouter":
      return ENV.openrouterApiKey;
  }
}

function modelFor(provider: LLMProvider): string {
  const override = {
    groq: ENV.groqModel,
    openrouter: ENV.openrouterModel,
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

type OpenAIToolCall = {
  id?: string;
  function?: { name?: string; arguments?: string };
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: OpenAIToolCall[] };
    finish_reason?: string;
  }>;
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

  const messages: Array<Record<string, unknown>> = [];
  if (system) messages.push({ role: "system", content: system });
  for (const m of conversationMsgs) {
    if (m.role === "tool") {
      // A tool result must carry the id of the call it answers, or the
      // provider rejects the whole conversation.
      messages.push({
        role: "tool",
        content: m.content,
        tool_call_id: m.toolCallId,
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      messages.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map(c => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: c.rawArguments },
        })),
      });
      continue;
    }
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
      ...(params.tools?.length
        ? {
            tools: params.tools.map(t => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })),
            tool_choice: "auto",
          }
        : {}),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as OpenAIChatResponse;

  if (!res.ok || data.error) {
    throw new ProviderError(
      `${provider} error: ${data.error?.message ?? res.statusText}`,
      isRetryableStatus(res.status)
    );
  }

  const message = data.choices?.[0]?.message;
  const text = message?.content ?? "";
  const toolCalls: LLMToolCall[] = (message?.tool_calls ?? [])
    .filter(c => c.function?.name)
    .map((c, i) => ({
      id: c.id ?? `call_${i}`,
      name: c.function!.name!,
      rawArguments: c.function?.arguments ?? "{}",
    }));

  // A turn that requests tools legitimately has no prose content, so empty
  // text is only an error when the model also asked for nothing.
  if (!text && !toolCalls.length) {
    throw new ProviderError(`${provider} returned an empty response`, true);
  }

  return {
    text,
    ...(toolCalls.length ? { toolCalls } : {}),
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
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Executes one tool call and returns a JSON-serialisable result. */
export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>
) => Promise<unknown> | unknown;

export type ToolLoopParams = LLMInvokeParams & {
  tools: LLMTool[];
  execute: ToolExecutor;
  /**
   * Maximum tool rounds before the loop gives up. Bounded per the AI Operating
   * Contract: a model that keeps calling tools must terminate, not spin.
   */
  maxRounds?: number;
};

export type ToolLoopResult = LLMResult & {
  /** Every tool the model actually ran, in order, for observability. */
  toolTrace: { name: string; args: Record<string, unknown>; result: unknown }[];
};

const DEFAULT_MAX_TOOL_ROUNDS = 2;

/**
 * Run a bounded tool-calling conversation: call the model, execute any tools it
 * requests, feed the results back, and repeat until it answers in prose or the
 * round budget is spent.
 *
 * Fails down, never open. A tool that throws, or arguments that are not valid
 * JSON, are reported back to the model as an error result rather than aborting
 * the turn — the model can then answer without that tool. If the round budget
 * is exhausted the last text is returned; the caller always gets an answer or a
 * thrown provider error, never a half-finished tool state.
 */
export async function runToolLoop(
  params: ToolLoopParams
): Promise<ToolLoopResult> {
  const {
    tools,
    execute,
    maxRounds = DEFAULT_MAX_TOOL_ROUNDS,
    ...rest
  } = params;
  const conversation: LLMMessage[] = [...params.messages];
  const toolTrace: ToolLoopResult["toolTrace"] = [];
  let last: LLMResult | null = null;

  for (let round = 0; round <= maxRounds; round++) {
    // On the final round the tools are withheld, which forces the model to
    // answer with what it already has instead of requesting more.
    const atBudget = round === maxRounds;
    const result = await invokeLLM({
      ...rest,
      messages: conversation,
      ...(atBudget ? {} : { tools }),
    });
    last = result;

    if (!result.toolCalls?.length) {
      return { ...result, toolTrace };
    }

    conversation.push({
      role: "assistant",
      content: result.text,
      toolCalls: result.toolCalls,
    });

    for (const call of result.toolCalls) {
      let args: Record<string, unknown> = {};
      let output: unknown;
      try {
        args = JSON.parse(call.rawArguments || "{}") as Record<string, unknown>;
      } catch {
        output = { error: "Tool arguments were not valid JSON." };
      }
      if (output === undefined) {
        try {
          output = await execute(call.name, args);
        } catch (err) {
          output = {
            error: err instanceof Error ? err.message : "Tool failed.",
          };
        }
      }
      toolTrace.push({ name: call.name, args, result: output });
      conversation.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify(output),
      });
    }
  }

  // Budget exhausted with the model still asking for tools. Return what it
  // last said rather than throwing — a degraded answer beats no answer.
  return { ...(last as LLMResult), toolTrace };
}

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
        "(https://console.groq.com/keys) or OPENROUTER_API_KEY " +
        "(https://openrouter.ai/keys) — in your Netlify environment variables."
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

function streamProvider(
  provider: LLMProvider,
  params: ResolvedParams
): AsyncGenerator<LLMStreamChunk> {
  switch (provider) {
    case "groq":
      return streamOpenAICompatible("groq", GROQ_API_BASE, params);
    case "openrouter":
      return streamOpenAICompatible("openrouter", OPENROUTER_API_BASE, params);
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
        "(https://console.groq.com/keys) or OPENROUTER_API_KEY " +
        "(https://openrouter.ai/keys) — in your Netlify environment variables."
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

// ─── Robust JSON parsing of model output ─────────────────────────────────────

/**
 * Parse JSON from an LLM response, tolerating the ways free-tier models deviate
 * from `jsonMode` even when asked for raw JSON: markdown code fences
 * (```json … ```), a leading/trailing sentence, or the object embedded in prose.
 *
 * Strategy: strip a surrounding code fence, try a direct parse, then fall back
 * to extracting the first balanced `{…}` / `[…]` block (quote- and
 * escape-aware). Throws a clear error if nothing parses so callers can return a
 * graceful message instead of leaking `Unexpected token … in JSON`.
 */
export function parseLlmJson<T = unknown>(text: string): T {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("LLM response was empty");
  }
  let s = text.trim();

  // Strip a wrapping markdown code fence, with or without a language tag.
  const fenced = s.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) s = fenced[1].trim();

  // Fast path: the whole (de-fenced) string is valid JSON.
  try {
    return JSON.parse(s) as T;
  } catch {
    // fall through to extraction
  }

  // Extract the first balanced object/array, ignoring braces inside strings.
  const start = s.search(/[{[]/);
  if (start !== -1) {
    const open = s[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') {
        inStr = true;
      } else if (c === open) {
        depth++;
      } else if (c === close) {
        depth--;
        if (depth === 0) {
          return JSON.parse(s.slice(start, i + 1)) as T;
        }
      }
    }
  }

  throw new Error("Could not parse JSON from the AI response");
}
