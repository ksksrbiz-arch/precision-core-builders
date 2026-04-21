/**
 * ProjectCard — editorial-style tile for the portfolio grid.
 * No dates. Ever.
 */
import { Project, photoUrl } from "@/data/projects";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowUpRight } from "lucide-react";

interface Props {
  project: Project;
  index?: number;
}

export function ProjectCard({ project, index = 0 }: Props) {
  const [, setLocation] = useLocation();
  const heroSrc = photoUrl(project.hero);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-lg bg-white cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-500"
      onClick={() => setLocation(`/portfolio/${project.slug}`)}
    >
      <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
        <img
          src={heroSrc}
          alt={project.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
        />
      </div>
      {project.tag === "Our Home" && (
        <div className="absolute top-4 left-4 z-10 bg-[#C8A84B] text-neutral-900 text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded">
          Our Home
        </div>
      )}
      <div className="p-5">
        <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 mb-1.5">
          {project.category}
        </p>
        <h3 className="font-heading text-lg md:text-xl text-neutral-900 leading-tight group-hover:text-[#8B7355] transition-colors">
          {project.title}
        </h3>
        {project.location && (
          <p className="text-sm text-neutral-500 mt-1">{project.location}</p>
        )}
        <p className="mt-3 text-sm text-neutral-600 leading-relaxed line-clamp-2">
          {project.summary}
        </p>
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-neutral-900 group-hover:text-[#8B7355] transition-colors">
          View project
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </motion.article>
  );
}
