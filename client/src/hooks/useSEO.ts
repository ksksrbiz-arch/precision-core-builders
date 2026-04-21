/**
 * useSEO — Sets document title and meta description dynamically per page.
 * Call at the top of each page component with page-specific values.
 */
import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description?: string;
  canonical?: string;
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

export function useSEO({ title, description, canonical }: SEOOptions) {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`;

    // Document title
    document.title = fullTitle;

    // Meta description
    if (description) {
      const metaDesc = getOrCreateMeta(
        'meta[name="description"]',
        "name",
        "description"
      );
      metaDesc.content = description;
    }

    // OG title
    const ogTitle = getOrCreateMeta(
      'meta[property="og:title"]',
      "property",
      "og:title"
    );
    ogTitle.content = fullTitle;

    // OG description
    if (description) {
      const ogDesc = getOrCreateMeta(
        'meta[property="og:description"]',
        "property",
        "og:description"
      );
      ogDesc.content = description;
    }

    // Canonical
    if (canonical) {
      const canonicalEl = getOrCreateLink('link[rel="canonical"]', "canonical");
      canonicalEl.href = canonical;
    }

    // Reset to default on unmount
    return () => {
      document.title = `${SITE_NAME} | Precision Construction, Core Values | Eugene, OR`;
    };
  }, [title, description, canonical]);
}
