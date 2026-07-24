/**
 * Services overview page — all 8 services with real photos, links to sub-pages.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { JsonLd } from "@/components/JsonLd";
import { ASSETS, SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { TextReveal } from "@/components/ui/TextReveal";
import { TiltCard } from "@/components/ui/TiltCard";
import {
  ArrowRight,
  Hammer,
  Home,
  Paintbrush,
  Phone,
  Ruler,
  ShieldCheck,
  Trees,
  Umbrella,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type Service = {
  title: string;
  desc: string;
  photo: string;
  href: string;
  icon: LucideIcon;
  tag?: string;
  pairedWith?: string[];
};

type Category = {
  label: string;
  blurb: string;
  services: Service[];
};

const CATEGORIES: Category[] = [
  {
    label: "Residential",
    blurb: "Whole-home builds, updates, and the rooms you live in most.",
    services: [
      {
        title: "Residential Construction",
        desc: "With over 20 years of hands-on experience, our lead carpenters have honed their skills across every dimension of residential construction — from foundations to final finish.",
        photo: ASSETS.services.residential,
        href: "/services/residential",
        icon: Home,
        tag: "Most Popular",
        pairedWith: ["Custom Cabinets", "Painting"],
      },
      {
        title: "Remodels & Renovations",
        desc: "We transform outdated spaces into modern, functional areas for both residential and small business clients, working closely with you from vision to reality.",
        photo: ASSETS.services.remodels,
        href: "/services/remodels",
        icon: Hammer,
        pairedWith: ["Custom Cabinets", "Painting"],
      },
      {
        title: "New Construction",
        desc: "From conceptualization to completion, we manage every phase of new construction with the expertise and confidence that only comes from decades on the job.",
        photo: ASSETS.services.newConstruction,
        href: "/services/new-construction",
        icon: Ruler,
        pairedWith: ["Roofing", "Outdoor Spaces"],
      },
      {
        title: "Custom Cabinets",
        desc: "Built-ins, kitchen cabinetry, bathroom vanities, and custom millwork — designed for your space, built to endure, finished to impress.",
        photo: ASSETS.services.cabinets,
        href: "/services/cabinets",
        icon: Ruler,
        pairedWith: ["Remodels & Renovations", "Painting"],
      },
    ],
  },
  {
    label: "Outdoor & Exterior",
    blurb: "Everything that protects and extends your home outside.",
    services: [
      {
        title: "Outdoor Spaces",
        desc: "Decks, patios, fencing, pergolas, and site work — we extend your living space outdoors with the same standard of craftsmanship we bring inside.",
        photo: ASSETS.services.outdoor,
        href: "/services/outdoor",
        icon: Trees,
        pairedWith: ["New Construction", "Painting"],
      },
      {
        title: "Painting",
        desc: "Interior and exterior painting done right — proper prep, quality materials, clean lines, and a finish that holds up to Oregon's climate for years.",
        photo: ASSETS.services.painting,
        href: "/services/painting",
        icon: Paintbrush,
        pairedWith: ["Remodels & Renovations", "Restoration"],
      },
      {
        title: "Roofing",
        desc: "Roof replacements, repairs, and inspections handled by people who understand Oregon weather. We protect your home from the top down.",
        photo: ASSETS.services.roofing,
        href: "/services/roofing",
        icon: Umbrella,
        pairedWith: ["Restoration", "New Construction"],
      },
    ],
  },
  {
    label: "Specialized",
    blurb: "Restoring, repairing, and protecting what already stands.",
    services: [
      {
        title: "Restoration",
        desc: "We breathe new life into damaged, aged, or deteriorated structures — preserving what makes a home special while bringing it back to its full potential.",
        photo: ASSETS.services.restoration,
        href: "/services/restoration",
        icon: ShieldCheck,
        pairedWith: ["Roofing", "Painting"],
      },
    ],
  },
];

export default function ServicesPage() {
  useSEO({
    title: "Construction Services — Eugene, Oregon",
    description:
      "Residential construction, remodels, new builds, restoration, outdoor living, painting, roofing, and custom cabinets in Eugene, OR — licensed CCB #246527.",
    canonical: canonicalUrl("/services"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Services", path: "/services" }])}
      />
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
              <h1
                className="text-5xl sm:text-6xl font-semibold leading-tight mb-5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <TextReveal
                  text="Every trade."
                  className="block"
                  delay={0.1}
                  stagger={0.08}
                />
                <TextReveal
                  text="One standard of quality."
                  className="block"
                  wordClassName="text-primary italic"
                  delay={0.4}
                  stagger={0.08}
                />
              </h1>
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

        {/* Services by category */}
        <section className="py-16 sm:py-24">
          <div className="container">
            <div className="max-w-5xl mx-auto space-y-16">
              {CATEGORIES.map(category => (
                <div key={category.label}>
                  {/* Category heading */}
                  <div className="flex items-baseline gap-3 mb-2">
                    <h2
                      className="text-2xl sm:text-3xl font-semibold"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {category.label}
                    </h2>
                    <span
                      className="text-[11px] px-2 py-0.5 bg-primary/15 text-primary font-bold tracking-widest uppercase"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {category.services.length}{" "}
                      {category.services.length === 1 ? "service" : "services"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-light mb-6">
                    {category.blurb}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-5">
                    {category.services.map((service, i) => {
                      const Icon = service.icon;
                      return (
                        <TiltCard
                          key={service.href}
                          className="h-full"
                          maxTilt={4}
                        >
                          <motion.a
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
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/20" />
                              {/* Icon callout */}
                              <div className="absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center bg-background/85 text-primary ring-1 ring-primary/30 backdrop-blur-sm">
                                <Icon className="h-4 w-4" aria-hidden />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-5 sm:p-6">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3
                                  className="text-base font-semibold group-hover:text-primary transition-colors duration-200 leading-snug"
                                  style={{ fontFamily: "var(--font-heading)" }}
                                >
                                  {service.title}
                                </h3>
                                {service.tag && (
                                  <span
                                    className="text-[8px] px-1.5 py-0.5 bg-primary/20 text-primary font-bold tracking-widest uppercase flex-shrink-0"
                                    style={{
                                      fontFamily: "var(--font-condensed)",
                                    }}
                                  >
                                    {service.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-light leading-relaxed mb-4">
                                {service.desc}
                              </p>

                              {service.pairedWith &&
                                service.pairedWith.length > 0 && (
                                  <div className="mb-4">
                                    <span
                                      className="block text-[9px] text-muted-foreground/70 font-semibold tracking-widest uppercase mb-1.5"
                                      style={{
                                        fontFamily: "var(--font-condensed)",
                                      }}
                                    >
                                      Often paired with
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {service.pairedWith.map(paired => (
                                        <span
                                          key={paired}
                                          className="text-[10px] px-2 py-0.5 bg-muted/60 text-muted-foreground"
                                        >
                                          {paired}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              <span
                                className="inline-flex items-center gap-1.5 text-[10px] text-primary font-bold tracking-widest uppercase group-hover:gap-2.5 transition-all duration-200"
                                style={{
                                  fontFamily: "var(--font-condensed)",
                                }}
                              >
                                Learn More <ArrowRight className="h-3 w-3" />
                              </span>
                            </div>
                          </motion.a>
                        </TiltCard>
                      );
                    })}
                  </div>
                </div>
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
                  Ready to start? Let's scope your project.
                </h2>
                <p className="text-muted-foreground font-light text-sm">
                  Tell Eric what you're planning — get a clear, no-pressure
                  estimate and a straight answer on next steps.
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
                <Link
                  href="/estimator"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 hover:gap-3 transition-all min-h-[48px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Free Estimate <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
