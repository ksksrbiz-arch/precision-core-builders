/**
 * TextReveal — word-by-word masked rise reveal for headlines. Each word
 * slides up from behind an overflow mask, staggered, for a cinematic
 * entrance. Falls back to plain text under prefers-reduced-motion.
 *
 * Accessibility: the full string is exposed via aria-label on the wrapper
 * and the animated word spans are hidden from assistive tech.
 */
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  text: string;
  className?: string;
  /** Applied to every animated word span (e.g. "text-gradient-gold"). */
  wordClassName?: string;
  /** Seconds before the first word starts. Default 0. */
  delay?: number;
  /** Seconds between words. Default 0.06. */
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

export function TextReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.06,
  as = "span",
}: Props) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{text}</Tag>;
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      aria-label={text}
    >
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block overflow-hidden align-bottom pb-[0.1em] -mb-[0.1em]"
        >
          <motion.span
            className={`inline-block will-change-transform ${wordClassName ?? ""}`}
            variants={{
              hidden: { y: "115%" },
              visible: {
                y: 0,
                transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
