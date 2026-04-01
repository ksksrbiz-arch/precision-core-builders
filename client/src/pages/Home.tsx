import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SITE } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Hammer,
  HardHat,
  Mail,
  MapPin,
  Menu,
  Mic,
  Phone,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const NAV_LINKS = ["Services", "Values", "Process", "About", "Contact"];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main>
        <HeroSection />
        <ServicesSection />
        <ValuesSection />
        <ProcessSection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────────── */

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5" aria-label="Precision Core Builders — Home">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <HardHat className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <span className="block font-semibold text-sm tracking-tight font-[family-name:var(--font-heading)]">
              Precision Core
            </span>
            <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">
              Builders
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {NAV_LINKS.map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button size="sm" className="hidden sm:inline-flex" asChild>
            <a href="#contact">Get an Estimate</a>
          </Button>
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md">
          <nav className="container py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_LINKS.map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {item}
              </a>
            ))}
            <Separator className="my-2" />
            <Button size="sm" className="w-full" asChild>
              <a href="#contact" onClick={() => setMobileOpen(false)}>
                Get an Estimate
              </a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section
      className="relative min-h-[90vh] flex items-center pt-16"
      aria-label="Hero"
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#2D2D2D 1px, transparent 1px), linear-gradient(90deg, #2D2D2D 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        aria-hidden
      />

      <div className="container relative">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-3xl"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium tracking-widest uppercase text-primary mb-6"
          >
            {SITE.license} &middot; {SITE.location}
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight mb-6"
          >
            Building with
            <br />
            <span className="text-primary italic">precision</span> and{" "}
            <span className="text-primary italic">purpose</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10"
          >
            Luxury construction management that transforms how your project
            operates — from field to finish, with complete transparency.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="text-base px-8" asChild>
              <a href="#contact">
                Start Your Project
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8" asChild>
              <a href="#services">Explore Services</a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-muted-foreground"
          aria-hidden
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Services ─────────────────────────────────────────────────────── */

const services = [
  {
    icon: ClipboardCheck,
    title: "Project Management",
    description:
      "End-to-end project oversight with real-time reporting, budget tracking, and milestone management.",
  },
  {
    icon: Mic,
    title: "Digital Field Reporting",
    description:
      "Voice-to-report technology converts on-site observations into structured, client-ready daily updates.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "Weather-responsive Gantt charts that automatically adjust timelines based on Eugene, OR conditions.",
  },
  {
    icon: BarChart3,
    title: "Cost Estimation",
    description:
      "AI-powered project estimating with real-time cost breakdowns and material procurement tracking.",
  },
  {
    icon: Users,
    title: "Client Portal",
    description:
      "Live project timelines, finish selections, and transparent decision ledgers for every client.",
  },
  {
    icon: Sparkles,
    title: "Quality Assurance",
    description:
      "Documented inspections, photo evidence, and immutable records of every decision and milestone.",
  },
];

