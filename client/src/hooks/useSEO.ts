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

export function useSEO({ title, description, canonical }: SEOOptions) {
  useEffect(() => {
    // Update document title
    document.title = `${title} | ${SITE_NAME}`;

    // Update meta description
    if (description) {
      let metaDesc = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      if (metaDesc) {
        metaDesc.content = description;
      }
    }

    // Update OG title
    let ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]'
    );
    if (ogTitle) {
      ogTitle.content = `${title} | ${SITE_NAME}`;
    }

    // Update OG description
    if (description) {
      let ogDesc = document.querySelector<HTMLMetaElement>(
        'meta[property="og:description"]'
      );
      if (ogDesc) {
        ogDesc.content = description;
      }
    }

    // Update canonical
    if (canonical) {
      let canonicalEl = document.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]'
      );
      if (canonicalEl) {
        canonicalEl.href = canonical;
      }
    }

    // Reset to default on unmount
    return () => {
      document.title = `${SITE_NAME} | Precision Construction, Core Values | Eugene, OR`;
    };
  }, [title, description, canonical]);
}
