/**
 * Portfolio — real PCB project photos from Webflow CDN.
 * Filterable by category. Full multi-page structure.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { ASSETS, SITE } from "@/const";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};
const stagger = { visible: { transition: { staggerChildren: 0.09 } } };

type Category =
  | "All"
  | "Custom Homes"
  | "Renovations"
  | "Additions"
  | "Commercial";
const CATEGORIES: Category[] = [
  "All",
  "Custom Homes",
  "Renovations",
  "Additions",
  "Commercial",
];

type Project = {
  id: number;
  title: string;
  category: Exclude<Category, "All">;
  location: string;
  highlight: string;
  image: string;
};

const PROJECTS: Project[] = [
  {
    id: 1,
    title: "Custom Home Build",
    category: "Custom Homes",
    location: "Eugene, OR",
    highlight:
      "New construction with precision craftsmanship and attention to detail.",
    image: ASSETS.portfolio[0],
  },
  {
    id: 2,
    title: "Kitchen & Bath Renovation",
    category: "Renovations",
    location: "Eugene, OR",
    highlight: "Complete kitchen and bathroom remodel with quality materials.",
    image: ASSETS.portfolio[1],
  },
  {
    id: 3,
    title: "Second Story Addition",
    category: "Additions",
    location: "Eugene, OR",
    highlight: "Seamless addition expanding the home's living space.",
    image: ASSETS.portfolio[2],
  },
  {
    id: 4,
    title: "Commercial Build-Out",
    category: "Commercial",
    location: "Eugene, OR",
    highlight: "Professional commercial tenant improvement.",
    image: ASSETS.portfolio[3],
  },
  {
    id: 5,
    title: "Craftsman Remodel",
    category: "Renovations",
    location: "Lane County, OR",
    highlight: "Full interior refresh honoring original character.",
    image: ASSETS.portfolio[4],
  },
  {
    id: 6,
    title: "Accessory Dwelling Unit",
    category: "Additions",
    location: "Eugene, OR",
    highlight: "Detached ADU with full kitchen, bath, and loft.",
    image: ASSETS.portfolio[5],
  },
  {
    id: 7,
    title: "Custom Craftsman Home",
    category: "Custom Homes",
    location: "Lane County, OR",
    highlight: "Custom millwork and covered porch built to last.",
    image: ASSETS.portfolio[6],
  },
  {
    id: 8,
    title: "Master Suite Addition",
    category: "Additions",
    location: "Eugene, OR",
    highlight: "Primary suite addition with spa bath and walk-in closet.",
    image: ASSETS.portfolio[7],
  },
  {
    id: 9,
    title: "Whole-Home Renovation",
    category: "Renovations",
    location: "Eugene, OR",
    highlight: "Complete renovation with updated systems and finishes.",
    image: ASSETS.portfolio[8],
  },
];

export default function Portfolio() {
  const [active, setActive] = useState<Category>("All");

  const filtered =
    active === "All" ? PROJECTS : PROJECTS.filter(p => p.category === active);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />

      <main className="flex-1 pt-[68px]">
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
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.span
                variants={fadeUp}
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-5"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Our Work
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl font-semibold leading-tight mb-5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Built with precision.
                <br />
                <em className="text-primary italic">Delivered with pride.</em>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-muted-foreground text-lg leading-relaxed font-light"
              >
                Every project in our portfolio reflects the same commitment —
                quality craftsmanship, transparent communication, and results
                that outlast the contract.
              </motion.p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* Filters + Grid */}
        <section className="py-16 sm:py-24">
          <div className="container">
            {/* Category pills */}
            <div
              className="flex flex-wrap gap-2 mb-10"
              role="group"
              aria-label="Filter by category"
            >
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  aria-pressed={active === cat}
                  className={`px-4 py-2 text-[11px] font-bold tracking-[0.14em] uppercase transition-all duration-200 ${
                    active === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {filtered.map((project, i) => (
                  <motion.article
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.07,
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group bg-card border border-border/60 overflow-hidden hover:border-primary/25 hover:shadow-lg hover:shadow-black/20 transition-all duration-300"
                  >
                    {/* Real photo */}
                    <div className="relative h-52 overflow-hidden bg-muted">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading={i < 3 ? "eager" : "lazy"}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      {/* Badges */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2">
                        <span
                          className="text-[9px] px-2 py-1 font-bold tracking-[0.18em] uppercase bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {project.category}
                        </span>
                        <span
                          className="text-[9px] px-2 py-1 font-bold tracking-[0.18em] uppercase bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {project.location}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3
                        className="text-base font-semibold mb-2 group-hover:text-primary transition-colors duration-200"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                        <MapPin
                          className="h-3 w-3 flex-shrink-0 text-primary"
                          aria-hidden
                        />
                        <span>{project.location}</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-light leading-relaxed">
                        {project.highlight}
                      </p>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </AnimatePresence>

            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-16 text-sm">
                No projects in this category yet.
              </p>
            )}
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 sm:py-28 bg-card/30 border-y border-border/40">
          <div className="container max-w-4xl">
            <div className="text-center mb-12">
              <span
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Client Voices
              </span>
              <h2
                className="text-3xl sm:text-4xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                What clients say.
              </h2>
            </div>
            <div className="max-w-md mx-auto">
              <div className="bg-card border border-border/60 p-8 text-center">
                <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
                  Verified client testimonials coming soon. Want to hear from
                  past clients? We&apos;re happy to connect you.
                </p>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline"
                >
                  Contact Us <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-28">
          <div className="container max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2
                className="text-3xl sm:text-4xl font-semibold mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Ready to start yours?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 font-light">
                Every project we build becomes a portfolio piece we&apos;re
                proud of. Let&apos;s make yours next.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/85 transition-all hover:gap-3 min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Request an Estimate <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href={SITE.phoneHref}
                  className="flex items-center justify-center gap-2 border border-border/60 text-muted-foreground px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-primary hover:text-primary transition-colors min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Phone className="h-4 w-4" /> {SITE.phone}
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
