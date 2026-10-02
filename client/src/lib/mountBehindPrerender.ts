/**
 * Seamless prerender → React hand-off.
 *
 * Public pages ship prerendered HTML in `#root` (scripts/prerender-marketing.ts
 * marks it `data-prerendered`). React's `createRoot` doesn't hydrate: it
 * discards that markup, and every photo on the page disappears, the app shows
 * its route loader, then the photos are re-created hidden and fade back in.
 * Measured on a throttled phone, that was the "photos flash before they
 * render" on /portfolio: ~20 images vanished for ~3 s.
 *
 * Instead the app mounts into an offscreen container *behind* the prerendered
 * page. The prerendered page stays on screen until the live page has rendered
 * its content and the photos in view have loaded and finished fading in, then
 * the prerendered DOM is swapped out in one step. If the live app never gets
 * there (error, offline chunk) it swaps after a timeout so the user isn't left
 * on a dead page.
 */

export const PRERENDERED_ATTR = "data-prerendered";

export type HandoffOptions = {
  /** The live page is ready when this matches inside the offscreen container. */
  readySelector?: string;
  /** Give up waiting for the live render and swap anyway. */
  maxWaitMs?: number;
  /** Once content exists, how long to wait for in-view photos to settle. */
  imageWaitMs?: number;
  pollMs?: number;
};

const HIDDEN_STYLE =
  "position:fixed;inset:0;overflow:hidden;visibility:hidden;pointer-events:none;";

/** True when the page's root holds prerendered content to hand off from. */
export function isPrerendered(root: HTMLElement): boolean {
  return root.hasAttribute(PRERENDERED_ATTR);
}

function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.top < window.innerHeight &&
    r.right > 0 &&
    r.left < window.innerWidth
  );
}

/** A photo is settled once its pixels are in and any fade-in has finished. */
function imageSettled(img: HTMLImageElement): boolean {
  if (!img.complete) return false;
  if (img.naturalWidth === 0) return true; // broken image: don't wait on it
  return Number.parseFloat(getComputedStyle(img).opacity || "1") >= 0.99;
}

function unsettledImages(live: HTMLElement): number {
  return [...live.querySelectorAll("img")].filter(
    img => inViewport(img) && !imageSettled(img)
  ).length;
}

/**
 * Create the offscreen container, let `render` mount the app into it, and swap
 * it in for `root` when ready. Returns a promise that resolves after the swap.
 */
export function mountBehindPrerender(
  root: HTMLElement,
  render: (container: HTMLElement) => void,
  {
    readySelector = "main h1",
    maxWaitMs = 8000,
    imageWaitMs = 1500,
    pollMs = 50,
  }: HandoffOptions = {}
): Promise<HTMLElement> {
  const live = document.createElement("div");
  live.setAttribute("style", HIDDEN_STYLE);
  root.after(live);
  render(live);

  return new Promise(resolve => {
    const startedAt = Date.now();
    let contentSince: number | null = null;

    const swap = () => {
      clearInterval(timer);
      live.removeAttribute("style");
      root.remove();
      live.id = "root";
      resolve(live);
    };

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= maxWaitMs) return swap();

      if (contentSince === null) {
        if (!live.querySelector(readySelector)) return;
        contentSince = Date.now();
      }
      if (
        unsettledImages(live) === 0 ||
        Date.now() - contentSince >= imageWaitMs
      ) {
        swap();
      }
    }, pollMs);
  });
}
