/**
 * ServicePage — reusable template for all 8 service pages.
 * Handles local SEO, CTAs, trust signals, and FAQ per service.
 */
import {
  SiteNav,
  SiteFooter,
  MobileCTABar,
} from "@/components/layout/SiteShell";
import { TrustBar } from "@/components/layout/TrustBar";
import { SITE } from "@/const";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { type ReactNode, useState } from "react";

const fadeUp: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export type ServicePageProps = {
  title: string;
  subtitle: string;
  headline: ReactNode;
  heroImage: string;
  heroImageAlt: string;
  /** SEO: e.g. "Eugene, OR custom home builder" */
  metaTitle: string;
  metaDescription: string;
  intro: string;
  body: string[];
  includes: string[];
  /** City/area keywords for local SEO */
  serviceAreas: string[];
  faqs: { q: string; a: string }[];
  relatedServices: { label: string; href: string }[];
};

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ServicePage(p: ServicePageProps) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fields, setFields] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const data = new FormData(e.currentTarget);
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(
          data as unknown as Record<string, string>
        ).toString(),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  const input =
    "w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors";

  return (
    <>
      {/* Dynamic SEO head */}
      <title>{p.metaTitle}</title>
      <meta name="description" content={p.metaDescription} />

      <SiteNav />
      <MobileCTABar />

      <main className="pt-[68px]">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative h-[55vh] min-h-[380px] flex items-end pb-12 overflow-hidden">
          <img
            src={p.heroImage}
            alt={p.heroImageAlt}
            className="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
          <div className="container relative z-10">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div
                variants={fadeUp}
                className="flex items-center gap-3 mb-4"
              >
                <div className="h-px w-10 bg-primary" aria-hidden />
                <span
                  className="text-primary text-[11px] tracking-[0.28em] uppercase font-semibold"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {p.subtitle}
                </span>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight max-w-3xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {p.headline}
              </motion.h1>
            </motion.div>
          </div>
        </section>

        {/* ── Trust bar ─────────────────────────────────────────── */}
        <TrustBar />

        {/* ── Main content + sidebar form ───────────────────────── */}
        <section className="py-20 sm:py-28">
          <div className="container">
            <div className="grid lg:grid-cols-[1fr_360px] gap-14 xl:gap-20">
              {/* Left — content */}
              <div>
                <p className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed mb-8 border-l-2 border-primary pl-5">
                  {p.intro}
                </p>
                <div className="space-y-5 mb-10">
                  {p.body.map((para, i) => (
                    <p
                      key={i}
                      className="text-muted-foreground leading-relaxed font-light text-base"
                    >
                      {para}
                    </p>
                  ))}
                </div>

                {/* What's included */}
                <h2
                  className="text-2xl sm:text-3xl font-semibold mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  What&apos;s Included
                </h2>
                <ul className="grid sm:grid-cols-2 gap-3 mb-12">
                  {p.includes.map(item => (
                    <li
                      key={item}
                      className="flex items-start gap-3 bg-card border border-border/60 p-4"
                    >
                      <CheckCircle2
                        className="h-4 w-4 text-primary mt-0.5 flex-shrink-0"
                        aria-hidden
                      />
                      <span className="text-sm text-muted-foreground font-light leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Mid-page CTA */}
                <div className="bg-card border border-border/60 p-7 mb-12 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="flex-1">
                    <p
                      className="text-base font-semibold mb-1"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Ready to get started?
                    </p>
                    <p className="text-sm text-muted-foreground font-light">
                      Free on-site consultation. We come to you, no obligation.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                    <a
                      href={SITE.phoneHref}
                      className="flex items-center gap-2 border border-primary text-primary px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/10 transition-colors min-h-[44px]"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      <Phone className="h-3.5 w-3.5" /> {SITE.phone}
                    </a>
                    <a
                      href="#service-form"
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-all hover:gap-3 min-h-[44px]"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Get Free Estimate <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Service areas */}
                <h2
                  className="text-2xl sm:text-3xl font-semibold mb-5"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Service Areas
                </h2>
                <p className="text-muted-foreground font-light mb-3">
                  Precision Core Builders provides{" "}
                  <strong className="text-foreground font-medium">
                    {p.title.toLowerCase()}
                  </strong>{" "}
                  services throughout:
                </p>
                <div className="flex flex-wrap gap-2 mb-12">
                  {p.serviceAreas.map(area => (
                    <span
                      key={area}
                      className="px-3 py-1.5 border border-border/60 text-xs text-muted-foreground bg-card"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {area}
                    </span>
                  ))}
                </div>

                {/* FAQ */}
                <h2
                  className="text-2xl sm:text-3xl font-semibold mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4 mb-12">
                  {p.faqs.map(({ q, a }) => (
                    <details
                      key={q}
                      className="group border border-border/60 bg-card"
                    >
                      <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none min-h-[56px]">
                        <span className="text-sm font-semibold text-foreground">
                          {q}
                        </span>
                        <span
                          className="text-primary flex-shrink-0 group-open:rotate-180 transition-transform duration-200 text-lg leading-none"
                          aria-hidden
                        >
                          +
                        </span>
                      </summary>
                      <div className="px-5 pb-5">
                        <p className="text-sm text-muted-foreground font-light leading-relaxed">
                          {a}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>

                {/* Related services */}
                <h2
                  className="text-xl font-semibold mb-5"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Other Services We Offer
                </h2>
                <div className="flex flex-wrap gap-3">
                  {p.relatedServices.map(s => (
                    <a
                      key={s.href}
                      href={s.href}
                      className="flex items-center gap-2 border border-border/60 bg-card px-4 py-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors min-h-[44px]"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {s.label} <ArrowRight className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Right — sticky estimate form */}
              <div>
                <div
                  id="service-form"
                  className="bg-card border border-border/60 p-7 lg:sticky lg:top-24"
                >
                  {status === "success" ? (
                    <div className="text-center py-10">
                      <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
                      <p
                        className="font-semibold mb-1"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Message received.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We'll be in touch within one business day.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p
                        className="text-[10px] tracking-[0.2em] uppercase text-primary font-semibold mb-1"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Free Consultation
                      </p>
                      <h3
                        className="text-xl font-semibold mb-6"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Get Your Free Estimate
                      </h3>
                      <form
                        name={`${p.title.toLowerCase().replace(/\s+/g, "-")}-inquiry`}
                        method="POST"
                        data-netlify="true"
                        netlify-honeypot="bot-field"
                        onSubmit={onSubmit}
                        className="space-y-4"
                        aria-label={`${p.title} inquiry form`}
                      >
                        <input
                          type="hidden"
                          name="form-name"
                          value={`${p.title.toLowerCase().replace(/\s+/g, "-")}-inquiry`}
                        />
                        <input type="hidden" name="service" value={p.title} />
                        <p className="hidden" aria-hidden>
                          <label>
                            Skip: <input name="bot-field" tabIndex={-1} />
                          </label>
                        </p>
                        {[
                          {
                            id: "name",
                            label: "Your Name",
                            type: "text",
                            required: true,
                            placeholder: "Jane Smith",
                          },
                          {
                            id: "phone",
                            label: "Phone",
                            type: "tel",
                            required: false,
                            placeholder: "(541) 555-0100",
                          },
                          {
                            id: "email",
                            label: "Email",
                            type: "email",
                            required: true,
                            placeholder: "jane@email.com",
                          },
                        ].map(f => (
                          <div key={f.id}>
                            <label
                              htmlFor={f.id}
                              className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              {f.label}
                              {f.required && (
                                <span className="text-primary ml-1" aria-hidden>
                                  *
                                </span>
                              )}
                            </label>
                            <input
                              id={f.id}
                              name={f.id}
                              type={f.type}
                              required={f.required}
                              autoComplete={f.id}
                              value={(fields as Record<string, string>)[f.id]}
                              onChange={onChange}
                              className={input}
                              placeholder={f.placeholder}
                            />
                          </div>
                        ))}
                        <div>
                          <label
                            htmlFor="message"
                            className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            Project Details{" "}
                            <span className="text-primary" aria-hidden>
                              *
                            </span>
                          </label>
                          <textarea
                            id="message"
                            name="message"
                            required
                            rows={3}
                            value={fields.message}
                            onChange={onChange}
                            className={`${input} resize-none`}
                            placeholder={`Describe your ${p.title.toLowerCase()} project…`}
                          />
                        </div>
                        {status === "error" && (
                          <p className="text-sm text-destructive" role="alert">
                            Error — call us at{" "}
                            <a href={SITE.phoneHref} className="underline">
                              {SITE.phone}
                            </a>
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={status === "submitting"}
                          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 text-[11px] font-bold tracking-[0.12em] uppercase hover:bg-primary/90 disabled:opacity-60 transition-all hover:gap-3 min-h-[52px]"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {status === "submitting" ? (
                            "Sending…"
                          ) : (
                            <>
                              {`Request ${p.title} Estimate`}{" "}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                        <a
                          href={SITE.phoneHref}
                          className="flex items-center justify-center gap-2 border border-border/60 text-muted-foreground py-3 text-[11px] font-semibold tracking-widest uppercase hover:border-primary hover:text-primary transition-colors min-h-[44px]"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          <Phone className="h-3.5 w-3.5" /> Or Call {SITE.phone}
                        </a>
                        <p className="text-[10px] text-center text-muted-foreground/50 font-light">
                          Free · No obligation · {SITE.license}
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
