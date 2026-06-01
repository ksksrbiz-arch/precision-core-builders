import { Button } from "@/components/ui/button";
import { SiteFooter, SiteNav } from "@/components/layout/SiteShell";
import { useSEO } from "@/hooks/useSEO";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const POPULAR = [
  { label: "Our Work", href: "/portfolio" },
  { label: "Services", href: "/services" },
  { label: "About Eric", href: "/about" },
  { label: "Contact", href: "/contact" },
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
      <main className="flex-1 flex items-center justify-center px-6 pt-[68px]">
        <div className="text-center max-w-md w-full py-20">
          <p className="text-7xl font-bold text-primary/20 font-[family-name:var(--font-mono)] mb-4">
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mb-3">
            Page Not Found
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Button onClick={() => setLocation("/")} size="lg" className="mb-10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div>
            <p
              className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60 mb-4 font-semibold"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Popular Pages
            </p>
            <ul className="grid grid-cols-2 gap-2 text-left">
              {POPULAR.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="flex items-center justify-between gap-2 border border-border/60 bg-card px-4 py-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors min-h-[44px]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {link.label}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
