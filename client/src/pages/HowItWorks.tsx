/**
 * How It Works — client-facing page explaining the platform features,
 * how they benefit the homeowner, and what makes PCB different.
 * Linked from nav dropdowns and footer menus.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { ASSETS, SITE } from "@/const";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Eye,
  FileText,
  HardHat,
  Layers,
  Lock,
  MessageSquare,
  Palette,
  Phone,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useRef } from "react";

/* ─── Animation presets ─────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

/* ─── Feature data ──────────────────────────────────────────── */

type Feature = {
  icon: typeof Eye;
  title: string;
  tagline: string;
  description: string;
  benefits: string[];
};

const CLIENT_FEATURES: Feature[] = [
  {
    icon: Eye,
    title: "Real-Time Project Portal",
    tagline: "See your project 24/7 — no phone tag required",
    description:
      "Your dedicated client portal gives you instant access to your project's status, timeline, and every update. No more waiting for callbacks or wondering what's happening on-site. Log in anytime from your phone, tablet, or computer.",
    benefits: [
      "Live project timeline showing completed, in-progress, and upcoming tasks",
      "Instant access to daily field reports with photos and summaries",
      "Weather-adjusted scheduling so you know about delays before they happen",
      "Accessible from any device — desktop, tablet, or phone",
    ],
  },
  {
    icon: FileText,
    title: "Daily Field Reports",
    tagline: "Every detail documented, every day",
    description:
      "Eric records detailed field reports from the job site using voice-to-text AI technology. These reports are automatically organized, summarized, and shared with you through your portal — complete with photos and progress notes.",
    benefits: [
      "AI-powered voice transcription for accurate, thorough reporting",
      "Photos attached to each report showing the day's progress",
      "Published directly to your portal — no email chains or missed updates",
      "Complete history of every day's work for your records",
    ],
  },
  {
    icon: Palette,
    title: "Digital Finish Selections",
    tagline: "Choose your finishes with confidence",
    description:
      "Browse and select your project finishes through our digital showroom. See how different options affect your budget in real-time, compare materials side-by-side, and make decisions at your own pace without the pressure of a showroom visit.",
    benefits: [
      "Real-time budget impact displayed as you browse options",
      "Side-by-side comparison of materials, colors, and textures",
      "All selections saved and tracked in one place",
      "Change your mind anytime before the order deadline",
    ],
  },
  {
    icon: DollarSign,
    title: "AI Project Estimator",
    tagline: "Know your costs before we break ground",
    description:
      "Our AI-powered estimator gives you a detailed cost breakdown for your project in minutes — not weeks. Enter your project details, and our system calculates realistic cost ranges based on current material prices, labor rates, and local market data.",
    benefits: [
      "Detailed line-item cost breakdowns by category",
      "Realistic price ranges based on current Eugene-area market rates",
      "Instant estimates available 24/7 from our website",
      "No pressure, no commitment — just real numbers to help you plan",
    ],
  },
  {
    icon: Shield,
    title: "Core Values Ledger",
    tagline: "Complete transparency on every decision",
    description:
      "Every decision, change order, permit, and inspection is logged in an immutable ledger that you can review anytime. This is our commitment to radical transparency — you'll always know what was decided, when, why, and how it affects your project.",
    benefits: [
      "Immutable record — entries can't be edited or deleted after the fact",
      "Every change order documented with cost impact and reason",
      "Permit and inspection results logged with dates",
      "Full audit trail you can reference during and after your project",
    ],
  },
  {
    icon: Camera,
    title: "Vision Studio",
    tagline: "See the possibilities before construction begins",
    description:
      "Upload photos of your space and explore design possibilities with AI-assisted visualization. See how renovations might look before committing, explore different material options, and share your vision with Eric to align on the final plan.",
    benefits: [
      "AI-powered visualization of potential renovations",
      "Explore different materials, colors, and layouts on your actual space",
      "Share your vision board directly with the project team",
      "Make more confident decisions with visual context",
    ],
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    tagline: "The right update at the right time",
    description:
      "Receive timely notifications about milestones, schedule changes, inspection results, and material deliveries. We keep you informed without overwhelming you — you control which updates you want to receive and how.",
    benefits: [
      "Milestone alerts when key phases of your project are complete",
      "Weather delay notifications so you're never caught off guard",
      "Material delivery confirmations with expected arrival dates",
      "Customizable preferences — choose email, SMS, or in-portal alerts",
    ],
  },
  {
    icon: BarChart3,
    title: "Budget Tracking",
    tagline: "Know exactly where your money goes",
    description:
      "Track your project budget in real-time with clear breakdowns of estimated vs. actual costs. See where you're on budget, where adjustments were made, and what's left. No surprises at final billing — just clear, honest numbers throughout.",
    benefits: [
      "Real-time estimated vs. actual cost comparison",
      "Category-by-category breakdowns (materials, labor, permits)",
      "Change order cost impacts clearly displayed",
      "Milestone-based billing — pay as progress is made",
    ],
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Get Your Estimate",
    description:
      "Use our AI Estimator for instant cost ranges, or contact us for a detailed custom quote. No pressure, no commitment.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Access Your Portal",
    description:
      "Once your project begins, you'll receive login credentials to your personal client portal with all project details.",
    icon: Users,
  },
  {
    step: "03",
    title: "Track Progress Daily",
    description:
      "Follow along with daily field reports, photos, and real-time schedule updates. Your project, your visibility.",
    icon: ClipboardList,
  },
  {
    step: "04",
    title: "Make Decisions Confidently",
    description:
      "Select finishes, approve changes, and review budgets — all through your portal with full cost transparency.",
    icon: CheckCircle2,
  },
];

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */

