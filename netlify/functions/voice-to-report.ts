/**
 * Voice-to-Report Netlify Function
 *
 * Accepts two input modes:
 *  1. JSON body: { projectId, transcript } — pre-transcribed text (from Web Speech API)
 *  2. JSON body: { projectId, audio, mimeType } — base64-encoded audio, transcribed
 *     server-side via OpenAI Whisper (requires OPENAI_API_KEY)
 *
 * Generates a structured field report via the free-tier LLM router and saves to field_reports table.
 */
import { requireSupabaseAdmin } from "../../server/_core/supabase";
import { transcribeAudio } from "../../server/_core/voiceTranscription";
import { invokeLLM, parseLlmJson } from "../../server/_core/llm";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";
import { withGuards } from "./_lib/http";
import { PROMPTS, isLLMConfigError } from "./_lib/llm/prompts";

export const handler = withGuards(
  // Require authentication — voice reports are always admin-submitted.
  { methods: ["POST"], auth: "user" },
  async ({ event, user, json, error }) => {
    // Rate limit: 5 transcriptions per hour per authenticated user.
    const rl = checkRateLimit(`voice:${user!.id}`, {
      maxRequests: 5,
      windowMs: 60 * 60_000,
    });
    if (!rl.allowed) {
      return error(
        429,
        "Voice report limit reached. Please wait before submitting again.",
        rateLimitHeaders(rl)
      );
    }

    try {
      if (!event.body) {
        return error(400, "No body");
      }

      // Parse JSON body — all input modes use JSON
      const input = JSON.parse(event.body) as {
        projectId?: number;
        transcript?: string;
        audio?: string; // base64-encoded audio data
        mimeType?: string;
      };

      const projectId =
        input.projectId ??
        parseInt(event.queryStringParameters?.projectId ?? "0");
      if (!projectId) {
        return error(400, "projectId required");
      }

      // ── 1. Get transcription text ─────────────────────────────────────────────
      let transcriptionText: string;

      if (input.transcript && input.transcript.trim().length > 0) {
        // Fast path: client already transcribed via Web Speech API (free)
        transcriptionText = input.transcript.trim();
      } else if (input.audio) {
        // Server-side transcription via OpenAI Whisper
        // input.audio is a base64 string; convert to a properly-bounded ArrayBuffer
        const audioBuffer = Buffer.from(input.audio, "base64");
        // Safely slice to avoid exposing the full shared Buffer pool
        const safeArrayBuffer = audioBuffer.buffer.slice(
          audioBuffer.byteOffset,
          audioBuffer.byteOffset + audioBuffer.byteLength
        );
        const mimeType = input.mimeType ?? "audio/webm";
        const result = await transcribeAudio(safeArrayBuffer, mimeType);
        transcriptionText = result.text;
      } else {
        return error(
          400,
          "Either 'transcript' (text) or 'audio' (base64) is required"
        );
      }

      // ── 2. Generate structured report with the free-tier LLM router ───────────
      const llmResult = await invokeLLM({
        feature: "voice-to-report",
        messages: [
          { role: "system", content: PROMPTS.fieldReport },
          {
            role: "user",
            content: `Field memo transcription:\n\n${transcriptionText}`,
          },
        ],
        jsonMode: true,
        maxTokens: 1000,
        temperature: 0.2,
      });

      let reportData: {
        summary: string;
        tasksCompleted: string[];
        materialsUsed: string[];
        issuesFlagged: string[];
        materialShortages: string[];
      };

      try {
        reportData = parseLlmJson(llmResult.text);
      } catch {
        reportData = {
          summary: transcriptionText.slice(0, 500),
          tasksCompleted: [],
          materialsUsed: [],
          issuesFlagged: [],
          materialShortages: [],
        };
      }

      // ── 3. Save to field_reports table ────────────────────────────────────────
      const db = requireSupabaseAdmin();
      const { data: report, error: dbError } = await db
        .from("field_reports")
        .insert({
          project_id: projectId,
          author_id: user!.id,
          report_date: new Date().toISOString(),
          transcription: transcriptionText,
          summary: reportData.summary,
          tasks_completed: JSON.stringify(reportData.tasksCompleted),
          materials_used: JSON.stringify(reportData.materialsUsed),
          issues_flagged: JSON.stringify(reportData.issuesFlagged),
          material_shortages: JSON.stringify(reportData.materialShortages),
          published_to_client: false,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      return json(200, { success: true, report });
    } catch (err) {
      console.error("[voice-to-report]", err);
      return error(
        500,
        isLLMConfigError(err)
          ? "AI service is not configured. Please contact the site administrator."
          : err instanceof Error
            ? err.message
            : "Report generation failed. Please try again."
      );
    }
  }
);
