/**
 * @vitest-environment jsdom
 *
 * Tests for ResponsiveTable — the whole point of the component is that a
 * caller cannot end up with clipped content, so these assert that
 * `overflow-x-auto` and a `min-w` are applied unconditionally.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ResponsiveTable } from "./ResponsiveTable";

afterEach(() => {
  cleanup();
});

describe("ResponsiveTable", () => {
  it("renders its children", () => {
    render(
      <ResponsiveTable>
        <div>row-content</div>
      </ResponsiveTable>
    );
    expect(screen.getByText("row-content")).toBeTruthy();
  });

  it("always applies overflow-x-auto to the scroll surface", () => {
    render(
      <ResponsiveTable label="Materials">
        <div>row-content</div>
      </ResponsiveTable>
    );
    const region = screen.getByRole("region", { name: "Materials" });
    expect(region.className).toContain("overflow-x-auto");
  });

  it("applies a default min-width to the inner track", () => {
    render(
      <ResponsiveTable label="Materials">
        <div>row-content</div>
      </ResponsiveTable>
    );
    const region = screen.getByRole("region", { name: "Materials" });
    const inner = region.firstElementChild as HTMLElement;
    expect(inner.className).toContain("min-w-[640px]");
  });

  it("honours a custom min-width class", () => {
    render(
      <ResponsiveTable label="Materials" minWidthClassName="min-w-[900px]">
        <div>row-content</div>
      </ResponsiveTable>
    );
    const region = screen.getByRole("region", { name: "Materials" });
    const inner = region.firstElementChild as HTMLElement;
    expect(inner.className).toContain("min-w-[900px]");
    expect(inner.className).not.toContain("min-w-[640px]");
  });

  it("keeps overflow-x-auto even when a caller passes overflow-hidden", () => {
    render(
      <ResponsiveTable
        label="Materials"
        className="border border-border/60 overflow-hidden"
      >
        <div>row-content</div>
      </ResponsiveTable>
    );
    const region = screen.getByRole("region", { name: "Materials" });
    expect(region.className).toContain("overflow-x-auto");
    expect(region.className).not.toContain("overflow-hidden");
    expect(region.className).toContain("border-border/60");
  });

  it("keeps overflow-x-auto even when a caller passes overflow-x-hidden", () => {
    render(
      <ResponsiveTable label="Materials" className="overflow-x-hidden">
        <div>row-content</div>
      </ResponsiveTable>
    );
    const region = screen.getByRole("region", { name: "Materials" });
    expect(region.className).toContain("overflow-x-auto");
    expect(region.className).not.toContain("overflow-x-hidden");
  });

  it("falls back to a generic accessible label", () => {
    render(
      <ResponsiveTable>
        <div>row-content</div>
      </ResponsiveTable>
    );
    expect(
      screen.getByRole("region", { name: "Scrollable table" })
    ).toBeTruthy();
  });
});
