import type { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "../../server/_core/env";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "./_utils/rateLimiter";
import { corsHeaders, checkOrigin } from "./_utils/corsGuard";
import { verifyAuth } from "./_utils/authGuard";

/**
 * Vision Studio — AI photo analysis endpoint.
 * Primary: Claude Vision (Anthropic). Fallback: Gemini Vision (Google AI).
 * Accepts base64-encoded images and returns AI analysis
 * for construction site photos, material inspection, progress tracking, etc.
 */

const SYSTEM_PROMPT = `You are the Vision AI for Precision Core Builders, owned by Eric Tadlock (CCB #246527), a master builder in Eugene, OR with 20+ years of experience.

You analyze construction site images with expert-level precision. Your capabilities include:
- **Progress Assessment**: Evaluate construction phase completion percentages
- **Material Identification**: Identify building materials, brands, and quality grades
- **Safety Inspection**: Flag potential OSHA violations or safety concerns
- **Defect Detection**: Spot structural issues, water damage, improper installations
- **Code Compliance**: Note visible code compliance or violation indicators (Oregon residential code)
- **Quality Grading**: Rate workmanship quality on a 1-10 scale with justification

Always respond with structured, actionable insights. Be specific about locations within the image.
When possible, reference Oregon building codes and best practices.
Format your response as clear sections with headers.`;

type AnalysisMode =
  | "progress"
  | "safety"
  | "material"
  | "defect"
  | "general"
  | "estimate";

const MODE_PROMPTS: Record<AnalysisMode, string> = {
  progress:
    "Analyze this construction site photo for project progress. Estimate completion percentage for each visible trade/phase. Note what work appears recently completed vs. in-progress vs. not yet started.",
  safety:
    "Perform a safety inspection of this construction site photo. Identify any OSHA violations, fall hazards, PPE issues, housekeeping concerns, or unsafe conditions. Rate overall site safety 1-10.",
  material:
    "Identify all visible building materials in this photo. Note brands if visible, estimate quantities where possible, and assess material quality/condition. Flag any materials that appear damaged or unsuitable.",
  defect:
    "Inspect this construction photo for defects, damage, or quality issues. Look for water damage, structural concerns, improper installations, settling, cracking, or any workmanship problems.",
  general:
    "Provide a comprehensive analysis of this construction photo. Cover progress, materials, quality, and any notable observations.",
  estimate:
    "Based on this construction photo, provide rough cost estimates for the visible work. Include material costs and labor estimates where possible. Note this is for ballpark planning only.",
};

export const handler: Handler = async event => {
  const origin = event.headers["origin"];
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
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

  // Vision analysis requires authentication — it processes private site photos.
  const authResult = await verifyAuth(event.headers);
  if (!authResult.ok) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.message }),
    };
  }

  // Rate limit: 15 analyses per hour per authenticated user.
  const rl = checkRateLimit(`vision:${authResult.user.id}`, {
    maxRequests: 15,
    windowMs: 60 * 60_000,
  });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimitHeaders(rl) },
      body: JSON.stringify({
        error:
          "Analysis limit reached. Please wait before submitting more photos.",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      image,
      mediaType = "image/jpeg",
      mode = "general",
      customPrompt,
    } = body as {
      image?: string;
      mediaType?: string;
      mode?: AnalysisMode;
      customPrompt?: string;
    };

    if (!image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "No image provided. Send base64-encoded image data in the 'image' field.",
        }),
      };
    }

    if (!ENV.anthropicApiKey && !ENV.googleAiApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error:
            "Vision AI is not configured. Please contact the site administrator.",
        }),
      };
    }

    const userPrompt =
      customPrompt || MODE_PROMPTS[mode] || MODE_PROMPTS.general;

    // ── Claude Vision (primary) ───────────────────────────────────────────────
    if (ENV.anthropicApiKey) {
      const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as
                    | "image/jpeg"
                    | "image/png"
                    | "image/gif"
                    | "image/webp",
                  data: image,
                },
              },
              { type: "text", text: userPrompt },
            ],
          },
        ],
      });

      const analysisText = response.content
        .filter(block => block.type === "text")
        .map(block => (block as Anthropic.TextBlock).text)
        .join("");

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          analysis: analysisText,
          mode,
          model: response.model,
          usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens:
              response.usage.input_tokens + response.usage.output_tokens,
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // ── Gemini Vision (fallback) ──────────────────────────────────────────────
    const geminiModel = "gemini-2.0-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${ENV.googleAiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
              },
              {
                inline_data: {
                  mime_type: mediaType,
                  data: image,
                },
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
      }),
    });

    type GeminiVisionResponse = {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
      error?: { message?: string };
    };

    const geminiData = (await geminiRes.json()) as GeminiVisionResponse;

    if (!geminiRes.ok || geminiData.error) {
      throw new Error(
        `Vision analysis failed: ${geminiData.error?.message ?? geminiRes.statusText}`
      );
    }

    const analysisText =
      geminiData.candidates
        ?.flatMap(c => c.content?.parts ?? [])
        .map(p => p.text ?? "")
        .join("") ?? "";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analysis: analysisText,
        mode,
        model: geminiModel,
        usage: geminiData.usageMetadata
          ? {
              promptTokens: geminiData.usageMetadata.promptTokenCount ?? 0,
              completionTokens:
                geminiData.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: geminiData.usageMetadata.totalTokenCount ?? 0,
            }
          : { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: unknown) {
    console.error("[vision-studio] Error:", err);
    const isConfigError =
      err instanceof Error &&
      err.message.includes("No LLM API key configured");
    const message = isConfigError
      ? "Vision AI is not configured. Please contact the site administrator."
      : err instanceof Error
        ? err.message
        : "Vision analysis failed. Please try again.";
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: message }),
    };
  }
};
