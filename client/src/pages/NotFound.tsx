import { Button } from "@/components/ui/button";
import { SiteFooter, SiteNav } from "@/components/layout/SiteShell";
import { useSEO } from "@/hooks/useSEO";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Hammer,
  Image,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

type QuickLink = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const QUICK_LINKS: QuickLink[] = [
  {
    label: "Our Work",
    description: "Browse completed builds and remodels.",
    href: "/portfolio",
    icon: Image,
  },
  {
    label: "Services",
    description: "New construction, remodels, restoration.",
    href: "/services",
    icon: Hammer,
  },
  {
    label: "Estimator",
    description: "Get a ballpark for your project.",
    href: "/estimator",
    icon: Calculator,
  },
  {
    label: "Contact",
    description: "Talk with Eric about your next build.",
    href: "/contact",
    icon: Phone,
  },
];

export default function NotFound() {
  const [, setLocation] = useLocation();
  useSEO({
    title: "Page Not Found",
    description:
      "We couldn't find that page. Browse our work, services, or get in touch with Precision Core Builders.",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteNav />
      <main
        id="main-content"
        className="relative flex-1 flex items-center justify-center px-6 pt-[68px] overflow-hidden"
      >
        <div className="glow-gold-top" aria-hidden="true" />
        <div className="relative text-center max-w-2xl w-full py-20 sm:py-28">
          <p className="eyebrow text-primary/70 mb-5">Error 404</p>
          <p
            className="display-hero text-gradient-gold mb-6"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            404
          </p>
          <h1
            className="display-section mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            This corner&apos;s still framed out.
          </h1>
          <span
            className="heading-bar heading-bar-center mb-6"
            aria-hidden="true"
          />
          <p className="text-muted-foreground mb-10 leading-relaxed max-w-md mx-auto">
            The page you&apos;re after isn&apos;t on the blueprint &mdash; it
            may have moved or never broke ground. Let&apos;s get you back to
            solid footing.
          </p>
          <Button
            onClick={() => setLocation("/")}
            size="lg"
            className="mb-14 card-lift"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div>
            <p className="eyebrow text-muted-foreground/60 mb-5">
              Where to next
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {QUICK_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="card-lift ring-gradient-gold group flex items-center gap-4 px-5 py-4 min-h-[64px] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border/60 text-primary transition-colors group-hover:border-primary/50">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className="block text-sm font-semibold tracking-wider uppercase text-foreground"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {link.label}
                        </span>
                        <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
                          {link.description}
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
