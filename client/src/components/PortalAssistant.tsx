/**
 * PortalAssistant — client-facing project assistant for the portal.
 * Backed by /api/portal-assistant (auth-scoped to the client's own project;
 * answers over a client-safe snapshot only).
 */
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAuthHeader } from "@/lib/authHeader";
import { ArrowUp, MessageCircle, Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_PROMPTS = [
  "What's the status of my project?",
  "What's happening next?",
  "What was completed recently?",
  "Show my finish selections",
];

type PortalAssistantProps = {
  /** Header label. */
  title?: string;
  /** Page-aware starter prompts. */
  quickPrompts?: string[];
};

function errorFor(status: number, fallback?: string): string {
  if (status === 429)
    return "You're sending messages a little fast — please wait a moment.";
  if (status === 503)
    return "The assistant isn't available right now. Please check back soon.";
  return (
    fallback ?? "The assistant is temporarily unavailable. Please try again."
  );
}

export default function PortalAssistant({
  title = "Project Assistant",
  quickPrompts = DEFAULT_PROMPTS,
}: PortalAssistantProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messageEric = async () => {
    const text = composeText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/portal-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const confirmation: Message = {
        id: `s-${Date.now()}`,
        role: "assistant",
        content: res.ok
          ? "✅ Your message has been sent to Eric. He'll follow up with you directly."
          : `⚠️ ${data.error ?? "Couldn't send your message. Please try again or call us."}`,
      };
      setMessages(prev => [...prev, confirmation]);
      if (res.ok) {
        setComposeText("");
        setComposeOpen(false);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Connection error. Please try again or call us.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

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
      const res = await fetch("/api/portal-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const errorContent = res.ok
        ? undefined
        : errorFor(res.status, data.error);
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
            ? {
                ...m,
                content:
                  "Connection error. Please check your internet and try again.",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col border border-border/60 bg-card overflow-hidden h-full min-h-[440px]">
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <div className="h-6 w-6 border border-primary/40 flex items-center justify-center">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
        </div>
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          {title}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span
            className="text-[9px] text-green-400 tracking-wider uppercase"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Online
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4 py-3 overscroll-contain touch-action-pan-y">
        {messages.length === 0 && (
          <div className="py-3">
            <p className="text-xs text-muted-foreground text-center mb-4 font-light">
              Ask about your project — progress, what's next, recent updates, or
              your finish selections.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map(p => (
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
                  <MessageCircle className="h-3 w-3 text-primary" />
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

      {/* Message Eric handoff */}
      {composeOpen ? (
        <div className="px-3 py-3 border-t border-border/40 space-y-2 bg-muted/20">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Message Eric directly
          </p>
          <textarea
            value={composeText}
            onChange={e => setComposeText(e.target.value)}
            placeholder="Ask about invoices, a change request, scheduling a call…"
            rows={3}
            disabled={sending}
            className="w-full resize-none bg-background border border-input px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setComposeOpen(false);
                setComposeText("");
              }}
              disabled={sending}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
            >
              Cancel
            </button>
            <Button
              size="sm"
              onClick={messageEric}
              disabled={!composeText.trim() || sending}
              className="h-8 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send to Eric"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setComposeOpen(true)}
          className="px-4 py-2 border-t border-border/40 text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center gap-1.5"
        >
          <Send className="h-3 w-3" />
          Need something else? Message Eric directly →
        </button>
      )}

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
