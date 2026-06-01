/**
 * Services overview page — all 8 services with real photos, links to sub-pages.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { ASSETS, SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const SERVICES = [
  {
    title: "Residential Construction",
    desc: "With over 20 years of hands-on experience, our lead carpenters have honed their skills across every dimension of residential construction — from foundations to final finish.",
    photo: ASSETS.services.residential,
    href: "/services/residential",
    tag: "Most Popular",
  },
  {
    title: "Remodels & Renovations",
    desc: "We transform outdated spaces into modern, functional areas for both residential and small business clients, working closely with you from vision to reality.",
    photo: ASSETS.services.remodels,
    href: "/services/remodels",
  },
  {
    title: "New Construction",
    desc: "From conceptualization to completion, we manage every phase of new construction with the expertise and confidence that only comes from decades on the job.",
    photo: ASSETS.services.newConstruction,
    href: "/services/new-construction",
  },
  {
    title: "Restoration",
    desc: "We breathe new life into damaged, aged, or deteriorated structures — preserving what makes a home special while bringing it back to its full potential.",
    photo: ASSETS.services.restoration,
    href: "/services/restoration",
  },
  {
    title: "Outdoor Spaces",
    desc: "Decks, patios, fencing, pergolas, and site work — we extend your living space outdoors with the same standard of craftsmanship we bring inside.",
    photo: ASSETS.services.outdoor,
    href: "/services/outdoor",
  },
  {
    title: "Painting",
    desc: "Interior and exterior painting done right — proper prep, quality materials, clean lines, and a finish that holds up to Oregon's climate for years.",
    photo: ASSETS.services.painting,
    href: "/services/painting",
  },
  {
    title: "Roofing",
    desc: "Roof replacements, repairs, and inspections handled by people who understand Oregon weather. We protect your home from the top down.",
    photo: ASSETS.services.roofing,
    href: "/services/roofing",
  },
  {
    title: "Custom Cabinets",
    desc: "Built-ins, kitchen cabinetry, bathroom vanities, and custom millwork — designed for your space, built to endure, finished to impress.",
    photo: ASSETS.services.cabinets,
    href: "/services/cabinets",
  },
] as const;

export default function ServicesPage() {
  useSEO({
    title: "Construction Services — Eugene, Oregon",
    description:
      "Precision Core Builders offers residential construction, remodels, new builds, restoration, outdoor spaces, painting, roofing, and custom cabinets in Eugene, OR.",
    canonical: "https://precision-core.netlify.app/services",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />

      <main id="main-content" className="flex-1 pt-[68px]">
        {/* Hero */}
        <section className="py-20 sm:py-28 relative">
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#C8A84B 1px, transparent 1px), linear-gradient(90deg, #C8A84B 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
          <div className="container relative max-w-3xl">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.span
                variants={fadeUp}
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-5"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                What We Build
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl font-semibold leading-tight mb-5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Every trade.
                <br />
                <em className="text-primary italic">
                  One standard of quality.
                </em>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-muted-foreground text-lg leading-relaxed font-light"
              >
                From ground-up new construction to custom cabinetry — we handle
                every phase of your project with the same precision and
                commitment to craft.
              </motion.p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* Services grid */}
        <section className="py-16 sm:py-24">
          <div className="container">
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5 max-w-5xl mx-auto">
              {SERVICES.map((service, i) => (
                <motion.a
                  key={service.href}
                  href={service.href}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    delay: i * 0.07,
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative bg-card border border-border/60 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 flex"
                >
                  {/* Photo */}
                  <div className="relative w-32 sm:w-40 flex-shrink-0 overflow-hidden">
                    <img
                      src={service.photo}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading={i < 4 ? "eager" : "lazy"}
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/20" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2
                        className="text-base font-semibold group-hover:text-primary transition-colors duration-200 leading-snug"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {service.title}
                      </h2>
                      {"tag" in service && (
                        <span
                          className="text-[8px] px-1.5 py-0.5 bg-primary/20 text-primary font-bold tracking-widest uppercase flex-shrink-0"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {service.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-light leading-relaxed mb-4">
                      {service.desc}
                    </p>
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] text-primary font-bold tracking-widest uppercase group-hover:gap-2.5 transition-all duration-200"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Learn More <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className="py-16 bg-card/40 border-y border-border/40">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold mb-1"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Not sure which service you need?
                </h2>
                <p className="text-muted-foreground font-light text-sm">
                  Call Eric — free consultation, honest advice, no sales
                  pressure.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <a
                  href={SITE.phoneHref}
                  className="flex items-center justify-center gap-2 border border-primary text-primary px-6 py-3 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/10 transition-colors min-h-[48px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Phone className="h-3.5 w-3.5" /> {SITE.phone}
                </a>
                <a
                  href="/contact"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 hover:gap-3 transition-all min-h-[48px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Free Estimate <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
