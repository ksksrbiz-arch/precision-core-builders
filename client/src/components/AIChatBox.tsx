/**
 * AIChatBox — Digital Foreman AI assistant.
 * Backed by /api/ai-chat (Netlify Function → invokeLLM/streamLLM). Streams the
 * reply token-by-token when the server supports it, falling back to a single
 * buffered response otherwise — both handled by useStreamingChat.
 */
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatComposer } from "@/components/ai/ChatComposer";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { Bot, User, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function getChatErrorMessage(status: number, fallback?: string): string {
  if (status === 429) {
    return "⚠️ You're sending messages too quickly. Please wait a moment and try again.";
  }
  if (status === 503) {
    return "⚠️ AI service is not available right now. Please check back shortly.";
  }
  return fallback ?? "⚠️ AI temporarily unavailable. Please try again.";
}

const QUICK_PROMPTS = [
  "What tasks are weather-sensitive?",
  "Draft a client update email",
  "Estimate framing labor for 2,000 sqft",
  "Oregon permit checklist for addition",
];

export default function AIChatBox({ compact = false }: { compact?: boolean }) {
  const { messages, loading, send } = useStreamingChat({
    endpoint: "/api/ai-chat",
    formatError: getChatErrorMessage,
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    void send(content);
  };

  return (
    <div
      className={`flex flex-col border border-border/60 bg-card overflow-hidden ${compact ? "min-h-0 h-[320px] sm:h-[420px]" : "h-full min-h-[520px]"}`}
    >
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <div className="h-6 w-6 border border-primary/40 flex items-center justify-center">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          Digital Foreman AI
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span
            className="text-[9px] text-green-400 tracking-wider uppercase"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Live
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4 py-3 overscroll-contain touch-action-pan-y">
        {messages.length === 0 && (
          <div className="py-3">
            <p className="text-xs text-muted-foreground text-center mb-4 font-light">
              Ask about projects, materials, weather scheduling, or Oregon
              codes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  className="flex items-start gap-2 text-left text-xs min-h-11 p-3 border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors leading-snug"
                >
                  <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="h-6 w-6 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 border border-border/40"
                }`}
              >
                {m.content || (
                  <span className="text-muted-foreground animate-pulse">…</span>
                )}
              </div>
              {m.role === "user" && (
                <div className="h-6 w-6 border border-border/60 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={() => submit()}
        disabled={loading}
        placeholder="Ask about your project…"
      />
    </div>
  );
}
