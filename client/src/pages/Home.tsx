/**
 * Precision Core Builders — Home Page
 * Full rebrand using real company assets, photos, video, and team content.
 * Eric Tadlock + Mitch Tadlock | CCB #246527 | Eugene, OR
 */
import { ASSETS, SITE } from "@/const";
import { motion, useInView, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Facebook,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ─── Motion config ───────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };
const staggerFast = { visible: { transition: { staggerChildren: 0.07 } } };

/* ─── Animated counter hook ──────────────────────────────────── */
function useCounter(target: number, inView: boolean) {
  const val = useMotionValue(0);
  const spring = useSpring(val, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (inView) val.set(target);
  }, [inView, target, val]);
  useEffect(() => spring.on("change", v => setDisplay(Math.round(v))), [spring]);
  return display;
}

const NAV = [
  { label: "About",    href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Team",     href: "#team" },
  { label: "Our Work", href: "#work" },
  { label: "Contact",  href: "#contact" },
];

/* ══════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <StatsBar />
        <About />
        <Services />
        <Team />
        <Work />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/95 backdrop-blur-md border-b border-border/50 shadow-lg shadow-black/20" : "bg-transparent"
      }`}
    >
      <div className="container h-[72px] flex items-center justify-between">
        {/* Logo */}
        <a href="/" aria-label="Precision Core Builders — Home">
          <img
            src={ASSETS.logo}
            alt="Precision Core Builders"
            className="h-10 w-auto"
            fetchPriority="high"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary navigation">
          {NAV.map(n => (
            <a
              key={n.label}
              href={n.href}
              className="text-[13px] font-medium tracking-[0.08em] uppercase text-muted-foreground hover:text-primary transition-colors duration-200"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="hidden sm:inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-[12px] font-bold tracking-[0.12em] uppercase transition-all duration-200 hover:bg-primary/85 hover:gap-3"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Free Estimate <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={() => setOpen(o => !o)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-card/98 backdrop-blur-md border-t border-border"
        >
          <nav className="container py-6 flex flex-col gap-1">
            {NAV.map(n => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-semibold tracking-widest uppercase text-muted-foreground hover:text-primary border-b border-border/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {n.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 text-sm font-bold tracking-widest uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Get Your Free Estimate <ArrowRight className="h-4 w-4" />
            </a>
          </nav>
        </motion.div>
      )}
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO — cinematic Ken Burns slideshow, 5 dramatic construction scenes
══════════════════════════════════════════════════════════════ */

// 5 hand-picked dramatic construction/architecture shots
// Each chosen for: golden light, scale, visual impact, Oregon-appropriate feel
const HERO_SLIDES = [
  {
    // Sweeping aerial — partially-framed luxury home at golden hour
    url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=2000&q=90",
    alt: "Luxury custom home under construction — golden hour aerial view",
    // Ken Burns: slow zoom in from center
    animation: "hero-zoom-in",
  },
  {
    // Heavy timber framing — dramatic perspective looking up through rafters
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=2000&q=90",
    alt: "Heavy timber frame construction — dramatic rafter perspective",
    // Ken Burns: slow drift right
    animation: "hero-drift-right",
  },
  {
    // Craftsman at work — carpenter precision detail shot, warm light
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=2000&q=90",
    alt: "Master carpenter precision work — warm workshop light",
    // Ken Burns: slow pull back / zoom out
    animation: "hero-zoom-out",
  },
  {
    // Finished luxury home exterior — dramatic dusk sky, all lights on
    url: "https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?auto=format&fit=crop&w=2000&q=90",
    alt: "Completed custom home at dusk — lights glowing warm",
    // Ken Burns: slow drift left
    animation: "hero-drift-left",
  },
  {
    // Interior framing — daylight streaming through window openings, dust motes
    url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=90",
    alt: "Home framing interior — light streaming through window openings",
    // Ken Burns: diagonal zoom
    animation: "hero-zoom-diagonal",
  },
] as const;

const SLIDE_DURATION = 6000; // ms each slide shows
const FADE_DURATION  = 1200; // ms crossfade

function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev]       = useState<number | null>(null);
  const [loaded, setLoaded]   = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    // Preload next slide
    const next = (current + 1) % HERO_SLIDES.length;
    if (!loaded.has(next)) {
      const img = new Image();
      img.src = HERO_SLIDES[next].url;
      img.onload = () => setLoaded(s => new Set([...s, next]));
    }

    const timer = setTimeout(() => {
      setPrev(current);
      setCurrent(n => (n + 1) % HERO_SLIDES.length);
      setTimeout(() => setPrev(null), FADE_DURATION);
    }, SLIDE_DURATION);

    return () => clearTimeout(timer);
  }, [current, loaded]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes hero-zoom-in {
          from { transform: scale(1.0) translate(0, 0); }
          to   { transform: scale(1.12) translate(0, 0); }
        }
        @keyframes hero-zoom-out {
          from { transform: scale(1.14) translate(0, 0); }
          to   { transform: scale(1.0) translate(0, 0); }
        }
        @keyframes hero-drift-right {
          from { transform: scale(1.08) translateX(-2%); }
          to   { transform: scale(1.08) translateX(2%); }
        }
        @keyframes hero-drift-left {
          from { transform: scale(1.08) translateX(2%); }
          to   { transform: scale(1.08) translateX(-2%); }
        }
        @keyframes hero-zoom-diagonal {
          from { transform: scale(1.0) translate(1%, 1%); }
          to   { transform: scale(1.13) translate(-1%, -1%); }
        }
        .hero-slide-img {
          animation-timing-function: linear;
          animation-fill-mode: both;
          will-change: transform;
        }
      `}</style>

      {/* Outgoing slide — fades out */}
      {prev !== null && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: 0, transitionDuration: `${FADE_DURATION}ms` }}
        >
          <img
            src={HERO_SLIDES[prev].url}
            alt=""
            className={`hero-slide-img w-full h-full object-cover`}
            style={{
              animationName: HERO_SLIDES[prev].animation,
              animationDuration: `${SLIDE_DURATION + FADE_DURATION}ms`,
            }}
          />
        </div>
      )}

      {/* Current slide — fades in */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          opacity: 1,
          transitionDuration: `${FADE_DURATION}ms`,
          transitionTimingFunction: "ease-in-out",
        }}
      >
        <img
          key={current}
          src={HERO_SLIDES[current].url}
          alt={HERO_SLIDES[current].alt}
          className={`hero-slide-img w-full h-full object-cover`}
          style={{
            animationName: HERO_SLIDES[current].animation,
            animationDuration: `${SLIDE_DURATION + FADE_DURATION}ms`,
          }}
          fetchPriority={current === 0 ? "high" : "auto"}
        />
      </div>

      {/* Dot indicators — bottom center, subtle */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPrev(current); setCurrent(i); }}
            aria-label={`Go to slide ${i + 1}`}
            className={`transition-all duration-500 rounded-full ${
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
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden" aria-label="Hero">
      {/* CINEMATIC SLIDESHOW */}
      <HeroSlideshow />

      {/* Multi-layer gradient — bottom dark pool for text, left vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/25 to-transparent pointer-events-none" aria-hidden />
      {/* Top fade so nav reads cleanly */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-background/60 to-transparent pointer-events-none" aria-hidden />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      {/* CONTENT */}
      <motion.div style={{ y: textY, opacity }} className="container relative z-10 pt-[72px]">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-4xl"
        >
          {/* Eyebrow */}
          <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
            <div className="h-px w-12 bg-primary" aria-hidden />
            <span
              className="text-primary text-[11px] tracking-[0.3em] uppercase font-semibold"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Eugene, Oregon &nbsp;·&nbsp; {SITE.license}
            </span>
          </motion.div>

          {/* Main headline — 3 lines for dramatic weight */}
          <motion.h1
            variants={fadeUp}
            className="leading-[0.95] tracking-tight mb-8"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <span className="block text-5xl sm:text-6xl lg:text-[82px] font-semibold text-foreground">
              Precision
            </span>
            <span className="block text-5xl sm:text-6xl lg:text-[82px] font-semibold text-foreground">
              Construction,
            </span>
            <span className="block text-5xl sm:text-6xl lg:text-[82px] font-semibold italic text-primary">
              Core Values.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed font-light mb-10"
          >
            Two veteran brothers and a combined 38 years of hands-on experience,
            building and restoring homes across the Eugene area with the kind of
            craftsmanship that shows for decades.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-sm font-bold tracking-[0.12em] uppercase hover:bg-primary/90 transition-all duration-200 hover:gap-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Get Your Free Estimate <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#work"
              className="inline-flex items-center justify-center gap-2 border border-foreground/25 text-foreground px-8 py-4 text-sm font-semibold tracking-[0.12em] uppercase hover:border-primary hover:text-primary transition-all duration-200"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              See Our Work
            </a>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/60"
        aria-hidden
      >
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </motion.div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   STATS BAR — real numbers, animated counters
══════════════════════════════════════════════════════════════ */
const STATS = [
  { value: 20, suffix: "",   label: "Years Construction Experience" },
  { value: 12, suffix: "",   label: "Years Business Experience" },
  { value: 50, suffix: "+",  label: "Happy Customers" },
  { value: 0,  suffix: "",   label: "Call Backs" },
] as const;

function StatCell({ value, suffix, label }: typeof STATS[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useCounter(value, inView);
  return (
    <div ref={ref} className="py-10 px-6 text-center">
      <div
        className="text-4xl sm:text-5xl font-bold text-primary mb-2 tabular-nums"
        style={{ fontFamily: "var(--font-heading)" }}
        aria-label={`${value}${suffix}`}
      >
        {count}{suffix}
      </div>
      <div
        className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground leading-tight"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        {label}
      </div>
    </div>
  );
}

function StatsBar() {
  return (
    <section className="border-y border-border/50 bg-card/70" aria-label="Company credentials">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/40">
          {STATS.map(s => <StatCell key={s.label} {...s} />)}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   ABOUT — real company copy, two-column with accent elements
══════════════════════════════════════════════════════════════ */
function About() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="about" className="py-28 sm:py-36" ref={ref} aria-labelledby="about-heading">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center">
          {/* Left — stacked text with gold accent rule */}
          <motion.div
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-5"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              About Us
            </motion.span>
            <motion.h2
              id="about-heading"
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.0] mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Reliable Hands
            </motion.h2>
            <motion.h2
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.0] italic text-primary mb-8"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Crafting Your World.
            </motion.h2>

            {/* Gold rule */}
            <motion.div variants={fadeUp} className="gold-rule mb-8" aria-hidden />

            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed text-base font-light mb-5">
              Precision Core Builders represents a new standard in Eugene's construction
              landscape — built on trust, respect, diligence, and over 20 years of
              hands-on industry experience.
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed text-base font-light mb-5">
              Founded by two veteran construction brothers and a seasoned business
              professional, we bring the kind of exceptional service to our neighbors
              that only comes from genuine craftsmanship and community commitment.
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed text-base font-light mb-10">
              Our roots run deep in Eugene. Together, we&apos;re building a stronger,
              more beautiful, and more efficient community — one project at a time.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
              {[
                { icon: Shield, text: SITE.license },
                { icon: MapPin, text: SITE.location },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" aria-hidden />
                  <span>{text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — values grid */}
          <motion.div
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={stagger}
            className="grid grid-cols-1 gap-4"
          >
            {[
              {
                title: "Trust",
                body: "You know where your project stands at every stage. We document every decision, every cost, and every milestone — no surprises, no runaround.",
              },
              {
                title: "Respect",
                body: "Your home is your most important investment. We treat every project with the same care we'd give our own — because your standards deserve nothing less.",
              },
              {
                title: "Diligence",
                body: "We show up on time, work clean, and don't cut corners. Every phase is completed to Oregon code standards and beyond, every single time.",
              },
            ].map((v, i) => (
              <motion.div
                key={v.title}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="group flex gap-5 p-6 bg-card border border-border/60 hover:border-primary/30 transition-colors duration-300"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 flex items-center justify-center border border-primary/40 group-hover:border-primary group-hover:bg-primary/5 transition-colors duration-300">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                </div>
                <div>
                  <h3
                    className="text-base font-bold tracking-[0.06em] uppercase mb-2 text-foreground"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {v.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">{v.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   SERVICES — all 8 real service photos
══════════════════════════════════════════════════════════════ */
const SERVICES = [
  {
    title: "Residential",
    desc: "With over 20 years of hands-on experience, our lead carpenters have honed their skills across every dimension of residential construction — from foundations to final finish.",
    photo: ASSETS.services.residential,
    href: "/services/residential",
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

function Services() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section id="services" className="py-28 sm:py-36 bg-card/30" ref={ref} aria-labelledby="services-heading">
      <div className="container">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="mb-16"
        >
          <motion.span
            variants={fadeUp}
            className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Construction Services
          </motion.span>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <motion.h2
              id="services-heading"
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Diverse Services,{" "}
              <em className="text-primary italic">Consistent Quality.</em>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground font-light max-w-xs leading-relaxed text-sm sm:text-right">
              Eight specialties, one standard of excellence.
            </motion.p>
          </div>
        </motion.div>

        {/* 8-service grid — 4 cols desktop, 2 tablet, 1 mobile */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map((s, i) => (
            <motion.article
              key={s.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeIn}
              transition={{ delay: i * 0.06 }}
              className="group relative overflow-hidden cursor-pointer"
            >
              {/* Photo */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={s.photo}
                  alt={`${s.title} — Precision Core Builders`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                {/* Always-on gradient bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />

                {/* Content pinned to bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3
                    className="text-base font-bold tracking-[0.05em] uppercase text-foreground mb-2 leading-tight"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {s.title}
                  </h3>
                  {/* Description slides up on hover */}
                  <div className="overflow-hidden h-0 group-hover:h-auto transition-all duration-300">
                    <p className="text-[12px] text-muted-foreground leading-relaxed font-light pb-3">
                      {s.desc}
                    </p>
                    <a
                      href="#contact"
                      className="inline-flex items-center gap-1 text-primary text-[11px] tracking-widest uppercase font-semibold"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Get Estimate <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                  {/* Gold line accent */}
                  <div className="h-px bg-primary/60 group-hover:bg-primary transition-colors duration-300 mt-2" aria-hidden />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   TEAM — real headshots, real bios
══════════════════════════════════════════════════════════════ */
const TEAM = [
  {
    name: "Eric Tadlock",
    role: "Lead Carpenter & Owner",
    bio: "A seasoned carpenter with over 20 years of hands-on construction experience. Eric's craftsmanship lies at the heart of every high-quality project we deliver — from framing to finish.",
    photo: ASSETS.team.eric,
    phone: SITE.phone,
    phoneHref: SITE.phoneHref,
  },
  {
    name: "Mitch Tadlock",
    role: "Lead Carpenter",
    bio: "Eric's brother and veteran carpenter, Mitch brings 18 years of innovation and skilled craftsmanship to the family's construction legacy. His attention to detail sets the standard on every site.",
    photo: ASSETS.team.mitch,
  },
] as const;

function Team() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section id="team" className="py-28 sm:py-36" ref={ref} aria-labelledby="team-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="mb-16 text-center"
        >
          <motion.span
            variants={fadeUp}
            className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Our Team
          </motion.span>
          <motion.h2
            id="team-heading"
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Focused Team,{" "}
            <em className="text-primary italic">Unmatched Ability.</em>
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TEAM.map((member, i) => (
            <motion.div
              key={member.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              transition={{ delay: i * 0.14 }}
              className="group"
            >
              {/* Headshot */}
              <div className="relative aspect-[3/4] overflow-hidden mb-5">
                <img
                  src={member.photo}
                  alt={`${member.name} — ${member.role}`}
                  className="w-full h-full object-cover object-top group-hover:scale-103 transition-transform duration-700"
                  loading="lazy"
                />
                {/* Subtle gold border bottom on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left" aria-hidden />
              </div>

              {/* Info */}
              <div>
                <h3
                  className="text-lg font-bold tracking-[0.04em] uppercase text-foreground leading-tight"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {member.name}
                </h3>
                <p
                  className="text-primary text-[11px] tracking-widest uppercase font-semibold mt-1 mb-3"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {member.role}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed font-light mb-4">
                  {member.bio}
                </p>

                {/* Contact links if present */}
                <div className="flex flex-col gap-1.5">
                  {"phone" in member && (
                    <a
                      href={member.phoneHref}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {member.phone}
                    </a>
                  )}
                  {"email" in member && (
                    <a
                      href={member.emailHref}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors truncate"
                    >
                      <Mail className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden />
                      {member.email}
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   OUR WORK — all 12 real portfolio photos, magazine masonry layout
══════════════════════════════════════════════════════════════ */
function Work() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  // Layout: asymmetric grid — col 1: tall, col 2: two squares, col 3: tall (repeated)
  const photos = ASSETS.portfolio;

  return (
    <section id="work" className="py-28 sm:py-36 bg-card/30" ref={ref} aria-labelledby="work-heading">
      <div className="container">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14"
        >
          <div>
            <motion.span
              variants={fadeUp}
              className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Our Work
            </motion.span>
            <motion.h2
              id="work-heading"
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Built in Eugene.{" "}
              <em className="text-primary italic">Built to last.</em>
            </motion.h2>
          </div>
          <motion.a
            variants={fadeUp}
            href="/portfolio"
            className="flex items-center gap-2 text-[12px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            View Full Portfolio <ArrowRight className="h-4 w-4" />
          </motion.a>
        </motion.div>

        {/* Masonry-style grid — 3 columns, alternating heights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Col span tricks for magazine feel */}
          {photos.slice(0, 12).map((src, i) => {
            // Positions 0, 5, 8 get tall treatment (row-span-2)
            const isTall = [0, 5, 8].includes(i);
            return (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={fadeIn}
                transition={{ delay: i * 0.04 }}
                className={`group relative overflow-hidden ${isTall ? "row-span-2" : ""}`}
              >
                <div className={`relative overflow-hidden ${isTall ? "h-full min-h-[320px]" : "aspect-square"}`}>
                  <img
                    src={src}
                    alt={`Precision Core Builders project ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-400 mix-blend-multiply" />
                  <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/40 transition-colors duration-400" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   CONTACT — real phone, email, functional Netlify Form
══════════════════════════════════════════════════════════════ */
type FormStatus = "idle" | "submitting" | "success" | "error";

function Contact() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fields, setFields] = useState({
    name: "", email: "", phone: "", projectType: "", budget: "", message: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const data = new FormData(e.currentTarget);
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      });
      setStatus(res.ok ? "success" : "error");
      if (res.ok) setFields({ name: "", email: "", phone: "", projectType: "", budget: "", message: "" });
    } catch { setStatus("error"); }
  };

  const inputCls =
    "w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors duration-200";

  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="contact" className="py-28 sm:py-36" ref={ref} aria-labelledby="contact-heading">
      <div className="container">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16 items-start">

          {/* Left — info */}
          <motion.div
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-5"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Contact Us
            </motion.span>
            <motion.h2
              id="contact-heading"
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-semibold leading-tight mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Let&apos;s Build
            </motion.h2>
            <motion.h2
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-semibold leading-tight italic text-primary mb-8"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Something Remarkable.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed font-light mb-10 text-base">
              Call Eric directly, send an email, or fill out the form. We come
              to your site for a free consultation before anything else — because
              every project deserves a real look before a real number.
            </motion.p>

            <motion.div variants={stagger} className="space-y-0">
              {[
                { icon: Phone, label: "Call Direct",  value: SITE.phone, href: SITE.phoneHref },
                { icon: Mail,  label: "Email",        value: SITE.email, href: SITE.emailHref },
                { icon: MapPin,label: "Service Area", value: "Eugene, Springfield & Lane County", href: undefined },
                { icon: Shield,label: "Oregon CCB",   value: SITE.license, href: undefined },
              ].map(({ icon: Icon, label, value, href }) => (
                <motion.div
                  key={label}
                  variants={fadeUp}
                  className="flex items-start gap-4 py-5 border-b border-border/40 group"
                >
                  <div className="h-10 w-10 border border-primary/30 flex items-center justify-center flex-shrink-0 group-hover:border-primary group-hover:bg-primary/5 transition-colors duration-200 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                  <div>
                    <div
                      className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/60 mb-1 font-medium"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {label}
                    </div>
                    {href ? (
                      <a href={href} className="text-sm text-foreground hover:text-primary transition-colors">
                        {value}
                      </a>
                    ) : (
                      <span className="text-sm text-foreground">{value}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={fadeUp}
          >
            <div className="bg-card border border-border/60 p-8 sm:p-10">
              {status === "success" ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 border border-primary/50 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden />
                  </div>
                  <h3
                    className="text-2xl font-semibold mb-3"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Message received.
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    We&apos;ll be in touch within one business day.
                  </p>
                </div>
              ) : (
                <>
                  <h3
                    className="text-xl font-semibold mb-1"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Get Your Free Estimate
                  </h3>
                  <p className="text-sm text-muted-foreground mb-8 font-light">
                    No obligation. We come to you.
                  </p>

                  <form
                    name="project-inquiry"
                    method="POST"
                    data-netlify="true"
                    netlify-honeypot="bot-field"
                    onSubmit={onSubmit}
                    className="space-y-4"
                    aria-label="Project inquiry form"
                  >
                    <input type="hidden" name="form-name" value="project-inquiry" />
                    <p className="hidden" aria-hidden>
                      <label>Skip: <input name="bot-field" tabIndex={-1} /></label>
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Full Name <span className="text-primary" aria-hidden>*</span>
                        </label>
                        <input id="name" name="name" type="text" required autoComplete="name"
                          value={fields.name} onChange={onChange}
                          className={inputCls} placeholder="Jane Smith" />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Email <span className="text-primary" aria-hidden>*</span>
                        </label>
                        <input id="email" name="email" type="email" required autoComplete="email"
                          value={fields.email} onChange={onChange}
                          className={inputCls} placeholder="jane@email.com" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Phone
                        </label>
                        <input id="phone" name="phone" type="tel" autoComplete="tel"
                          value={fields.phone} onChange={onChange}
                          className={inputCls} placeholder="(541) 555-0100" />
                      </div>
                      <div>
                        <label
                          htmlFor="projectType"
                          className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Project Type <span className="text-primary" aria-hidden>*</span>
                        </label>
                        <select id="projectType" name="projectType" required
                          value={fields.projectType} onChange={onChange} className={inputCls}>
                          <option value="">Select…</option>
                          <option value="residential">Residential</option>
                          <option value="remodel">Remodel / Renovation</option>
                          <option value="new-construction">New Construction</option>
                          <option value="restoration">Restoration</option>
                          <option value="outdoor">Outdoor / Decking</option>
                          <option value="roofing">Roofing</option>
                          <option value="painting">Painting</option>
                          <option value="cabinets">Custom Cabinets</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="budget"
                        className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Approximate Budget
                      </label>
                      <select id="budget" name="budget"
                        value={fields.budget} onChange={onChange} className={inputCls}>
                        <option value="">Prefer not to say</option>
                        <option value="under-25k">Under $25,000</option>
                        <option value="25-75k">$25,000 – $75,000</option>
                        <option value="75-200k">$75,000 – $200,000</option>
                        <option value="200-500k">$200,000 – $500,000</option>
                        <option value="500k-plus">$500,000+</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Project Description <span className="text-primary" aria-hidden>*</span>
                      </label>
                      <textarea id="message" name="message" required rows={4}
                        value={fields.message} onChange={onChange}
                        className={`${inputCls} resize-none`}
                        placeholder="Tell us about your project — what you're building, where it is, and any timeline or specific requirements…" />
                    </div>

                    {status === "error" && (
                      <p className="text-sm text-destructive" role="alert">
                        Something went wrong. Please call us at{" "}
                        <a href={SITE.phoneHref} className="underline">{SITE.phone}</a>.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      aria-busy={status === "submitting"}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 text-sm font-bold tracking-[0.12em] uppercase hover:bg-primary/90 disabled:opacity-60 transition-all duration-200 hover:gap-3"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {status === "submitting" ? "Sending…" : <>Send Inquiry <ArrowRight className="h-4 w-4" /></>}
                    </button>

                    <p className="text-[11px] text-muted-foreground/60 text-center font-light pt-1">
                      Free consultation · No obligation · Licensed &amp; insured · {SITE.license}
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/40">
      <div className="container py-12">
        <div className="grid sm:grid-cols-[auto_1fr_auto] gap-8 items-start">
          {/* Logo */}
          <div>
            <img
              src={ASSETS.logo}
              alt="Precision Core Builders"
              className="h-9 w-auto mb-3"
            />
            <p
              className="text-[10px] tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {SITE.license} · Eugene, Oregon
            </p>
          </div>

          {/* Nav */}
          <nav
            className="flex flex-wrap gap-x-8 gap-y-2 sm:justify-center sm:pt-1"
            aria-label="Footer navigation"
          >
            {[...NAV, { label: "Portfolio", href: "/portfolio" }].map(n => (
              <a
                key={n.label}
                href={n.href}
                className="text-[11px] tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {n.label}
              </a>
            ))}
          </nav>

          {/* Contact */}
          <div className="flex flex-col gap-2 text-right">
            <a
              href={SITE.phoneHref}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {SITE.phone}
            </a>
            <a
              href={SITE.emailHref}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {SITE.email}
            </a>
            <a
              href={SITE.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Precision Core Builders on Facebook"
              className="flex items-center justify-end gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Facebook className="h-4 w-4" />
              <span className="text-xs" style={{ fontFamily: "var(--font-condensed)" }}>
                Facebook
              </span>
            </a>
          </div>
        </div>

        <div className="gold-rule my-8" aria-hidden />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground/60">
          <p>&copy; {new Date().getFullYear()} Precision Core Builders. All rights reserved.</p>
          <p
            className="tracking-widest uppercase"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Powered by Precision Core
          </p>
        </div>
      </div>
    </footer>
  );
}
