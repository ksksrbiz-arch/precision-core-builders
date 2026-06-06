/**
 * PortfolioDetail — single project view.
 * Route: /portfolio/:slug
 *
 * Renders:
 *   - Hero section with project photo + title + scope
 *   - Optional before/after drag slider (when project.beforeAfter is defined)
 *   - Full photo gallery with lightbox
 *   - CTA to contact / next project
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";
import { PhotoGrid } from "@/components/portfolio/PhotoGrid";
import { getProject, PROJECTS, photoUrl } from "@/data/projects";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Phone,
  Check,
  Calendar,
  Clock,
  Ruler,
  Layers,
  Tag,
  MoveHorizontal,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useMemo } from "react";

export default function PortfolioDetail() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const project = getProject(params.slug);

  // Next project for rotation at bottom
  const nextProject = useMemo(() => {
    if (!project) return null;
    const idx = PROJECTS.findIndex(p => p.slug === project.slug);
    return PROJECTS[(idx + 1) % PROJECTS.length];
  }, [project]);

  useSEO({
    title: project ? project.title : "Project Not Found",
    description: project
      ? `${project.summary} Built by Precision Core Builders in ${project.location || "Lane County, Oregon"}.`
      : "The project you're looking for could not be found.",
    canonical: project
      ? `https://precision-core.netlify.app/portfolio/${project.slug}`
      : "https://precision-core.netlify.app/portfolio",
  });

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteNav />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center py-24"
        >
          <div className="text-center max-w-md px-5">
            <p
              className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              404
            </p>
            <h1 className="font-heading text-4xl text-neutral-900">
              Project not found
            </h1>
            <p className="mt-4 text-neutral-600">
              That project may have moved or the link is out of date.
            </p>
            <button
              onClick={() => setLocation("/portfolio")}
              className="mt-8 inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-neutral-800 transition"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Portfolio
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />

      <main id="main-content" className="flex-1">
        {/* HERO */}
        <section className="relative min-h-[65vh] md:min-h-[75vh] flex items-end overflow-hidden">
          <img
            src={photoUrl(project.hero)}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="sync"
            {...({ fetchpriority: "high" } as Record<string, string>)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

          <div className="relative container mx-auto px-5 md:px-8 pb-14 md:pb-20 text-white">
            <motion.button
              onClick={() => setLocation("/portfolio")}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="group inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span
                className="uppercase tracking-[0.14em]"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                All Projects
              </span>
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl"
            >
              {/* Stack category + Our Home on mobile, inline on sm+ */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2 mb-3">
                <p
                  className="text-[11px] uppercase tracking-[0.2em] text-white/85"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {project.category}
                </p>
                {project.tag === "Our Home" && (
                  <span className="self-start bg-[#C8A84B] text-neutral-900 text-[10px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded">
                    Our Home
                  </span>
                )}
              </div>
              <h1 className="display-hero font-heading">{project.title}</h1>
              <span className="heading-bar" aria-hidden />
              {project.location && (
                <div className="mt-5 flex items-center gap-2 text-white/80">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm tracking-wide">
                    {project.location}
                  </span>
                </div>
              )}
              <p className="mt-5 md:mt-6 text-base md:text-lg text-white/85 max-w-2xl leading-relaxed">
                {project.summary}
              </p>
            </motion.div>
          </div>
        </section>

        {/* PROJECT FACTS BAR — real data; optional year/duration/size when set */}
        {(() => {
          const facts = [
            { Icon: Tag, label: "Project Type", value: project.category },
            { Icon: MapPin, label: "Location", value: project.location },
            { Icon: Calendar, label: "Completed", value: project.year },
            { Icon: Clock, label: "Duration", value: project.duration },
            { Icon: Ruler, label: "Size", value: project.size },
            {
              Icon: Layers,
              label: "Scope",
              value: `${project.scope.length} work items`,
            },
          ].filter(f => Boolean(f.value));

          return (
            <section className="border-b border-border/40 bg-card/40">
              <div className="container mx-auto px-5 md:px-8">
                <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y divide-border/40 sm:divide-y-0 sm:divide-x">
                  {facts.map(({ Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 py-5 sm:px-5 first:pl-0"
                    >
                      <Icon
                        className="h-4 w-4 text-[#C8A84B] mt-0.5 shrink-0"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <dt
                          className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 mb-1"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {label}
                        </dt>
                        <dd className="text-sm font-medium text-foreground leading-snug">
                          {value}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          );
        })()}

        {/* BEFORE / AFTER SLIDER (if present) */}
        {project.beforeAfter && (
          <section className="py-14 md:py-20 bg-card/30">
            <div className="container mx-auto px-5 md:px-8">
              <div className="max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-8 md:mb-12"
                >
                  <p className="eyebrow text-[#8B7355] mb-2">Before / After</p>
                  <h2 className="display-section font-heading text-foreground">
                    The Transformation
                  </h2>
                  <span
                    className="heading-bar heading-bar-center"
                    aria-hidden
                  />
                  <p className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <MoveHorizontal
                      className="h-4 w-4 text-[#C8A84B]"
                      aria-hidden
                    />
                    Drag to compare
                  </p>
                </motion.div>
                <BeforeAfterSlider
                  before={photoUrl(project.beforeAfter.before)}
                  after={photoUrl(project.beforeAfter.after)}
                  beforeAlt={`${project.title} — before`}
                  afterAlt={`${project.title} — after`}
                  caption={project.beforeAfter.caption}
                />
              </div>
            </div>
          </section>
        )}

        {/* STORY + SCOPE */}
        <section className="py-14 md:py-20 bg-background">
          <div className="container mx-auto px-5 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-7"
              >
                <p className="eyebrow text-[#8B7355] mb-2">The Project</p>
                <h2 className="display-section font-heading text-foreground leading-tight">
                  Built with intent.
                </h2>
                <span className="heading-bar" aria-hidden />
                <p className="mt-6 text-foreground/80 text-base md:text-lg leading-[1.75]">
                  {project.description}
                </p>
              </motion.div>

              {/* Divider on mobile between description + scope */}
              <div
                className="border-t border-border/40 lg:hidden"
                aria-hidden
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="lg:col-span-5"
              >
                <div className="bg-card/60 p-6 md:p-8 rounded-lg border border-border/40">
                  <p className="eyebrow text-muted-foreground mb-4">
                    Scope of Work
                  </p>
                  <ul className="space-y-3">
                    {project.scope.map(item => (
                      <li key={item} className="flex gap-3">
                        <Check className="h-4 w-4 text-[#C8A84B] shrink-0 mt-1" />
                        <span className="text-sm text-foreground/85 leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* GALLERY */}
        {project.photos.length > 0 && (
          <section className="py-14 md:py-20 bg-card/30">
            <div className="container mx-auto px-5 md:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 md:mb-12"
              >
                <p className="eyebrow text-[#8B7355] mb-2">Gallery</p>
                <h2 className="display-section font-heading text-foreground">
                  From framing to finish
                </h2>
                <span className="heading-bar heading-bar-center" aria-hidden />
              </motion.div>
              <div className="max-w-6xl mx-auto">
                <PhotoGrid photos={project.photos} />
              </div>
            </div>
          </section>
        )}

        {/* CTA + NEXT PROJECT */}
        <section className="py-14 md:py-20 bg-neutral-900 text-white">
          <div className="container mx-auto px-5 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="font-heading text-3xl md:text-4xl leading-tight">
                  Ready to start yours?
                </h2>
                <p className="mt-3 text-white/75 max-w-md">
                  Walk the site with Eric. Honest estimate, no pressure, every
                  time.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 bg-[#C8A84B] text-neutral-900 px-6 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-[#d4b866] transition-all hover:gap-3"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Request an Estimate <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={SITE.phoneHref}
                    className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-[#C8A84B] hover:text-[#C8A84B] transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Phone className="h-4 w-4" /> {SITE.phone}
                  </a>
                </div>
              </motion.div>

              {nextProject && (
                <motion.button
                  onClick={() => {
                    setLocation(`/portfolio/${nextProject.slug}`);
                    window.scrollTo({ top: 0 });
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className="group text-left block active:scale-[0.98] transition-transform"
                  aria-label={`Next project: ${nextProject.title}`}
                >
                  <p
                    className="text-[11px] uppercase tracking-[0.2em] text-white/60 mb-2"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Next Project
                  </p>
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={photoUrl(nextProject.hero)}
                      alt={nextProject.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      style={{ aspectRatio: "16 / 10" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                      <h3 className="font-heading text-xl md:text-2xl text-white leading-tight">
                        {nextProject.title}
                      </h3>
                      <ArrowRight className="h-5 w-5 text-white shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.button>
              )}
            </div>
          </div>
        </section>
      </main>

      <MobileCTABar />
      <SiteFooter />
    </div>
  );
}
