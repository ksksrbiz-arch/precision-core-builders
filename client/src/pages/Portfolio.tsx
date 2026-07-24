/**
 * Portfolio — curated gallery of Precision Core Builders work.
 *
 * Data source: /client/src/data/projects.ts (static catalog of real projects).
 * Photos: /client/public/portfolio/*.jpg (EXIF-stripped, dateless, owned assets).
 *
 * Filter by category, click into a project for full detail + before/after sliders.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { netlifySrcSet } from "@/lib/netlifyImage";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { Reveal } from "@/components/ui/Reveal";
import {
  PROJECTS,
  CATEGORIES,
  ProjectCategory,
  photoUrl,
} from "@/data/projects";
import { SITE } from "@/const";
import { JsonLd } from "@/components/JsonLd";
import { useSEO } from "@/hooks/useSEO";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Magnetic } from "@/components/ui/Magnetic";
import { TextReveal } from "@/components/ui/TextReveal";
import { ArrowRight, PackageOpen, Phone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Filter = "All" | ProjectCategory;
const FILTERS: Filter[] = ["All", ...CATEGORIES];

export default function Portfolio() {
  useSEO({
    title: "Portfolio — Custom Homes & Remodels in Eugene, OR",
    description:
      "Real projects by Precision Core Builders in Eugene and Lane County, OR — custom homes, restorations, kitchens, baths, decks, and structures. CCB #246527.",
    canonical: canonicalUrl("/portfolio"),
  });

  const [filter, setFilter] = useState<Filter>("All");

  const visibleProjects = useMemo(
    () =>
      filter === "All" ? PROJECTS : PROJECTS.filter(p => p.category === filter),
    [filter]
  );

  // Project count per filter — drives the count badge on each tab.
  const counts = useMemo(() => {
    const map = { All: PROJECTS.length } as Record<Filter, number>;
    for (const cat of CATEGORIES) {
      map[cat] = PROJECTS.filter(p => p.category === cat).length;
    }
    return map;
  }, []);

  // Use real hero photo as page backdrop
  const heroImage = photoUrl("signature-home-01.jpg");

  // Cursor parallax on the editorial hero backdrop.
  const reduceMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const parallaxX = useSpring(mx, { stiffness: 55, damping: 18, mass: 0.6 });
  const parallaxY = useSpring(my, { stiffness: 55, damping: 18, mass: 0.6 });

  function onHeroMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduceMotion) return;
    mx.set((e.clientX / window.innerWidth - 0.5) * 22);
    my.set((e.clientY / window.innerHeight - 0.5) * 14);
  }
  function onHeroMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  // CollectionPage + ItemList JSON-LD — built from the full catalog (never the
  // filtered subset) so search engines index every project regardless of UI
  // state. Mirrors the FAQPage schema pattern used elsewhere on the site.
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Portfolio — Precision Core Builders",
    description:
      "Custom homes, full restorations, kitchens, baths, decks, and " +
      "structures built by Precision Core Builders in Eugene and Lane " +
      "County, Oregon.",
    url: canonicalUrl("/portfolio"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: PROJECTS.length,
      itemListElement: PROJECTS.map((project, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: project.title,
        url: canonicalUrl(`/portfolio/${project.slug}`),
      })),
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <JsonLd data={collectionSchema} />
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Portfolio", path: "/portfolio" }])}
      />
      <SiteNav />

      <main id="main-content" className="flex-1">
        {/* Editorial hero */}
        <section
          className="relative min-h-[60vh] md:min-h-[65vh] flex items-end overflow-hidden"
          onMouseMove={onHeroMouseMove}
          onMouseLeave={onHeroMouseLeave}
        >
          {/*
           * Use a real <img> (not CSS background) so the browser preloads it
           * as the LCP and we get explicit eager + high fetchpriority.
           */}
          <motion.div
            className="absolute inset-0 scale-[1.07]"
            style={reduceMotion ? undefined : { x: parallaxX, y: parallaxY }}
          >
            <img
              src={heroImage}
              srcSet={netlifySrcSet(heroImage)}
              sizes="100vw"
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="sync"
              {...({ fetchpriority: "high" } as Record<string, string>)}
              className="h-full w-full object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
          <div className="film-grain" aria-hidden />
          <div className="relative container mx-auto px-5 md:px-8 pb-14 md:pb-20 text-white">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl"
            >
              <p className="eyebrow mb-4 text-white/80">
                Selected Work — {SITE.license}
              </p>
              <h1 className="display-hero font-heading text-white">
                <TextReveal
                  text="Twenty years,"
                  className="block"
                  delay={0.15}
                  stagger={0.08}
                />
                <TextReveal
                  text="one standard."
                  className="block"
                  delay={0.45}
                  stagger={0.08}
                />
              </h1>
              <span className="heading-bar" aria-hidden />
              <p className="mt-5 md:mt-6 text-base md:text-lg text-white/85 max-w-xl leading-relaxed">
                Every project below was built by Eric and crew in Eugene and
                across Lane County, Oregon. Real homes, real hands, real
                craftsmanship.
              </p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* Filter rail — horizontal-scroll on mobile, wrap on desktop */}
        <FilterRail filter={filter} setFilter={setFilter} counts={counts} />

        {/* Project grid */}
        <section className="py-10 md:py-20 bg-background">
          <div className="container mx-auto px-5 md:px-8">
            {visibleProjects.length === 0 ? (
              <div className="flex flex-col items-center text-center py-20 md:py-28">
                <PackageOpen
                  className="h-10 w-10 text-primary/70"
                  aria-hidden
                />
                <p className="eyebrow mt-5 text-muted-foreground">
                  Nothing here yet
                </p>
                <h2 className="display-section font-heading mt-2">
                  No projects in this category yet
                </h2>
                <p className="mt-3 max-w-md text-sm md:text-base text-foreground/70">
                  New work is added as it wraps. Browse all projects or reach
                  out about yours.
                </p>
                <button
                  type="button"
                  onClick={() => setFilter("All")}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] bg-primary text-primary-foreground hover:gap-3 transition-all min-h-[44px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  View all projects <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                {visibleProjects.map((project, i) => (
                  <ProjectCard key={project.slug} project={project} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA band */}
        <section className="py-16 md:py-24 bg-neutral-900 text-white">
          <div className="container mx-auto px-5 md:px-8 text-center max-w-2xl">
            <Reveal>
              <h2 className="display-section font-heading">
                Have a project in mind?
              </h2>
              <span className="heading-bar heading-bar-center" aria-hidden />
              <p className="mt-4 text-white/75 text-base md:text-lg">
                Walk the site with Eric. Honest estimate, no pressure, every
                time.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                <Magnetic strength={0.3}>
                  <a
                    href="/contact"
                    className="flex items-center justify-center gap-2 bg-[#C8A84B] text-neutral-900 px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-[#d4b866] transition-all hover:gap-3 min-h-[52px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Request an Estimate <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </Magnetic>
                <Magnetic strength={0.3}>
                  <a
                    href={SITE.phoneHref}
                    className="flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-[#C8A84B] hover:text-[#C8A84B] transition-colors min-h-[52px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Phone className="h-4 w-4" /> {SITE.phone}
                  </a>
                </Magnetic>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MobileCTABar />
      <SiteFooter />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   FilterRail — scroll-snap pill rail on mobile, wrap on tablet+.
   Scrolls the active pill into view when the filter changes.
────────────────────────────────────────────────────────────── */
function FilterRail({
  filter,
  setFilter,
  counts,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const active = scroller.querySelector<HTMLButtonElement>(
      '[data-active="true"]'
    );
    if (active) {
      active.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [filter]);

  return (
    <section className="border-b border-neutral-200/20 bg-background sticky top-[68px] z-30 backdrop-blur-md">
      <div className="container mx-auto px-5 md:px-8 py-3 md:py-4">
        <div
          ref={scrollerRef}
          className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory md:flex-wrap md:overflow-visible edge-fade-right md:[-webkit-mask-image:none] md:[mask-image:none]"
          role="tablist"
          aria-label="Filter projects by category"
        >
          {FILTERS.map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                aria-label={`${f} — ${counts[f]} project${
                  counts[f] === 1 ? "" : "s"
                }`}
                data-active={active}
                className={[
                  "snap-start whitespace-nowrap px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-medium border transition-colors min-h-[44px] flex items-center",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-foreground/75 border-border/60 hover:border-primary hover:text-primary",
                ].join(" ")}
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {f}
                <span
                  className={[
                    "ml-2 tabular-nums text-[10px] leading-none px-1.5 py-0.5 rounded-full border",
                    active
                      ? "border-primary-foreground/30 bg-primary-foreground/15"
                      : "border-border/60 bg-foreground/5 text-foreground/60",
                  ].join(" ")}
                  aria-hidden
                >
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
