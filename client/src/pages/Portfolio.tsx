/**
 * Portfolio page — public showcase of completed projects.
 * Phase 1: structural scaffold with category filtering.
 * Phase 5: images from Supabase Storage, data from portfolioProjects table.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SITE } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowRight,
  HardHat,
  Mail,
  MapPin,
  Phone,
  Shield,
  Star,
} from "lucide-react";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

type Category = "All" | "Custom Homes" | "Renovations" | "Additions" | "Commercial";
const CATEGORIES: Category[] = ["All", "Custom Homes", "Renovations", "Additions", "Commercial"];

type Project = {
  id: number;
  title: string;
  category: Exclude<Category, "All">;
  location: string;
  year: number;
  sqft: number;
  highlight: string;
  accentColor: string;
  patternSeed: number;
};

/**
 * Curated project cards — real project data to be filled in by Eric.
 * Images will load from Supabase Storage once Phase 5 is complete.
 */
const PROJECTS: Project[] = [
  {
    id: 1,
    title: "South Hills Modern Farmhouse",
    category: "Custom Homes",
    location: "South Hills, Eugene",
    year: 2024,
    sqft: 3200,
    highlight: "Full custom build — white oak floors, vaulted great room, chef's kitchen with quartzite island.",
    accentColor: "#8B7355",
    patternSeed: 1,
  },
  {
    id: 2,
    title: "River Road Kitchen & Bath",
    category: "Renovations",
    location: "River Road, Eugene",
    year: 2024,
    sqft: 850,
    highlight: "Complete kitchen gut and two bathroom remodels. Waterfall quartz, custom cabinetry, heated tile.",
    accentColor: "#6B8E23",
    patternSeed: 2,
  },
  {
    id: 3,
    title: "Crest Drive Second Story Addition",
    category: "Additions",
    location: "Crest Drive, Eugene",
    year: 2023,
    sqft: 1100,
    highlight: "Full second-story addition with master suite, two bedrooms, and a media room. Seamless exterior match.",
    accentColor: "#D4A574",
    patternSeed: 3,
  },
  {
    id: 4,
    title: "West 11th Commercial Build-Out",
    category: "Commercial",
    location: "West Eugene",
    year: 2023,
    sqft: 2400,
    highlight: "Commercial tenant improvement — open-plan office, conference room, server closet, and ADA restrooms.",
    accentColor: "#5B7FA6",
    patternSeed: 4,
  },
  {
    id: 5,
    title: "Thurston Craftsman Remodel",
    category: "Renovations",
    location: "Thurston, Springfield",
    year: 2023,
    sqft: 1900,
    highlight: "Full interior refresh of a 1960s craftsman. New windows, refinished hardwoods, updated electrical.",
    accentColor: "#8B7355",
    patternSeed: 5,
  },
  {
    id: 6,
    title: "Friendly Street ADU",
    category: "Additions",
    location: "Friendly Area, Eugene",
    year: 2022,
    sqft: 640,
    highlight: "Detached accessory dwelling unit with full kitchen, bath, and loft. Energy-efficient construction.",
    accentColor: "#6B8E23",
    patternSeed: 6,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Eric's crew finished our kitchen remodel on time and exactly on budget. The daily photo updates through the client portal meant we always knew what was happening.",
    name: "M. & K. Larson",
    project: "River Road Kitchen & Bath",
  },
  {
    quote:
      "The second-story addition transformed our home. Eric walked us through every decision, every material, every change — zero surprises.",
    name: "T. Whitfield",
    project: "Crest Drive Addition",
  },
];

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filtered =
    activeCategory === "All"
      ? PROJECTS
      : PROJECTS.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen flex flex-col">
      <PortfolioHeader />
      <main>
        <PortfolioHero />
        <ProjectsSection
          filtered={filtered}
          active={activeCategory}
          setActive={setActiveCategory}
        />
        <TestimonialsSection />
        <PortfolioCTA />
      </main>
      <PortfolioFooter />
    </div>
  );
}

/* ─── Header ─────────────────────────────────────────────────────── */

function PortfolioHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="flex items-center gap-2.5" aria-label="Precision Core Builders — Home">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <HardHat className="h-4 w-4 text-primary-foreground" aria-hidden />
          </div>
          <div className="leading-tight">
            <span className="block font-semibold text-sm tracking-tight font-[family-name:var(--font-heading)]">
              Precision Core
            </span>
            <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">
              Builders
            </span>
          </div>
        </a>
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          <a href="/#services" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Services</a>
          <a href="/#values" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Values</a>
          <a href="/portfolio" className="text-sm font-medium text-foreground">Portfolio</a>
          <a href="/#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
        </nav>
        <Button size="sm" asChild>
          <a href="/#contact">Get an Estimate</a>
        </Button>
      </div>
    </header>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────── */

