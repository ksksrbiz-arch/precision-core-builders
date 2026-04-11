/**
 * AIChatBox — Digital Foreman AI assistant.
 * Backed by /api/ai-chat (Netlify Function → Claude via invokeLLM).
 */
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, Bot, User, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  "What tasks are weather-sensitive?",
  "Draft a client update email",
  "Estimate framing labor for 2,000 sqft",
  "Oregon permit checklist for addition",
];

export default function AIChatBox({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content };
    const assistantId = `a-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: data.text ?? "No response." }
            : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "⚠️ AI unavailable. Check ANTHROPIC_API_KEY in Netlify env.",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col border border-border/60 bg-card overflow-hidden ${compact ? "h-[420px]" : "h-full min-h-[520px]"}`}
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

      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 && (
          <div className="py-3">
            <p className="text-xs text-muted-foreground text-center mb-4 font-light">
              Ask about projects, materials, weather scheduling, or Oregon
              codes.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left text-[10px] p-2.5 border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors leading-snug"
                >
                  <Zap className="h-2.5 w-2.5 inline mr-1 text-primary/60" />
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

      <div className="px-3 py-3 border-t border-border/40 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about your project…"
          disabled={loading}
          className="flex-1 bg-background border border-input px-3.5 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
        />
        <Button
          size="icon"
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="h-9 w-9 bg-primary hover:bg-primary/85"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
