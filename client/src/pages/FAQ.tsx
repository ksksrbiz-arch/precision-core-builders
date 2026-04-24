import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";

const fadeUp: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const FAQS = [
  {
    category: "Working With Us",
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

export default function FAQ() {
  useSEO({
    title: "FAQ — Licensing, Permits & Process",
    description:
      "Answers to common questions about working with Precision Core Builders — licensing, permits, costs, timelines, and how we operate in Eugene, Oregon.",
    canonical: "https://precision-core.netlify.app/faq",
  });

  // Build FAQPage JSON-LD from the FAQ data
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SiteNav />
      <MobileCTABar />
      <main className="pt-[68px]">
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
              <p className="text-muted-foreground text-lg font-light leading-relaxed">
                Straight answers about working with Precision Core Builders —
                licensing, permits, costs, and process. Still have a question?{" "}
                <a
                  href={SITE.phoneHref}
                  className="text-primary hover:underline"
                >
                  {SITE.phone}
                </a>
              </p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* FAQ sections */}
        <section className="py-20 sm:py-28">
          <div className="container max-w-4xl">
            <div className="space-y-16">
              {FAQS.map((section, si) => (
                <div key={section.category}>
                  <h2
                    className="text-2xl sm:text-3xl font-semibold mb-8 pb-4 border-b border-border/50"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {section.category}
                  </h2>
                  <div className="space-y-3">
                    {section.items.map(({ q, a }, i) => (
                      <motion.details
                        key={q}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        className="group border border-border/60 bg-card"
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
                    ))}
                  </div>
                </div>
              ))}
            </div>

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
