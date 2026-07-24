/**
 * Marquee — infinite horizontal scroll strip. Content is duplicated and the
 * track translates -50% for a seamless loop. Pauses on hover (desktop) and
 * degrades to a plain scrollable row under prefers-reduced-motion.
 *
 * Keyframes live in index.css (`.animate-marquee`) so they parse once.
 */
import { useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Seconds per full loop. Default 42. */
  duration?: number;
  /** Pause the loop on hover. Default true. */
  pauseOnHover?: boolean;
  className?: string;
}

export function Marquee({
  children,
  duration = 42,
  pauseOnHover = true,
  className = "",
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={`overflow-x-auto scrollbar-none ${className}`}>
        <div className="flex w-max items-center">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden ${pauseOnHover ? "marquee-pause" : ""} ${className}`}
    >
      <div
        className="animate-marquee flex w-max items-center"
        style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
      >
        <div className="flex items-center">{children}</div>
        <div className="flex items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
