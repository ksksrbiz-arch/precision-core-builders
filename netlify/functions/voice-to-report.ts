/**
 * Voice-to-Report Netlify Function
 *
 * Accepts two input modes:
 *  1. JSON body: { projectId, transcript } — pre-transcribed text (from Web Speech API)
 *  2. JSON body: { projectId, audio, mimeType } — base64-encoded audio, transcribed
 *     server-side via OpenAI Whisper (requires OPENAI_API_KEY)
 *
 * Generates a structured field report via Claude/Gemini and saves to field_reports table.
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { transcribeAudio } from "../../server/_core/voiceTranscription";
import { invokeLLM } from "../../server/_core/llm";
import { checkRateLimit, rateLimitHeaders } from "./_utils/rateLimiter";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { verifyAuth } from "./_utils/authGuard";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const FIELD_REPORT_SYSTEM_PROMPT = `You are an AI assistant for a licensed Oregon construction contractor.
You will receive a voice transcription from a job site field report.
Extract and return ONLY valid JSON in this exact format:
{
  "summary": "2-4 sentence professional summary of the day's work",
  "tasksCompleted": ["task 1", "task 2"],
  "materialsUsed": ["material and quantity 1", "material 2"],
  "issuesFlagged": ["issue 1 if any"],
  "materialShortages": ["shortage 1 if any"]
}
Be concise, professional, and factual. If a category has nothing to report, use an empty array.`;

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const originBlock = checkOrigin(origin);
  if (originBlock) return originBlock;

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Require authentication — voice reports are always admin-submitted.
    const authResult = await verifyAuth(event.headers);
    if (!authResult.ok) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.message }),
      };
    }

    // Rate limit: 5 transcriptions per hour per authenticated user.
    const rl = checkRateLimit(`voice:${authResult.user.id}`, {
      maxRequests: 5,
      windowMs: 60 * 60_000,
    });
    if (!rl.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, ...rateLimitHeaders(rl) },
        body: JSON.stringify({
          error:
            "Voice report limit reached. Please wait before submitting again.",
        }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No body" }),
      };
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "projectId required" }),
      };
    }

    // ── 1. Get transcription text ─────────────────────────────────────────────
    let transcriptionText: string;

    if (input.transcript && input.transcript.trim().length > 0) {
      // Fast path: client already transcribed via Web Speech API (free)
      transcriptionText = input.transcript.trim();
    } else if (input.audio) {
      // Server-side transcription via OpenAI Whisper
      // input.audio is a base64 string; convert to ArrayBuffer safely
      const audioBuffer = Buffer.from(input.audio, "base64");
      const mimeType = input.mimeType ?? "audio/webm";
      const result = await transcribeAudio(audioBuffer.buffer, mimeType);
      transcriptionText = result.text;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Either 'transcript' (text) or 'audio' (base64) is required",
        }),
      };
    }

    // ── 2. Generate structured report with Claude/Gemini ──────────────────────
    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: FIELD_REPORT_SYSTEM_PROMPT },
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
      reportData = JSON.parse(llmResult.text);
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
    const { data: report, error: dbError } = await db
      .from("field_reports")
      .insert({
        project_id: projectId,
        author_id: authResult.user.id,
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, report }),
    };
  } catch (err) {
    console.error("[voice-to-report]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
    };
  }
};
