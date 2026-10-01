/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BrandLoader } from "./BrandLoader";
import ErrorBoundary from "./ErrorBoundary";

afterEach(cleanup);

describe("BrandLoader", () => {
  it("is an accessible status region with the brand logo", () => {
    render(<BrandLoader />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByAltText("Precision Core Builders")).toBeTruthy();
    expect(status.textContent).toContain("Loading");
  });

  it("accepts a custom status label", () => {
    render(<BrandLoader label="Checking your session" />);
    expect(screen.getByRole("status").textContent).toContain(
      "Checking your session"
    );
  });
});

describe("static splash in index.html", () => {
  const html = readFileSync(
    resolve(import.meta.dirname, "../../index.html"),
    "utf8"
  );

  it("paints the splash inside #root so first render is never bare", () => {
    const root = html.slice(html.indexOf('<div id="root">'));
    expect(root).toContain('class="pcb-loader"');
    expect(root).toContain('class="pcb-loader__bar"');
    expect(root).toContain('src="/logo.svg"');
  });

  it("shares its markup classes with the React component", () => {
    const { container } = render(<BrandLoader />);
    for (const el of container.querySelectorAll("[class]")) {
      for (const cls of el.className.split(" ")) {
        expect(html).toContain(`.${cls}`);
      }
    }
  });

  it("inlines the critical CSS and a noscript fallback", () => {
    expect(html).toMatch(/<style>[\s\S]*\.pcb-loader\s*\{/);
    expect(html).toMatch(/<noscript>[\s\S]*needs JavaScript/);
  });
});

describe("ErrorBoundary fallback", () => {
  it("renders a branded, recoverable screen", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Boom(): never {
      throw new Error("boom");
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    spy.mockRestore();
    expect(screen.getByAltText("Precision Core Builders")).toBeTruthy();
    expect(screen.getByText("Something went wrong.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /go home/i })).toBeTruthy();
  });
});
