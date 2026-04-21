/**
 * ScrollProgressBar — thin gold bar at top of viewport showing scroll depth.
 * Respects prefers-reduced-motion by using opacity-only fallback.
 */
import { useEffect, useRef, useState } from "react";

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
      className={`fixed bottom-20 right-4 z-40 h-10 w-10 flex items-center justify-center bg-card border border-primary/40 text-primary shadow-lg transition-all duration-300 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:bottom-8 sm:right-6 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
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
