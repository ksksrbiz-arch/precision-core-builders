/**
 * ChatComposer — shared input bar for the admin AI chat tools.
 *
 * Adds tablet-first ergonomics that the bare <input> + send button lacked:
 *   - One-tap voice dictation (Web Speech API) so Eric can talk, not type, onsite
 *   - 44px touch targets for the mic and send buttons
 *   - A clear "listening" state with a live interim transcript hint
 *
 * Controlled: the parent owns the text value. Voice dictation is composed onto
 * whatever was already typed and pushed up via `onChange`.
 */
import { Button } from "@/components/ui/button";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { ArrowUp, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Ask a question…",
}: ChatComposerProps) {
  const speech = useSpeechToText();
  const [dictating, setDictating] = useState(false);
  const baseRef = useRef("");

  // While dictating, compose the recognized text onto the pre-dictation value.
  useEffect(() => {
    if (!dictating) return;
    const base = baseRef.current;
    const spoken = (speech.transcript + speech.interim).trim();
    const separator = base && !/\s$/.test(base) ? " " : "";
    onChange(spoken ? base + separator + spoken : base);
  }, [dictating, speech.transcript, speech.interim, onChange]);

  // When recognition ends on its own, leave dictation mode.
  useEffect(() => {
    if (dictating && !speech.listening) setDictating(false);
  }, [dictating, speech.listening]);

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop();
      return;
    }
    baseRef.current = value;
    speech.reset();
    speech.start();
    setDictating(true);
  };

  const handleType = (next: string) => {
    if (dictating) {
      speech.stop();
      setDictating(false);
    }
    onChange(next);
  };

  const handleSend = () => {
    if (speech.listening) speech.stop();
    setDictating(false);
    onSend();
  };

  return (
    <div className="border-t border-border/40">
      {speech.listening && (
        <div className="px-3 pt-2 flex items-center gap-2 text-[11px] text-primary">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Listening… speak your question
          {speech.interim && (
            <span className="text-muted-foreground italic truncate">
              “{speech.interim}”
            </span>
          )}
        </div>
      )}
      {speech.error && !speech.listening && (
        <div className="px-3 pt-2 text-[11px] text-destructive">
          {speech.error}
        </div>
      )}
      <div className="px-3 py-3 flex items-end gap-2">
        {speech.supported && (
          <Button
            type="button"
            size="icon"
            variant={speech.listening ? "default" : "outline"}
            onClick={toggleMic}
            disabled={disabled}
            aria-label={speech.listening ? "Stop voice input" : "Speak"}
            className={`h-11 w-11 shrink-0 ${
              speech.listening
                ? "bg-red-500 hover:bg-red-500/90 text-white"
                : ""
            }`}
          >
            {speech.listening ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}
        <input
          value={value}
          onChange={e => handleType(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-h-11 bg-background border border-input px-3.5 py-2 text-base placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          aria-label="Send"
          className="h-11 w-11 shrink-0 bg-primary hover:bg-primary/85"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
