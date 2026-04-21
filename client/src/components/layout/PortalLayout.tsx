/**
 * PortalLayout — Shared layout for all client portal pages.
 * Provides the sticky nav bar, sign-out action, and consistent padding.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { ASSETS } from "@/const";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

const NAV_LINKS = [
  { label: "Overview", href: "/portal" },
  { label: "Reports", href: "/portal/reports" },
  { label: "Selections", href: "/portal/finishes" },
  { label: "Ledger", href: "/portal/ledger" },
  { label: "Payments", href: "/portal/payments" },
] as const;

function PortalNav() {
  const { signOut } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[64px] flex items-center border-b border-border/50 bg-background/95 backdrop-blur-md">
      <div className="container flex items-center justify-between">
        <a href="/" aria-label="Home">
          <img
            src={ASSETS.logo}
            alt="Precision Core Builders"
            className="h-8 w-auto"
          />
        </a>
        <nav className="hidden sm:flex items-center gap-6">
          {NAV_LINKS.map(n => (
            <a
              key={n.href}
              href={n.href}
              className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-destructive transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </header>
  );
}

interface PortalLayoutProps {
  children: ReactNode;
  /** Optional extra className on the <main> wrapper */
  className?: string;
}

export function PortalLayout({ children, className }: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PortalNav />
      <main className={`pt-[64px] ${className ?? ""}`}>{children}</main>
    </div>
  );
}
