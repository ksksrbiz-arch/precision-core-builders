import { Button } from "@/components/ui/button";
import { SiteFooter, SiteNav } from "@/components/layout/SiteShell";
import { useSEO } from "@/hooks/useSEO";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Compass,
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

// All real public routes, used to suggest the closest match for a
// mistyped URL. Keep in sync with the router in App.tsx.
const KNOWN_ROUTES = [
  "/",
  "/about",
  "/services",
  "/portfolio",
  "/faq",
  "/contact",
  "/estimator",
  "/services/residential",
  "/services/remodels",
  "/services/new-construction",
  "/services/restoration",
  "/services/outdoor",
  "/services/painting",
  "/services/roofing",
  "/services/cabinets",
] as const;

// Standard Levenshtein edit distance between two strings.
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);
  for (let j = 0; j < cols; j += 1) {
    prev[j] = j;
  }
  for (let i = 1; i < rows; i += 1) {
    curr[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j += 1) {
      prev[j] = curr[j];
    }
  }
  return prev[cols - 1];
}

// Normalize a path: lowercase, strip query/hash and trailing slash.
function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0].toLowerCase();
  if (clean.length > 1 && clean.endsWith("/")) {
    return clean.replace(/\/+$/, "");
  }
  return clean;
}

// Find the closest known route to the current path, if any is a
// reasonably close match (small edit distance or a shared first
// segment). Returns null when nothing is close enough.
function suggestRoute(rawPath: string): string | null {
  const path = normalizePath(rawPath);
  if (!path || path === "/") {
    return null;
  }

  let best: string | null = null;
  let bestDistance = Infinity;
  const pathSegment = path.split("/")[1] ?? "";

  for (const route of KNOWN_ROUTES) {
    if (route === "/") {
      continue;
    }
    const distance = editDistance(path, route);
    const sharesSegment =
      pathSegment.length > 0 && route.split("/")[1] === pathSegment;
    // Accept a match if it's a near-miss typo, or shares the first
    // path segment (e.g. /services/foo -> a real /services/* route).
    const close = distance <= 4 || sharesSegment;
    if (close && distance < bestDistance) {
      best = route;
      bestDistance = distance;
    }
  }

  return best;
}

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
  const [location, setLocation] = useLocation();
  const suggestion = suggestRoute(location);
  useSEO({
    title: "Page Not Found",
    description:
      "We couldn't find that page. Browse our work, services, or get in touch with Precision Core Builders.",
    robots: "noindex, follow",
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
          {suggestion ? (
            <p className="text-muted-foreground mb-10 flex flex-wrap items-center justify-center gap-2">
              <Compass
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>Did you mean</span>
              <Link
                href={suggestion}
                className="text-gradient-gold font-semibold underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {suggestion}
              </Link>
              <span>?</span>
            </p>
          ) : null}
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
