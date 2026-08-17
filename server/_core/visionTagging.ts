/**
 * Field-report photo tagging — free-tier vision analysis.
 *
 * Runs the same free OpenRouter vision model that powers Vision Studio over the
 * photos attached to a field report, and returns a compact, structured tag set
 * per photo (category, headline, tags, safety concerns, progress note). This
 * lets site photos be analyzed automatically the first time a report is viewed,
 * rather than requiring Eric to open Vision Studio and paste each photo by hand.
 *
 * Free-tier only: served by OpenRouter's free vision catalog (Nemotron Nano by
 * default), OpenAI-compatible. Every call is best-effort and isolated — a
 * single failing photo never fails the batch, and a missing key surfaces a
 * clear, catchable config error.
 */
import { ENV } from "./env";
import { parseLlmJson } from "./llm";
import { logAiUsage } from "./aiUsage";

/**
 * Free OpenRouter vision model, shared with vision-studio. Overridable via
 * OPENROUTER_VISION_MODEL.
 */
const DEFAULT_OPENROUTER_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

/** Bound the work so a report with many photos can't run unbounded. */
export const MAX_PHOTOS_PER_REPORT = 8;

/** Per-photo request timeout — vision calls are slower than text. */
const PHOTO_TIMEOUT_MS = 45_000;

export type PhotoCategory =
  "progress" | "safety" | "defect" | "material" | "general";

const PHOTO_CATEGORIES: PhotoCategory[] = [
  "progress",
  "safety",
  "defect",
  "material",
  "general",
];

export type PhotoTag = {
  /** The photo URL these tags describe. */
  url: string;
  /** Primary classification of what the photo shows. */
  category: PhotoCategory;
  /** One-line, human-readable headline (e.g. "Framing ~60% complete"). */
  headline: string;
  /** Short keyword tags for filtering/search (materials, trades, phases). */
  tags: string[];
  /** Any visible safety or OSHA concerns; empty when none. */
  safetyConcerns: string[];
  /** Optional progress note when the photo shows construction progress. */
  progressNote?: string;
  /** Set when analysis failed for this specific photo (batch continues). */
  error?: string;
};

const TAGGING_SYSTEM_PROMPT = `You are the Vision AI for Precision Core Builders, a licensed Oregon construction contractor (CCB #246527). You look at a single construction site photo and return a compact, structured tag set for a field report. Be specific and grounded in what is actually visible. Reference Oregon residential building practices when relevant.

Respond with ONLY a JSON object (no prose, no markdown) matching exactly:
{
  "category": one of "progress" | "safety" | "defect" | "material" | "general",
  "headline": short one-line summary (max ~10 words),
  "tags": array of 2-6 short lowercase keywords (materials, trades, phases),
  "safetyConcerns": array of visible safety/OSHA concerns (empty array if none),
  "progressNote": short note on completion/phase when relevant, else omit
}`;

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

/** Error thrown when no vision provider is configured. Catchable by callers. */
export class VisionConfigError extends Error {
  constructor() {
    super(
      "Vision AI is not configured. Add a free OPENROUTER_API_KEY " +
        "(https://openrouter.ai/keys)."
    );
    this.name = "VisionConfigError";
  }
}

/** True when photo tagging can run (a vision provider is configured). */
export function isVisionTaggingConfigured(): boolean {
  return ENV.openrouterApiKey.length > 0;
}

function coerceCategory(value: unknown): PhotoCategory {
  return PHOTO_CATEGORIES.includes(value as PhotoCategory)
    ? (value as PhotoCategory)
    : "general";
}

function coerceStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map(v => v.trim())
    .slice(0, max);
}

/**
 * Analyze one photo URL and return its structured tags. The URL is passed to
 * OpenRouter directly as an `image_url` content part — no server-side download
 * or base64 encoding — so Supabase Storage URLs work as-is.
 */
export async function analyzeFieldReportPhoto(
  url: string,
  userId?: string | null
): Promise<PhotoTag> {
  if (!isVisionTaggingConfigured()) throw new VisionConfigError();

  const model = ENV.openrouterVisionModel || DEFAULT_OPENROUTER_VISION_MODEL;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ENV.openrouterApiKey}`,
    "X-Title": "Precision Core Builders",
  };
  if (ENV.siteUrl) headers["HTTP-Referer"] = ENV.siteUrl;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TAGGING_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this construction site photo and return the JSON tag set.",
            },
            { type: "image_url", image_url: { url } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
  });

  const dataRes = (await res.json()) as OpenRouterVisionResponse;
  if (!res.ok || dataRes.error) {
    throw new Error(
      `Vision tagging failed: ${dataRes.error?.message ?? res.statusText}`
    );
  }

  // Usage logging is best-effort (never throws).
  await logAiUsage({
    feature: "field-report-vision-tag",
    provider: "openrouter",
    model: dataRes.model ?? model,
    promptTokens: dataRes.usage?.prompt_tokens,
    completionTokens: dataRes.usage?.completion_tokens,
    totalTokens: dataRes.usage?.total_tokens,
    userId,
  });

  const content = dataRes.choices?.[0]?.message?.content ?? "";
  const parsed = parseLlmJson<Record<string, unknown>>(content);

  const progressNote =
    typeof parsed.progressNote === "string" && parsed.progressNote.trim()
      ? parsed.progressNote.trim()
      : undefined;

  return {
    url,
    category: coerceCategory(parsed.category),
    headline:
      typeof parsed.headline === "string" && parsed.headline.trim()
        ? parsed.headline.trim().slice(0, 140)
        : "Site photo",
    tags: coerceStringArray(parsed.tags, 6),
    safetyConcerns: coerceStringArray(parsed.safetyConcerns, 6),
    ...(progressNote ? { progressNote } : {}),
  };
}

/**
 * Tag a batch of photo URLs. Photos are analyzed sequentially (free-tier vision
 * models are heavily rate-limited, so parallel calls invite 429s), and each
 * photo is isolated: a failure produces a tag entry with an `error` field
 * rather than aborting the batch. Returns tags in the same order as the input.
 *
 * Throws only when the vision provider is entirely unconfigured — a config
 * error should surface to the caller, not be silently recorded per-photo.
 */
export async function tagFieldReportPhotos(
  urls: string[],
  userId?: string | null
): Promise<PhotoTag[]> {
  if (!isVisionTaggingConfigured()) throw new VisionConfigError();

  const bounded = urls.slice(0, MAX_PHOTOS_PER_REPORT);
  const results: PhotoTag[] = [];

  for (const url of bounded) {
    try {
      results.push(await analyzeFieldReportPhoto(url, userId));
    } catch (err) {
      results.push({
        url,
        category: "general",
        headline: "Analysis unavailable",
        tags: [],
        safetyConcerns: [],
        error: err instanceof Error ? err.message : "Vision analysis failed",
      });
    }
  }

  return results;
}
