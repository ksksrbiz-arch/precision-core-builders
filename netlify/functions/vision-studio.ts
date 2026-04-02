import type { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "../../server/_core/llm";
import { checkRateLimit, getClientIP } from "../../server/_core/rateLimit";

/**
 * Vision Studio — Claude Vision API endpoint.
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
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Rate limit: 10 vision analyses per minute per IP
    const ip = getClientIP(event.headers as Record<string, string>);
    const rl = await checkRateLimit(`vision:${ip}`, 10);
    if (!rl.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, "Retry-After": "60" },
        body: JSON.stringify({ error: "Too many requests" }),
      };
    }

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

    // Uses shared client — routes through CF AI Gateway when configured
    const client = getAnthropicClient();

    const userPrompt =
      customPrompt || MODE_PROMPTS[mode] || MODE_PROMPTS.general;

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
            {
              type: "text",
              text: userPrompt,
            },
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
  } catch (err: unknown) {
    console.error("[vision-studio] Error:", err);
    const message =
      err instanceof Error ? err.message : "Vision analysis failed";
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: message }),
    };
  }
};
