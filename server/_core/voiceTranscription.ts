/**
 * Voice transcription — server-side audio → text.
 *
 * Priority order (free-first):
 *  1. Groq Whisper large v3 (free tier, OpenAI-compatible, GROQ_API_KEY).
 *     Get a free key: https://console.groq.com/keys
 *  2. OpenAI Whisper (legacy, optional — only when OPENAI_API_KEY is set)
 *
 * If no key is configured, the browser-side Web Speech API path in
 * FieldReportNew remains available as a fully-free option — the resulting
 * transcript is posted to voice-to-report as plain text.
 */
import { ENV } from "./env";

export type TranscriptionResult = {
  text: string;
  language?: string;
  duration?: number;
  /** Identifier of the provider that produced the transcription. */
  provider?: "openai-whisper" | "groq-whisper";
};

async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: mimeType }), filename);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");

  const auth = "Bearer " + ENV.openaiApiKey;
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: auth },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Whisper API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    text: string;
    language?: string;
    duration?: number;
  };

  return {
    text: data.text,
    language: data.language,
    duration: data.duration,
    provider: "openai-whisper",
  };
}

async function transcribeWithGroq(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<TranscriptionResult> {
  // Groq hosts Whisper large v3 on their free tier via an OpenAI-compatible
  // endpoint. Same multipart form shape as OpenAI Whisper.
  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: mimeType }), filename);
  form.append("model", "whisper-large-v3");

  const auth = "Bearer " + ENV.groqApiKey;
  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: auth },
      body: form,
      signal: AbortSignal.timeout(120_000),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq Whisper API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    text: string;
    language?: string;
    duration?: number;
  };

  return {
    text: data.text,
    language: data.language,
    duration: data.duration,
    provider: "groq-whisper",
  };
}

/**
 * Transcribe an audio buffer.
 * Free-first: uses Groq Whisper (free tier), and only falls back to the legacy
 * paid OpenAI Whisper when OPENAI_API_KEY is set and Groq is not configured.
 * Accepts any common audio format: webm, mp3, m4a, wav, ogg.
 */
export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  mimeType: string = "audio/webm",
  filename: string = "field-memo.webm"
): Promise<TranscriptionResult> {
  if (ENV.groqApiKey) {
    return transcribeWithGroq(audioBuffer, mimeType, filename);
  }
  if (ENV.openaiApiKey) {
    return transcribeWithWhisper(audioBuffer, mimeType, filename);
  }

  throw new Error(
    "No transcription provider configured. Set GROQ_API_KEY (free at https://console.groq.com/keys). OPENAI_API_KEY (paid Whisper) is supported as a legacy option. Alternatively, submit a pre-transcribed transcript from the browser's Web Speech API."
  );
}
