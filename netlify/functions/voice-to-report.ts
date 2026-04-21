/**
 * Voice-to-Report Netlify Function
 * Accepts audio (multipart), transcribes with Whisper, generates structured
 * field report via Gemini, saves to field_reports table.
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

    // Parse multipart body
    const body = event.body;
    if (!body)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No body" }),
      };

    const isBase64 = event.isBase64Encoded;
    const rawBody = isBase64 ? Buffer.from(body, "base64") : Buffer.from(body);

    // Extract projectId from query params
    const projectId = parseInt(event.queryStringParameters?.projectId ?? "0");
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "projectId required" }),
      };
    }

    // Get content type for multipart boundary
    const contentType = event.headers["content-type"] ?? "audio/webm";
    const isMultipart = contentType.includes("multipart");

    let audioBuffer: ArrayBuffer;
    let mimeType = "audio/webm";

    if (isMultipart) {
      // Extract audio from multipart — find binary part
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
      // Raw audio body
      audioBuffer = rawBody.buffer;
      mimeType = contentType;
    }

    // 1. Transcribe with Whisper
    const transcription = await transcribeAudio(audioBuffer, mimeType);

    // 2. Generate structured report with Gemini
    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: FIELD_REPORT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Field memo transcription:\n\n${transcription.text}`,
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
        summary: transcription.text.slice(0, 500),
        tasksCompleted: [],
        materialsUsed: [],
        issuesFlagged: [],
        materialShortages: [],
      };
    }

    // 3. Save to field_reports table
    const { data: report, error: dbError } = await db
      .from("field_reports")
      .insert({
        project_id: projectId,
        author_id: authResult.user.id,
        report_date: new Date().toISOString(),
        transcription: transcription.text,
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
