/**
 * Netlify Image CDN helpers.
 *
 * Netlify serves on-the-fly resized + reformatted (AVIF/WebP, negotiated via
 * the browser's Accept header) variants of our static images through the
 * `/.netlify/images` endpoint — no pre-generated derivatives or extra build
 * step required. We only rewrite same-origin static images (paths starting
 * with "/"); external URLs and the local dev server (where the endpoint does
 * not exist) fall back to the original `src` so nothing breaks in `pnpm dev`.
 *
 * Docs: https://docs.netlify.com/image-cdn/overview/
 */

/** Default responsive widths, spanning phones through retina desktop. */
export const DEFAULT_IMG_WIDTHS = [
  400, 640, 768, 1024, 1280, 1600, 1920,
] as const;

/** Whether `src` is a same-origin static asset we can route through the CDN. */
function isTransformable(src: string): boolean {
  return import.meta.env.PROD && src.startsWith("/") && !src.startsWith("//");
}

/** A single CDN URL at a given pixel width. */
export function netlifyImage(src: string, width: number): string {
  if (!isTransformable(src)) return src;
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&fit=cover`;
}

/**
 * Build a `srcset` string across the given widths, or `undefined` when the
 * source can't be transformed (so callers can omit the attribute entirely).
 */
export function netlifySrcSet(
  src: string,
  widths: readonly number[] = DEFAULT_IMG_WIDTHS
): string | undefined {
  if (!isTransformable(src)) return undefined;
  return widths.map(w => `${netlifyImage(src, w)} ${w}w`).join(", ");
}
