/**
 * useStreamingChat — shared chat state machine for the AI assistants.
 *
 * POSTs a conversation to a Netlify Function (e.g. /api/ai-chat,
 * /api/ai-copilot) asking for a Server-Sent-Events stream, then appends each
 * token to the in-flight assistant message so the bubble fills in
 * progressively. If the server responds with JSON instead of a stream
 * (no streaming-capable provider, an older deploy, or a guarded error such as
 * 429/503), it transparently consumes the buffered `{ text }` body the classic
 * way — so behaviour never regresses.
 *
 * Transport is intentionally tiny and dependency-free: the SSE frames are
 * `data: <json>\n\n` where the JSON is an `LLMStreamChunk`
 * (`{type:"text"}` | `{type:"done"}` | `{type:"error"}`).
 */
import { useCallback, useRef, useState } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

/** Map an HTTP status (and optional server message) to a user-facing string. */
export type ErrorFormatter = (status: number, fallback?: string) => string;

/** Client-side retry tuning for transient failures. */
export type RetryOptions = {
  /** Extra attempts after the first (default 2 → up to 3 total tries). */
  maxRetries?: number;
  /** Base backoff in ms; doubles each attempt (default 500). */
  baseDelayMs?: number;
  /** Ceiling for any single backoff wait, in ms (default 4000). */
  maxDelayMs?: number;
};

export type UseStreamingChatOptions = {
  /** Function endpoint to POST to, e.g. "/api/ai-chat". */
  endpoint: string;
  /** Extra headers to merge in (e.g. an Authorization bearer for the copilot). */
  headers?: () => Record<string, string>;
  /** Translate an error HTTP status into a message shown in the bubble. */
  formatError: ErrorFormatter;
  /** Called once per response with the resolving provider id, when known. */
  onProvider?: (provider: string) => void;
  /** Override client-side retry behaviour (mostly for tests). */
  retry?: RetryOptions;
};

const CONNECTION_ERROR =
  "⚠️ Connection error. Please check your internet and try again.";

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

/**
 * HTTP statuses worth a client-side retry: request timeout, too-early,
 * rate-limit, and the transient 5xx gateway/overload family. A 4xx like 400 /
 * 401 / 403 / 404 is a caller/permissions problem that retrying won't fix, so
 * those surface immediately.
 */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Full-jitter exponential backoff. `Retry-After` (seconds or an HTTP-date),
 * when the server sends one on a 429/503, wins over the computed delay but is
 * still capped by `maxDelayMs` so a hostile header can't stall the UI.
 */
function backoffDelay(
  attempt: number,
  cfg: Required<RetryOptions>,
  retryAfter?: string | null
): number {
  const exponential = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * 2 ** attempt);
  const jittered = Math.random() * exponential;
  const serverHint = parseRetryAfter(retryAfter);
  const base = serverHint != null ? Math.max(jittered, serverHint) : jittered;
  return Math.min(cfg.maxDelayMs, base);
}

/** Parse a `Retry-After` header (delta-seconds or HTTP-date) into ms. */
function parseRetryAfter(value?: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const when = Date.parse(value);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return null;
}

/**
 * Result of a single request attempt: either terminal ("done" — an answer or a
 * non-retryable error has been rendered) or a transient failure worth a backed-
 * off retry, carrying the message to show if the retry budget is exhausted.
 */