function PortfolioHero() {
  return (
    <section className="pt-32 pb-16 relative" aria-label="Portfolio hero">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#2D2D2D 1px, transparent 1px), linear-gradient(90deg, #2D2D2D 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      <div className="container relative text-center max-w-3xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium tracking-widest uppercase text-primary mb-4"
          >
            Our Work
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] mb-5"
          >
            Built with precision.<br />
            <span className="text-primary italic">Delivered with pride.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground text-lg leading-relaxed"
          >
            Every project in our portfolio reflects the same commitment — quality
            craftsmanship, transparent communication, and results that outlast
            the contract.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Projects Grid ──────────────────────────────────────────────── */

function ProjectCard({ project }: { project: Project }) {
  /**
   * SVG pattern background — unique per project using patternSeed.
   * Evokes natural construction materials: grain, mesh, diamond-plate.
   * Replaced by real project photography in Phase 5.
   */
  const patterns = [
    // Diagonal grain
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M-10 10 l20-20M0 40 l40-40M30 50 l20-20' stroke='${encodeURIComponent(project.accentColor)}' stroke-width='1' opacity='0.15'/></svg>`,
    // Grid mesh
    `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='1' height='32' x='16' fill='${encodeURIComponent(project.accentColor)}' opacity='0.15'/><rect width='32' height='1' y='16' fill='${encodeURIComponent(project.accentColor)}' opacity='0.15'/></svg>`,
    // Diamond plate
    `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M12 2 L22 12 L12 22 L2 12 Z' fill='none' stroke='${encodeURIComponent(project.accentColor)}' stroke-width='0.8' opacity='0.2'/></svg>`,
    // Herringbone
    `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='16'><path d='M0 8 L8 0 L16 8 L24 0 L32 8' fill='none' stroke='${encodeURIComponent(project.accentColor)}' stroke-width='1' opacity='0.15'/></svg>`,
    // Brick
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><rect width='40' height='20' fill='none' stroke='${encodeURIComponent(project.accentColor)}' stroke-width='0.5' opacity='0.2'/><line x1='20' y1='0' x2='20' y2='20' stroke='${encodeURIComponent(project.accentColor)}' stroke-width='0.5' opacity='0.2'/></svg>`,
    // Hex
    `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='24'><polygon points='14,2 26,8 26,16 14,22 2,16 2,8' fill='none' stroke='${encodeURIComponent(project.accentColor)}' stroke-width='0.8' opacity='0.2'/></svg>`,
  ];
  const pattern = patterns[(project.patternSeed - 1) % patterns.length];

  return (
    <motion.article
      variants={fadeUp}
      className="group bg-card border border-border/60 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300"
    >
      {/* Visual panel — replaced by project photo in Phase 5 */}
      <div
        className="relative h-52 flex items-end p-5"
        style={{
          background: `linear-gradient(135deg, ${project.accentColor}18 0%, ${project.accentColor}30 100%)`,
          backgroundImage: `url("data:image/svg+xml,${pattern}")`,
        }}
        aria-label="Project visual"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent 50%, ${project.accentColor}40 100%)`,
          }}
          aria-hidden
        />
        <div className="relative z-10 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px] uppercase tracking-widest border border-white/20 bg-white/10 text-white backdrop-blur-sm"
          >
            {project.category}
          </Badge>
          <Badge
            variant="secondary"
            className="text-[10px] border border-white/20 bg-white/10 text-white backdrop-blur-sm"
          >
            {project.year}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-base font-semibold tracking-tight mb-1 group-hover:text-primary transition-colors">
          {project.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
          <span>{project.location}</span>
          <span>·</span>
          <span>{project.sqft.toLocaleString()} sq ft</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {project.highlight}
        </p>
      </div>
    </motion.article>
  );
}

function ProjectsSection({
  filtered,
  active,
  setActive,
}: {
  filtered: Project[];
  active: Category;
  setActive: (c: Category) => void;
}) {
  return (
    <section className="pb-24" aria-labelledby="projects-heading">
      <div className="container">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-10" role="group" aria-label="Filter projects by category">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              aria-pressed={active === cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                active === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filtered.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-16">
            No projects in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}

/* ─── Testimonials ───────────────────────────────────────────────── */

function TestimonialsSection() {
  return (
    <section className="py-24 bg-card/50" aria-labelledby="testimonials-heading">
      <div className="container max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">
              Client Voices
            </p>
            <h2
              id="testimonials-heading"
              className="text-3xl sm:text-4xl font-semibold tracking-tight"
            >
              What Clients Say
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={i}
                variants={fadeUp}
                className="bg-card border border-border/60 rounded-2xl p-7"
              >
                <div className="flex gap-0.5 mb-4" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-primary text-primary"
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.project}</p>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA ────────────────────────────────────────────────────────── */

function PortfolioCTA() {
  return (
    <section className="py-24" aria-label="Contact call to action">
      <div className="container max-w-2xl text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mx-auto mb-6"
          >
            <Shield className="h-8 w-8 text-primary" aria-hidden />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
          >
            Ready to start yours?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground text-lg mb-8"
          >
            Every project we build becomes a portfolio piece we&apos;re proud of.
            Let&apos;s make yours next.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="text-base px-8" asChild>
              <a href="/#contact">
                Request an Estimate
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8" asChild>
              <a href={SITE.phoneHref}>
                <Phone className="mr-2 h-4 w-4" aria-hidden />
                {SITE.phone}
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */

function PortfolioFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <HardHat className="h-3 w-3 text-primary-foreground" aria-hidden />
            </div>
            <span className="font-semibold tracking-tight text-foreground text-sm">
              Precision Core Builders
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 justify-center">
            <a href={SITE.phoneHref} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {SITE.phone}
            </a>
            <a href={SITE.emailHref} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {SITE.email}
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {SITE.location}
            </span>
          </div>
        </div>
        <Separator className="my-6" />
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Precision Core Builders &middot;{" "}
          {SITE.license}
        </p>
      </div>
    </footer>
  );
}
