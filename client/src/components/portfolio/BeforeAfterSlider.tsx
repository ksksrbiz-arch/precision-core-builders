/**
 * BeforeAfterSlider — drag-reveal comparison component.
 *
 * Usage:
 *   <BeforeAfterSlider before="/portfolio/x-01.jpg" after="/portfolio/x-02.jpg" />
 *
 * Supports mouse drag, touch drag, and keyboard (arrow keys when focused).
 * On first view (intersection observer), animates 30 → 70 → 50 once per
 * session to signal draggability.
 * Respects prefers-reduced-motion (defaults to static mid-split).
 */
import { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  before: string;
  after: string;
  beforeAlt?: string;
  afterAlt?: string;
  caption?: string;
  className?: string;
}

const DEMO_KEY = "pcb_ba_demo_played";

export function BeforeAfterSlider({
  before,
  after,
  beforeAlt = "Before",
  afterAlt = "After",
  caption,
  className = "",
}: Props) {
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [hinting, setHinting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.min(100, Math.max(0, raw)));
  }, []);

  // Global pointer move/up so dragging survives leaving the component
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      updateFromClientX(e.clientX);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateFromClientX]);

  // Auto-demo: once per session, when the slider first scrolls into view.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return;
    try {
      if (sessionStorage.getItem(DEMO_KEY)) return;
    } catch {
      /* storage blocked — fall through */
    }
    const el = containerRef.current;
    if (!el) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        io.disconnect();
        try {
          sessionStorage.setItem(DEMO_KEY, "1");
        } catch {
          /* ignore */
        }
        // 30 → 70 → 50 across ~2s
        const steps: Array<[number, number]> = [
          [30, 400],
          [70, 1200],
          [50, 2000],
        ];
        steps.forEach(([value, at]) => {
          timeouts.push(setTimeout(() => setPct(value), at));
        });
        setHinting(true);
        timeouts.push(setTimeout(() => setHinting(false), 2200));
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setPct(p => Math.max(0, p - 5));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setPct(p => Math.min(100, p + 5));
      e.preventDefault();
    } else if (e.key === "Home") {
      setPct(0);
      e.preventDefault();
    } else if (e.key === "End") {
      setPct(100);
      e.preventDefault();
    }
  };

  return (
    <figure className={`select-none ${className}`}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg bg-neutral-900 shadow-xl cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A84B] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onPointerDown={e => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
        role="slider"
        aria-label="Before / after comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{ touchAction: "none" }}
      >
        {/* After image = base layer */}
        <img
          src={after}
          alt={afterAlt}
          className="block w-full h-auto"
          draggable={false}
          loading="lazy"
        />
        {/* Before image = clipped overlay */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            width: `${pct}%`,
            transition: dragging
              ? "none"
              : "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <img
            src={before}
            alt={beforeAlt}
            className="block h-full w-auto max-w-none"
            draggable={false}
            loading="lazy"
            style={{ width: containerRef.current?.clientWidth || "auto" }}
          />
        </div>
        {/* Divider bar + handle */}
        <div
          className="absolute inset-y-0 pointer-events-none"
          style={{
            left: `${pct}%`,
            transform: "translateX(-50%)",
            transition: dragging
              ? "none"
              : "left 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div className="h-full w-[2px] bg-white/90 shadow-[0_0_10px_rgba(0,0,0,0.4)]" />
          <div
            className={[
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-[#C8A84B]",
              hinting ? "animate-pulse" : "",
            ].join(" ")}
            aria-hidden="true"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-neutral-800"
            >
              <path d="M9 18l-6-6 6-6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
        {/* Labels */}
        <div
          className="pointer-events-none absolute bottom-4 left-4 bg-black/80 text-white text-xs uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          Before
        </div>
        <div
          className="pointer-events-none absolute bottom-4 right-4 bg-black/80 text-white text-xs uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          After
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm text-muted-foreground text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
