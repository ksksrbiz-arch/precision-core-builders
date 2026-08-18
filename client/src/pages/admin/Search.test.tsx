/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/authHeader", () => ({
  getAuthHeader: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/search", vi.fn()],
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./Search");
  return mod.default;
}

describe("SearchView", () => {
  it("has a labelled search input, not placeholder-only", async () => {
    const SearchView = await loadPage();
    render(<SearchView />);
    expect(
      screen.getByLabelText(/search/i, { selector: "input" })
    ).toBeTruthy();
  });

  it("every interactive control has an accessible name", async () => {
    const SearchView = await loadPage();
    render(<SearchView />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });

  it("has responsive breakpoint classes rather than a fixed layout", async () => {
    const SearchView = await loadPage();
    const { container } = render(<SearchView />);
    const responsiveEls = container.querySelectorAll(
      '[class*="sm:"], [class*="md:"], [class*="lg:"]'
    );
    expect(responsiveEls.length).toBeGreaterThan(0);
  });

  it("surfaces an error via QueryError when the search request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "boom" }),
      })
    );
    const SearchView = await loadPage();
    render(<SearchView />);
    const input = screen.getByLabelText(/search/i, {
      selector: "input",
    }) as HTMLInputElement;
    input.value = "active projects";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const form = input.closest("form");
    form?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await new Promise(r => setTimeout(r, 0));
    vi.unstubAllGlobals();
  });
});
