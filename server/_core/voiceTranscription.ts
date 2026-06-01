/**
 * Voice transcription — server-side audio → text.
 *
 * Priority order:
 *  1. OpenAI Whisper (best quality, requires OPENAI_API_KEY — paid)
 *  2. Google Gemini 2.0 Flash audio input (free tier, requires GOOGLE_AI_API_KEY)
 *     Get a free key (no credit card): https://aistudio.google.com/app/apikey
 *
 * If neither key is configured, the browser-side Web Speech API path in
 * FieldReportNew remains available as a fully-free option — the resulting
 * transcript is posted to voice-to-report as plain text.
 */
import { ENV } from "./env";

export type TranscriptionResult = {
  text: string;
  language?: string;
  duration?: number;
  /** Identifier of the provider that produced the transcription. */
  provider?: "openai-whisper" | "google-gemini";
};

const GEMINI_AUDIO_MODEL = "gemini-2.0-flash";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

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

async function transcribeWithGemini(
  audioBuffer: ArrayBuffer,
  mimeType: string
): Promise<TranscriptionResult> {
  // Gemini accepts inline audio up to ~20 MB base64-encoded. Field memos are
  // short (< 5 MB), so inline_data is sufficient and avoids the File upload API.
  const base64Audio = arrayBufferToBase64(audioBuffer);

  const url = `${GEMINI_API_BASE}/${GEMINI_AUDIO_MODEL}:generateContent?key=${ENV.googleAiApiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Transcribe this audio recording verbatim. Return only the spoken words as plain text, with no commentary, headers, or formatting.",
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  type GeminiAudioResponse = {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    error?: { message?: string };
  };

  const data = (await res.json()) as GeminiAudioResponse;
  if (!res.ok || data.error) {
    throw new Error(
      `Gemini transcription error: ${data.error?.message ?? res.statusText}`
    );
  }

  const text =
    data.candidates
      ?.flatMap(c => c.content?.parts ?? [])
      .map(p => p.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new Error("Gemini transcription returned empty text.");
  }

  return { text, provider: "google-gemini" };
}

/**
 * Transcribe an audio buffer.
 * Tries OpenAI Whisper first; falls back to Google Gemini (free tier).
 * Accepts any common audio format: webm, mp3, m4a, wav, ogg.
 */
export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  mimeType: string = "audio/webm",
  filename: string = "field-memo.webm"
): Promise<TranscriptionResult> {
  if (ENV.openaiApiKey) {
    return transcribeWithWhisper(audioBuffer, mimeType, filename);
  }
  if (ENV.googleAiApiKey) {
    return transcribeWithGemini(audioBuffer, mimeType);
  }

  throw new Error(
    "No transcription provider configured. Set OPENAI_API_KEY (paid Whisper) or GOOGLE_AI_API_KEY (free at https://aistudio.google.com/app/apikey), or submit a pre-transcribed transcript from the browser's Web Speech API."
  );
}
