/**
 * AI Ops Co-pilot — POST /api/ai-copilot
 *
 * An admin-only conversational assistant that answers natural-language
 * questions over Eric's REAL operational data (projects, estimates, schedule,
 * ledger, leads, materials, field reports). Rather than embeddings, it injects
 * a compact, bounded snapshot of the current business state as context — fast,
 * accurate, and free-tier friendly for a single firm's data volume.
 *
 * Reads private business data via the service-role DB, so it requires an
 * authenticated admin. Streams the reply token-by-token over Server-Sent
 * Events when a streaming-capable provider is available, and transparently
 * falls back to the original buffered JSON response otherwise (no provider
 * configured, a non-streaming provider, or any pre-token streaming error) so
 * behaviour never regresses.
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
import { buildOpsSnapshot } from "../../server/_core/opsSnapshot";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";
import { verifyAdmin } from "./_utils/authGuard";
import { PROMPTS, isLLMConfigError } from "./_lib/llm/prompts";

type ChatMessage = { role: "user" | "assistant"; content: string };

const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

/**
 * Streaming is DISABLED: Netlify's `stream()` wrapper produces a corrupted
 * lambda response ("invalid character '\x00' after top-level value") for every
 * path in this deployment — the SSE body, the buffered fallback, and error
 * responses alike — which took ai-copilot down in production. Until response
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

  // Admin authentication (runs before rate limiting so the bucket keys on uid).
  const auth = await verifyAdmin(event.headers);
  if (!auth.ok) return errorBody(auth.statusCode, auth.message);
  const user = auth.user;

  // Rate limit (admin — keyed by user id).
  const rl = checkRateLimit(`ai-copilot:${user.id}`, RATE_LIMIT);
  if (!rl.allowed) {
    return errorBody(
      429,
      "Too many requests. Please slow down.",
      rateLimitHeaders(rl)
    );
  }

  let messages: ChatMessage[];
  try {
    const body = JSON.parse(event.body ?? "{}") as { messages?: ChatMessage[] };
    messages = (body.messages ?? [])
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-12); // keep the last few turns to bound tokens
  } catch {
    return errorBody(400, "Invalid JSON body");
  }

  if (!messages.length) {
    return errorBody(400, "No messages provided.");
  }

  // Build the live ops snapshot up-front (shared by both paths).
  let snapshotText: string;
  try {
    const snapshot = await buildOpsSnapshot();
    snapshotText = snapshot.text;
  } catch (err) {
    console.error("[ai-copilot] snapshot build failed:", err);
    return errorBody(
      500,
      "Co-pilot is temporarily unavailable. Please try again."
    );
  }

  const fullMessages = [
    {
      role: "system" as const,
      content: `${PROMPTS.copilot}\n\n${snapshotText}`,
    },
    ...messages,
  ];

  // Buffered fallback — preserves the original JSON contract exactly.
  const buffered = async (): Promise<StreamingResponse> => {
    try {
      const result = await invokeLLM({
        feature: "ai-copilot",
        userId: user.id,
        messages: fullMessages,
        maxTokens: 900,
        temperature: 0.3,
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
      console.error("[ai-copilot]", err);
      const isConfigError = isLLMConfigError(err);
      return errorBody(
        isConfigError ? 503 : 500,
        isConfigError
          ? "AI is not configured yet. Add a free GROQ_API_KEY or GOOGLE_AI_API_KEY."
          : "Co-pilot is temporarily unavailable. Please try again."
      );
    }
  };

  // Stream only when the deployed runtime supports it AND the client opted in.
  // Otherwise keep the classic buffered JSON response so behaviour never
  // regresses (unit tests, classic dev, non-SSE clients).
  if (!STREAMING_RUNTIME || !wantsStream(event.headers)) {
    return buffered();
  }

  // Attempt streaming. Peek the first chunk so a pre-emission failure cleanly
  // falls back to buffered JSON rather than opening a 200 stream we can't fill.
  const gen = streamLLM({
    feature: "ai-copilot",
    userId: user.id,
    messages: fullMessages,
    maxTokens: 900,
    temperature: 0.3,
  });

  let first: IteratorResult<LLMStreamChunk>;
  try {
    first = await gen.next();
  } catch (err) {
    console.error("[ai-copilot] stream init failed, falling back:", err);
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
      console.error("[ai-copilot] stream error mid-response:", err);
      body.push(
        sseFrame({
          type: "error",
          error: "Co-pilot interrupted. Please try again.",
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
    console.error("[ai-copilot] unhandled error:", err);
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
