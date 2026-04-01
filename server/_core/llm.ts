/**
 * LLM client — wires to Google Gemini via direct REST API.
 * Phase 3 expands this with full Whisper + Gemini integrations
 * inside Netlify Functions. This module provides shared types
 * and a base invocation helper used across features.
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

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Invoke Google Gemini via REST.
 * Throws on network error or non-200 response.
 */
export async function invokeLLM(params: LLMInvokeParams): Promise<LLMResult> {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured in Netlify environment variables.");
  }

  const { messages, maxTokens = 4096, temperature = 0.3, jsonMode = false } = params;

  // Convert to Gemini contents format
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === "system");

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction.content }],
    };
  }

  const res = await fetch(
    `${GEMINI_API_BASE}/${DEFAULT_MODEL}:generateContent?key=${ENV.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
    modelVersion?: string;
  };

  const text =
    data.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? "";

  return {
    text,
    model: data.modelVersion ?? DEFAULT_MODEL,
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : undefined,
  };
}
