/**
 * Parallax — scroll-linked vertical drift. Children translate between
 * +amount and -amount pixels as the element crosses the viewport, giving
 * sections quiet depth. No-op under prefers-reduced-motion.
 *
 * For images inside an overflow-hidden frame, pass a className that scales
 * the wrapper up (e.g. "h-full w-full scale-[1.12]") so the drift never
 * reveals edges.
 */
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Pixels of travel in each direction. Default 40. */
  amount?: number;
  className?: string;
}

export function Parallax({ children, amount = 40, className }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}
