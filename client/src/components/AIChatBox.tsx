/**
 * AIChatBox — AI assistant chat interface.
 * Phase 3: connects to Netlify Function for Gemini streaming responses.
 * Phase 1: component structure only, streaming wired to Netlify fetch.
 */
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, Bot, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AIChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantId = `a-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      // Phase 3: replace with streaming fetch to /api/ai-chat
      // For now: echo back with placeholder
      await new Promise(r => setTimeout(r, 600));
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "AI assistant coming in Phase 3 — Gemini integration via Netlify Function.",
              }
            : m,
        ),
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "Error reaching AI. Please try again." }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-xl overflow-hidden bg-card">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Digital Foreman AI</span>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ask about your projects, materials, schedule, or get an estimate.
          </p>
        )}
        <div className="space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.content || (
                  <span className="animate-pulse text-muted-foreground">…</span>
                )}
              </div>
              {m.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="px-3 py-3 border-t flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about your project…"
          disabled={streaming}
          className="flex-1 bg-background border border-input rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Chat input"
        />
        <Button
          size="icon"
          onClick={send}
          disabled={!input.trim() || streaming}
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
