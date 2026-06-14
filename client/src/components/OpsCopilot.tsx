/**
 * OpsCopilot — AI assistant that answers questions over Eric's REAL
 * operational data (projects, budgets, schedule, ledger, leads, materials).
 * Backed by /api/ai-copilot (admin-only Netlify Function → invokeLLM with a
 * live DB snapshot injected as context).
 */
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowUp, Brain, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  "Which projects are over budget?",
  "What's behind schedule right now?",
  "Which leads should I call first?",
  "Give me a 5-line status of the whole business",
];

function errorFor(status: number, fallback?: string): string {
  if (status === 429)
    return "⚠️ Too many questions too quickly — give it a moment.";
  if (status === 503)
    return "⚠️ AI isn't configured yet. Add a free GROQ_API_KEY or GOOGLE_AI_API_KEY in Netlify.";
  return fallback ?? "⚠️ Co-pilot temporarily unavailable. Please try again.";
}

export default function OpsCopilot() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
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
      const res = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const errorContent = res.ok
        ? undefined
        : errorFor(res.status, data.error);
      if (res.ok && data.provider) setProvider(data.provider);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: errorContent ?? data.text ?? "No response." }
            : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Connection error. Please try again." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col border border-border/60 bg-card overflow-hidden h-full min-h-[520px]">
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <div className="h-6 w-6 border border-primary/40 flex items-center justify-center">
          <Brain className="h-3.5 w-3.5 text-primary" />
        </div>
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          Ops Co-pilot
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {provider && (
            <span className="text-[9px] text-muted-foreground tracking-wider uppercase">
              {provider}
            </span>
          )}
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span
            className="text-[9px] text-green-400 tracking-wider uppercase"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Live data
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4 py-3 overscroll-contain touch-action-pan-y">
        {messages.length === 0 && (
          <div className="py-3">
            <p className="text-xs text-muted-foreground text-center mb-4 font-light">
              Ask anything about your live operations — budgets, schedule,
              leads, and risks across every project.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left text-[10px] p-2.5 border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors leading-snug"
                >
                  <Sparkles className="h-2.5 w-2.5 inline mr-1 text-primary/60" />
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
                  <Brain className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
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
          placeholder="Ask about budgets, schedule, leads…"
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
