/**
 * Blog overview page — lists all posts with photos, links to full articles.
 * Mirrors the structure of Services.tsx (nav/footer shell, TrustBar,
 * breadcrumb JSON-LD) at a smaller scale appropriate for 3 initial posts.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { JsonLd } from "@/components/JsonLd";
import { useSEO } from "@/hooks/useSEO";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const POSTS = [
  {
    title: "How Much Does a Kitchen Remodel Cost in Eugene, OR?",
    category: "Cost Guides",
    dek: "What a kitchen remodel actually costs in Eugene in 2026 — by tier, and what drives the price up or down.",
    photo: "/portfolio/signature-kitchen-01.jpg",
    href: "/blog/kitchen-remodel-cost-eugene-oregon",
  },
  {
    title: "Oregon CCB Licensing: What to Check Before Hiring a Contractor",
    category: "Homeowner Resources",
    dek: "What Oregon's CCB license actually verifies, how to check it yourself, and the red flags to watch for.",
    photo: "/portfolio/category-residential.jpg",
    href: "/blog/verify-oregon-ccb-license",
  },
  {
    title: "We Built Our Own Backyard First — Here's What That Taught Us",
    category: "Project Story",
    dek: "Eric and Mitch built their own home's pergola, deck, and fencing over a year. Here's the real project.",
    photo: "/portfolio/signature-outdoor-01.jpg",
    href: "/blog/tadlock-residence-case-study",
  },
];

export default function Blog() {
  useSEO({
    title: "Blog | Precision Core Builders",
    description:
      "Cost guides, homeowner resources, and real project stories from Precision Core Builders in Eugene, OR.",
    canonical: canonicalUrl("/blog"),
  });

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Blog", path: "/blog" }])} />

      <SiteNav />
      <MobileCTABar />

      <main className="pt-[68px]">
        <section className="py-20 sm:py-28 border-b border-border/40">
          <div className="container">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-10 bg-primary" aria-hidden />
                <span
                  className="text-primary text-[11px] tracking-[0.28em] uppercase font-semibold"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  From Precision Core Builders
                </span>
              </div>
              <h1
                className="text-4xl sm:text-5xl font-semibold leading-tight max-w-2xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Cost guides, honest answers, and real projects.
              </h1>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        <section className="py-16 sm:py-24">
          <div className="container">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {POSTS.map((post, i) => (
                <motion.a
                  key={post.href}
                  href={post.href}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  transition={{ delay: i * 0.08 }}
                  className="group flex flex-col bg-card border border-border/60 hover:border-primary/50 transition-colors"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={post.photo}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <span
                      className="text-primary text-[10px] tracking-[0.2em] uppercase font-semibold mb-2"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {post.category}
                    </span>
                    <h2
                      className="text-lg font-semibold mb-2 leading-snug"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4 flex-1">
                      {post.dek}
                    </p>
                    <span className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-primary group-hover:gap-3 transition-all">
                      Read More <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
