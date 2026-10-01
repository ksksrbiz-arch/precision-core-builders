/**
 * PageTransition — quiet enter animation applied on every route change.
 * The incoming page fades and lifts into place; exit is intentionally
 * skipped because wouter swaps routes synchronously. No-op under
 * prefers-reduced-motion.
 */
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

export function PageTransition({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const reduce = useReducedMotion();

  // A transformed page creates a containing block for fixed navigation.
  // Public pages should remain readable without a page-wide lift.
  const privateRoute = /^\/(admin|portal|auth|onboarding|dev-login)(\/|$)/.test(
    location
  );
  if (!privateRoute) {
    return <div className="marketing-site">{children}</div>;
  }

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={location}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
