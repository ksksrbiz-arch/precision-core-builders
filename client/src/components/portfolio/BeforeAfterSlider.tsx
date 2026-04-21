/**
 * BeforeAfterSlider — drag-reveal comparison component.
 *
 * Usage:
 *   <BeforeAfterSlider before="/portfolio/x-01.jpg" after="/portfolio/x-02.jpg" />
 *
 * Supports mouse drag, touch drag, and keyboard (arrow keys when focused).
 * Respects prefers-reduced-motion (defaults to static mid-split, no animation).
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setPct((p) => Math.max(0, p - 5));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setPct((p) => Math.min(100, p + 5));
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
        className="relative w-full overflow-hidden rounded-lg bg-neutral-100 shadow-lg cursor-ew-resize"
        onPointerDown={(e) => {
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
          style={{ width: `${pct}%` }}
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
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-[2px] bg-white/90 shadow-[0_0_10px_rgba(0,0,0,0.4)]" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-neutral-200"
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
        <div className="pointer-events-none absolute top-3 left-3 bg-black/70 text-white text-xs font-medium uppercase tracking-wider px-2 py-1 rounded">
          Before
        </div>
        <div className="pointer-events-none absolute top-3 right-3 bg-black/70 text-white text-xs font-medium uppercase tracking-wider px-2 py-1 rounded">
          After
        </div>
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-neutral-500 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
