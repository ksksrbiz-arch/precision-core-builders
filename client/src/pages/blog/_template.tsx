/**
 * ArticlePage — reusable template for blog/guide content.
 * Same nav/footer shell and SEO/JSON-LD approach as ServicePage and
 * LocationPage, but full-width long-form prose instead of a split-column
 * layout with a lead form — articles read better without a form competing
 * for attention next to every paragraph. CTA lives at the end instead.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { SITE } from "@/const";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { useSEO } from "@/hooks/useSEO";
import { useLocation } from "wouter";
import { ArrowRight, Phone } from "lucide-react";
import { type ReactNode } from "react";

export type ArticleBlock =
  | { type: "p"; content: ReactNode }
  | { type: "h2"; content: string }
  | { type: "list"; items: ReactNode[] }
  | { type: "callout"; content: ReactNode };

export type ArticlePageProps = {
  title: string;
  /** e.g. "Cost Guides" or "Homeowner Resources" */
  category: string;
  heroImage: string;
  heroImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  dek: string;
  blocks: ArticleBlock[];
  faqs?: { q: string; a: string }[];
  publishedDate: string; // ISO, e.g. "2026-08-04"
  relatedLinks: { label: string; href: string }[];
};

export function ArticlePage(p: ArticlePageProps) {
  const [location] = useLocation();
  useSEO({
    title: p.metaTitle,
    description: p.metaDescription,
    canonical: canonicalUrl(location),
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.metaDescription,
    datePublished: p.publishedDate,
    dateModified: p.publishedDate,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    mainEntityOfPage: canonicalUrl(location),
  };
  const faqJsonLd =
    p.faqs && p.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: p.faqs.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }
      : null;

  return (
    <>
      <JsonLd data={articleJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Blog", path: "/blog" },
          { name: p.title, path: location },
        ])}
      />

      <SiteNav />
      <MobileCTABar />

      <main className="pt-[68px]">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative h-[42vh] min-h-[300px] flex items-end pb-10 overflow-hidden">
          <img
            src={p.heroImage}
            alt={p.heroImageAlt}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="container relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-primary" aria-hidden />
              <span
                className="text-primary text-[11px] tracking-[0.28em] uppercase font-semibold"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {p.category}
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight max-w-3xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {p.title}
            </h1>
          </div>
        </section>

        {/* ── Article body ─────────────────────────────────────── */}
        <article className="py-16 sm:py-20">
          <div className="container">
            <div className="max-w-2xl mx-auto">
              <p className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed mb-10 border-l-2 border-primary pl-5">
                {p.dek}
              </p>

              <div className="space-y-6">
                {p.blocks.map((block, i) => {
                  if (block.type === "h2") {
                    return (
                      <h2
                        key={i}
                        className="text-2xl sm:text-3xl font-semibold pt-4"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {block.content}
                      </h2>
                    );
                  }
                  if (block.type === "p") {
                    return (
                      <p
                        key={i}
                        className="text-muted-foreground leading-relaxed font-light text-base"
                      >
                        {block.content}
                      </p>
                    );
                  }
                  if (block.type === "list") {
                    return (
                      <ul key={i} className="space-y-2.5 pl-1">
                        {block.items.map((item, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-3 text-muted-foreground font-light leading-relaxed text-base"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 flex-shrink-0"
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  // callout
                  return (
                    <div
                      key={i}
                      className="bg-card border border-border/60 p-6 text-sm text-muted-foreground leading-relaxed font-light"
                    >
                      {block.content}
                    </div>
                  );
                })}
              </div>

              {/* FAQ */}
              {p.faqs && p.faqs.length > 0 && (
                <div className="mt-14">
                  <h2
                    className="text-2xl sm:text-3xl font-semibold mb-6"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-4">
                    {p.faqs.map(({ q, a }) => (
                      <details
                        key={q}
                        className="group border border-border/60 bg-card"
                      >
                        <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none min-h-[56px]">
                          <span className="text-sm font-semibold text-foreground">
                            {q}
                          </span>
                          <span
                            className="text-primary flex-shrink-0 group-open:rotate-180 transition-transform duration-200 text-lg leading-none"
                            aria-hidden
                          >
                            +
                          </span>
                        </summary>
                        <div className="px-5 pb-5">
                          <p className="text-sm text-muted-foreground font-light leading-relaxed">
                            {a}
                          </p>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-14 bg-card border border-border/60 p-8 text-center">
                <p
                  className="text-xl font-semibold mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Ready to talk about your project?
                </p>
                <p className="text-sm text-muted-foreground font-light mb-6">
                  Free on-site consultation, no obligation. Or try our instant
                  AI estimator for a ballpark first.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="/estimator"
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-all hover:gap-3 min-h-[44px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Try the AI Estimator <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={SITE.phoneHref}
                    className="flex items-center gap-2 border border-primary text-primary px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/10 transition-colors min-h-[44px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Phone className="h-3.5 w-3.5" /> {SITE.phone}
                  </a>
                </div>
              </div>

              {/* Related */}
              {p.relatedLinks.length > 0 && (
                <div className="mt-12">
                  <h2
                    className="text-xl font-semibold mb-5"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Related
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {p.relatedLinks.map(l => (
                      <a
                        key={l.href}
                        href={l.href}
                        className="flex items-center gap-2 border border-border/60 bg-card px-4 py-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors min-h-[44px]"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {l.label} <ArrowRight className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
