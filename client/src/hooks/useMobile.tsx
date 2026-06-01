import * as React from "react";

const MOBILE_BREAKPOINT = 900;

export function useIsMobile() {
  // Resolve synchronously on first render so mobile devices don't flash the
  // desktop layout before the effect runs.
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

/** Detect if running as installed PWA (standalone mode) */
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standalone);

    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isStandalone;
}

/** Detect touch-only device (no hover) */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false);

  React.useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}
