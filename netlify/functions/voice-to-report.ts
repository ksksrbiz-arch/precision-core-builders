/**
 * Voice/Text-to-Report Netlify Function
 *
 * Two modes:
 * 1. Audio (multipart) → Whisper transcription → Claude structured report
 * 2. Text (JSON body)  → Claude structured report (skips Whisper)
 *
 * Saves to field_reports table.
 */
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { transcribeAudio } from "../../server/_core/voiceTranscription";
import { invokeLLM } from "../../server/_core/llm";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const FIELD_REPORT_SYSTEM_PROMPT = `You are an AI assistant for a licensed Oregon construction contractor (CCB #246527, Eugene OR).
You will receive field notes from a job site — either transcribed from voice or typed directly.
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
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Verify auth
    const token = event.headers["authorization"]?.replace("Bearer ", "");
    if (!token)
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized" }),
      };

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user)
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Unauthorized" }),
      };

    const projectId = parseInt(event.queryStringParameters?.projectId ?? "0");
    if (!projectId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "projectId required" }),
      };
    }

    const contentType = event.headers["content-type"] ?? "";
    let transcriptionText: string;

    // ── TEXT MODE: JSON body with { text: "..." } ──────────────────
    if (contentType.includes("application/json")) {
      const body = JSON.parse(event.body ?? "{}");
      if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "text field required" }),
        };
      }
      transcriptionText = body.text.trim();
    }
    // ── VOICE MODE: multipart audio → Whisper ──────────────────────
    else {
      const body = event.body;
      if (!body)
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "No body" }),
        };

      const isBase64 = event.isBase64Encoded;
      const rawBody = isBase64
        ? Buffer.from(body, "base64")
        : Buffer.from(body);

      const isMultipart = contentType.includes("multipart");

      let audioBuffer: ArrayBuffer;
      let mimeType = "audio/webm";

      if (isMultipart) {
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) throw new Error("No multipart boundary");
        const parts = rawBody.toString().split(`--${boundary}`);
        const audioPart = parts.find(p => p.includes("audio"));
        if (!audioPart) throw new Error("No audio part in multipart");
        const bodyStart = audioPart.indexOf("\r\n\r\n") + 4;
        const bodyEnd = audioPart.lastIndexOf("\r\n");
        audioBuffer = Buffer.from(
          audioPart.slice(bodyStart, bodyEnd),
          "binary"
        ).buffer;
        const mimeMatch = audioPart.match(/Content-Type: ([^\r\n]+)/);
        if (mimeMatch) mimeType = mimeMatch[1].trim();
      } else {
        audioBuffer = rawBody.buffer;
        mimeType = contentType;
      }

      const transcription = await transcribeAudio(audioBuffer, mimeType);
      transcriptionText = transcription.text;
    }

    // ── Generate structured report via Claude ──────────────────────
    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: FIELD_REPORT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Field notes:\n\n${transcriptionText}`,
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

    // ── Save to field_reports table ────────────────────────────────
    const { data: report, error: dbError } = await db
      .from("field_reports")
      .insert({
        project_id: projectId,
        author_id: user.id,
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
      headers: corsHeaders,
      body: JSON.stringify({ success: true, report }),
    };
  } catch (err) {
    console.error("[voice-to-report]", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
    };
  }
};
