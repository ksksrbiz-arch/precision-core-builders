/**
 * ProjectCard — editorial tile for the portfolio grid.
 * Uses ResponsiveImage for CLS-free loading and adds a quiet depth lift on
 * hover (desktop) + tap-down feedback (mobile).
 * No dates. Ever.
 */
import { Project, photoUrl } from "@/data/projects";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import { TiltCard } from "@/components/ui/TiltCard";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowUpRight } from "lucide-react";

interface Props {
  project: Project;
  index?: number;
}

export function ProjectCard({ project, index = 0 }: Props) {
  const [, setLocation] = useLocation();
  const heroSrc = photoUrl(project.hero);
  const reduce = useReducedMotion();

  return (
    <TiltCard className="h-full rounded-lg" maxTilt={4}>
      <motion.article
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{
          duration: 0.55,
          delay: index * 0.05,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="group relative overflow-hidden rounded-lg bg-card cursor-pointer shadow-sm hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)] hover:-translate-y-1 transition-all duration-500 active:scale-[0.98] focus-within:ring-2 focus-within:ring-[#C8A84B] focus-within:ring-offset-2 focus-within:ring-offset-background"
        onClick={() => setLocation(`/portfolio/${project.slug}`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLocation(`/portfolio/${project.slug}`);
          }
        }}
        aria-label={`View ${project.title}`}
      >
        <div className="relative overflow-hidden">
          <ResponsiveImage
            src={heroSrc}
            alt={project.title}
            aspectRatio="4/3"
            imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* subtle warm overlay on hover */}
          <div
            className="absolute inset-0 bg-[#8B7355]/0 group-hover:bg-[#8B7355]/10 transition-colors duration-500 pointer-events-none"
            aria-hidden
          />
        </div>
        {project.tag === "Our Home" && (
          <div className="absolute top-4 left-4 z-10 bg-[#C8A84B] text-neutral-900 text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded">
            Our Home
          </div>
        )}
        <div className="p-4 md:p-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
            {project.category}
          </p>
          <h3 className="font-heading text-lg md:text-xl text-foreground leading-tight group-hover:text-primary transition-colors">
            {project.title}
          </h3>
          {project.location && (
            <p className="text-sm text-muted-foreground mt-1">
              {project.location}
            </p>
          )}
          <p className="mt-2 md:mt-3 text-sm text-foreground/75 leading-relaxed line-clamp-2">
            {project.summary}
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            View project
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </motion.article>
    </TiltCard>
  );
}
