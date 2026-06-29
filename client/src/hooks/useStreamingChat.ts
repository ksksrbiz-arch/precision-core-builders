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

export type UseStreamingChatOptions = {
  /** Function endpoint to POST to, e.g. "/api/ai-chat". */
  endpoint: string;
  /** Extra headers to merge in (e.g. an Authorization bearer for the copilot). */
  headers?: () => Record<string, string>;
  /** Translate an error HTTP status into a message shown in the bubble. */
  formatError: ErrorFormatter;
  /** Called once per response with the resolving provider id, when known. */
  onProvider?: (provider: string) => void;
};

const CONNECTION_ERROR =
  "⚠️ Connection error. Please check your internet and try again.";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const { endpoint, headers, formatError, onProvider } = options;
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

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...(headers ? headers() : {}),
          },
          body: JSON.stringify({ messages: history }),
        });

        const contentType = res.headers.get("content-type") ?? "";
        const isStream =
          res.ok && contentType.includes("text/event-stream") && res.body;

        if (!isStream) {
          // Buffered JSON path (errors, or a non-streaming provider/deploy).
          const data = await res.json().catch(() => ({}));
          const message = res.ok
            ? (data.text ?? "No response received.")
            : formatError(res.status, data.error);
          if (res.ok && data.provider) onProvider?.(data.provider);
          setAssistant(assistantId, message);
          return;
        }

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
      } catch {
        setAssistant(assistantId, CONNECTION_ERROR);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [endpoint, headers, formatError, onProvider, loading, setAssistant]
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