type Outcome =
  | { type: "done" }
  | { type: "retry"; message: string; retryAfter: string | null };

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const { endpoint, headers, formatError, onProvider, retry } = options;
  const retryCfg: Required<RetryOptions> = { ...DEFAULT_RETRY, ...retry };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  // Latest messages snapshot for building the request without stale closures.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  // Synchronous in-flight guard. `loading` is async React state, so two rapid
  // synchronous calls (double-click, held Enter, two quick prompts) could both
  // read loading===false and fire concurrent requests — this ref blocks that.
  const inFlightRef = useRef(false);

  const setAssistant = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, content } : m)));
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading || inFlightRef.current) return;
      inFlightRef.current = true;

      const userMsg: ChatMessage = {
        id: nextId("u"),
        role: "user",
        content,
      };
      const assistantId = nextId("a");
      const history = [...messagesRef.current, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      setMessages(prev => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setLoading(true);

      // One request attempt. Returns "done" when the exchange reached a
      // terminal state (answer rendered, or a non-retryable error shown), or
      // "retry" for a transient failure the caller should back off and retry.
      // Crucially it does NOT touch the assistant bubble on a retryable failure,
      // so the bubble keeps showing its "…" placeholder between attempts and a
      // later success (or the final error) renders exactly once.
      const attemptOnce = async (): Promise<Outcome> => {
        let res: Response;
        try {
          res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              ...(headers ? headers() : {}),
            },
            body: JSON.stringify({ messages: history }),
          });
        } catch {
          // Network error / DNS / offline — worth a retry.
          return { type: "retry", message: CONNECTION_ERROR, retryAfter: null };
        }

        const contentType = res.headers.get("content-type") ?? "";
        const isStream =
          res.ok && contentType.includes("text/event-stream") && res.body;

        if (!isStream) {
          // Buffered JSON path (errors, or a non-streaming provider/deploy).
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            if (data.provider) onProvider?.(data.provider);
            setAssistant(assistantId, data.text ?? "No response received.");
            return { type: "done" };
          }
          // A transient status gets backed off and retried; anything else
          // (400/401/403/404…) surfaces immediately — retrying won't help.
          if (RETRYABLE_STATUSES.has(res.status)) {
            return {
              type: "retry",
              message: formatError(res.status, data.error),
              retryAfter: res.headers.get("retry-after"),
            };
          }
          setAssistant(assistantId, formatError(res.status, data.error));
          return { type: "done" };
        }

        // Streaming path: once we start writing tokens we can't cleanly retry
        // on a different attempt, so this path is always terminal.
        await consumeStream(res.body!, {
          onText: delta =>
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + delta } : m
              )
            ),
          onProvider: p => onProvider?.(p),
          // Surface a mid-stream error: replace an empty bubble, or append a
          // newline-separated notice to a partial answer so it's never hidden.
          onError: errText =>
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content
                        ? `${m.content}\n\n${errText}`
                        : errText,
                    }
                  : m
              )
            ),
        });

        // If the stream produced nothing at all, show a graceful fallback.
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId && !m.content
              ? { ...m, content: "No response received." }
              : m
          )
        );
        return { type: "done" };
      };

      try {
        for (let attempt = 0; ; attempt++) {
          let outcome: Outcome;
          try {
            outcome = await attemptOnce();
          } catch {
            // Any unexpected throw (e.g. a stream read blowing up) is treated as
            // a graceful connection error rather than a hard crash.
            outcome = {
              type: "retry",
              message: CONNECTION_ERROR,
              retryAfter: null,
            };
          }

          if (outcome.type === "done") break;

          // Transient failure. Retry with exponential backoff until the budget
          // is spent, then render the graceful fallback message once.
          if (attempt >= retryCfg.maxRetries) {
            setAssistant(assistantId, outcome.message);
            break;
          }
          await sleep(backoffDelay(attempt, retryCfg, outcome.retryAfter));
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [
      endpoint,
      headers,
      formatError,
      onProvider,
      loading,
      setAssistant,
      retryCfg.maxRetries,
      retryCfg.baseDelayMs,
      retryCfg.maxDelayMs,
    ]
  );

  return { messages, loading, send };
}

type StreamHandlers = {
  onText: (delta: string) => void;
  onProvider: (provider: string) => void;
  onError: (message: string) => void;
};

/**
 * Read an SSE response body, parsing `data:` frames into stream chunks and
 * routing them to the handlers. Buffers across network-chunk boundaries so a
 * frame split mid-read is never dropped.
 */
async function consumeStream(
  body: ReadableStream<Uint8Array>,
  handlers: StreamHandlers
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushEvent = (raw: string) => {
    // An SSE event may span multiple `data:` lines; concatenate their payloads.
    const dataLines = raw
      .split("\n")
      .filter(l => l.startsWith("data:"))
      .map(l => l.slice(5).trim());
    if (!dataLines.length) return;
    const payload = dataLines.join("");
    if (!payload || payload === "[DONE]") return;
    let chunk:
      | { type: "text"; text: string }
      | { type: "done"; done: { provider?: string } }
      | { type: "error"; error: string };
    try {
      chunk = JSON.parse(payload);
    } catch {
      return;
    }
    if (chunk.type === "text") handlers.onText(chunk.text);
    else if (chunk.type === "done") {
      if (chunk.done?.provider) handlers.onProvider(chunk.done.provider);
    } else if (chunk.type === "error") handlers.onError(chunk.error);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      // SSE events are delimited by a blank line.
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        flushEvent(event);
      }
    }
    const tail = buffer + decoder.decode();
    if (tail.trim()) flushEvent(tail);
  } finally {
    reader.releaseLock();
  }
}
