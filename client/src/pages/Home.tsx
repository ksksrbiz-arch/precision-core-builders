/**
 * Home — Lean landing page. Hero + stats + section teasers that link
 * out to dedicated pages. Previously 1,713 lines of embedded content;
 * now a proper router-driven entry point.
 *
 * Architecture:
 *   - SiteShell (nav + footer + mobile CTA) from shared layout
 *   - Hero with crossfading slideshow (Ken Burns animations preserved)
 *   - StatsBar (counter animation preserved)
 *   - About / Services / Portfolio / Testimonials / Contact teasers
 *     linking to /about, /services, /portfolio, /contact
 *   - Two CTABands (mid-page + footer) for conversion
 */
import { CTABand } from "@/components/layout/CTABand";
import {
  MobileCTABar,
  SiteFooter,
  SiteNav,
} from "@/components/layout/SiteShell";
import { SectionTeaser } from "@/components/layout/SectionTeaser";
import { TrustBar } from "@/components/layout/TrustBar";
import { Reveal } from "@/components/ui/Reveal";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import { ASSETS, SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Award,
  ExternalLink,
  Hammer,
  Home as HomeIcon,
  Paintbrush,
  Quote,
  Ruler,
  Star,
  TreePine,
  Trees,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

// ─── Animation primitives ──────────────────────────────────────────
const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9, ease } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };
const DEFAULT_SUPER_SPLAT_URL = "https://superspl.at";
const DEFAULT_SUPER_SPLAT_DEMO_URL =
  "https://supersplat-demo.vercel.app/?model=https://huggingface.co/spaces/nerfstudio-office/nerf_assets/resolve/main/splat-data/office.splat";
const DEFAULT_SUPER_SPLAT_FEATURES = [
  "Create a free SuperSplat account.",
  "Upload and publish your own 3D splat scenes.",
  "Share links with clients and teams instantly.",
] as const;

type SuperSplatConfig = {
  accountUrl: string;
  demoUrl: string;
  features: string[];
};

// ─── Counter hook (preserved from original) ────────────────────────
function useCounter(target: number, inView: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const duration = 1800;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, inView]);
  return value;
}

