/**
 * Precision Core Builders — Home Page
 * Pure construction company site. No AI references, no tech buzzwords.
 * Eric Tadlock — 20+ years, CCB #246527, Eugene, Oregon.
 */
import { Button } from "@/components/ui/button";
import { SITE } from "@/const";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

/* ─── Animation presets ─────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.13 } } };
const fadeIn  = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const NAV = ["Services", "Work", "About", "Contact"];

/* ─── Photo URLs ─────────────────────────────────────────────────
 * High-quality Unsplash stock — replace with Eric's real project
 * photos once available. All photos are free to use.
 */
const PHOTOS = {
  hero:     "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1920&q=85",
  customHome: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
  remodel:  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  addition: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80",
  about:    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80",
  port1:    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  port2:    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
  port3:    "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=800&q=80",
  port4:    "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?auto=format&fit=crop&w=800&q=80",
  port5:    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=800&q=80",
  port6:    "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
} as const;

/* ══════════════════════════════════════════════════════════════════
   PAGE ROOT
══════════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Services />
        <Work />
        <About />
        <Process />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════════════════ */
function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="container h-[68px] flex items-center justify-between">
        {/* Logo */}
        <a href="/" aria-label="Precision Core Builders home" className="flex items-center gap-3 group">
          {/* Hex logo — mirrors business card */}
          <svg width="32" height="36" viewBox="0 0 32 36" fill="none" aria-hidden>
            <path
              d="M16 1L30 9V27L16 35L2 27V9L16 1Z"
              fill="#C8A84B"
              fillOpacity="0.12"
              stroke="#C8A84B"
              strokeWidth="1.5"
            />
            <text
              x="16" y="22"
              textAnchor="middle"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="700"
              fontSize="13"
              fill="#C8A84B"
            >
              PCB
            </text>
          </svg>
          <div>
            <span className="block text-sm font-semibold tracking-wide text-foreground leading-tight"
              style={{ fontFamily: "var(--font-condensed)" }}>
              PRECISION CORE BUILDERS
            </span>
            <span className="block text-[10px] text-primary tracking-widest uppercase leading-tight">
              {SITE.license}
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {NAV.map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium tracking-wide text-muted-foreground hover:text-primary transition-colors duration-200"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide"
            style={{ fontFamily: "var(--font-condensed)" }}
            asChild
          >
            <a href="#contact">FREE ESTIMATE</a>
          </Button>
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-md">
          <nav className="container py-6 flex flex-col gap-2" aria-label="Mobile navigation">
            {NAV.map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setOpen(false)}
                className="py-3 text-base font-medium tracking-widest uppercase text-muted-foreground hover:text-primary border-b border-border/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {item}
              </a>
            ))}
            <Button className="mt-4 w-full bg-primary text-primary-foreground font-semibold" asChild>
              <a href="#contact" onClick={() => setOpen(false)}>FREE ESTIMATE</a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO — cinematic full-bleed photo, parallax scroll