export default function HowItWorks() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />

      <main>
        <Hero />
        <WhySection />
        <ProcessSteps />
        <FeaturesGrid />
        <SecuritySection />
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, #C8A84B 0%, transparent 60%)",
        }}
        aria-hidden
      />

      <div className="container relative">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.span
            variants={fadeUp}
            className="block text-[10px] tracking-[0.35em] uppercase text-primary font-bold mb-4"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Your Project, Your Visibility
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] mb-6"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            How Your Project{" "}
            <span className="text-primary">Comes to Life</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed mb-8 max-w-2xl mx-auto"
          >
            We built a platform that gives you complete visibility into your
            construction project — real-time updates, transparent budgets, and
            tools that put you in control from estimate to final walkthrough.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="/estimator"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-[12px] font-bold tracking-[0.12em] uppercase hover:bg-primary/85 transition-all hover:gap-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Try the Estimator <Sparkles className="h-3.5 w-3.5" />
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 border border-border/60 text-muted-foreground px-7 py-3.5 text-[12px] font-bold tracking-[0.12em] uppercase hover:text-primary hover:border-primary/40 transition-all"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Talk to Eric <Phone className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WHY SECTION
═══════════════════════════════════════════════════════════════ */
function WhySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 sm:py-24 border-t border-border/30">
      <div className="container">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <span
              className="block text-[10px] tracking-[0.3em] uppercase text-primary font-bold mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Why We're Different
            </span>
            <h2
              className="text-3xl sm:text-4xl font-semibold mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Construction Shouldn't Be a Black Box
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
              Most contractors hand you a quote and disappear until they need a
              check. We believe you deserve to see exactly what's happening on
              your project, every single day.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="grid sm:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Lock,
                title: "Trust",
                text: "Immutable records of every decision and cost. You'll never wonder what happened or why.",
              },
              {
                icon: Users,
                title: "Respect",
                text: "Your time matters. Real-time access means no phone tag, no waiting, no being left in the dark.",
              },
              {
                icon: HardHat,
                title: "Diligence",
                text: "AI-powered automation eliminates human error in reporting, scheduling, and cost tracking.",
              },
            ].map((v) => (
              <motion.div
                key={v.title}
                variants={fadeUp}
                className="bg-card border border-border/60 p-6 text-center"
              >
                <div className="h-12 w-12 border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <v.icon className="h-6 w-6 text-primary" />
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {v.title}
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {v.text}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROCESS STEPS
═══════════════════════════════════════════════════════════════ */
function ProcessSteps() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="py-16 sm:py-24 bg-card/30 border-y border-border/30"
    >
      <div className="container">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <span
              className="block text-[10px] tracking-[0.3em] uppercase text-primary font-bold mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              The Process
            </span>
            <h2
              className="text-3xl sm:text-4xl font-semibold mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              From Estimate to Move-In
            </h2>
            <p className="text-muted-foreground font-light max-w-xl mx-auto">
              Four straightforward steps to a project you can see, track, and
              trust.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
          >
            {PROCESS_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                variants={fadeUp}
                className="relative bg-card border border-border/60 p-6"
              >
                {/* Step number */}
                <span
                  className="block text-4xl font-bold text-primary/15 mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {s.step}
                </span>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {s.description}
                </p>
                {/* Connector line (not on last) */}
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-primary/20" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURES GRID
═══════════════════════════════════════════════════════════════ */
function FeaturesGrid() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-16 sm:py-24">
      <div className="container">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span
              className="block text-[10px] tracking-[0.3em] uppercase text-primary font-bold mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Platform Features
            </span>
            <h2
              className="text-3xl sm:text-4xl font-semibold mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Tools Built for <span className="text-primary">Your</span>{" "}
              Peace of Mind
            </h2>
            <p className="text-muted-foreground font-light max-w-2xl mx-auto">
              Every feature is designed to give you more visibility, more
              control, and more confidence in your construction project.
            </p>
          </motion.div>

          <div className="space-y-6 max-w-5xl mx-auto">
            {CLIENT_FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      className="bg-card border border-border/60 overflow-hidden"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-5">
          {/* Icon */}
          <div className="h-12 w-12 border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + tagline */}
            <h3
              className="text-xl font-semibold mb-1"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {feature.title}
            </h3>
            <p
              className="text-[11px] tracking-[0.15em] uppercase text-primary/80 font-semibold mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {feature.tagline}
            </p>

            {/* Description */}
            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-5">
              {feature.description}
            </p>

            {/* Benefits */}
            <ul className="space-y-2">
              {feature.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground leading-snug">
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECURITY SECTION
═══════════════════════════════════════════════════════════════ */
function SecuritySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="py-16 sm:py-24 bg-card/30 border-y border-border/30"
    >
      <div className="container">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div variants={fadeUp}>
            <div className="h-14 w-14 border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h2
              className="text-2xl sm:text-3xl font-semibold mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your Data, Protected
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed mb-8 max-w-xl mx-auto">
              We take your privacy seriously. Your portal is secured with
              industry-standard encryption, your data is never shared with
              third parties, and you control who sees your project information.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { label: "Encrypted", sub: "End-to-end" },
              { label: "Private", sub: "Your data, only" },
              { label: "Secure Login", sub: "Auth0 + Supabase" },
              { label: "Audit Trail", sub: "Immutable logs" },
            ].map((item) => (
              <motion.div
                key={item.label}
                variants={fadeUp}
                className="border border-border/40 p-4"
              >
                <p className="text-sm font-semibold mb-0.5">{item.label}</p>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  {item.sub}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CTA SECTION
═══════════════════════════════════════════════════════════════ */
function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-semibold mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ready to Build with{" "}
            <span className="text-primary">Transparency?</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground font-light leading-relaxed mb-8"
          >
            Get a free estimate and see for yourself how Precision Core Builders
            keeps you informed, in control, and confident throughout your
            project.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="/estimator"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-[12px] font-bold tracking-[0.12em] uppercase hover:bg-primary/85 transition-all hover:gap-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Get Free Estimate <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={SITE.phoneHref}
              className="inline-flex items-center gap-2 border border-border/60 text-muted-foreground px-7 py-3.5 text-[12px] font-bold tracking-[0.12em] uppercase hover:text-primary hover:border-primary/40 transition-all"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Phone className="h-3.5 w-3.5" /> {SITE.phone}
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
