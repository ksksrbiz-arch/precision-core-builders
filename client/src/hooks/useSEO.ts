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

    // OG type (default website)
    const ogType = getOrCreateMeta(
      'meta[property="og:type"]',
      "property",
      "og:type"
    );
    ogType.content = "website";

    // Twitter card
    const twitterCard = getOrCreateMeta(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card"
    );
    twitterCard.content = "summary_large_image";

    // OG title
    const ogTitle = getOrCreateMeta(
      'meta[property="og:title"]',
      "property",
      "og:title"
    );
    ogTitle.content = fullTitle;

    // Twitter title
    const twitterTitle = getOrCreateMeta(
      'meta[name="twitter:title"]',
      "name",
      "twitter:title"
    );
    twitterTitle.content = fullTitle;

    // OG / Twitter description
    if (description) {
      const ogDesc = getOrCreateMeta(
        'meta[property="og:description"]',
        "property",
        "og:description"
      );
      ogDesc.content = description;

      const twitterDesc = getOrCreateMeta(
        'meta[name="twitter:description"]',
        "name",
        "twitter:description"
      );
      twitterDesc.content = description;
    }

    // Canonical + og:url
    if (canonical) {
      const canonicalEl = getOrCreateLink('link[rel="canonical"]', "canonical");
      canonicalEl.href = canonical;

      const ogUrl = getOrCreateMeta(
        'meta[property="og:url"]',
        "property",
        "og:url"
      );
      ogUrl.content = canonical;
    }

    // OG / Twitter image (only when explicitly provided; otherwise keep the
    // static homepage image from index.html)
    if (image) {
      const ogImage = getOrCreateMeta(
        'meta[property="og:image"]',
        "property",
        "og:image"
      );
      ogImage.content = image;

      const twitterImage = getOrCreateMeta(
        'meta[name="twitter:image"]',
        "name",
        "twitter:image"
      );
      twitterImage.content = image;
    }

    // Reset to default on unmount
    return () => {
      document.title = `${SITE_NAME} | Precision Construction, Core Values | Eugene, OR`;
    };
  }, [title, description, canonical, image]);
}
