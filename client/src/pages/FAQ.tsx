import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Phone,
  Search,
  Handshake,
  ShieldCheck,
  Clock,
  Hammer,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const fadeUp: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

type FaqSection = {
  category: string;
  icon: LucideIcon;
  accent: string;
  items: { q: string; a: string }[];
};

const FAQS: FaqSection[] = [
  {
    category: "Working With Us",
    icon: Handshake,
    accent: "var(--primary)",
    items: [
      {
        q: "How do I get started?",
        a: "Call Eric directly at 541-852-5144 or fill out our contact form. We schedule a free on-site consultation — we come to your property, review the scope, and provide a detailed written estimate before you commit to anything.",
      },
      {
        q: "Are you licensed and insured in Oregon?",
        a: "Yes. Precision Core Builders holds Oregon CCB license #246527 and carries full general liability and workers' compensation insurance. We're happy to provide certificates of insurance on request.",
      },
      {
        q: "How do you handle change orders?",
        a: "Every change order is documented in writing with a cost and timeline impact before any additional work begins. Nothing happens without your written approval.",
      },
      {
        q: "Do you provide written contracts and estimates?",
        a: "Always. You receive a detailed written estimate itemizing labor, materials, and timeline. Your contract specifies scope, payment schedule, and project milestones. No verbal agreements.",
      },
      {
        q: "Who will I be working with day-to-day?",
        a: "You work directly with Eric and Mitch Tadlock. They are on-site personally throughout your project — not managing from a distance while sending crews you've never met.",
      },
    ],
  },
  {
    category: "Permits & Compliance",
    icon: ShieldCheck,
    accent: "var(--success, #6B8E23)",
    items: [
      {
        q: "Do you handle building permits in Eugene and Lane County?",
        a: "Yes. We manage the entire permitting process with the City of Eugene Building & Permit Services and Lane County for all projects that require permits. Permit costs are included in your estimate.",
      },
      {
        q: "What projects require permits in Eugene?",
        a: "New construction, additions, structural modifications, electrical upgrades, plumbing changes, deck builds over 30 inches, and most significant remodels require permits. We advise you on permit requirements at the estimate stage.",
      },
      {
        q: "What is the CCB license and why does it matter?",
        a: "Oregon's Construction Contractors Board (CCB) requires all contractors doing work over $1,000 to be licensed, bonded, and insured. Always verify your contractor's CCB number at oregon.gov/ccb. Ours is #246527.",
      },
    ],
  },
  {
    category: "Timing & Costs",
    icon: Clock,
    accent: "var(--warning, #D4A574)",
    items: [
      {
        q: "How far out are you scheduling?",
        a: "Scheduling varies by season and current workload. Call or contact us directly for current availability. We recommend reaching out 4–8 weeks before your desired start date for smaller projects, longer for new construction.",
      },
      {
        q: "Do you offer financing or payment plans?",
        a: "We structure milestone-based payment schedules that align with project phases — typically a deposit, mid-project payment(s), and final payment at completion. We don't offer in-house financing but work with your timeline.",
      },
      {
        q: "How accurate are your estimates?",
        a: "Our estimates are detailed and itemized. For fixed-price work, we stand behind our numbers. For projects with inherent unknowns (like restoration work), we explain contingency ranges upfront so there are no surprises.",
      },
      {
        q: "Why is the lowest bid not always the best choice?",
        a: "Low bids usually mean shortcuts: cheaper materials, less experienced crews, skipped permits, or missing scope items that show up as change orders later. We price our work honestly and execute it completely.",
      },
    ],
  },
  {
    category: "Project Types",
    icon: Hammer,
    accent: "var(--accent, #8B7355)",
    items: [
      {
        q: "What types of projects do you specialize in?",
        a: "Residential construction, remodels and renovations, new home builds, restoration, outdoor spaces, painting, roofing, and custom cabinetry throughout the Eugene area.",
      },
      {
        q: "Do you do commercial projects?",
        a: "We focus primarily on residential work and small commercial projects in the Eugene area. Contact us to discuss your specific commercial needs.",
      },
      {
        q: "Can you work from my architect's or designer's plans?",
        a: "Absolutely. We frequently work from plans provided by architects and designers. We review plans before estimating to flag any constructability issues or code considerations.",
      },
    ],
  },
];