function ServicesSection() {
  return (
    <section id="services" className="py-24 sm:py-32" aria-labelledby="services-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium tracking-widest uppercase text-primary mb-3"
          >
            What We Do
          </motion.p>
          <motion.h2
            id="services-heading"
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
          >
            Operational Excellence
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground max-w-2xl mx-auto text-lg"
          >
            Every tool and workflow designed to eliminate manual overhead and
            give you complete visibility into your project.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map(service => (
            <motion.div key={service.title} variants={fadeUp}>
              <Card className="group h-full border-border/60 bg-card/60 backdrop-blur-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                <CardContent className="p-6 sm:p-8">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                    <service.icon className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 tracking-tight">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Core Values ──────────────────────────────────────────────────── */

const values = [
  {
    icon: Shield,
    title: "Trust",
    description:
      "Transparent, immutable ledgers of every project decision, change order, and cost. You see exactly what we see.",
  },
  {
    icon: Users,
    title: "Respect",
    description:
      "Clients have real-time portal access to timelines, selections, and progress — because your project is your project.",
  },
  {
    icon: Hammer,
    title: "Diligence",
    description:
      "Automated workflows eliminate guesswork. Every report, schedule update, and procurement step is tracked and verified.",
  },
];

function ValuesSection() {
  return (
    <section id="values" className="py-24 sm:py-32 bg-card/50" aria-labelledby="values-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">
              Our Foundation
            </p>
            <h2
              id="values-heading"
              className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
            >
              Built on Core Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Three principles embedded in every line of code and every nail we
              drive.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {values.map(value => (
              <motion.div
                key={value.title}
                variants={fadeUp}
                className="text-center"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <value.icon className="h-7 w-7 text-primary" aria-hidden />
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">
                  {value.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Process ──────────────────────────────────────────────────────── */

const steps = [
  {
    number: "01",
    title: "Discovery & Estimation",
    description:
      "We assess your project scope, provide AI-powered cost estimates, and establish a transparent budget framework.",
  },
  {
    number: "02",
    title: "Planning & Scheduling",
    description:
      "Smart Gantt charts map every phase of construction, automatically adapting to weather and dependencies.",
  },
  {
    number: "03",
    title: "Execution & Reporting",
    description:
      "Daily voice-to-report updates, real-time client portal access, and documented quality checks at every stage.",
  },
  {
    number: "04",
    title: "Delivery & Handoff",
    description:
      "Complete project documentation, final walk-throughs, and a permanent record in your digital project ledger.",
  },
];

function ProcessSection() {
  return (
    <section id="process" className="py-24 sm:py-32" aria-labelledby="process-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">
              How We Work
            </p>
            <h2
              id="process-heading"
              className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
            >
              From Vision to Reality
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A proven four-phase process designed for accountability and
              precision at every step.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(step => (
              <motion.div key={step.number} variants={fadeUp}>
                <span className="text-4xl font-bold text-primary/20 font-[family-name:var(--font-mono)]">
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold mt-2 mb-3 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── About ────────────────────────────────────────────────────────── */

function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32 bg-card/50" aria-labelledby="about-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium tracking-widest uppercase text-primary mb-3"
          >
            The Builder
          </motion.p>
          <motion.h2
            id="about-heading"
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6"
          >
            {SITE.owner}
          </motion.h2>

          <motion.div variants={fadeUp}>
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Award className="h-12 w-12 text-primary" aria-hidden />
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-lg text-muted-foreground leading-relaxed mb-4"
          >
            Licensed Oregon contractor ({SITE.license}) specializing in luxury
            residential and commercial construction in the Eugene area. Every
            project is managed with the same precision tools we build into this
            platform.
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-muted-foreground leading-relaxed mb-8"
          >
            Precision Core Builders combines decades of hands-on craftsmanship
            with modern construction management technology — delivering a
            building experience that&apos;s transparent, efficient, and built to
            last.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              <span>{SITE.location}</span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" aria-hidden />
              <span>{SITE.license}</span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" aria-hidden />
              <a href={SITE.phoneHref} className="hover:text-foreground transition-colors">
                {SITE.phone}
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Contact ──────────────────────────────────────────────────────── */

type FormState = "idle" | "submitting" | "success" | "error";

function ContactSection() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    budget: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState("submitting");

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      });

      if (res.ok) {
        setFormState("success");
        setFormData({ name: "", email: "", phone: "", projectType: "", budget: "", message: "" });
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  };

  return (
    <section id="contact" className="py-24 sm:py-32" aria-labelledby="contact-heading">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">
              Start a Conversation
            </p>
            <h2
              id="contact-heading"
              className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
            >
              Let&apos;s Build Together
            </h2>
            <p className="text-muted-foreground text-lg">
              Ready to bring precision to your next project? Reach out for a
              free consultation.
            </p>
          </motion.div>

          {/* Direct contact strips */}
          <motion.div
            variants={fadeUp}
            className="grid sm:grid-cols-3 gap-4 mb-12"
          >
            <a
              href={SITE.phoneHref}
              className="group p-5 rounded-xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <Phone className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" aria-hidden />
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Call direct</p>
              <p className="font-semibold text-sm">{SITE.phone}</p>
            </a>
            <a
              href={SITE.emailHref}
              className="group p-5 rounded-xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <Mail className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" aria-hidden />
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Email</p>
              <p className="font-semibold text-sm break-all">{SITE.email}</p>
            </a>
            <div className="p-5 rounded-xl bg-card border border-border/60 text-center">
              <MapPin className="h-6 w-6 text-primary mx-auto mb-2" aria-hidden />
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Location</p>
              <p className="font-semibold text-sm">{SITE.location}</p>
            </div>
          </motion.div>

          {/* Netlify contact form */}
          <motion.div
            variants={fadeUp}
            className="bg-card border border-border/60 rounded-2xl p-6 sm:p-10"
          >
            {formState === "success" ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-green-600" aria-hidden />
                </div>
                <h3 className="text-xl font-semibold mb-2">Message received.</h3>
                <p className="text-muted-foreground">
                  Eric will be in touch within one business day.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-6 tracking-tight">
                  Free Project Consultation
                </h3>
                {/* Netlify Forms: data-netlify="true" enables form detection at build time */}
                <form
                  name="project-inquiry"
                  method="POST"
                  data-netlify="true"
                  netlify-honeypot="bot-field"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  aria-label="Project inquiry form"
                >
                  {/* Hidden fields required by Netlify Forms */}
                  <input type="hidden" name="form-name" value="project-inquiry" />
                  <p className="hidden" aria-hidden>
                    <label>
                      Don&apos;t fill this out if you&apos;re human:{" "}
                      <input name="bot-field" tabIndex={-1} />
                    </label>
                  </p>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Full Name <span className="text-destructive" aria-hidden>*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Email Address <span className="text-destructive" aria-hidden>*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                        placeholder="(541) 555-0100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="projectType"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Project Type <span className="text-destructive" aria-hidden>*</span>
                      </label>
                      <select
                        id="projectType"
                        name="projectType"
                        required
                        value={formData.projectType}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      >
                        <option value="">Select type…</option>
                        <option value="new-home">New Home Build</option>
                        <option value="addition">Home Addition</option>
                        <option value="remodel-full">Full Remodel</option>
                        <option value="remodel-kitchen">Kitchen Remodel</option>
                        <option value="remodel-bath">Bathroom Remodel</option>
                        <option value="commercial">Commercial Build-Out</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="budget"
                      className="block text-sm font-medium mb-1.5"
                    >
                      Approximate Budget
                    </label>
                    <select
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="under-50k">Under $50,000</option>
                      <option value="50-150k">$50,000 – $150,000</option>
                      <option value="150-350k">$150,000 – $350,000</option>
                      <option value="350-750k">$350,000 – $750,000</option>
                      <option value="750k-plus">$750,000+</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium mb-1.5"
                    >
                      Project Description <span className="text-destructive" aria-hidden>*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-none"
                      placeholder="Tell us about your project — location, timeline, and any specific requirements…"
                    />
                  </div>

                  {formState === "error" && (
                    <p className="text-sm text-destructive" role="alert">
                      Something went wrong. Please call us directly at{" "}
                      <a href={SITE.phoneHref} className="underline">
                        {SITE.phone}
                      </a>
                      .
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={formState === "submitting"}
                    aria-busy={formState === "submitting"}
                  >
                    {formState === "submitting"
                      ? "Sending…"
                      : "Send Inquiry"}
                    {formState !== "submitting" && (
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    We respond within one business day. Licensed &amp; insured —{" "}
                    {SITE.license}.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
                <HardHat className="h-3.5 w-3.5 text-primary-foreground" aria-hidden />
              </div>
              <span className="font-semibold tracking-tight font-[family-name:var(--font-heading)]">
                Precision Core Builders
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {SITE.tagline}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col sm:flex-row gap-8" aria-label="Footer navigation">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Navigation
              </p>
              <ul className="space-y-2">
                {NAV_LINKS.map(item => (
                  <li key={item}>
                    <a
                      href={`#${item.toLowerCase()}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Contact
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href={SITE.phoneHref}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {SITE.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={SITE.emailHref}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {SITE.email}
                  </a>
                </li>
                <li>
                  <span className="text-sm text-muted-foreground">
                    {SITE.location}
                  </span>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Precision Core Builders. All
            rights reserved.
          </p>
          <p>{SITE.license} &middot; {SITE.location}</p>
        </div>
      </div>
    </footer>
  );
}
