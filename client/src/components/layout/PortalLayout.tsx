/**
 * PortalLayout — Shared layout for all client portal pages.
 * Provides the sticky nav bar, sign-out action, and consistent padding.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { ASSETS } from "@/const";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { ReactNode } from "react";

const NAV_LINKS = [
  { label: "Overview", href: "/portal" },
  { label: "Reports", href: "/portal/reports" },
  { label: "Selections", href: "/portal/finishes" },
  { label: "Ledger", href: "/portal/ledger" },
  { label: "Payments", href: "/portal/payments" },
  ...(import.meta.env?.VITE_FEATURE_BLUEPRINT === "true"
    ? [{ label: "Blueprints", href: "/portal/blueprint" }]
    : []),
] as const;

function PortalNav() {
  const { signOut } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 h-16 flex items-center border-b border-border/50 bg-background/95 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="container flex items-center justify-between gap-3">
        <a href="/" aria-label="Home" className="flex-shrink-0">
          <img
            src={ASSETS.logo}
            alt="Precision Core Builders"
            className="h-7 sm:h-8 w-auto"
          />
        </a>

        {/* Desktop / tablet nav */}
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

        {/* Desktop sign-out */}
        <button
          onClick={signOut}
          className="hidden sm:flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-destructive transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>

        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="sm:hidden h-10 w-10 inline-flex items-center justify-center rounded border border-border/40 bg-background active:scale-95 transition-transform"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 max-w-[85vw] p-0 [&>button]:hidden"
          >
            <SheetHeader className="border-b border-border/40 px-5 py-4 flex-row items-center justify-between space-y-0">
              <SheetTitle
                className="text-xs font-bold tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Client Portal
              </SheetTitle>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-accent"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </SheetHeader>
            <SheetDescription className="sr-only">
              Portal navigation menu
            </SheetDescription>
            <nav className="flex flex-col py-2">
              {NAV_LINKS.map(n => {
                const active =
                  n.href === "/portal"
                    ? location === "/portal"
                    : location.startsWith(n.href);
                return (
                  <a
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-5 py-3 text-sm font-semibold tracking-wide transition-colors min-h-[44px] ${
                      active
                        ? "text-primary bg-primary/5 border-l-2 border-primary"
                        : "text-foreground hover:bg-accent border-l-2 border-transparent"
                    }`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {n.label}
                  </a>
                );
              })}
            </nav>
            <div className="border-t border-border/40 px-5 py-4 mt-2">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors min-h-[44px]"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </SheetContent>
        </Sheet>
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
      <main className={`pt-16 pb-12 ${className ?? ""}`}>{children}</main>
    </div>
  );
}
