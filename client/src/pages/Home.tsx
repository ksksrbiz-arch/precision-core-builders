import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  HardHat,
  Hammer,
  Mail,
  MapPin,
  Mic,
  Phone,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

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

/* ─── Header / Navigation ──────────────────────────────────────────── */

function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="flex items-center gap-2.5">
          <HardHat className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg tracking-tight font-[family-name:var(--font-heading)]">
            Precision Core
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {["Services", "Values", "Process", "About", "Contact"].map(
            (item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item}
              </a>
            ),
          )}
        </nav>

        <Button size="sm" asChild>
          <a href="#contact">Get an Estimate</a>
        </Button>
      </div>
    </header>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-16">
      {/* Subtle decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#2D2D2D 1px, transparent 1px), linear-gradient(90deg, #2D2D2D 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
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
            CCB #246527 &middot; Eugene, Oregon
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
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8"
              asChild
            >
              <a href="#services">Explore Services</a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-muted-foreground"
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
      "Voice-to-report technology that converts field observations into structured, client-ready updates.",
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
    <section id="services" className="py-24 sm:py-32">
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
          {services.map((service) => (
            <motion.div key={service.title} variants={fadeUp}>
              <Card className="group h-full border-border/60 bg-card/60 backdrop-blur-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                <CardContent className="p-6 sm:p-8">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                    <service.icon className="h-6 w-6 text-primary" />
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
    <section id="values" className="py-24 sm:py-32 bg-card/50">
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
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
              Built on Core Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Three principles embedded in every line of code and every nail we
              drive.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {values.map((value) => (
              <motion.div
                key={value.title}
                variants={fadeUp}
                className="text-center"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <value.icon className="h-7 w-7 text-primary" />
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
    <section id="process" className="py-24 sm:py-32">
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
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
              From Vision to Reality
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A proven four-phase process designed for accountability and
              precision at every step.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
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
    <section id="about" className="py-24 sm:py-32 bg-card/50">
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
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6"
          >
            Eric Tadlock
          </motion.h2>

          <motion.div variants={fadeUp}>
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Award className="h-12 w-12 text-primary" />
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-lg text-muted-foreground leading-relaxed mb-4"
          >
            Licensed Oregon contractor (CCB #246527) specializing in luxury
            residential and commercial construction in the Eugene area. Every
            project is managed with the same precision tools we build into this
            platform.
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-muted-foreground leading-relaxed mb-8"
          >
            Precision Core Builders combines decades of hands-on craftsmanship
            with modern construction management technology. The result is a
            building experience that&apos;s transparent, efficient, and built to
            last.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Eugene, Oregon</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>CCB #246527</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Contact ──────────────────────────────────────────────────────── */

function ContactSection() {
  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium tracking-widest uppercase text-primary mb-3"
          >
            Start a Conversation
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
          >
            Let&apos;s Build Together
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground text-lg mb-10"
          >
            Ready to bring precision to your next project? Reach out and
            we&apos;ll start with a free consultation.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button size="lg" className="text-base px-8 w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              Email Us
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 w-full sm:w-auto"
            >
              <Phone className="mr-2 h-4 w-4" />
              Call Now
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="grid sm:grid-cols-3 gap-6 text-sm"
          >
            <div className="p-4 rounded-lg bg-card border border-border/60">
              <MapPin className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="font-medium mb-1">Location</p>
              <p className="text-muted-foreground">Eugene, Oregon</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/60">
              <Phone className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="font-medium mb-1">Phone</p>
              <p className="text-muted-foreground">Available on request</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/60">
              <Mail className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="font-medium mb-1">Email</p>
              <p className="text-muted-foreground">Available on request</p>
            </div>
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <HardHat className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight font-[family-name:var(--font-heading)]">
              Precision Core Builders
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            {["Services", "Values", "Process", "About", "Contact"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="hover:text-foreground transition-colors"
                >
                  {item}
                </a>
              ),
            )}
          </nav>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Precision Core Builders. All
            rights reserved.
          </p>
          <p>CCB #246527 &middot; Eugene, Oregon</p>
        </div>
      </div>
    </footer>
  );
}
