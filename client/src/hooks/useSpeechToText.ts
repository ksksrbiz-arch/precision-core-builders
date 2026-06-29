/**
 * useSpeechToText — reusable Web Speech API dictation hook.
 *
 * Extracted from the voice-to-report flow so any text field in the admin app
 * can offer hands-free dictation (Eric is onsite, gloved, on a tablet). Uses the
 * browser-native SpeechRecognition (free, no API key); callers should hide the
 * mic affordance when `supported` is false and fall back to typing.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  results: { length: number; [index: number]: SpeechResultLike };
};

type SpeechRecognitionErrorEventLike = Event & { error: string };

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

// Feature-detect via a local cast rather than augmenting the global Window
// interface — other modules (e.g. the voice-to-report page) declare their own
// Web Speech types, and a second global augmentation would conflict.
const SpeechRecognitionAPI: (new () => BrowserSpeechRecognition) | null =
  typeof window !== "undefined"
    ? ((
        window as unknown as {
          SpeechRecognition?: new () => BrowserSpeechRecognition;
          webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        }
      ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        }
      ).webkitSpeechRecognition ??
      null)
    : null;

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone access denied. Allow microphone permission and try again.",
  "no-speech": "No speech detected. Try speaking again.",
  network: "Network error during speech recognition. Check your connection.",
  "audio-capture": "No microphone found. Connect a microphone and try again.",
};

export type UseSpeechToText = {
  /** Whether the browser supports speech recognition at all. */
  supported: boolean;
  /** Whether we are actively listening. */
  listening: boolean;
  /** Finalized transcript for the current dictation session. */
  transcript: string;
  /** Best-guess interim transcript (not yet finalized). */
  interim: string;
  /** User-facing error message, or "" when none. */
  error: string;
  start: () => void;
  stop: () => void;
  /** Clear transcript/interim/error without affecting listening state. */
  reset: () => void;
};

export function useSpeechToText(lang = "en-US"): UseSpeechToText {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const supported = Boolean(SpeechRecognitionAPI);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError("");
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onresult = event => {
        let finalText = "";
        let interimText = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript + " ";
          else interimText += result[0].transcript;
        }
        setTranscript(finalText);
        setInterim(interimText);
      };

      recognition.onerror = event => {
        if (event.error !== "aborted") {
          setError(
            SPEECH_ERROR_MESSAGES[event.error] ??
              "Speech recognition failed. Try again or use a different browser."
          );
        }
      };

      recognition.onend = () => {
        setListening(false);
        setInterim("");
      };

      recognition.start();
      recognitionRef.current = recognition;
      setError("");
      setListening(true);
    } catch {
      setError("Could not start voice input. Check microphone permissions.");
    }
  }, [lang]);

  // Stop recognition if the consumer unmounts mid-session.
  useEffect(() => () => recognitionRef.current?.stop(), []);

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    reset,
  };
}
