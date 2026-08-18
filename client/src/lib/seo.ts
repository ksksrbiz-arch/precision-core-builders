/**
 * seo — shared helpers for per-route head metadata and structured data.
 * Single source of truth for the production domain so canonicals, og:url,
 * and JSON-LD URLs never drift between pages.
 */
import { SITE } from "@/const";

/**
 * Absolute canonical URL for a route path.
 * canonicalUrl("/") → "https://precisioncorebuilders.com/"
 * canonicalUrl("/about") → "https://precisioncorebuilders.com/about"
 */
export function canonicalUrl(path: string): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Make an asset URL absolute on the production domain. Open Graph and
 * Twitter cards require absolute image URLs; local assets arrive as
 * root-relative paths ("/portfolio/…"), CDN assets are already absolute.
 */
export function absoluteAssetUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : canonicalUrl(url);
}

export interface Breadcrumb {
  name: string;
  path: string;
}

/**
 * BreadcrumbList JSON-LD for inner pages. "Home" is always position 1 —
 * pass only the trail below it, e.g.
 * breadcrumbJsonLd([{ name: "Portfolio", path: "/portfolio" }]).
 */
export function breadcrumbJsonLd(trail: Breadcrumb[]): Record<string, unknown> {
  const items: Breadcrumb[] = [{ name: "Home", path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
