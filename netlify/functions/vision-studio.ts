import { ENV } from "../../server/_core/env";
import { withGuards } from "./_lib/http";
import { redactDollarFigures } from "./_lib/moneyGuard";

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
Hard limits: never state a price, cost, rate or dollar figure (pricing is calculated elsewhere); never invent measurements or quantities you cannot see; never assert an Oregon/Lane County code or permit requirement as fact — mark it VERIFY with the inspector or on site.
Label each material conclusion KNOWN (clearly visible), INFERRED (reasonable reading, say so) or VERIFY (cannot be determined from the photo).
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
    "Based on this construction photo, produce a scope-of-work takeoff: list each visible work item and trade, the scope questions that change cost, and what must be measured or confirmed on site. Do NOT state any prices, costs, rates or dollar amounts — the estimating engine prices the work from the reviewed cost basis.",
};

/** ~7 MB decoded: base64 is 4/3 the size of the bytes it encodes. */
const MAX_IMAGE_BASE64_CHARS = 9_500_000;

export const handler = withGuards(
  {
    methods: ["POST"],
    // Vision analysis is an internal admin tool (it processes private site
    // photos and spends paid-model credits) — admin only.
    auth: "admin",
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

      // Bound the payload before it is forwarded to a paid vision model.
      if (image.length > MAX_IMAGE_BASE64_CHARS) {
        return error(413, "Image is too large (max ~7 MB).");
      }
      if (customPrompt !== undefined && customPrompt.length > 2000) {
        return error(400, "customPrompt is too long (max 2,000 characters).");
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

      // Deterministic output guard: a model must never originate a dollar
      // figure, whatever the prompt (or a custom prompt) asked for.
      const guarded = redactDollarFigures(
        openrouterData.choices?.[0]?.message?.content ?? ""
      );
      const analysisText = guarded.text;

      return json(200, {
        analysis: analysisText,
        ...(guarded.redacted > 0 && { redactedAmounts: guarded.redacted }),
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
