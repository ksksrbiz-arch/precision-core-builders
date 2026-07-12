/**
 * useSEO — Sets document title and meta description dynamically per page.
 * Call at the top of each page component with page-specific values.
 */
import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
}

const SITE_NAME = "Precision Core Builders";

function getOrCreateMeta(
  selector: string,
  attrName: string,
  attrValue: string
): HTMLMetaElement {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  return el;
}

function getOrCreateLink(selector: string, rel: string): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  return el;
}

export function useSEO({ title, description, canonical, image }: SEOOptions) {
  useEffect(() => {
    // Snapshot every tag this hook mutates and restore it on unmount, so
    // navigating to a page that doesn't set description / canonical / og:image
    // never inherits stale values from the previous route.
    const restores: Array<() => void> = [];

    const setMeta = (
      selector: string,
      attrName: string,
      attrValue: string,
      content: string
    ) => {
      const el = getOrCreateMeta(selector, attrName, attrValue);
      const prev = el.content;
      el.content = content;
      restores.push(() => {
        el.content = prev;
      });
    };

    const setLink = (selector: string, rel: string, href: string) => {
      const el = getOrCreateLink(selector, rel);
      const prev = el.href;
      el.href = href;
      restores.push(() => {
        el.href = prev;
      });
    };

    const fullTitle = `${title} | ${SITE_NAME}`;
    const prevTitle = document.title;
    document.title = fullTitle;
    restores.push(() => {
      document.title = prevTitle;
    });

    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      "summary_large_image"
    );
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);

    if (description) {
      setMeta('meta[name="description"]', "name", "description", description);
      setMeta(
        'meta[property="og:description"]',
        "property",
        "og:description",
        description
      );
      setMeta(
        'meta[name="twitter:description"]',
        "name",
        "twitter:description",
        description
      );
    }

    if (canonical) {
      setLink('link[rel="canonical"]', "canonical", canonical);
      setMeta('meta[property="og:url"]', "property", "og:url", canonical);
    }

    // Only override og:image when explicitly provided; otherwise the static
    // homepage image from index.html is kept.
    if (image) {
      setMeta('meta[property="og:image"]', "property", "og:image", image);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
    }

    return () => {
      // Restore in reverse so the DOM is left exactly as this effect found it.
      for (const restore of restores.reverse()) restore();
    };
  }, [title, description, canonical, image]);
}
