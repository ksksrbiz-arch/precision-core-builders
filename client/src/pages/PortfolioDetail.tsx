/**
 * PortfolioDetail — Single project showcase with gallery, details, and testimonial.
 * Route: /portfolio/:slug
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { trpc } from "@/lib/trpc";
import { SITE } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Phone,
  Ruler,
  Star,
} from "lucide-react";
import { useLocation, useParams } from "wouter";

function GalleryImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative overflow-hidden aspect-[4/3] bg-muted">
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
      />
    </div>
  );
}

export default function PortfolioDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();

  const { data: project, isLoading, error } = trpc.portfolio.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteNav />
        <main className="flex-1 flex items-center justify-center pt-[68px]">
          <div className="text-center max-w-md p-8">
            <h1
              className="text-3xl font-semibold mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Project Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              This project may have been moved or is no longer published.
            </p>
            <button
              onClick={() => setLocation("/portfolio")}
              className="flex items-center gap-2 mx-auto text-primary hover:underline text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> View All Projects
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const gallery: string[] = (() => {
    try {
      return JSON.parse(project.gallery_image_urls ?? "[]");
    } catch {
      return [];
    }
  })();

  const allImages = [
    ...(project.cover_image_url ? [project.cover_image_url] : []),
    ...gallery,
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />

      <main className="flex-1 pt-[68px]">
        {/* Hero image */}
        {project.cover_image_url && (
          <div className="relative h-[50vh] sm:h-[60vh] overflow-hidden bg-muted">
            <img
              src={project.cover_image_url}
              alt={project.title}
              loading="eager"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
        )}

        <div className="container max-w-5xl py-12">
          {/* Back nav */}
          <button
            onClick={() => setLocation("/portfolio")}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-8 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Projects
          </button>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {project.category && (
                  <span
                    className="text-[11px] font-bold tracking-[0.28em] uppercase text-primary mb-3 block"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {project.category}
                  </span>
                )}
                <h1
                  className="text-3xl sm:text-4xl font-semibold mb-4"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {project.title}
                </h1>

                {/* Project meta */}
                <div className="flex flex-wrap gap-5 text-sm text-muted-foreground mb-8">
                  {project.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {project.location}
                    </span>
                  )}
                  {project.completion_year && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Completed {project.completion_year}
                    </span>
                  )}
                  {project.square_footage && (
                    <span className="flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-primary" />
                      {Number(project.square_footage).toLocaleString()} sq ft
                    </span>
                  )}
                </div>

                {/* Description */}
                {project.description && (
                  <div className="prose prose-sm max-w-none text-muted-foreground font-light leading-relaxed mb-10">
                    {project.description.split("\n").map((para: string, i: number) => (
                      <p key={i} className="mb-3">
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {/* Gallery grid */}
                {allImages.length > 1 && (
                  <div className="mb-10">
                    <p
                      className="text-[11px] font-bold tracking-[0.28em] uppercase text-muted-foreground mb-4"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Project Gallery
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {allImages.slice(1).map((img, i) => (
                        <GalleryImage
                          key={i}
                          src={img}
                          alt={`${project.title} — photo ${i + 2}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Client testimonial */}
                {project.client_testimonial && (
                  <blockquote className="border-l-2 border-primary pl-6 mb-10">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className="h-3.5 w-3.5 fill-primary text-primary"
                        />
                      ))}
                    </div>
                    <p className="text-base text-muted-foreground font-light leading-relaxed italic mb-3">
                      &ldquo;{project.client_testimonial}&rdquo;
                    </p>
                    {project.client_name && (
                      <footer className="text-sm font-semibold text-foreground">
                        — {project.client_name}
                      </footer>
                    )}
                  </blockquote>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="sticky top-24 space-y-4">
                {/* CTA */}
                <div className="bg-card border border-border/60 p-6">
                  <p
                    className="text-[11px] font-bold tracking-[0.28em] uppercase text-primary mb-3"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Start Your Project
                  </p>
                  <p className="text-sm text-muted-foreground font-light mb-5">
                    Ready to build something this remarkable? Let&apos;s talk.
                  </p>
                  <a
                    href="/estimator"
                    className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-5 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/85 transition-all mb-3"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Get an Estimate <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={SITE.phoneHref}
                    className="flex items-center justify-center gap-2 w-full border border-border/60 text-muted-foreground px-5 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-primary hover:text-primary transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Phone className="h-3.5 w-3.5" /> {SITE.phone}
                  </a>
                </div>

                {/* License badge */}
                <div className="bg-card border border-border/60 p-4 text-center">
                  <p className="text-[9px] tracking-widest uppercase text-muted-foreground/60 mb-1">
                    Oregon Licensed Contractor
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    CCB #246527
                  </p>
                </div>

                {/* View all */}
                <button
                  onClick={() => setLocation("/portfolio")}
                  className="w-full flex items-center justify-center gap-2 border border-border/60 text-muted-foreground px-5 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-primary hover:text-primary transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> View All Projects
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
