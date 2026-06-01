/**
 * SectionTeaser — Reusable "preview card" for Home page sections that now
 * link out to dedicated pages. Keeps the homepage tight while pulling users
 * deeper into the site.
 *
 * Two layouts:
 *   - variant="card"     : square-ish image above, title/copy/link below
 *   - variant="feature"  : wide side-by-side image + content (alternating)
 */
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

interface TeaserProps {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  ctaLabel?: string;
  image?: string;
  imageAlt?: string;
  /** Tailwind aspect class, e.g. "aspect-[3/4]" for portraits. Default "aspect-[4/3]". */
  imageAspect?: string;
  /** object-position class, e.g. "object-top" to avoid cropping faces. Default "object-center". */
  imagePosition?: string;
  Icon?: ComponentType<{ className?: string }>;
  variant?: "card" | "feature";
  reverse?: boolean;
  className?: string;
}

export function SectionTeaser({
  eyebrow,
  title,
  body,
  href,
  ctaLabel = "Learn more",
  image,
  imageAlt = "",
  imageAspect = "aspect-[4/3]",
  imagePosition = "object-center",
  Icon,
  variant = "card",
  reverse = false,
  className = "",
}: TeaserProps) {
  if (variant === "feature") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        } ${className}`}
      >
        {image && (
          <div
            className={`relative overflow-hidden rounded-sm ${imageAspect} bg-muted`}
          >
            <img
              src={image}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover ${imagePosition} transition-transform duration-[2s] ease-out hover:scale-105`}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none" />
          </div>
        )}
        <div>
          <div
            className="text-[10px] tracking-[0.3em] uppercase text-primary mb-3 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {eyebrow}
          </div>
          <h3
            className="text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-6 text-base md:text-lg">
            {body}
          </p>
          <Link
            href={href}
            className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all border-b border-primary/40 hover:border-primary pb-0.5"
          >
            {ctaLabel}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </motion.article>
    );
  }

  // Card variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <Link
        href={href}
        className="group block bg-card border border-border/60 rounded-sm overflow-hidden hover:border-primary/60 hover:-translate-y-1 transition-all duration-500 h-full"
      >
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={image}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        )}
        <div className="p-6 md:p-7">
          {Icon && !image && (
            <Icon className="w-8 h-8 text-primary mb-4" aria-hidden="true" />
          )}
          <div
            className="text-[10px] tracking-[0.3em] uppercase text-primary mb-2 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {eyebrow}
          </div>
          <h3
            className="text-xl md:text-2xl font-semibold text-foreground mb-3 leading-snug"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {body}
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium group-hover:gap-2.5 transition-all">
            {ctaLabel}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
