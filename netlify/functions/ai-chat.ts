/**
 * AI Chat — POST /api/ai-chat
 *
 * Public "Digital Foreman" assistant. Streams the model's reply token-by-token
 * over Server-Sent Events when a provider that supports streaming is available,
 * and transparently falls back to a single buffered JSON response otherwise
 * (no provider configured, a non-streaming provider, or any streaming error
 * before the first token). The buffered path is byte-for-byte the original
 * behaviour, so existing clients and tests never regress.
 */
import { Readable } from "node:stream";
import { stream } from "@netlify/functions";
import type {
  Handler,
  HandlerEvent,
  StreamingResponse,
} from "@netlify/functions";
import {
  invokeLLM,
  streamLLM,
  type LLMStreamChunk,
} from "../../server/_core/llm";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { PROMPTS, isLLMConfigError } from "./_lib/llm/prompts";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

/**
 * Streaming is DISABLED: Netlify's `stream()` wrapper produces a corrupted
 * lambda response ("invalid character '\x00' after top-level value") for every
 * path in this deployment — the SSE body, the buffered fallback, and error
 * responses alike — which took ai-chat down in production. Until response
 * streaming is validated end-to-end on a deploy preview, `serveInner` always
 * returns the classic buffered JSON, which the frontend `useStreamingChat`
 * consumes via its buffered fallback. Flip this back to a runtime check once
 * streaming is proven to work on a preview.
 */
const STREAMING_RUNTIME = false;

/** True when the caller opted into SSE via the Accept header. */
function wantsStream(headers: Record<string, string | undefined>): boolean {
  const accept = headers["accept"] ?? headers["Accept"] ?? "";
  return accept.includes("text/event-stream");
}

/** Serialise a stream chunk into a single SSE frame. */
function sseFrame(chunk: LLMStreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

const serveInner = async (event: HandlerEvent): Promise<StreamingResponse> => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);
  const jsonHeaders = { ...headers, "Content-Type": "application/json" };

  const errorBody = (
    statusCode: number,
    message: string,
    extra: Record<string, string> = {}
  ): StreamingResponse => ({
    statusCode,
    headers: { ...jsonHeaders, ...extra },
    body: JSON.stringify({ error: message }),
  });

  // CORS preflight.
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Origin allow-list.
  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  // Method allow-list.
  if (event.httpMethod !== "POST") {
    return errorBody(405, "Method not allowed");
  }

  // Rate limit (public — keyed by IP).
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`ai-chat:${ip}`, RATE_LIMIT);
  if (!rl.allowed) {
    return errorBody(
      429,
      "Too many requests. Please slow down.",
      rateLimitHeaders(rl)
    );
  }

  let messages: ChatMessage[];
  try {
    const body = JSON.parse(event.body ?? "{}");
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return errorBody(400, "Invalid JSON body");
  }

  if (!messages.length) {
    return errorBody(400, "messages array is required");
  }

  const fullMessages = [
    { role: "system" as const, content: PROMPTS.chat },
    ...messages.filter(m => m.role !== "system"),
  ];

  // Buffered fallback — preserves the original JSON contract exactly.
  const buffered = async (): Promise<StreamingResponse> => {
    try {
      const result = await invokeLLM({
        messages: fullMessages,
        maxTokens: 600,
        temperature: 0.4,
        feature: "ai-chat",
      });
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          text: result.text,
          model: result.model,
          provider: result.provider,
        }),
      };
    } catch (err) {
      console.error("[ai-chat]", err);
      return errorBody(
        500,
        isLLMConfigError(err)
          ? "AI service is not configured. Please contact the site administrator."
          : "AI service temporarily unavailable. Please try again in a moment."
      );
    }
  };

  // Stream only when the deployed runtime supports it AND the client opted in.
  // Otherwise keep the classic buffered JSON response so behaviour never
  // regresses (unit tests, classic dev, non-SSE clients).
  if (!STREAMING_RUNTIME || !wantsStream(event.headers)) {
    return buffered();
  }

  // Attempt streaming. Peek the first chunk so a pre-emission failure (no key /
  // all providers fail) cleanly falls back to buffered JSON instead of opening
  // a 200 stream we can't fill.
  const gen = streamLLM({
    messages: fullMessages,
    maxTokens: 600,
    temperature: 0.4,
    feature: "ai-chat",
  });

  let first: IteratorResult<LLMStreamChunk>;
  try {
    first = await gen.next();
  } catch (err) {
    console.error("[ai-chat] stream init failed, falling back:", err);
    return buffered();
  }

  const body = new Readable({ read() {} });
  if (!first.done && first.value) body.push(sseFrame(first.value));

  (async () => {
    try {
      for await (const chunk of gen) {
        body.push(sseFrame(chunk));
      }
    } catch (err) {
      console.error("[ai-chat] stream error mid-response:", err);
      body.push(
        sseFrame({
          type: "error",
          error: "AI service interrupted. Please try again.",
        })
      );
    } finally {
      body.push(null);
    }
  })();

  return {
    statusCode: 200,
    headers: {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...rateLimitHeaders(rl),
    },
    body,
  };
};

/**
 * Umbrella try/catch — restores the top-level guard `withGuards` provided so
 * any unexpected synchronous/await throw during setup still returns a
 * structured 500 with CORS headers (never a bare runtime crash).
 */
const serve = async (event: HandlerEvent): Promise<StreamingResponse> => {
  try {
    return await serveInner(event);
  } catch (err) {
    console.error("[ai-chat] unhandled error:", err);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders(event.headers["origin"]),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

// Buffered classic handler (streaming disabled — see STREAMING_RUNTIME above).
export const handler: Handler = serve as unknown as Handler;
