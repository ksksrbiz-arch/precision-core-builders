/**
 * Contact page — full inquiry form, phone, email, service area.
 */
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
  CheckCircle2,
  Clock,
  Facebook,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
} from "lucide-react";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type Status = "idle" | "submitting" | "success" | "error";

const inputCls =
  "w-full px-4 py-3 bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors";

export default function Contact() {
  useSEO({
    title: "Contact Us — Free Estimate",
    description:
      "Contact Precision Core Builders for a free on-site estimate. Call Eric Tadlock at 541-852-5144 or fill out our form. Serving Eugene, Springfield, and Lane County, Oregon.",
    canonical: "https://precision-core.netlify.app/contact",
  });

  const [status, setStatus] = useState<Status>("idle");
  const [fields, setFields] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    budget: "",
    message: "",
  });

  const onChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => setFields(p => ({ ...p, [e.target.name]: e.target.value }));

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
      if (res.ok)
        setFields({
          name: "",
          email: "",
          phone: "",
          projectType: "",
          budget: "",
          message: "",
        });
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <MobileCTABar />

      <main id="main-content" className="flex-1 pt-[68px]">
        {/* Hero */}
        <section className="py-20 sm:py-28 relative">
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
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.span
                variants={fadeUp}
                className="block text-primary text-[11px] tracking-[0.28em] uppercase font-semibold mb-5"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Get In Touch
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="text-5xl sm:text-6xl font-semibold leading-tight mb-5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Let&apos;s build
                <br />
                <em className="text-primary italic">something remarkable.</em>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="text-muted-foreground text-lg leading-relaxed font-light"
              >
                Free on-site consultation. We come to you, review your project,
                and give you a real written estimate — no obligation.
              </motion.p>
            </motion.div>
          </div>
        </section>

        <TrustBar />

        {/* Form + info */}
        <section className="py-16 sm:py-24">
          <div className="container">
            <div className="grid lg:grid-cols-[1fr_380px] gap-12 xl:gap-20 max-w-6xl mx-auto">
              {/* Form */}
              <div>
                {status === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border/60 p-10 text-center"
                  >
                    <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h2
                      className="text-2xl font-semibold mb-2"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Message received.
                    </h2>
                    <p className="text-muted-foreground font-light mb-6">
                      We&apos;ll be in touch within one business day to schedule
                      your free consultation.
                    </p>
                    <a
                      href={SITE.phoneHref}
                      className="inline-flex items-center gap-2 text-primary text-sm hover:underline"
                    >
                      <Phone className="h-4 w-4" /> Call directly: {SITE.phone}
                    </a>
                  </motion.div>
                ) : (
                  <form
                    name="project-inquiry"
                    method="POST"
                    data-netlify="true"
                    netlify-honeypot="bot-field"
                    onSubmit={onSubmit}
                    className="space-y-5"
                    aria-label="Project inquiry form"
                  >
                    <input
                      type="hidden"
                      name="form-name"
                      value="project-inquiry"
                    />
                    <p className="hidden" aria-hidden>
                      <label>
                        Skip: <input name="bot-field" tabIndex={-1} />
                      </label>
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        {
                          id: "name",
                          label: "Your Name",
                          type: "text",
                          req: true,
                          placeholder: "Jane Smith",
                          auto: "name",
                        },
                        {
                          id: "email",
                          label: "Email",
                          type: "email",
                          req: true,
                          placeholder: "jane@email.com",
                          auto: "email",
                        },
                        {
                          id: "phone",
                          label: "Phone",
                          type: "tel",
                          req: false,
                          placeholder: "(541) 555-0100",
                          auto: "tel",
                          inputMode: "tel" as const,
                        },
                        {
                          id: "budget",
                          label: "Project Budget",
                          type: "text",
                          req: false,
                          placeholder: "e.g. $50k–$100k",
                          auto: "off",
                        },
                      ].map(f => (
                        <div key={f.id}>
                          <label
                            htmlFor={f.id}
                            className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            {f.label}
                            {f.req && (
                              <span className="text-primary ml-1" aria-hidden>
                                *
                              </span>
                            )}
                          </label>
                          <input
                            id={f.id}
                            name={f.id}
                            type={f.type}
                            required={f.req}
                            autoComplete={f.auto}
                            inputMode={
                              (f as { inputMode?: "tel" | "email" }).inputMode
                            }
                            value={(fields as Record<string, string>)[f.id]}
                            onChange={onChange}
                            className={inputCls}
                            placeholder={f.placeholder}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label
                        htmlFor="projectType"
                        className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 mb-2 font-medium"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Project Type
                      </label>
                      <select
                        id="projectType"
                        name="projectType"
                        value={fields.projectType}
                        onChange={onChange}
                        className={inputCls}
                      >
                        <option value="">Select a service…</option>
                        {[
                          "Residential Construction",
                          "Remodel / Renovation",
                          "New Construction",
                          "Restoration",
                          "Outdoor Spaces",
                          "Painting",
                          "Roofing",
                          "Custom Cabinets",
                          "Multiple / Not Sure",
                        ].map(o => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>

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
                        rows={5}
                        value={fields.message}
                        onChange={onChange}
                        className={`${inputCls} resize-none`}
                        placeholder="Tell us about your project — location, timeline, scope, anything that helps us understand what you need…"
                      />
                    </div>

                    {status === "error" && (
                      <p className="text-sm text-destructive" role="alert">
                        Something went wrong — please call us at{" "}
                        <a href={SITE.phoneHref} className="underline">
                          {SITE.phone}
                        </a>
                      </p>
                    )}

                    {/* Polite SR-only status — announces submission progress
                        without stealing focus or duplicating the error alert. */}
                    <p className="sr-only" aria-live="polite">
                      {status === "submitting"
                        ? "Submitting your inquiry…"
                        : ""}
                    </p>

                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-primary/90 disabled:opacity-60 transition-all hover:gap-3 min-h-[54px]"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {status === "submitting" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send Project Inquiry{" "}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-center text-muted-foreground/50 font-light">
                      Free · No obligation · {SITE.license}
                    </p>
                  </form>
                )}
              </div>

              {/* Contact info sidebar */}
              <div className="space-y-4">
                {[
                  {
                    icon: Phone,
                    label: "Call or Text",
                    value: SITE.phone,
                    href: SITE.phoneHref,
                    sub: "Direct line to Eric",
                  },
                  {
                    icon: Mail,
                    label: "Email",
                    value: SITE.email,
                    href: SITE.emailHref,
                    sub: "We reply within one business day",
                  },
                  {
                    icon: MapPin,
                    label: "Service Area",
                    value: "Eugene, OR & Lane County",
                    href: undefined,
                    sub: "Springfield · Coburg · Creswell · Cottage Grove",
                  },
                  {
                    icon: Clock,
                    label: "Hours",
                    value: "Mon – Fri, 7am – 5pm",
                    href: undefined,
                    sub: "Emergency line available for active projects",
                  },
                  {
                    icon: Shield,
                    label: "License",
                    value: SITE.license,
                    href: undefined,
                    sub: "Licensed & insured in Oregon",
                  },
                ].map(({ icon: Icon, label, value, href, sub }) => (
                  <div
                    key={label}
                    className="bg-card border border-border/60 p-5 flex gap-4"
                  >
                    <div className="h-9 w-9 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-primary" aria-hidden />
                    </div>
                    <div>
                      <p
                        className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground/60 mb-1 font-semibold"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {label}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors break-all"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-foreground">
                          {value}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground font-light mt-0.5">
                        {sub}
                      </p>
                    </div>
                  </div>
                ))}

                <a
                  href={SITE.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-border/60 bg-card hover:border-primary/30 transition-colors"
                >
                  <Facebook className="h-5 w-5 text-[#1877F2]" />
                  <div>
                    <p className="text-sm font-semibold">Facebook</p>
                    <p className="text-[11px] text-muted-foreground">
                      Precision Core Builders
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
