import { ENV } from "../../server/_core/env";
import { logAiUsage } from "../../server/_core/aiUsage";
import { routeAi } from "../../server/_core/ai/router";
import { specialistPrompt } from "../../server/_core/ai/specialists";
import { withGuards } from "./_lib/http";
import { PROMPTS, VISION_MODE_PROMPTS, isVisionMode } from "./_lib/llm/prompts";
import { redactDollarFigures } from "./_lib/moneyGuard";

/**
 * Vision Studio — AI photo analysis endpoint.
 * Free-tier only: served by a free OpenRouter vision model. Accepts
 * base64-encoded images and returns AI analysis for construction site photos,
 * material inspection, progress tracking, etc.
 *
 * AI contract (docs/AI_OPERATING_CONTRACT.md): this is an internal, admin-only
 * surface pinned to the `vision-analyst` specialist. The route is chosen by
 * code (never by the model), the specialist contract is injected before the
 * photo is seen, the output is validated for dollar figures before it reaches
 * the user, usage is logged, and any provider failure degrades to a plain
 * "unavailable" message rather than leaking provider internals.
 */

/**
 * Free OpenRouter vision model. Overridable via OPENROUTER_VISION_MODEL.
 * Nemotron Nano 12B (NVIDIA) is a free, 128K-context vision model available in
 * the OpenRouter free catalog.
 */
const DEFAULT_OPENROUTER_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

type SupportedMediaType =
  "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** Budget: one provider call, bounded output, bounded wait. */
const MAX_OUTPUT_TOKENS = 4096;
const VISION_TIMEOUT_MS = 45_000;

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
  async ({ event, json, error, user }) => {
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
        mode?: string;
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

      // Routing is deterministic: this endpoint is the photo-analysis job.
      const route = routeAi({
        surface: "internal",
        specialist: "vision-analyst",
      });
      const analysisMode = isVisionMode(mode) ? mode : "general";
      const userPrompt = customPrompt || VISION_MODE_PROMPTS[analysisMode];

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
          signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
          body: JSON.stringify({
            model: openrouterModel,
            max_tokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
            messages: [
              {
                role: "system",
                // Domain brief, then the contract — both before the photo.
                content: [PROMPTS.vision, specialistPrompt(route.id)].join(
                  "\n\n"
                ),
              },
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

      // Best-effort (never throws): feeds the AI Usage governance panel.
      await logAiUsage({
        feature: "vision-studio",
        provider: "openrouter",
        model: openrouterData.model ?? openrouterModel,
        promptTokens: openrouterData.usage?.prompt_tokens,
        completionTokens: openrouterData.usage?.completion_tokens,
        totalTokens: openrouterData.usage?.total_tokens,
        userId: user?.id,
      });

      return json(200, {
        analysis: analysisText,
        ...(guarded.redacted > 0 && { redactedAmounts: guarded.redacted }),
        mode: analysisMode,
        route: route.id,
        routeReason: route.reason,
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
      // Fail down: a plain, safe message — never raw provider text.
      const timedOut =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      return error(
        timedOut ? 504 : 502,
        timedOut
          ? "Vision analysis timed out. Please try again with a smaller photo."
          : "Vision analysis is unavailable right now. Please try again."
      );
    }
  }
);
