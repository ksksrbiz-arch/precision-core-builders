/**
 * Magnetic — spring-based magnetic hover. The wrapped element gravitates
 * toward the cursor and snaps back on leave. Desktop-only by nature
 * (no pointer on touch), and a no-op under prefers-reduced-motion.
 *
 * Use on primary CTAs for a tactile, high-end feel.
 */
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useRef, type MouseEvent, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 0–1 fraction of the cursor offset applied as pull. Default 0.35. */
  strength?: number;
  className?: string;
}

export function Magnetic({ children, strength = 0.35, className }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 14, mass: 0.2 });
  const springY = useSpring(y, { stiffness: 180, damping: 14, mass: 0.2 });

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  function onMove(e: MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: springX, y: springY, display: "inline-block" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
