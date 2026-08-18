/**
 * ResponsiveTable — a scroll container for wide admin content.
 *
 * Admin list surfaces are hand-rolled card/grid markup, and several of them
 * wrap that markup in `overflow-hidden`, which silently clips columns on
 * narrow viewports. This component makes that mistake impossible: it always
 * applies `overflow-x-auto` and always gives its inner track a minimum width,
 * so content scrolls instead of disappearing.
 *
 * Pass extra classes for the outer surface via `className`; the inner track
 * (the thing that actually gets `min-w`) is styled via `innerClassName`.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ResponsiveTableProps = {
  children: ReactNode;
  /** Classes for the scrolling surface. `overflow-x-auto` is always applied. */
  className?: string;
  /** Classes for the inner track. A `min-w` is always applied. */
  innerClassName?: string;
  /**
   * Minimum width of the inner track. Any Tailwind `min-w-*` class works.
   * Defaults to `min-w-[640px]` — wide enough that a multi-column row keeps
   * its layout rather than collapsing.
   */
  minWidthClassName?: string;
  /** Accessible label, applied to the scroll region. */
  label?: string;
};

/**
 * Bare `overflow-*` shorthands (as opposed to `overflow-x-*` / `overflow-y-*`)
 * live in a different tailwind-merge group than `overflow-x-auto`, so they
 * would survive `cn()` and keep clipping the horizontal axis. Drop them so the
 * component's guarantee holds no matter what a caller passes in.
 */
const CLIPPING_SHORTHAND =
  /(^|\s)-?overflow-(auto|hidden|clip|visible|scroll)(?=\s|$)/g;

function stripClippingShorthand(className?: string) {
  if (!className) return className;
  return className.replace(CLIPPING_SHORTHAND, " ").trim();
}

export function ResponsiveTable({
  children,
  className,
  innerClassName,
  minWidthClassName = "min-w-[640px]",
  label,
}: ResponsiveTableProps) {
  return (
    <div
      // `overflow-x-auto` is intentionally last so it wins over any
      // `overflow-x-*` a caller passes in via `className`; bare shorthands are
      // stripped first because tailwind-merge would not resolve them.
      className={cn(stripClippingShorthand(className), "overflow-x-auto")}
      role="region"
      aria-label={label ?? "Scrollable table"}
      tabIndex={0}
    >
      <div className={cn(innerClassName, minWidthClassName)}>{children}</div>
    </div>
  );
}

export default ResponsiveTable;
