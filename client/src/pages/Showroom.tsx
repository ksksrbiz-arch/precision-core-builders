/**
 * Showroom — public digital finish showroom. Browsable catalog of finish
 * products/options (flooring, countertops, cabinets, fixtures, etc.), sourced
 * live from finishCatalog.listPublished (Supabase, admin-managed via
 * /admin/finish-catalog). Distinct from Portfolio, which showcases completed
 * projects rather than individual products.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";
import { Magnetic } from "@/components/ui/Magnetic";
import { TextReveal } from "@/components/ui/TextReveal";
import { ArrowRight, PackageOpen, Palette, Phone } from "lucide-react";
import { useMemo, useState } from "react";

type FinishCatalogItem = {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  brand: string | null;
  description: string | null;
  price_tier: string | null;
  image_url: string | null;
  featured: boolean | null;
  sort_order: number | null;
};

type Filter = "All" | string;

export default function Showroom() {
  useSEO({
    title: "Finish Showroom — Flooring, Countertops & Cabinets in Eugene, OR",
    description:
      "Browse finish options for your Precision Core Builders project — flooring, countertops, cabinets, fixtures, and more. Serving Eugene and Lane County, OR.",
    canonical: canonicalUrl("/showroom"),
  });

  const { data, isLoading, isError, refetch } =
    trpc.finishCatalog.listPublished.useQuery();
  const items = (data ?? []) as FinishCatalogItem[];

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort();
  }, [items]);

  const [filter, setFilter] = useState<Filter>("All");
  const visibleItems = useMemo(
    () => (filter === "All" ? items : items.filter(i => i.category === filter)),
    [items, filter]
  );

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Finish Showroom — Precision Core Builders",
    description:
      "Flooring, countertops, cabinets, fixtures, and finish options offered " +
      "by Precision Core Builders in Eugene and Lane County, Oregon.",
    url: canonicalUrl("/showroom"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
      })),
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <JsonLd data={collectionSchema} />
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Showroom", path: "/showroom" }])}
      />
      <SiteNav />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative py-20 sm:py-28 overflow-hidden bg-neutral-900 text-white">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#C8A84B 1px, transparent 1px), linear-gradient(90deg, #C8A84B 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
          <div className="container relative mx-auto px-5 md:px-8 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="eyebrow mb-4 text-white/80">Finish Showroom</p>
              <h1 className="display-hero font-heading text-white">
                <TextReveal
                  text="Choose finishes"
                  className="block"
                  delay={0.1}
                  stagger={0.08}
                />
                <TextReveal
                  text="that last."
                  className="block"
                  wordClassName="text-primary italic"
                  delay={0.4}
                  stagger={0.08}
                />
              </h1>
              <span className="heading-bar" aria-hidden />
              <p className="mt-5 md:mt-6 text-base md:text-lg text-white/85 max-w-xl leading-relaxed">
                Flooring, countertops, cabinets, and fixtures we install
                regularly. See something you like? Bring it to your estimate —
                we&apos;ll build it into your budget.
              </p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* Category filter rail */}
        {categories.length > 0 && (
          <section className="border-b border-neutral-200/20 bg-background sticky top-[68px] z-30 backdrop-blur-md">
            <div className="container mx-auto px-5 md:px-8 py-3 md:py-4">
              <div
                className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory md:flex-wrap md:overflow-visible"
                role="tablist"
                aria-label="Filter finishes by category"
              >
                {(["All", ...categories] as Filter[]).map(cat => {
                  const active = filter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      onClick={() => setFilter(cat)}
                      aria-pressed={active}
                      data-active={active}
                      className={[
                        "snap-start whitespace-nowrap px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-medium border transition-colors min-h-[44px] flex items-center",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-foreground/75 border-border/60 hover:border-primary hover:text-primary",
                      ].join(" ")}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Catalog grid */}
        <section className="py-10 md:py-20 bg-background">
          <div className="container mx-auto px-5 md:px-8">
            {isLoading ? (
              <ShowroomSkeleton />
            ) : isError ? (
              <div className="flex flex-col items-center text-center py-20 md:py-28">
                <p className="eyebrow mt-5 text-muted-foreground">
                  Something went wrong
                </p>
                <h2 className="display-section font-heading mt-2">
                  Couldn&apos;t load the showroom
                </h2>
                <p className="mt-3 max-w-md text-sm md:text-base text-foreground/70">
                  Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] bg-primary text-primary-foreground hover:gap-3 transition-all min-h-[44px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Try again
                </button>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex flex-col items-center text-center py-20 md:py-28">
                <PackageOpen
                  className="h-10 w-10 text-primary/70"
                  aria-hidden
                />
                <p className="eyebrow mt-5 text-muted-foreground">
                  Nothing here yet
                </p>
                <h2 className="display-section font-heading mt-2">
                  {items.length === 0
                    ? "The showroom is being stocked"
                    : "No finishes in this category yet"}
                </h2>
                <p className="mt-3 max-w-md text-sm md:text-base text-foreground/70">
                  {items.length === 0
                    ? "Check back soon, or ask Eric directly about finish options for your project."
                    : "Browse all finishes or reach out about what you have in mind."}
                </p>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter("All")}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] bg-primary text-primary-foreground hover:gap-3 transition-all min-h-[44px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    View all finishes <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                {visibleItems.map((item, i) => (
                  <FinishCard key={item.slug} item={item} index={i} />
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
                See it in person.
              </h2>
              <span className="heading-bar heading-bar-center" aria-hidden />
              <p className="mt-4 text-white/75 text-base md:text-lg">
                Bring your favorites to your on-site estimate and we&apos;ll
                price them into your project.
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

function FinishCard({
  item,
  index,
}: {
  item: FinishCatalogItem;
  index: number;
}) {
  const [imgBroken, setImgBroken] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.3) }}
      className="group border border-border/60 bg-card overflow-hidden"
    >
      <div className="aspect-[4/3] bg-muted/20 overflow-hidden">
        {item.image_url && !imgBroken ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            onError={() => setImgBroken(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Palette className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-semibold">
            {item.category ?? "Finish"}
          </p>
          {item.price_tier && (
            <span
              className="text-[10px] tracking-wider text-muted-foreground"
              aria-label={`Price tier: ${item.price_tier}`}
            >
              {item.price_tier}
            </span>
          )}
        </div>
        <h3
          className="text-lg font-semibold leading-snug"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {item.name}
        </h3>
        {item.brand && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.brand}</p>
        )}
        {item.description && (
          <p className="text-sm text-muted-foreground/80 font-light mt-2 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ShowroomSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8"
      aria-busy="true"
      aria-label="Loading showroom"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border border-border/40 bg-card overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-muted/30" />
          <div className="p-5 space-y-2">
            <div className="h-2.5 w-16 bg-muted/40" />
            <div className="h-4 w-3/4 bg-muted/40" />
            <div className="h-3 w-1/2 bg-muted/30" />
          </div>
        </div>
      ))}
    </div>
  );
}
