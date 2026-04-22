/**
 * LLM client — Claude (Anthropic) primary, Google Gemini 1.5 Flash free fallback.
 * All AI features (field reports, estimator, lead scoring, chat) call invokeLLM().
 *
 * Priority order:
 *  1. Anthropic Claude (claude-sonnet-4-6) — best quality, requires ANTHROPIC_API_KEY
 *  2. Google Gemini 1.5 Flash — free tier, requires GOOGLE_AI_API_KEY
 *     Get a free key (no credit card): https://aistudio.google.com/app/apikey
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

export type LLMResult = {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

// ─── Anthropic (Claude) ──────────────────────────────────────────────────────

async function invokeAnthropic(
  params: LLMInvokeParams & { system: string; conversationMsgs: LLMMessage[] }
): Promise<LLMResult> {
  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  const { system, conversationMsgs, maxTokens = 4096, temperature = 0.3 } =
    params;

  const sdkMessages: Anthropic.MessageParam[] = conversationMsgs.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: sdkMessages,
  });

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

// ─── Google Gemini (free tier fallback) ────────────────────────────────────

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

async function invokeGemini(
  params: LLMInvokeParams & { system: string; conversationMsgs: LLMMessage[] }
): Promise<LLMResult> {
  const {
    system,
    conversationMsgs,
    maxTokens = 4096,
    temperature = 0.3,
  } = params;

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
    if (!system) throw new Error("invokeLLM: no messages and no system prompt");
    contents.unshift({ role: "user", parts: [{ text: system }] });
  }

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${ENV.googleAiApiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  const data = (await res.json()) as GeminiResponse;

  if (!res.ok || data.error) {
    throw new Error(
      `Gemini API error: ${data.error?.message ?? res.statusText}`
    );
  }

  const text =
    data.candidates
      ?.flatMap(c => c.content?.parts ?? [])
      .map(p => p.text ?? "")
      .join("") ?? "";

  return {
    text,
    model: GEMINI_MODEL,
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Invoke the best available LLM.
 * Tries Anthropic Claude first; falls back to Google Gemini (free tier).
 * Throws if neither API key is configured.
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

  const enriched = { ...params, system, conversationMsgs };

  if (ENV.anthropicApiKey) {
    return invokeAnthropic(enriched);
  }

  if (ENV.googleAiApiKey) {
    return invokeGemini(enriched);
  }

  throw new Error(
    "No LLM API key configured. Set ANTHROPIC_API_KEY (paid) or GOOGLE_AI_API_KEY (free at https://aistudio.google.com/app/apikey) in Netlify environment variables."
  );
}
