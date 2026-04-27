/**
 * SiteShell — shared nav + mobile sticky CTA + footer used on every page.
 * Keeps brand consistency and ensures CTAs are always visible.
 */
import { DEV_BYPASS_KEY } from "@/_core/hooks/useAuth";
import { ASSETS, SITE } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Facebook,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Our Work", href: "/portfolio" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

/* ─── Dev Password Modal ────────────────────────────────────── */
// Sourced from Netlify env (VITE_DEV_PASSWORD). When unset, the dev modal
// stays disabled in production so a credential is never shipped in the bundle.
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? "";
const DEV_MODAL_ENABLED = import.meta.env.DEV || DEV_PASSWORD.length > 0;
const TAP_TARGET = 7;
const TAP_RESET_MS = 2000;

interface DevPasswordModalProps {
  onClose: () => void;
}

function DevPasswordModal({ onClose }: DevPasswordModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Defense-in-depth: without a configured password, never accept a match
    if (DEV_PASSWORD && value === DEV_PASSWORD) {
      localStorage.setItem(DEV_BYPASS_KEY, "true");
      window.location.href = "/admin";
    } else {
      setError(true);
      setValue("");
      setTimeout(() => setError(false), 1200);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Developer access"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={error ? { x: [-8, 8, -8, 8, 0] } : { opacity: 1, scale: 1 }}
        transition={{ duration: error ? 0.3 : 0.2 }}
        className="bg-card border border-amber-500/30 shadow-2xl w-full max-w-[320px]"
      >
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="h-11 w-11 border border-amber-500/40 bg-amber-500/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <p
            className="text-[9px] tracking-[0.3em] uppercase text-amber-400/70 font-semibold"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Developer Access
          </p>
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter password"
              autoComplete="off"
              className={`w-full bg-background border ${
                error ? "border-destructive" : "border-border/60"
              } px-4 py-3 text-sm text-center tracking-widest outline-none focus:border-amber-500/60 transition-colors`}
            />
            {error && (
              <p className="text-[11px] text-destructive font-medium">
                Incorrect password
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 py-3 text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-amber-500/30 transition-colors min-h-[48px]"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Unlock
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Top Nav ───────────────────────────────────────────────── */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showDevModal, setShowDevModal] = useState(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  function handleLogoTap(e: React.MouseEvent) {
    // When the dev modal isn't enabled (e.g. prod with no VITE_DEV_PASSWORD),
    // act as a normal home link instead of swallowing the click.
    if (!DEV_MODAL_ENABLED) return;
    e.preventDefault();
    const next = tapCount + 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (next >= TAP_TARGET) {
      setTapCount(0);
      setShowDevModal(true);
    } else {
      setTapCount(next);
      tapTimerRef.current = setTimeout(() => {
        setTapCount(0);
        // Single tap with no follow-up = user wants to go home
        if (next === 1) window.location.href = "/";
      }, TAP_RESET_MS);
    }
  }

  return (
    <>
      {showDevModal && DEV_MODAL_ENABLED && (
        <DevPasswordModal onClose={() => setShowDevModal(false)} />
      )}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border/50 shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
        style={{ transform: "translateZ(0)", willChange: "background-color" }}
      >
        <div className="container h-[68px] flex items-center justify-between">
          <a
            href="/"
            aria-label="Precision Core Builders — Home"
            className="flex-shrink-0"
            onClick={handleLogoTap}
          >
            <img
              src={ASSETS.logo}
              alt="Precision Core Builders"
              className="h-9 w-auto"
              width="180"
              height="36"
              fetchPriority="high"
            />
          </a>

          {/* Desktop nav */}
          <nav
            className="hidden lg:flex items-center gap-7"
            aria-label="Primary navigation"
          >
            {NAV_LINKS.map(n => (
              <a
                key={n.label}
                href={n.href}
                className="text-[12px] font-semibold tracking-[0.08em] uppercase text-muted-foreground hover:text-primary transition-colors duration-200"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Phone — visible md+ */}
            <a
              href={SITE.phoneHref}
              className="hidden md:flex items-center gap-2 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
              aria-label={`Call ${SITE.phone}`}
            >
              <Phone className="h-3.5 w-3.5" />
              {SITE.phone}
            </a>
            <a
              href="/contact"
              className="hidden sm:inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-[11px] font-bold tracking-[0.12em] uppercase hover:bg-primary/85 transition-all duration-200 hover:gap-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Free Estimate <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setOpen(o => !o)}
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden bg-card/98 backdrop-blur-md border-t border-border"
          >
            <nav
              className="container py-5 flex flex-col gap-0"
              aria-label="Mobile navigation"
            >
              {NAV_LINKS.map(n => (
                <a
                  key={n.label}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="py-4 text-[13px] font-bold tracking-widest uppercase text-muted-foreground hover:text-primary border-b border-border/40 transition-colors min-h-[48px] flex items-center"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {n.label}
                </a>
              ))}
              <div className="pt-5 pb-2 flex flex-col gap-3">
                <a
                  href={SITE.phoneHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 border border-primary/50 text-primary py-3.5 text-sm font-bold tracking-wider uppercase min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Phone className="h-4 w-4" /> {SITE.phone}
                </a>
                <a
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 text-sm font-bold tracking-wider uppercase min-h-[52px]"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Get Free Estimate <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </header>
    </>
  );
}

/* ─── Mobile Sticky CTA Bar ─────────────────────────────────────
 * Fixed bottom bar on mobile only — always-visible call + estimate.
 * Disappears on desktop (nav handles it).
 */
export function MobileCTABar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const h = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div
      className={`sm:hidden fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-label="Quick contact"
    >
      <div className="flex border-t border-border/60 bg-card/95 backdrop-blur-md">
        <a
          href={SITE.phoneHref}
          className="flex-1 flex items-center justify-center gap-2 py-4 text-[12px] font-bold tracking-widest uppercase text-primary border-r border-border/40 min-h-[56px] active:bg-primary/10"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <Phone className="h-4 w-4" /> Call Now
        </a>
        <a
          href="/contact"
          className="flex-1 flex items-center justify-center gap-2 py-4 text-[12px] font-bold tracking-widest uppercase bg-primary text-primary-foreground min-h-[56px] active:bg-primary/80"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          Free Estimate <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

/* ─── Site Footer ───────────────────────────────────────────── */
const SERVICES_FOOTER = [
  { label: "Residential", href: "/services/residential" },
  { label: "Remodels & Renovations", href: "/services/remodels" },
  { label: "New Construction", href: "/services/new-construction" },
  { label: "Restoration", href: "/services/restoration" },
  { label: "Outdoor Spaces", href: "/services/outdoor" },
  { label: "Painting", href: "/services/painting" },
  { label: "Roofing", href: "/services/roofing" },
  { label: "Custom Cabinets", href: "/services/cabinets" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-card/40 pb-20 sm:pb-0">
      <div className="container pt-14 pb-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <img
              src={ASSETS.logo}
              alt="Precision Core Builders"
              className="h-9 w-auto mb-4"
            />
            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
              Precision Construction, Core Values. Serving Eugene, Oregon and
              surrounding Lane County since 2004.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Shield
                className="h-3.5 w-3.5 text-primary flex-shrink-0"
                aria-hidden
              />
              <span>{SITE.license} · Licensed &amp; Insured</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <p
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Services
            </p>
            <ul className="space-y-2.5">
              {SERVICES_FOOTER.map(s => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors leading-tight block"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Company
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "About Us", href: "/about" },
                { label: "Our Team", href: "/about" },
                { label: "Our Work", href: "/portfolio" },
                { label: "FAQ", href: "/faq" },
                { label: "Contact", href: "/contact" },
              ].map(l => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-4"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Get In Touch
            </p>
            <div className="space-y-3 mb-5">
              {[
                { icon: Phone, value: SITE.phone, href: SITE.phoneHref },
                { icon: Mail, value: SITE.email, href: SITE.emailHref },
                { icon: MapPin, value: "Eugene, Oregon", href: undefined },
              ].map(({ icon: Icon, value, href }) => (
                <div key={value} className="flex items-start gap-3">
                  <Icon
                    className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0"
                    aria-hidden
                  />
                  {href ? (
                    <a
                      href={href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors break-all"
                    >
                      {value}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {value}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-[11px] font-bold tracking-[0.12em] uppercase hover:bg-primary/85 transition-all hover:gap-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Free Estimate <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Gold rule */}
        <div className="gold-rule mb-6" aria-hidden />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground/50">
          <p>
            &copy; {new Date().getFullYear()} Precision Core Builders. All
            rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={SITE.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Facebook className="h-3.5 w-3.5" /> Facebook
            </a>
            <span
              className="tracking-widest uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Powered by Precision Core
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