/* ══════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════ */
export default function Home() {
  useSEO({
    title: "Precision Core Builders — Precision Construction, Core Values.",
    description:
      "Master carpenters serving Eugene, Oregon and Lane County. 20+ years of experience in residential construction, remodels, restoration, custom cabinets, and more. CCB #246527.",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />
      <main id="main-content">
        <Hero />
        <StatsBar />
        <div className="cv-auto">
          <AboutTeaser />
        </div>
        <div className="cv-auto">
          <ServicesTeaser />
        </div>
        <MidpageCTA />
        <div className="cv-auto">
          <PortfolioTeaser />
        </div>
        <div className="cv-auto">
          <SuperSplatTeaser />
        </div>
        <div className="cv-auto">
          <TestimonialTeaser />
        </div>
        <ClosingCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO (slideshow preserved from original)
══════════════════════════════════════════════════════════════ */
const HERO_SLIDES = [
  {
    url: "/portfolio/signature-outdoor-01.jpg",
    alt: "The Tadlock brothers' own home — pergola, deck, and cedar privacy fence, all built by Eric and Mitch themselves",
    animation: "hero-zoom-in",
  },
  {
    url: "/portfolio/signature-deck-01.jpg",
    alt: "Covered pergola and composite deck on a Eugene home — built by Precision Core Builders",
    animation: "hero-drift-right",
  },
  {
    url: "/portfolio/house-restoration-02.jpg",
    alt: "Full home restoration at sunset — new roof, siding, and envelope by Precision Core Builders",
    animation: "hero-zoom-out",
  },
  {
    url: "/portfolio/signature-outdoor-01.jpg",
    alt: "Backyard pergola over composite deck with horizontal cedar privacy fence — outdoor living by Precision Core Builders",
    animation: "hero-drift-left",
  },
  {
    url: "/portfolio/side-yard-shed-03.jpg",
    alt: "Custom side-yard shed with matching siding and roofline — Eric Tadlock carpentry",
    animation: "hero-zoom-diagonal",
  },
] as const;

const SLIDE_DURATION = 6000;
const FADE_DURATION = 1200;

function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  // The <link rel="preload"> for slide 0 is already in index.html.
  // This hook handles subsequent slides so they start loading on mount.
  useEffect(() => {
    // Preload slide[1] immediately so it is ready when the first rotation happens
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = HERO_SLIDES[1].url;
    document.head.appendChild(link);
  }, []);

  // Pause auto-rotation when the tab/document is hidden to save CPU and battery.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    // Respect prefers-reduced-motion: keep the first slide static instead of
    // auto-rotating. Pagination dots still allow manual selection.
    if (reduceMotion || paused) return;
    const timer = setTimeout(() => {
      setCurrent(n => (n + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [current, paused, reduceMotion]);

  return (
    <div
      className="absolute inset-0 overflow-hidden touch-action-pan-y"
      aria-hidden
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/*
       * Keyframe animations are defined in index.css (not an inline <style>)
       * so the browser only parses them once, not on every re-render.
       *
       * will-change is applied ONLY to the active slide to avoid promoting
       * all 5 full-resolution images to GPU compositing layers simultaneously.
       */}
      {HERO_SLIDES.map((slide, i) => {
        const active = i === current;
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity"
            style={{
              opacity: active ? 1 : 0,
              transitionDuration: `${FADE_DURATION}ms`,
              transitionTimingFunction: "ease-in-out",
              zIndex: active ? 1 : 0,
            }}
          >
            <img
              src={slide.url}
              alt={i === 0 ? slide.alt : ""}
              aria-hidden={i === 0 ? undefined : true}
              className="hero-slide-img h-full w-full object-cover"
              style={{
                animationName:
                  active && !reduceMotion ? slide.animation : "none",
                animationDuration: `${SLIDE_DURATION + FADE_DURATION}ms`,
                willChange: active ? "transform, opacity" : undefined,
              }}
              loading={i === 0 ? "eager" : "lazy"}
              decoding={i === 0 ? "sync" : "async"}
              draggable={false}
              {...({
                fetchpriority: i === 0 ? "high" : "low",
              } as Record<string, string>)}
            />
          </div>
        );
      })}

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Show slide ${i + 1} of ${HERO_SLIDES.length}`}
            aria-current={i === current ? "true" : undefined}
            className={`transition-all duration-500 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 ${
              i === current
                ? "w-6 h-1.5 bg-primary"
                : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      className="relative min-h-[70vh] md:min-h-[85vh] lg:min-h-[100svh] flex items-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <HeroSlideshow />
      {/* Dark vignette for text legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/30 z-[1]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent z-[1]"
        aria-hidden
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative z-[2] max-w-7xl mx-auto px-6 md:px-10 w-full py-28 md:py-40"
      >
        <motion.div variants={fadeIn} className="mb-6 md:mb-8">
          <span
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-primary font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <span className="w-8 h-px bg-primary" aria-hidden />
            Eugene, Oregon · Since 2004
          </span>
        </motion.div>

        <motion.h1
          id="hero-heading"
          variants={fadeUp}
          className="display-hero font-semibold text-white max-w-4xl mb-5 md:mb-6"
        >
          Precision Construction.
          <br />
          <span className="text-gradient-gold">Core Values.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed mb-8 md:mb-10"
        >
          Master carpenters with 20+ years building homes, remodels, and outdoor
          spaces across Lane County. Every project carries the same standard: on
          time, on budget, built to last.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-start"
        >
          <Link
            href="/estimator"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 font-medium hover:bg-primary/90 transition-all group rounded-sm uppercase text-sm min-h-[48px] min-w-[160px] w-full sm:w-auto"
            style={{
              fontFamily: "var(--font-condensed)",
              letterSpacing: "0.1em",
            }}
          >
            Get a Free Estimate
            <ArrowRight
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 font-medium hover:bg-white/10 transition-all rounded-sm uppercase text-sm min-h-[48px] min-w-[160px] w-full sm:w-auto"
            style={{
              fontFamily: "var(--font-condensed)",
              letterSpacing: "0.1em",
            }}
          >
            See Our Work
          </Link>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-12 md:mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-white/50"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" aria-hidden="true" />
            {SITE.license}
          </span>
          <span className="hidden sm:block w-px h-4 bg-white/20" aria-hidden />
          <span>Licensed · Bonded · Insured</span>
        </motion.div>
      </motion.div>

      {/* Animated scroll indicator — hidden on small screens to avoid CTA overlap */}
      <span
        className="scroll-indicator hidden md:inline-flex z-[2]"
        aria-hidden
      />
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════════════════ */
const STATS = [
  { value: 20, suffix: "", label: "Years Construction" },
  { value: 12, suffix: "", label: "Years In Business" },
  { value: 50, suffix: "+", label: "Happy Customers" },
  { value: 0, suffix: "", label: "Call-Backs" },
] as const;

function StatCell({ value, suffix, label }: (typeof STATS)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const count = useCounter(value, inView);
  return (
    <div
      ref={ref}
      className="group relative py-10 px-6 text-center transition-colors duration-300 hover:bg-primary/[0.04]"
    >
      <div
        className="text-4xl sm:text-5xl font-bold text-gradient-gold mb-2 tabular-nums"
        style={{ fontFamily: "var(--font-heading)" }}
        aria-label={`${value}${suffix}`}
      >
        {count}
        {suffix}
      </div>
      <div
        className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground leading-tight"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {label}
      </div>
      <span
        aria-hidden
        className="mx-auto mt-3 block h-[2px] w-6 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 group-hover:w-12 transition-all duration-500"
      />
    </div>
  );
}

function StatsBar() {
  return (
    <section
      className="relative border-y border-border/50 bg-card/70 overflow-hidden"
      aria-label="Company credentials"
    >
      <div className="glow-gold-top" aria-hidden />
      <div className="relative max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-border/50 md:divide-x-reverse">
        {STATS.map(s => (
          <StatCell key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABOUT TEASER — links to /about
══════════════════════════════════════════════════════════════ */
function AboutTeaser() {
  return (
    <section
      id="about"
      className="py-24 md:py-32 bg-background"
      aria-labelledby="about-heading"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <SectionTeaser
          eyebrow="About Precision Core"
          title="Two brothers. 20+ years. Every build done right."
          body="Eric and Mitch Tadlock run Precision Core Builders out of Eugene, Oregon — family-owned, licensed (CCB #246527), and built on a simple standard: show up, work clean, do it right. From framing to finish, every decision gets made by someone with skin in the game."
          href="/about"
          ctaLabel="Meet the team"
          image={ASSETS.team.eric}
          imageAlt="Eric Tadlock, owner and lead carpenter at Precision Core Builders"
          imageAspect="aspect-[3/4]"
          imagePosition="object-top"
          variant="feature"
        />

        <div className="mt-20">
          <TrustBar />
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   SERVICES TEASER — 3 featured + link to /services
══════════════════════════════════════════════════════════════ */
const FEATURED_SERVICES = [
  {
    eyebrow: "Residential",
    title: "Custom Homes & Additions",
    body: "From foundation to final finish. Decades of hands-on residential work across Lane County.",
    href: "/services/residential",
    image: ASSETS.services.residential,
    imageAlt: "Custom residential home build",
  },
  {
    eyebrow: "Remodels",
    title: "Remodels & Renovations",
    body: "Kitchens, bathrooms, additions, full-home transformations. Vision to reality, close collaboration the whole way.",
    href: "/services/remodels",
    image: ASSETS.services.remodels,
    imageAlt: "Home remodel and renovation",
  },
  {
    eyebrow: "Custom Cabinets",
    title: "Cabinetry & Millwork",
    body: "Built-ins, kitchen cabinetry, vanities. Designed for your space, built to endure, finished to impress.",
    href: "/services/cabinets",
    image: ASSETS.services.cabinets,
    imageAlt: "Custom cabinetry and millwork",
  },
] as const;

const ALL_SERVICES_ICONS = [
  { Icon: HomeIcon, label: "Residential", href: "/services/residential" },
  { Icon: Hammer, label: "Remodels", href: "/services/remodels" },
  { Icon: Ruler, label: "New Build", href: "/services/new-construction" },
  { Icon: Wrench, label: "Restoration", href: "/services/restoration" },
  { Icon: Trees, label: "Outdoor", href: "/services/outdoor" },
  { Icon: Paintbrush, label: "Painting", href: "/services/painting" },
  { Icon: TreePine, label: "Roofing", href: "/services/roofing" },
  { Icon: Ruler, label: "Cabinets", href: "/services/cabinets" },
] as const;

function ServicesTeaser() {
  return (
    <section
      id="services"
      className="py-24 md:py-32 bg-card/40 border-y border-border/40"
      aria-labelledby="services-heading"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease }}
          className="max-w-2xl mb-16"
        >
          <div
            className="text-[10px] tracking-[0.3em] uppercase text-primary mb-4 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            What We Build
          </div>
          <h2
            id="services-heading"
            className="text-4xl md:text-5xl font-semibold text-foreground mb-5 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Full-scope construction, one crew.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Eight service areas. Every one handled in-house by carpenters who've
            spent decades earning their reputation. Scroll through the
            highlights — or{" "}
            <Link
              href="/services"
              className="text-primary border-b border-primary/40 hover:border-primary"
            >
              see all services
            </Link>
            .
          </p>
        </motion.div>

        {/* Featured 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16">
          {FEATURED_SERVICES.map(s => (
            <SectionTeaser key={s.href} {...s} variant="card" />
          ))}
        </div>

        {/* Full service index pills */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease }}
          className="border-t border-border/40 pt-10"
        >
          <div
            className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-5 font-medium text-center"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            All Service Areas
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {ALL_SERVICES_ICONS.map(({ Icon, label, href }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-2 px-4 py-2.5 border border-border/60 bg-background hover:border-primary hover:bg-primary/5 transition-all rounded-sm text-sm"
              >
                <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   MIDPAGE CTA
══════════════════════════════════════════════════════════════ */
function MidpageCTA() {
  return (
    <CTABand
      eyebrow="No-pressure estimates"
      headline="Tell us about your project."
      body="Every estimate comes from a real site visit — no guesses, no bait-and-switch. We respond within one business day."
      primaryHref="/estimator"
      primaryLabel="Start Your Estimate"
      variant="dark"
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   PORTFOLIO TEASER — 4 images + link to /portfolio
══════════════════════════════════════════════════════════════ */
function PortfolioTeaser() {
  return (
    <section
      id="work"
      className="py-20 md:py-32 bg-background"
      aria-labelledby="work-heading"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-12">
          <div className="max-w-2xl">
            <div className="eyebrow text-primary mb-3 md:mb-4">Recent Work</div>
            <h2
              id="work-heading"
              className="display-section font-semibold text-foreground"
            >
              Homes we've built, remodels we've completed.
            </h2>
            <span className="heading-bar" aria-hidden />
          </div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all border-b border-primary/40 hover:border-primary pb-0.5 whitespace-nowrap min-h-[44px]"
          >
            View full portfolio
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            "/portfolio/signature-outdoor-01.jpg",
            "/portfolio/house-restoration-02.jpg",
            "/portfolio/side-yard-shed-03.jpg",
            "/portfolio/bath-remodel-06.jpg",
          ].map((img, i) => (
            <motion.div
              key={img}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease }}
            >
              <Link
                href="/portfolio"
                className="group block relative overflow-hidden rounded-sm bg-muted active:scale-[0.98] transition-transform"
              >
                <ResponsiveImage
                  src={img}
                  alt={`Precision Core Builders project ${i + 1}`}
                  aspectRatio="4/5"
                  imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute inset-x-4 bottom-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                  <span
                    className="text-[10px] tracking-[0.3em] uppercase text-white/80"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    View Project
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SuperSplatTeaser() {
  const [config, setConfig] = useState<SuperSplatConfig>({
    accountUrl: DEFAULT_SUPER_SPLAT_URL,
    demoUrl: DEFAULT_SUPER_SPLAT_DEMO_URL,
    features: [...DEFAULT_SUPER_SPLAT_FEATURES],
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/supersplat-config")
      .then(async response => {
        if (!response.ok) return;
        const data = (await response.json()) as Partial<SuperSplatConfig>;
        if (cancelled) return;
        setConfig({
          accountUrl: data.accountUrl ?? DEFAULT_SUPER_SPLAT_URL,
          demoUrl: data.demoUrl ?? DEFAULT_SUPER_SPLAT_DEMO_URL,
          features:
            data.features && data.features.length > 0
              ? data.features
              : [...DEFAULT_SUPER_SPLAT_FEATURES],
        });
      })
      .catch(() => {
        // Keep rendering with the static defaults if the function is offline.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="py-24 md:py-32 bg-card/40 border-y border-border/40"
      aria-labelledby="supersplat-heading"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <Reveal className="max-w-3xl mb-10">
          <div
            className="text-[10px] tracking-[0.3em] uppercase text-primary mb-4 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            3D Mapping Preview
          </div>
          <h2
            id="supersplat-heading"
            className="text-4xl md:text-5xl font-semibold text-foreground mb-5 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Explore projects in interactive 3D with SuperSplat.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Rotate, zoom, and inspect a live Gaussian-splat model directly from
            our homepage. Customers can create a free SuperSplat account to
            publish and share their own scenes through this workflow.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 rounded-sm overflow-hidden border border-border/60 bg-background">
            <div className="aspect-video bg-muted">
              <iframe
                title="SuperSplat 3D mapping example"
                src={config.demoUrl}
                className="w-full h-full"
                loading="lazy"
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                allowFullScreen
              />
            </div>
          </div>

          <div className="rounded-sm border border-border/60 bg-background p-6 md:p-7">
            <h3
              className="text-2xl font-semibold text-foreground mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Get started
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed mb-6">
              {config.features.map(feature => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              <a
                href={config.accountUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors rounded-sm uppercase text-sm"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Create Free Account (Sign Up)
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href={config.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 font-medium hover:bg-muted/60 transition-colors rounded-sm uppercase text-sm"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Open Full Demo
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   TESTIMONIAL TEASER — single quote + link to full testimonials
══════════════════════════════════════════════════════════════ */
const FEATURED_TESTIMONIAL = {
  quote:
    "Eric finished our second-story addition exactly when he said he would and exactly on budget. He was on site every single day. We won't use anyone else.",
  name: "T. & K. Whitfield",
  location: "South Eugene",
  project: "Second Story Addition",
  stars: 5,
} as const;

function TestimonialTeaser() {
  return (
    <section
      className="py-24 md:py-32 bg-card/40 border-y border-border/40"
      aria-labelledby="testimonial-heading"
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger}
        className="max-w-4xl mx-auto px-6 md:px-10 text-center"
      >
        <motion.div variants={fadeUp}>
          <Quote
            className="w-12 h-12 text-primary/40 mx-auto mb-6"
            aria-hidden="true"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <div
            className="flex justify-center gap-1 mb-8"
            aria-label={`${FEATURED_TESTIMONIAL.stars} out of 5 stars`}
          >
            {Array.from({ length: FEATURED_TESTIMONIAL.stars }).map((_, i) => (
              <Star
                key={i}
                className="w-5 h-5 fill-primary text-primary"
                aria-hidden="true"
              />
            ))}
          </div>
        </motion.div>
        <motion.blockquote
          id="testimonial-heading"
          variants={fadeUp}
          className="text-2xl md:text-3xl font-medium text-foreground leading-snug mb-8"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          &ldquo;{FEATURED_TESTIMONIAL.quote}&rdquo;
        </motion.blockquote>
        <motion.div variants={fadeUp}>
          <div className="text-sm font-medium text-foreground">
            {FEATURED_TESTIMONIAL.name}
          </div>
          <div
            className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground mt-1"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {FEATURED_TESTIMONIAL.project} · {FEATURED_TESTIMONIAL.location}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   CLOSING CTA
══════════════════════════════════════════════════════════════ */
function ClosingCTA() {
  return (
    <CTABand
      eyebrow="Let's build it right"
      headline="Ready to start your project?"
      body="Whether you're planning a kitchen remodel, new construction, or just have a question — we'd love to hear about it."
      primaryHref="/contact"
      primaryLabel="Contact Us"
      variant="light"
    />
  );
}
