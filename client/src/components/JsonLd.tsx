/**
 * JsonLd — injects a JSON-LD structured-data script for the current route.
 * Renders inline in the body (Google parses the rendered DOM, so placement
 * is fine) and unmounts with the page, so schemas never leak across routes.
 * "<" is unicode-escaped so page copy can never break out of the tag.
 */
interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
