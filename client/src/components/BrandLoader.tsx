/**
 * BrandLoader — the one loading screen for the whole app.
 *
 * Used for lazy-route Suspense fallbacks and auth checks. Its markup and
 * `.pcb-loader*` styles are mirrored by the static splash inside
 * `<div id="root">` in client/index.html (the styles live there, inline, so
 * they apply before any bundle arrives). That is what guarantees there is no
 * bare/blank frame on first render — and no visible jump when React replaces
 * the splash with this component. Change the markup in one place, change the
 * other.
 */
import { ASSETS } from "@/const";

type Props = {
  /** Accessible status text; also read out by screen readers. */
  label?: string;
};

export function BrandLoader({ label = "Loading" }: Props) {
  return (
    <div className="pcb-loader" role="status" aria-live="polite">
      <img
        className="pcb-loader__logo"
        src={ASSETS.logo}
        alt="Precision Core Builders"
        width={145}
        height={56}
      />
      <div className="pcb-loader__bar" aria-hidden="true">
        <span />
      </div>
      <span className="pcb-loader__sr">{label}…</span>
    </div>
  );
}

export default BrandLoader;
