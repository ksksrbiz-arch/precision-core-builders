/**
 * Voice transcription — wraps OpenAI Whisper API.
 * Called from netlify/functions/voice-to-report.ts in Phase 3.
 * This module provides the shared transcription helper.
 */
import { ENV } from "./env";

export type TranscriptionResult = {
  text: string;
  language?: string;
  duration?: number;
};

/**
 * Transcribe an audio buffer using OpenAI Whisper.
 * Accepts any Whisper-supported format: mp3, mp4, mpeg, mpga, m4a, wav, webm.
 */
export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  mimeType: string = "audio/webm",
  filename: string = "field-memo.webm"
): Promise<TranscriptionResult> {
  if (!ENV.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured in Netlify environment variables."
    );
  }

  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: mimeType }), filename);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.openaiApiKey}` },
    body: form,
    signal: AbortSignal.timeout(120_000), // Whisper can take time on long memos
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
  };
}
