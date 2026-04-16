/**
 * CTABand — Full-width bold call-to-action band. Used between sections
 * on homepage and as closer on service/portfolio pages.
 *
 * Two variants:
 *   - variant="dark"    : navy background, gold accent (high-impact)
 *   - variant="light"   : cream background, subtle (connective tissue)
 */
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import { SITE } from "@/const";

interface CTABandProps {
  eyebrow?: string;
  headline: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  variant?: "dark" | "light";
  showPhone?: boolean;
  className?: string;
}

export function CTABand({
  eyebrow,
  headline,
  body,
  primaryHref = "/estimator",
  primaryLabel = "Get a Free Estimate",
  variant = "dark",
  showPhone = true,
  className = "",
}: CTABandProps) {
  const isDark = variant === "dark";
  return (
    <section
      className={`relative py-20 md:py-28 overflow-hidden ${
        isDark
          ? "bg-[#1a1a1a] text-white"
          : "bg-[#F5F1ED] text-foreground border-y border-border/60"
      } ${className}`}
    >
      {/* Decorative gradient wash */}
      {isDark && (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top left, rgba(200,168,75,0.15), transparent 50%), radial-gradient(ellipse at bottom right, rgba(139,115,85,0.12), transparent 50%)",
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-4xl mx-auto px-6 text-center"
      >
        {eyebrow && (
          <div
            className="text-[10px] tracking-[0.35em] uppercase text-primary mb-5 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          className={`text-3xl md:text-5xl font-semibold leading-tight mb-5 ${
            isDark ? "text-white" : "text-foreground"
          }`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {headline}
        </h2>
        {body && (
          <p
            className={`text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto ${
              isDark ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            {body}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-4 font-medium tracking-wide hover:bg-primary/90 transition-colors rounded-sm text-sm uppercase"
            style={{
              fontFamily: "var(--font-condensed)",
              letterSpacing: "0.1em",
            }}
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          {showPhone && (
            <a
              href={SITE.phoneHref}
              className={`inline-flex items-center gap-2 px-7 py-4 font-medium tracking-wide transition-colors rounded-sm text-sm uppercase border ${
                isDark
                  ? "border-white/20 text-white hover:bg-white/5"
                  : "border-foreground/20 text-foreground hover:bg-foreground/5"
              }`}
              style={{
                fontFamily: "var(--font-condensed)",
                letterSpacing: "0.1em",
              }}
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              {SITE.phone}
            </a>
          )}
        </div>
      </motion.div>
    </section>
  );
}