══════════════════════════════════════════════════════════════════ */
function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-end pb-20 pt-[68px] overflow-hidden"
      aria-label="Hero"
    >
      {/* Parallax photo */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 scale-110"
        aria-hidden
      >
        <img
          src={PHOTOS.hero}
          alt="Construction framing at dusk — Precision Core Builders"
          className="w-full h-full object-cover"
          fetchPriority="high"
        />
        {/* Layered gradient — dark bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
      </motion.div>

      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      {/* Content */}
      <div className="container relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-3xl"
        >
          {/* Eyebrow */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-7">
            <div className="h-px w-10 bg-primary" aria-hidden />
            <span
              className="text-primary text-xs tracking-[0.25em] uppercase font-medium"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Eugene, Oregon &nbsp;·&nbsp; Est. 2004
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.0] tracking-tight mb-7"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Built right.
            <br />
            <em className="text-primary not-italic">Built to last.</em>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed mb-10 font-light"
          >
            Twenty years of precision construction in the Eugene area — custom
            homes, full remodels, and additions built to Oregon code and beyond.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm px-8 font-semibold tracking-wider"
              style={{ fontFamily: "var(--font-condensed)" }}
              asChild
            >
              <a href="#contact">
                REQUEST A FREE ESTIMATE
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-foreground/20 text-foreground hover:bg-foreground/5 text-sm px-8 tracking-wider"
              style={{ fontFamily: "var(--font-condensed)" }}
              asChild
            >
              <a href="#work">VIEW OUR WORK</a>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
        aria-hidden
      >
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </motion.div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STATS BAND
══════════════════════════════════════════════════════════════════ */
const STATS = [
  { value: "20+", label: "Years in Business" },
  { value: "200+", label: "Projects Completed" },
  { value: "CCB\u00a0#246527", label: "Oregon Licensed" },
  { value: "Eugene", label: "Locally Rooted" },
] as const;

function Stats() {
  return (
    <section className="border-y border-border/60 bg-card/60" aria-label="Company statistics">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/40">
          {STATS.map(({ value, label }) => (
            <motion.div
              key={label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="py-10 px-6 text-center"
            >
              <div
                className="text-3xl sm:text-4xl font-semibold text-primary mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {value}
              </div>
              <div
                className="text-xs tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SERVICES
══════════════════════════════════════════════════════════════════ */
const SERVICES = [
  {
    num: "01",
    title: "Custom Home Builds",
    body: "From foundation to final finish, we manage every stage of your new home construction. We coordinate permits, subcontractors, materials, and inspections — so you get the home you envisioned, on time and on budget.",
    photo: PHOTOS.customHome,
    alt: "Custom luxury home exterior — Precision Core Builders",
  },
  {
    num: "02",
    title: "Full Remodels & Renovations",
    body: "Kitchens, bathrooms, whole-home renovations. We strip it down and rebuild it right — new framing where needed, proper insulation, updated electrical and plumbing, and finish work that holds up for decades.",
    photo: PHOTOS.remodel,
    alt: "Luxury kitchen remodel — Precision Core Builders",
  },
  {
    num: "03",
    title: "Additions & ADUs",
    body: "Second stories, room additions, attached or detached accessory dwelling units. We tie new construction seamlessly into your existing structure, matching materials and meeting every Oregon code requirement.",
    photo: PHOTOS.addition,
    alt: "Home addition — Precision Core Builders",
  },
] as const;

function Services() {
  return (
    <section id="services" className="py-28 sm:py-36" aria-labelledby="services-heading">
      <div className="container">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-xl mb-20"
        >
          <motion.span
            variants={fadeUp}
            className="block text-primary text-xs tracking-[0.25em] uppercase mb-4 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            What We Build
          </motion.span>
          <motion.h2
            id="services-heading"
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-semibold leading-tight mb-5"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Decades of craft.<br />
            <em className="text-primary">One standard.</em>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg leading-relaxed font-light">
            Every project we take on gets the same level of care — whether
            it&apos;s a kitchen remodel or a ground-up custom home.
          </motion.p>
        </motion.div>

        {/* Service cards */}
        <div className="space-y-6">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.num}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              className={`group grid md:grid-cols-2 gap-0 rounded-sm overflow-hidden border border-border/60 hover:border-primary/30 transition-colors duration-500 ${
                i % 2 === 1 ? "md:[direction:rtl]" : ""
              }`}
            >
              {/* Photo */}
              <div className="relative h-72 md:h-auto overflow-hidden" style={i % 2 === 1 ? { direction: "ltr" } : {}}>
                <img
                  src={s.photo}
                  alt={s.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-background/20 group-hover:bg-background/10 transition-colors duration-500" />
              </div>

              {/* Text */}
              <div
                className="flex flex-col justify-center p-10 sm:p-14 bg-card"
                style={i % 2 === 1 ? { direction: "ltr" } : {}}
              >
                <span
                  className="text-primary/40 text-5xl font-bold mb-4 leading-none select-none"
                  style={{ fontFamily: "var(--font-condensed)" }}
                  aria-hidden
                >
                  {s.num}
                </span>
                <h3
                  className="text-3xl sm:text-4xl font-semibold mb-5"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {s.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base font-light max-w-md">
                  {s.body}
                </p>
                <div className="mt-8">
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all duration-200 group/link"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <span className="tracking-wider uppercase">Discuss your project</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WORK — PORTFOLIO GRID
══════════════════════════════════════════════════════════════════ */
const PORTFOLIO = [
  { photo: PHOTOS.port1, title: "South Hills Custom Home",   cat: "Custom Build",  sf: "3,200 sq ft" },
  { photo: PHOTOS.port2, title: "River Road Kitchen & Bath", cat: "Renovation",    sf: "850 sq ft"   },
  { photo: PHOTOS.port3, title: "Crest Drive Addition",      cat: "Addition",      sf: "1,100 sq ft" },
  { photo: PHOTOS.port4, title: "Friendly Area ADU",         cat: "ADU",           sf: "640 sq ft"   },
  { photo: PHOTOS.port5, title: "Thurston Craftsman Remodel",cat: "Full Remodel",  sf: "1,900 sq ft" },
  { photo: PHOTOS.port6, title: "West Eugene Custom Home",   cat: "Custom Build",  sf: "4,100 sq ft" },
] as const;

function Work() {
  return (
    <section id="work" className="py-28 sm:py-36 bg-card/30" aria-labelledby="work-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14"
        >
          <div>
            <motion.span
              variants={fadeUp}
              className="block text-primary text-xs tracking-[0.25em] uppercase mb-4 font-medium"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Recent Work
            </motion.span>
            <motion.h2
              id="work-heading"
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Projects we&apos;re<br />
              <em className="text-primary">proud to stand behind.</em>
            </motion.h2>
          </div>
          <motion.div variants={fadeUp}>
            <Button
              variant="outline"
              className="border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 tracking-wider text-xs"
              style={{ fontFamily: "var(--font-condensed)" }}
              asChild
            >
              <a href="/portfolio">VIEW FULL PORTFOLIO →</a>
            </Button>
          </motion.div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PORTFOLIO.map((p, i) => (
            <motion.article
              key={p.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeIn}
              transition={{ delay: i * 0.08 }}
              className="group relative aspect-[4/3] overflow-hidden rounded-sm cursor-pointer"
              aria-label={p.title}
            >
              <img
                src={p.photo}
                alt={`${p.title} — Precision Core Builders`}
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                loading="lazy"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
              <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                <span
                  className="block text-primary text-[10px] tracking-[0.2em] uppercase mb-1"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {p.cat} &nbsp;·&nbsp; {p.sf}
                </span>
                <h3
                  className="text-white text-xl font-semibold"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {p.title}
                </h3>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ABOUT ERIC
══════════════════════════════════════════════════════════════════ */
function About() {
  return (
    <section id="about" className="py-28 sm:py-36" aria-labelledby="about-heading">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Photo */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative aspect-[4/5] rounded-sm overflow-hidden">
              <img
                src={PHOTOS.about}
                alt="New home construction — Precision Core Builders"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
            </div>
            {/* Gold corner accent */}
            <div
              className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-primary opacity-40 rounded-sm"
              aria-hidden
            />
            <div
              className="absolute -top-4 -left-4 w-16 h-16 border-t-2 border-l-2 border-primary opacity-40 rounded-sm"
              aria-hidden
            />
            {/* License badge */}
            <div className="absolute top-5 left-5 bg-background/90 backdrop-blur-sm border border-primary/30 rounded-sm px-4 py-3">
              <div
                className="text-primary text-[10px] tracking-widest uppercase font-medium"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Oregon Licensed
              </div>
              <div
                className="text-foreground text-sm font-semibold"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {SITE.license}
              </div>
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="block text-primary text-xs tracking-[0.25em] uppercase mb-4 font-medium"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              About Eric
            </motion.span>
            <motion.h2
              id="about-heading"
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-semibold leading-tight mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Twenty years
              <br />
              <em className="text-primary">behind the hammer.</em>
            </motion.h2>

            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-5 font-light text-base">
              Eric Tadlock has been building in the Eugene area since 2004. What
              started as a deep respect for the craft has grown into one of
              the valley&apos;s most trusted residential construction companies.
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-5 font-light text-base">
              Every home Eric builds or remodels carries the same level of
              attention — from the footings to the finish trim. He knows Oregon
              codes inside out, works directly with homeowners from day one, and
              doesn&apos;t hand off the important decisions to anyone else.
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-10 font-light text-base">
              Precision Core Builders is a small operation by design. That keeps
              the quality where it belongs — on your project.
            </motion.p>

            {/* Credentials */}
            <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Shield, label: SITE.license },
                { icon: MapPin, label: "Eugene, Oregon" },
                { icon: Phone, label: SITE.phone, href: SITE.phoneHref },
                { icon: Mail,  label: SITE.email,  href: SITE.emailHref },
              ].map(({ icon: Icon, label, href }) => (
                <div key={label} className="flex items-center gap-3 py-3 border-b border-border/40">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" aria-hidden />
                  {href ? (
                    <a
                      href={href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors truncate"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">{label}</span>
                  )}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROCESS
══════════════════════════════════════════════════════════════════ */
const STEPS = [
  {
    num: "01",
    title: "We Listen",
    body: "We start with a free on-site consultation. You walk us through the project, we ask the right questions, and we get a real understanding of what you want built and what it will actually cost.",
  },
  {
    num: "02",
    title: "We Plan",
    body: "You get a detailed written estimate, a clear scope of work, and a realistic timeline. No surprises. Oregon permitting, subcontractor scheduling, and material lead times are all accounted for before we break ground.",
  },
  {
    num: "03",
    title: "We Build",
    body: "We show up when we say we will. You hear from us consistently throughout construction — site updates, photo documentation, and direct access to Eric. The job isn't done until everything is right.",
  },
] as const;

function Process() {
  return (
    <section className="py-28 sm:py-36 bg-card/30" aria-labelledby="process-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-20 max-w-2xl mx-auto"
        >
          <motion.span
            variants={fadeUp}
            className="block text-primary text-xs tracking-[0.25em] uppercase mb-4 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            How We Work
          </motion.span>
          <motion.h2
            id="process-heading"
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-semibold mb-5"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Straightforward from<br />
            <em className="text-primary">start to finish.</em>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg font-light leading-relaxed">
            No runaround, no hidden surprises. Just clear communication and
            honest work every step of the way.
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              transition={{ delay: i * 0.12 }}
              className="relative bg-card border border-border/60 rounded-sm p-10 hover:border-primary/30 transition-colors duration-400"
            >
              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:block absolute top-14 -right-3 w-6 h-px bg-primary/30"
                  aria-hidden
                />
              )}
              <span
                className="block text-6xl font-bold text-primary/15 mb-5 leading-none select-none"
                style={{ fontFamily: "var(--font-condensed)" }}
                aria-hidden
              >
                {step.num}
              </span>
              <h3
                className="text-2xl font-semibold mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm font-light">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════════════════ */
const TESTIMONIALS = [
  {
    quote:
      "Eric finished our second-story addition exactly when he said he would and exactly on budget. He was on site every single day and was straight with us the whole way through. We won't use anyone else.",
    name: "T. & K. Whitfield",
    project: "Second Story Addition, South Eugene",
  },
  {
    quote:
      "We've done two projects with Precision Core Builders now — a kitchen remodel and a bathroom. The quality of work is exceptional. Eric's crew takes real pride in what they do. You can see it in every detail.",
    name: "M. Larson",
    project: "Kitchen & Bathroom Remodel, River Road",
  },
  {
    quote:
      "We went with Eric because he actually came out, looked at everything, and gave us a real number. Other contractors were throwing estimates around without even seeing the site. Night and day difference.",
    name: "P. & D. Okonkwo",
    project: "Home Addition, Thurston",
  },
] as const;

function Testimonials() {
  return (
    <section className="py-28 sm:py-36" aria-labelledby="testimonials-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeUp}
            className="block text-primary text-xs tracking-[0.25em] uppercase mb-4 font-medium"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Client Voices
          </motion.span>
          <motion.h2
            id="testimonials-heading"
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            What homeowners say.
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.blockquote
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border/60 rounded-sm p-8 flex flex-col hover:border-primary/20 transition-colors duration-400"
            >
              {/* Gold quote mark */}
              <div
                className="text-6xl text-primary/30 leading-none mb-4 select-none"
                style={{ fontFamily: "var(--font-heading)" }}
                aria-hidden
              >
                &ldquo;
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-light flex-1">
                {t.quote}
              </p>
              <footer className="border-t border-border/40 pt-5">
                <div className="text-foreground text-sm font-semibold">{t.name}</div>
                <div
                  className="text-primary text-[10px] tracking-widest uppercase mt-1"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {t.project}
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CONTACT
══════════════════════════════════════════════════════════════════ */
type FormStatus = "idle" | "submitting" | "success" | "error";

function Contact() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fields, setFields] = useState({
    name: "", email: "", phone: "", projectType: "", budget: "", message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setFields(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const inputCls = "w-full px-4 py-3 rounded-sm border border-border bg-input text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-shadow";

  return (
    <section id="contact" className="py-28 sm:py-36 bg-card/30" aria-labelledby="contact-heading">
      <div className="container">
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-16 items-start">

          {/* Left — info */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="block text-primary text-xs tracking-[0.25em] uppercase mb-4 font-medium"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Get in Touch
            </motion.span>
            <motion.h2
              id="contact-heading"
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-semibold leading-tight mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Ready to start<br />
              <em className="text-primary">your project?</em>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base leading-relaxed font-light mb-10">
              Call Eric directly, send an email, or fill out the form. We get
              back to every inquiry within one business day and come out for a
              free on-site consultation before anything else.
            </motion.p>

            <motion.div variants={stagger} className="space-y-6">
              {[
                { icon: Phone, label: "Call or text",       value: SITE.phone, href: SITE.phoneHref },
                { icon: Mail,  label: "Email",              value: SITE.email, href: SITE.emailHref },
                { icon: MapPin,label: "Service area",       value: "Eugene, Springfield & surrounding Lane County" },
                { icon: Shield,label: "Oregon CCB License", value: SITE.license },
              ].map(({ icon: Icon, label, value, href }) => (
                <motion.div
                  key={label}
                  variants={fadeUp}
                  className="flex items-start gap-4 pb-6 border-b border-border/40 last:border-0"
                >
                  <div className="h-9 w-9 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                  <div>
                    <div
                      className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-1"
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
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="bg-card border border-border/60 rounded-sm p-8 sm:p-10">
              {status === "success" ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
                    <Shield className="h-8 w-8 text-primary" aria-hidden />
                  </div>
                  <h3
                    className="text-2xl font-semibold mb-2"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Message received.
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Eric will be in touch within one business day.
                  </p>
                </div>
              ) : (
                <>
                  <h3
                    className="text-xl font-semibold mb-8"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Free Project Consultation
                  </h3>
                  <form
                    name="project-inquiry"
                    method="POST"
                    data-netlify="true"
                    netlify-honeypot="bot-field"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    aria-label="Project inquiry form"
                  >
                    <input type="hidden" name="form-name" value="project-inquiry" />
                    <p className="hidden" aria-hidden>
                      <label>Skip this: <input name="bot-field" tabIndex={-1} /></label>
                    </p>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-xs tracking-wider uppercase text-muted-foreground mb-2"
                          style={{ fontFamily: "var(--font-condensed)" }}>
                          Your Name <span className="text-primary" aria-hidden>*</span>
                        </label>
                        <input id="name" name="name" type="text" required autoComplete="name"
                          value={fields.name} onChange={handleChange} className={inputCls} placeholder="Jane Smith" />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-xs tracking-wider uppercase text-muted-foreground mb-2"
                          style={{ fontFamily: "var(--font-condensed)" }}>
                          Email <span className="text-primary" aria-hidden>*</span>
                        </label>
                        <input id="email" name="email" type="email" required autoComplete="email"
                          value={fields.email} onChange={handleChange} className={inputCls} placeholder="jane@example.com" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="phone" className="block text-xs tracking-wider uppercase text-muted-foreground mb-2"
                          style={{ fontFamily: "var(--font-condensed)" }}>
                          Phone
                        </label>
                        <input id="phone" name="phone" type="tel" autoComplete="tel"
                          value={fields.phone} onChange={handleChange} className={inputCls} placeholder="(541) 555-0100" />
                      </div>
                      <div>
                        <label htmlFor="projectType" className="block text-xs tracking-wider uppercase text-muted-foreground mb-2"
                          style={{ fontFamily: "var(--font-condensed)" }}>
                          Project Type <span className="text-primary" aria-hidden>*</span>
                        </label>
                        <select id="projectType" name="projectType" required
                          value={fields.projectType} onChange={handleChange}
                          className={inputCls}
                        >
                          <option value="">Select…</option>
                          <option value="new-home">New Home Build</option>
                          <option value="full-remodel">Full Remodel</option>
                          <option value="kitchen">Kitchen Remodel</option>
                          <option value="bathroom">Bathroom Remodel</option>
                          <option value="addition">Home Addition</option>
                          <option value="adu">ADU / Second Unit</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="budget" className="block text-xs tracking-wider uppercase text-muted-foreground mb-2"
                        style={{ fontFamily: "var(--font-condensed)" }}>
                        Approximate Budget
                      </label>
                      <select id="budget" name="budget"
                        value={fields.budget} onChange={handleChange} className={inputCls}>
                        <option value="">Prefer not to say</option>
                        <option value="under-50k">Under $50,000</option>
                        <option value="50-150k">$50,000 – $150,000</option>
                        <option value="150-350k">$150,000 – $350,000</option>
                        <option value="350-750k">$350,000 – $750,000</option>
                        <option value="750k-plus">$750,000+</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-xs tracking-wider uppercase text-muted-foreground mb-2"
                        style={{ fontFamily: "var(--font-condensed)" }}>
                        Project Description <span className="text-primary" aria-hidden>*</span>
                      </label>
                      <textarea id="message" name="message" required rows={4}
                        value={fields.message} onChange={handleChange} className={`${inputCls} resize-none`}
                        placeholder="Tell us about your project — location, what you're looking to build or change, and any timeline or specific requirements…" />
                    </div>

                    {status === "error" && (
                      <p className="text-sm text-destructive" role="alert">
                        Something went wrong. Please call us at{" "}
                        <a href={SITE.phoneHref} className="underline">{SITE.phone}</a>.
                      </p>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      disabled={status === "submitting"}
                      aria-busy={status === "submitting"}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wider text-sm"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {status === "submitting" ? "SENDING…" : "SEND INQUIRY"}
                      {status !== "submitting" && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center font-light">
                      Free consultation · No obligation · {SITE.license} · Licensed &amp; insured
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

/* ══════════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg width="24" height="28" viewBox="0 0 32 36" fill="none" aria-hidden>
                <path d="M16 1L30 9V27L16 35L2 27V9L16 1Z" fill="#C8A84B" fillOpacity="0.1" stroke="#C8A84B" strokeWidth="1.5"/>
                <text x="16" y="22" textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="700" fontSize="13" fill="#C8A84B">PCB</text>
              </svg>
              <span className="text-sm font-semibold tracking-wider" style={{ fontFamily: "var(--font-condensed)" }}>
                PRECISION CORE BUILDERS
              </span>
            </div>
            <p className="text-xs text-muted-foreground ml-9">{SITE.license} &nbsp;·&nbsp; Eugene, Oregon</p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-2 ml-9 md:ml-0" aria-label="Footer navigation">
            {NAV.map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-xs tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {item}
              </a>
            ))}
            <a
              href="/portfolio"
              className="text-xs tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Portfolio
            </a>
          </nav>
        </div>

        <div className="gold-rule my-8" aria-hidden />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Precision Core Builders. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href={SITE.phoneHref} className="hover:text-primary transition-colors">{SITE.phone}</a>
            <span aria-hidden>·</span>
            <a href={SITE.emailHref} className="hover:text-primary transition-colors">{SITE.email}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