/** Stable, URL-safe id from arbitrary text (for section + item anchors). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function FAQ() {
  useSEO({
    title: "FAQ — Licensing, Permits & Process",
    description:
      "Answers to common questions about working with Precision Core Builders — licensing, permits, costs, timelines, and how we operate in Eugene, Oregon.",
    canonical: "https://precision-core.netlify.app/faq",
  });

  const [query, setQuery] = useState("");

  // Build FAQPage JSON-LD from ALL FAQ data — never the filtered subset.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.flatMap(section =>
      section.items.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      }))
    ),
  };

  // Filter sections + items by the live search query.
  const normalized = query.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!normalized) return FAQS;
    return FAQS.map(section => ({
      ...section,
      items: section.items.filter(
        ({ q, a }) =>
          q.toLowerCase().includes(normalized) ||
          a.toLowerCase().includes(normalized)
      ),
    })).filter(section => section.items.length > 0);
  }, [normalized]);

  const matchCount = filteredSections.reduce((n, s) => n + s.items.length, 0);
  const hasResults = filteredSections.length > 0;

  // Deep link: scroll to the element matching the URL hash on load.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // If the target is a collapsible item, open it for the visitor.
    if (el instanceof HTMLDetailsElement) el.open = true;
    el.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SiteNav />
      <MobileCTABar />
      <main id="main-content" className="pt-[68px]">
        {/* Hero */}
        <section className="py-20 sm:py-28 border-b border-border/40">
          <div className="container max-w-3xl">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <span
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Frequently Asked Questions
              </span>
              <h1
                className="text-4xl sm:text-5xl font-semibold leading-tight mb-5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Questions we hear
                <br />
                <em className="text-primary italic">all the time.</em>
              </h1>
              <p className="text-muted-foreground text-lg font-light leading-relaxed mb-8">
                Straight answers about working with Precision Core Builders —
                licensing, permits, costs, and process. Still have a question?{" "}
                <a
                  href={SITE.phoneHref}
                  className="text-primary hover:underline"
                >
                  {SITE.phone}
                </a>
              </p>

              {/* Live search / filter */}
              <div className="relative">
                <label htmlFor="faq-search" className="sr-only">
                  Search frequently asked questions
                </label>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id="faq-search"
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search questions — permits, costs, scheduling…"
                  aria-describedby="faq-search-status"
                  className="w-full bg-card border border-border/60 pl-12 pr-4 py-3.5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors min-h-[52px]"
                />
              </div>
              <p
                id="faq-search-status"
                role="status"
                aria-live="polite"
                className="sr-only"
              >
                {normalized
                  ? `${matchCount} matching question${
                      matchCount === 1 ? "" : "s"
                    }`
                  : ""}
              </p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* FAQ sections */}
        <section className="py-20 sm:py-28">
          <div className="container max-w-4xl">
            {hasResults ? (
              <div className="space-y-16">
                {filteredSections.map(section => {
                  const sectionId = `faq-${slugify(section.category)}`;
                  const Icon = section.icon;
                  return (
                    <div key={section.category} id={sectionId}>
                      <h2
                        className="flex items-center gap-3 text-2xl sm:text-3xl font-semibold mb-8 pb-4 border-b border-border/50"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <span
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md"
                          style={{
                            color: section.accent,
                            backgroundColor: `color-mix(in srgb, ${section.accent} 12%, transparent)`,
                          }}
                          aria-hidden
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        {section.category}
                      </h2>
                      <div className="space-y-3">
                        {section.items.map(({ q, a }, i) => {
                          const itemId = `${sectionId}-${slugify(q)}`;
                          return (
                            <motion.details
                              key={q}
                              id={itemId}
                              initial={{ opacity: 0, y: 12 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.06 }}
                              className="group border border-border/60 border-l-2 bg-card"
                              style={{ borderLeftColor: section.accent }}
                            >
                              <summary className="flex items-center justify-between gap-4 p-5 sm:p-6 cursor-pointer list-none min-h-[56px]">
                                <span className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                                  {q}
                                </span>
                                <span
                                  className="text-primary flex-shrink-0 text-xl leading-none group-open:rotate-45 transition-transform duration-200"
                                  aria-hidden
                                >
                                  +
                                </span>
                              </summary>
                              <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-border/30 pt-4">
                                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                                  {a}
                                </p>
                              </div>
                            </motion.details>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-border/60 bg-card p-10 sm:p-14 text-center">
                <Search
                  className="mx-auto mb-4 h-8 w-8 text-muted-foreground/60"
                  aria-hidden
                />
                <h2
                  className="text-xl font-semibold mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  No questions match “{query.trim()}”
                </h2>
                <p className="text-muted-foreground font-light mb-6">
                  Try a different keyword, or just ask us directly.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* CTA */}
            <div className="mt-16 bg-card border border-border/60 p-8 sm:p-10 text-center">
              <h2
                className="text-2xl font-semibold mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Still have questions?
              </h2>
              <p className="text-muted-foreground font-light mb-7">
                Call Eric directly or request a free on-site consultation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={SITE.phoneHref}
                  className="flex items-center justify-center gap-2 border border-primary text-primary px-7 py-3.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/10 transition-colors min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Phone className="h-4 w-4" /> {SITE.phone}
                </a>
                <a
                  href="/#contact"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-all hover:gap-3 min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Free Estimate <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
