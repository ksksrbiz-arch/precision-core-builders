/**
 * TiltCard — subtle 3D perspective tilt that follows the cursor, with an
 * optional soft glare that tracks the pointer. Springs keep motion buttery.
 * No-op under prefers-reduced-motion; inert on touch devices (no mousemove).
 */
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, type MouseEvent, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Max tilt in degrees. Keep small (4–8) for a premium feel. Default 6. */
  maxTilt?: number;
  /** Show the cursor-tracking glare overlay. Default true. */
  glare?: boolean;
  className?: string;
}

export function TiltCard({
  children,
  maxTilt = 6,
  glare = true,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springX = useSpring(px, { stiffness: 200, damping: 20, mass: 0.4 });
  const springY = useSpring(py, { stiffness: 200, damping: 20, mass: 0.4 });
  const rotateX = useTransform(springY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(springX, [0, 1], [-maxTilt, maxTilt]);
  const glareX = useTransform(springX, [0, 1], ["15%", "85%"]);
  const glareY = useTransform(springY, [0, 1], ["15%", "85%"]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(231, 200, 112, 0.09), transparent 55%)`;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  function onMove(e: MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }

  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
      }}
      className={`relative ${className ?? ""}`}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}
