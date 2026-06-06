/**
 * ScrollProgressBar — thin gold bar at top of viewport showing scroll depth.
 * Respects prefers-reduced-motion by using opacity-only fallback.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      rafRef.current = null;
    };

    const onScroll = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-hidden={progress <= 0 ? "true" : "false"}
      className="fixed top-0 left-0 z-[60] h-[2px] bg-primary transition-all duration-75 motion-reduce:transition-none"
      style={{
        width: `${progress}%`,
        opacity: progress > 0 ? 1 : 0,
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * BackToTop — floating button that appears after scrolling down,
 * smoothly returns user to the top of the page.
 * Respects prefers-reduced-motion.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const isAdminMobile = isMobile && location.startsWith("/admin");

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > 600);
      rafRef.current = null;
    };

    const onScroll = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollTop = () => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  };

  return (
    <button
      onClick={scrollTop}
      aria-label="Back to top"
      className={`fixed right-4 z-40 h-10 w-10 flex items-center justify-center bg-card border border-primary/40 text-primary shadow-lg transition-all duration-300 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:bottom-8 sm:right-6 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{
        // On public mobile the sticky Call/Estimate bar (~56px) occupies the
        // bottom edge, so lift the button above it; admin uses the taller
        // bottom-nav offset.
        bottom: isMobile
          ? `calc(var(--pcb-back-to-top-mobile-offset, ${
              isAdminMobile ? "5.5rem" : "4.75rem"
            }) + env(safe-area-inset-bottom, 0px))`
          : undefined,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}

/**
 * StickyEstimateCTA — desktop-only floating "Get a Free Estimate" pill that
 * slides in after the user scrolls past the hero. Keeps the primary conversion
 * action one click away on long marketing pages. Hidden on mobile (the bottom
 * Call/Estimate bar covers that), on app routes (admin/portal/auth), and on the
 * estimator/contact pages themselves where the CTA would be redundant.
 */
export function StickyEstimateCTA() {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const [location] = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > 700);
      rafRef.current = null;
    };
    const onScroll = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const hiddenRoute =
    location.startsWith("/admin") ||
    location.startsWith("/portal") ||
    location.startsWith("/auth") ||
    location === "/dev-login" ||
    location === "/estimator" ||
    location === "/contact";

  if (isMobile || hiddenRoute) return null;

  return (
    <Link
      href="/estimator"
      aria-label="Get a free estimate"
      className={`fixed bottom-8 right-20 z-40 hidden sm:inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 text-[11px] font-bold tracking-[0.12em] uppercase shadow-lg shadow-primary/25 rounded-sm transition-all duration-300 hover:bg-primary/90 hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ fontFamily: "var(--font-condensed)" }}
    >
      Get a Free Estimate
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

/**
 * SkipToContent — visually hidden link that becomes visible on focus.
 * Allows keyboard / screen-reader users to skip nav and jump to main content.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-bold focus:tracking-wider focus:uppercase focus:outline-none focus:ring-2 focus:ring-primary-foreground"
    >
      Skip to main content
    </a>
  );
}
