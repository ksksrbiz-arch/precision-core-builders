/**
 * Portfolio — curated gallery of Precision Core Builders work.
 *
 * Data source: /client/src/data/projects.ts (static catalog of real projects).
 * Photos: /client/public/portfolio/*.jpg (EXIF-stripped, dateless, owned assets).
 *
 * Filter by category, click into a project for full detail + before/after sliders.
 */
import { SiteNav, SiteFooter, MobileCTABar } from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { PROJECTS, CATEGORIES, ProjectCategory, photoUrl } from "@/data/projects";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import { useMemo, useState } from "react";

type Filter = "All" | ProjectCategory;
const FILTERS: Filter[] = ["All", ...CATEGORIES];

export default function Portfolio() {
  useSEO({
    title: "Portfolio — Custom Homes, Remodels & Restoration",
    description:
      "Real work from Precision Core Builders in Eugene and Lane County, Oregon. Custom homes, full restorations, kitchens, baths, decks, and structures — built by Eric Tadlock and crew. CCB #246527.",
    canonical: "https://precisioncorebuilders.com/portfolio",
  });

  const [filter, setFilter] = useState<Filter>("All");

  const visibleProjects = useMemo(
    () => (filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter)),
    [filter]
  );

  // Use real hero photo as page backdrop
  const heroImage = photoUrl("signature-home-01.jpg");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />

      <main className="flex-1">
        {/* Editorial hero */}
        <section className="relative min-h-[55vh] md:min-h-[65vh] flex items-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
          <div className="relative container mx-auto px-5 md:px-8 pb-14 md:pb-20 text-white">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl"
            >
              <p
                className="text-[11px] uppercase tracking-[0.2em] mb-4 text-white/80"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Selected Work — {SITE.license}
              </p>
              <h1 className="font-heading text-4xl md:text-6xl leading-[1.05]">
                Twenty years,
                <br />
                one standard.
              </h1>
              <p className="mt-5 md:mt-6 text-base md:text-lg text-white/85 max-w-xl leading-relaxed">
                Every project below was built by Eric and crew in Eugene and across
                Lane County, Oregon. Real homes, real hands, real craftsmanship.
              </p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* Filter rail */}
        <section className="border-b border-neutral-200 bg-white">
          <div className="container mx-auto px-5 md:px-8 py-4">
            <div className="flex flex-wrap gap-2 md:gap-3">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={[
                    "px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-medium border transition-colors",
                    filter === f
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-900 hover:text-neutral-900",
                  ].join(" ")}
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Project grid */}
        <section className="py-12 md:py-20 bg-neutral-50/50">
          <div className="container mx-auto px-5 md:px-8">
            {visibleProjects.length === 0 ? (
              <p className="text-center text-neutral-500 py-20">
                No projects in this category yet — check back soon.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-heading text-3xl md:text-5xl leading-tight">
                Have a project in mind?
              </h2>
              <p className="mt-4 text-white/75 text-base md:text-lg">
                Walk the site with Eric. Honest estimate, no pressure, every time.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                <a
                  href="/contact"
                  className="flex items-center justify-center gap-2 bg-[#C8A84B] text-neutral-900 px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-[#d4b866] transition-all hover:gap-3 min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Request an Estimate <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href={SITE.phoneHref}
                  className="flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-[#C8A84B] hover:text-[#C8A84B] transition-colors min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Phone className="h-4 w-4" /> {SITE.phone}
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <MobileCTABar />
      <SiteFooter />
    </div>
  );
}
