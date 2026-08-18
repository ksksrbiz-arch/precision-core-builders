import { ENV } from "../../server/_core/env";
import { withGuards } from "./_lib/http";

/**
 * Vision Studio — AI photo analysis endpoint.
 * Free-tier only: served by a free OpenRouter vision model. Accepts
 * base64-encoded images and returns AI analysis for construction site photos,
 * material inspection, progress tracking, etc.
 */

/**
 * Free OpenRouter vision model. Overridable via OPENROUTER_VISION_MODEL.
 * Nemotron Nano 12B (NVIDIA) is a free, 128K-context vision model available in
 * the OpenRouter free catalog.
 */
const DEFAULT_OPENROUTER_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

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
  "progress" | "safety" | "material" | "defect" | "general" | "estimate";

type SupportedMediaType =
  "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

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

export const handler = withGuards(
  {
    methods: ["POST"],
    // Vision analysis requires authentication — it processes private site photos.
    auth: "user",
    // Rate limit: 15 analyses per hour per authenticated user.
    rateLimit: {
      key: ({ user }) => `vision:${user?.id}`,
      maxRequests: 15,
      windowMs: 60 * 60_000,
    },
  },
  async ({ event, json, error }) => {
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
        return error(
          400,
          "No image provided. Send base64-encoded image data in the 'image' field."
        );
      }

      if (!SUPPORTED_MEDIA_TYPES.includes(mediaType as SupportedMediaType)) {
        return error(
          400,
          `Unsupported media type "${mediaType}". Supported: ${SUPPORTED_MEDIA_TYPES.join(", ")}.`
        );
      }

      if (!ENV.openrouterApiKey) {
        return error(
          500,
          "Vision AI is not configured. Please contact the site administrator."
        );
      }

      const userPrompt =
        customPrompt || MODE_PROMPTS[mode] || MODE_PROMPTS.general;

      // ── OpenRouter Vision (free tier) ────────────────────────────────────────
      // OpenRouter is OpenAI-compatible; the image is passed as a base64 `data:`
      // URI on an image_url content part.
      const openrouterModel =
        ENV.openrouterVisionModel || DEFAULT_OPENROUTER_VISION_MODEL;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.openrouterApiKey}`,
        "X-Title": "Precision Core Builders",
      };
      if (ENV.siteUrl) headers["HTTP-Referer"] = ENV.siteUrl;

      const openrouterRes = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: openrouterModel,
            max_tokens: 4096,
            temperature: 0.2,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  { type: "text", text: userPrompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mediaType};base64,${image}`,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      type OpenRouterVisionResponse = {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
        error?: { message?: string };
      };

      const openrouterData =
        (await openrouterRes.json()) as OpenRouterVisionResponse;
      if (!openrouterRes.ok || openrouterData.error) {
        throw new Error(
          `Vision analysis failed: ${openrouterData.error?.message ?? openrouterRes.statusText}`
        );
      }

      const analysisText = openrouterData.choices?.[0]?.message?.content ?? "";

      return json(200, {
        analysis: analysisText,
        mode,
        model: openrouterData.model ?? openrouterModel,
        usage: openrouterData.usage
          ? {
              promptTokens: openrouterData.usage.prompt_tokens ?? 0,
              completionTokens: openrouterData.usage.completion_tokens ?? 0,
              totalTokens: openrouterData.usage.total_tokens ?? 0,
            }
          : { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        timestamp: new Date().toISOString(),
      });
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
      return error(500, message);
    }
  }
);
