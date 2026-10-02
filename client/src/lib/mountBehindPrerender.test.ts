/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPrerendered,
  mountBehindPrerender,
  PRERENDERED_ATTR,
} from "./mountBehindPrerender";

let root: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML =
    '<div id="root" data-prerendered="true"><main><h1>Prerendered</h1><img id="pre" src="/a.jpg"></main></div><script></script>';
  root = document.getElementById("root")!;
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

/** Make an <img> look like it's in the viewport with the given load state. */
function stubImage(img: HTMLImageElement, complete: boolean, opacity = "1") {
  Object.defineProperty(img, "complete", {
    get: () => complete,
    configurable: true,
  });
  Object.defineProperty(img, "naturalWidth", { value: 800 });
  img.getBoundingClientRect = () =>
    ({
      width: 300,
      height: 200,
      top: 10,
      bottom: 210,
      left: 0,
      right: 300,
    }) as DOMRect;
  img.style.opacity = opacity;
}

describe("isPrerendered", () => {
  it("reads the marker set by the prerender script", () => {
    expect(isPrerendered(root)).toBe(true);
    root.removeAttribute(PRERENDERED_ATTR);
    expect(isPrerendered(root)).toBe(false);
  });
});

describe("mountBehindPrerender", () => {
  it("mounts offscreen and keeps the prerendered page until the live page has content", async () => {
    let container!: HTMLElement;
    const done = mountBehindPrerender(root, c => {
      container = c;
      c.innerHTML = '<div role="status">Loading</div>';
    });

    // Live app is showing its loader: prerendered page must stay put.
    await vi.advanceTimersByTimeAsync(500);
    expect(document.getElementById("root")).toBe(root);
    expect(root.querySelector("h1")?.textContent).toBe("Prerendered");
    expect(container.getAttribute("style")).toMatch(/visibility:hidden/);

    // Content arrives -> swap.
    container.innerHTML = "<main><h1>Live</h1></main>";
    await vi.advanceTimersByTimeAsync(100);
    const live = await done;
    expect(live).toBe(container);
    expect(document.getElementById("root")).toBe(container);
    expect(document.body.contains(root)).toBe(false);
    expect(container.hasAttribute("style")).toBe(false);
  });

  it("waits for in-view photos to load and finish fading in before swapping", async () => {
    let container!: HTMLElement;
    let swapped = false;
    const done = mountBehindPrerender(root, c => {
      container = c;
      c.innerHTML = '<main><h1>Live</h1><img id="hero" src="/a.jpg"></main>';
    }).then(() => (swapped = true));
    const hero = container.querySelector("img")!;

    stubImage(hero, false, "0");
    await vi.advanceTimersByTimeAsync(300);
    expect(swapped).toBe(false); // still downloading

    stubImage(hero, true, "0.4");
    await vi.advanceTimersByTimeAsync(300);
    expect(swapped).toBe(false); // loaded but mid-fade

    stubImage(hero, true, "1");
    await vi.advanceTimersByTimeAsync(100);
    await done;
    expect(swapped).toBe(true);
  });

  it("ignores photos that are below the fold", async () => {
    let container!: HTMLElement;
    const done = mountBehindPrerender(root, c => {
      container = c;
      c.innerHTML = '<main><h1>Live</h1><img src="/far.jpg"></main>';
    });
    const far = container.querySelector("img")!;
    Object.defineProperty(far, "complete", { value: false });
    far.getBoundingClientRect = () =>
      ({
        width: 300,
        height: 200,
        top: 5000,
        bottom: 5200,
        left: 0,
        right: 300,
      }) as DOMRect;
    await vi.advanceTimersByTimeAsync(100);
    await expect(done).resolves.toBe(container);
  });

  it("stops waiting on a photo after imageWaitMs", async () => {
    let container!: HTMLElement;
    const done = mountBehindPrerender(
      root,
      c => {
        container = c;
        c.innerHTML = '<main><h1>Live</h1><img src="/slow.jpg"></main>';
      },
      { imageWaitMs: 1000 }
    );
    stubImage(container.querySelector("img")!, false, "0");
    await vi.advanceTimersByTimeAsync(1200);
    await expect(done).resolves.toBe(container);
  });

  it("swaps after maxWaitMs even if the live app never renders content", async () => {
    let container!: HTMLElement;
    const done = mountBehindPrerender(
      root,
      c => {
        container = c;
        c.innerHTML = '<div role="status">Loading</div>';
      },
      { maxWaitMs: 2000 }
    );
    await vi.advanceTimersByTimeAsync(1900);
    expect(document.getElementById("root")).toBe(root);
    await vi.advanceTimersByTimeAsync(200);
    await expect(done).resolves.toBe(container);
    expect(document.body.contains(root)).toBe(false);
  });
});
