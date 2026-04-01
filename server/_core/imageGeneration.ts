/**
 * Image generation — Phase 5 feature.
 * Placeholder for Gemini Imagen integration via Netlify Function.
 */
export type ImageGenerationParams = {
  prompt: string;
  width?: number;
  height?: number;
};

export type ImageGenerationResult = {
  url: string;
  width: number;
  height: number;
};

export async function generateImage(
  _params: ImageGenerationParams
): Promise<ImageGenerationResult> {
  throw new Error(
    "Image generation not yet configured. Add GEMINI_API_KEY to Netlify env."
  );
}
