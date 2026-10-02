/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ResponsiveImage } from "./ResponsiveImage";

afterEach(cleanup);

const opacityClass = (img: HTMLElement) =>
  img.className.includes("opacity-100") ? "visible" : "hidden";

describe("ResponsiveImage", () => {
  it("stays hidden until the pixels arrive, then shows", () => {
    const { getByAltText } = render(<ResponsiveImage src="/a.jpg" alt="A" />);
    const img = getByAltText("A");
    expect(opacityClass(img)).toBe("hidden");
    fireEvent.load(img);
    expect(opacityClass(img)).toBe("visible");
  });

  it("shows an image that was already loaded before React attached onLoad", () => {
    // Cached image / replaced prerendered markup: `load` already fired.
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });
    try {
      const { getByAltText } = render(<ResponsiveImage src="/a.jpg" alt="A" />);
      expect(opacityClass(getByAltText("A"))).toBe("visible");
    } finally {
      delete (HTMLImageElement.prototype as { complete?: boolean }).complete;
    }
  });

  it("never leaves an invisible hole when the image fails", () => {
    const { getByAltText } = render(
      <ResponsiveImage src="/missing.jpg" alt="A" />
    );
    const img = getByAltText("A");
    fireEvent.error(img);
    expect(opacityClass(img)).toBe("visible");
  });

  it("loads above-the-fold images eagerly", () => {
    const { getByAltText } = render(
      <ResponsiveImage src="/a.jpg" alt="Hero" priority />
    );
    expect(getByAltText("Hero").getAttribute("loading")).toBe("eager");
  });
});
