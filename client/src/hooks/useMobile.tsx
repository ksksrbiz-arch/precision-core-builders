import * as React from "react";

const MOBILE_BREAKPOINT = 900;

// Phone vs. tablet split. Phones (<768px) keep the bottom-nav phone UI; the
// 768–1023px range is treated as a tablet and gets the desktop sidebar shell.
// Kept separate from MOBILE_BREAKPOINT so existing useIsMobile() consumers
// (which branch at 900px) are unaffected.
const PHONE_BREAKPOINT = 768;
const TABLET_MAX_BREAKPOINT = 1024;

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

/**
 * True for phone-class widths (<768px). Use this — not useIsMobile() — when the
 * decision is "phone UI vs. larger-screen UI", so tablets fall on the desktop
 * side of the split.
 */
export function useIsPhone() {
  const [isPhone, setIsPhone] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < PHONE_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsPhone(window.innerWidth < PHONE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}

/**
 * True for tablet-class widths (768–1023px, e.g. an iPad). Tablets render the
 * collapsible desktop sidebar + breadcrumb/quick-action header rather than the
 * phone bottom-nav.
 */
export function useIsTablet() {
  const compute = () => {
    if (typeof window === "undefined") return false;
    const w = window.innerWidth;
    return w >= PHONE_BREAKPOINT && w < TABLET_MAX_BREAKPOINT;
  };
  const [isTablet, setIsTablet] = React.useState<boolean>(compute);

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${PHONE_BREAKPOINT}px) and (max-width: ${TABLET_MAX_BREAKPOINT - 1}px)`
    );
    const onChange = () => setIsTablet(compute());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTablet;
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
