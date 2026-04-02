/**
 * Image description via Claude — replaces the Gemini Imagen stub.
 * Instead of generating images (unsupported), Claude produces rich structured
 * project descriptions, alt-text, and design specs that pair with manual photos.
 */
import { invokeLLM } from "./llm";

export type ImageDescriptionParams = {
  projectType: string;
  location?: string;
  materials?: string[];
  phase?: string;
  notes?: string;
};

export type ImageDescriptionResult = {
  altText: string;
  captionShort: string;
  captionLong: string;
  seoDescription: string;
  suggestedFilename: string;
};

const SYSTEM = `You are a construction photography and content specialist for Precision Core Builders, Eugene OR (CCB #246527).
Generate professional, SEO-optimized image descriptions for construction project photos.
Return ONLY valid JSON matching the requested schema.`;

/**
 * Generate rich image alt-text and captions for a construction project photo.
 * Use this wherever generateImage() was previously called.
 */
export async function describeProjectImage(
  params: ImageDescriptionParams
): Promise<ImageDescriptionResult> {
  const prompt = [
    `Project type: ${params.projectType}`,
    params.location ? `Location: ${params.location}` : null,
    params.materials?.length
      ? `Materials: ${params.materials.join(", ")}`
      : null,
    params.phase ? `Construction phase: ${params.phase}` : null,
    params.notes ? `Notes: ${params.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Generate image description fields for this construction photo context:\n${prompt}\n\nReturn JSON: { "altText": "...", "captionShort": "...", "captionLong": "...", "seoDescription": "...", "suggestedFilename": "..." }`,
      },
    ],
    jsonMode: true,
    maxTokens: 400,
    temperature: 0.3,
  });

  return JSON.parse(result.text) as ImageDescriptionResult;
}

/**
 * @deprecated Use describeProjectImage() instead.
 * Kept for backward compatibility — throws a clear migration error.
 */
export async function generateImage(_params: unknown): Promise<never> {
  throw new Error(
    "generateImage() is deprecated. Use describeProjectImage() from imageGeneration.ts. " +
      "Claude generates rich text descriptions; upload actual photos to Supabase Storage."
  );
}
