/**
 * About page — Eric & Mitch Tadlock, company values, full team section.
 * Lifted from Home.tsx About + Team sections, adapted for standalone page.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { ASSETS, SITE } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { motion, useInView } from "framer-motion";
import { TextReveal } from "@/components/ui/TextReveal";
import {
  ArrowRight,
  Award,
  Eye,
  Hammer,
  Handshake,
  MapPin,
  Phone,
  Shield,
} from "lucide-react";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const TEAM = [
  {
    name: "Eric Tadlock",
    role: "Owner & Lead Carpenter",
    photo: ASSETS.team.eric,
    bio: "A seasoned carpenter with over 20 years of hands-on construction experience. Eric's craftsmanship lies at the heart of every project — from framing to finish.",
    phone: SITE.phone,
    phoneHref: SITE.phoneHref,
  },
  {
    name: "Mitch Tadlock",
    role: "Lead Carpenter",
    photo: ASSETS.team.mitch,
    bio: "Mitch brings exceptional skill and precision to every build. With deep expertise in finish carpentry and structural work, he ensures every detail meets the Precision Core standard.",
  },
] as const;

const VALUES = [
  {
    title: "Trust",
    icon: Handshake,
    stat: "Zero call-backs",
    body: "You know where your project stands at every stage. We document every decision, every cost, and every milestone — no surprises, no runaround.",
  },
  {
    title: "Respect",
    icon: Eye,
    stat: "50+ happy customers",
    body: "Your home is your most important investment. We treat every project with the same care we'd give our own — because your standards deserve nothing less.",
  },
  {
    title: "Diligence",
    icon: Hammer,
    stat: "Built to Oregon code & beyond",
    body: "We show up on time, work clean, and don't cut corners. Every phase is completed to Oregon code standards and beyond, every single time.",
  },
];

const MILESTONES = [
  {
    year: "2004",
    title: "Precision Core Builders founded",
    body: "The Tadlock brothers set out to raise the standard for construction in Eugene and Lane County.",
  },
  {
    year: "20+ yrs",
    title: "Two decades of carpentry",
    body: "From framing to finish, Eric and Mitch have honed hands-on craftsmanship across hundreds of builds and remodels.",
  },
  {
    year: "50+",
    title: "Happy customers",
    body: "Homeowners across Lane County trust us — earned one project, one referral at a time.",
  },
  {
    year: "0",
    title: "Call-backs",
    body: "We get it right the first time. A perfect record we protect on every job.",
  },
  {
    year: SITE.license,
    title: "Oregon licensed & insured",
    body: "Fully licensed, bonded, and insured — your project is protected from day one.",
  },
];

export default function About() {
  useSEO({
    title: "About Us — Eric & Mitch Tadlock",
    description:
      "Meet the Tadlock brothers — Eric and Mitch — the veteran carpenters behind Precision Core Builders. 20+ years of construction experience in Eugene, Oregon.",
    canonical: "https://precision-core.netlify.app/about",
  });

  const heroRef = useRef(null);
  const valuesRef = useRef(null);
  const inViewValues = useInView(valuesRef, { once: true, margin: "-80px" });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />

      <main id="main-content" className="flex-1 pt-[68px]">
        {/* Hero */}
        <section className="py-20 sm:py-28 relative" ref={heroRef}>
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#C8A84B 1px, transparent 1px), linear-gradient(90deg, #C8A84B 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
          <div className="container relative max-w-3xl">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.span
                variants={fadeUp}
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-5"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                About Us
              </motion.span>
              <h1 className="display-hero font-semibold mb-5">
                <TextReveal
                  text="Reliable hands."
                  className="block"
                  delay={0.1}
                  stagger={0.08}
                />
                <TextReveal
                  text="Crafting your world."
                  className="block"
                  wordClassName="text-primary italic"
                  delay={0.4}
                  stagger={0.08}
                />
              </h1>
              <motion.span
                variants={fadeUp}
                className="heading-bar mb-5"
                aria-hidden
              />
              <motion.p
                variants={fadeUp}
                className="text-muted-foreground text-lg leading-relaxed font-light"
              >
                Precision Core Builders represents a new standard in
                Eugene&apos;s construction landscape — built on trust, respect,
                diligence, and over 20 years of hands-on industry experience.
              </motion.p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* Story + Values */}
        <section className="py-20 sm:py-28" ref={valuesRef}>
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-start">
              {/* Left — story */}
              <motion.div
                initial="hidden"
                animate={inViewValues ? "visible" : "hidden"}
                variants={stagger}
              >
                <motion.div
                  variants={fadeUp}
                  className="gold-rule mb-8"
                  aria-hidden
                />
                <motion.p
                  variants={fadeUp}
                  className="text-muted-foreground leading-relaxed text-base font-light mb-5"
                >
                  Founded by two veteran construction brothers, we bring
                  exceptional service to our neighbors that only comes from
                  genuine craftsmanship and community commitment.
                </motion.p>
                <motion.p
                  variants={fadeUp}
                  className="text-muted-foreground leading-relaxed text-base font-light mb-5"
                >
                  Our roots run deep in Eugene. We&apos;ve spent two decades
                  building homes, renovating spaces, and earning the trust of
                  Lane County homeowners — one project at a time.
                </motion.p>
                <motion.p
                  variants={fadeUp}
                  className="text-muted-foreground leading-relaxed text-base font-light mb-8"
                >
                  When you work with Precision Core Builders, you work directly
                  with Eric and Mitch. No middlemen, no subcontracted crews
                  you&apos;ve never met — just the Tadlock brothers and their
                  commitment to getting it right.
                </motion.p>
                <motion.div
                  variants={fadeUp}
                  className="flex flex-col sm:flex-row gap-4 mb-10"
                >
                  {[
                    { icon: Shield, text: SITE.license },
                    { icon: MapPin, text: SITE.location },
                  ].map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Icon
                        className="h-4 w-4 text-primary flex-shrink-0"
                        aria-hidden
                      />
                      <span>{text}</span>
                    </div>
                  ))}
                </motion.div>
                <motion.a
                  variants={fadeUp}
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/85 hover:gap-3 transition-all"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Start Your Project <ArrowRight className="h-3.5 w-3.5" />
                </motion.a>
              </motion.div>

              {/* Right — values */}
              <motion.div
                initial="hidden"
                animate={inViewValues ? "visible" : "hidden"}
                variants={stagger}
                className="space-y-4"
              >
                {VALUES.map((v, i) => {
                  const Icon = v.icon;
                  return (
                    <motion.div
                      key={v.title}
                      variants={fadeUp}
                      transition={{ delay: i * 0.1 }}
                      className="card-lift group flex gap-5 p-7 bg-card border border-border/60 hover:border-primary/40 transition-colors duration-300"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="ring-gradient-gold h-12 w-12 flex items-center justify-center rounded-sm transition-all duration-300 group-hover:shadow-[0_0_20px_-4px_rgba(200,168,75,0.55)]">
                          <Icon className="h-6 w-6 text-primary" aria-hidden />
                        </div>
                      </div>
                      <div>
                        <h3
                          className="text-lg font-bold tracking-[0.06em] uppercase mb-1.5"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {v.title}
                        </h3>
                        <p
                          className="text-[11px] font-semibold tracking-[0.16em] uppercase text-primary mb-3"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {v.stat}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed font-light">
                          {v.body}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Company Timeline */}
        <section className="py-20 sm:py-28 cv-auto relative overflow-hidden">
          <span
            aria-hidden
            className="text-outline pointer-events-none select-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[20vw] leading-none font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Since 2004
          </span>
          <div className="container relative">
            <div className="text-center mb-14">
              <span
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Our Story
              </span>
              <h2
                className="text-4xl sm:text-5xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <TextReveal text="Two decades of" stagger={0.07} />{" "}
                <TextReveal
                  text="proven craft."
                  wordClassName="text-primary italic"
                  delay={0.35}
                  stagger={0.07}
                />
              </h2>
              <span className="heading-bar mx-auto mt-5" aria-hidden />
            </div>

            <ol className="relative max-w-3xl mx-auto">
              {/* Vertical spine */}
              <span
                className="absolute left-[19px] sm:left-1/2 top-2 bottom-2 w-px bg-border/70 sm:-translate-x-1/2"
                aria-hidden
              />
              {MILESTONES.map((m, i) => (
                <motion.li
                  key={m.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    delay: i * 0.08,
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`relative pl-14 pb-10 last:pb-0 sm:w-1/2 sm:pl-0 sm:pb-12 ${
                    i % 2 === 0
                      ? "sm:pr-12 sm:text-right"
                      : "sm:ml-auto sm:pl-12"
                  }`}
                >
                  {/* Node */}
                  <span
                    className={`ring-gradient-gold absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-full bg-background sm:left-auto ${
                      i % 2 === 0
                        ? "sm:right-0 sm:translate-x-1/2"
                        : "sm:left-0 sm:-translate-x-1/2"
                    }`}
                    aria-hidden
                  >
                    <Award className="h-4 w-4 text-primary" />
                  </span>
                  <div
                    className="text-2xl font-bold tracking-tight text-primary mb-1"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {m.year}
                  </div>
                  <h3
                    className="text-base font-bold tracking-[0.04em] uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {m.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">
                    {m.body}
                  </p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Team */}
        <section
          id="team"
          className="py-20 sm:py-28 bg-card/30 border-y border-border/40 scroll-mt-24"
        >
          <div className="container">
            <div className="text-center mb-14">
              <span
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-4"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                The Team
              </span>
              <h2
                className="text-4xl sm:text-5xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Focused team,{" "}
                <em className="text-primary italic">unmatched ability.</em>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-10 max-w-3xl mx-auto">
              {TEAM.map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    delay: i * 0.14,
                    duration: 0.65,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group"
                >
                  <div className="relative aspect-[3/4] overflow-hidden mb-5">
                    <img
                      src={member.photo}
                      alt={`${member.name} — ${member.role}`}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-700"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                      aria-hidden
                    />
                  </div>
                  <h3
                    className="text-lg font-bold tracking-[0.04em] uppercase leading-tight"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {member.name}
                  </h3>
                  <p
                    className="text-primary text-[11px] tracking-widest uppercase font-semibold mt-1 mb-3"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {member.role}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light mb-4">
                    {member.bio}
                  </p>
                  {"phone" in member && (
                    <a
                      href={member.phoneHref}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {member.phone}
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-28">
          <div className="container max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2
                className="text-3xl sm:text-4xl font-semibold mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Ready to work with us?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 font-light">
                Free on-site consultation. We come to you, no obligation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/85 hover:gap-3 transition-all min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Get Free Estimate <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="/portfolio"
                  className="flex items-center justify-center gap-2 border border-border/60 text-muted-foreground px-8 py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:border-primary hover:text-primary transition-colors min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  View Our Work <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
