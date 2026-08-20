/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/guides", vi.fn()],
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./Guides");
  return mod.default;
}

describe("Guides", () => {
  it("renders exactly one h1, and it appears before any h2 in the DOM", async () => {
    const Guides = await loadPage();
    const { container } = render(<Guides />);
    const headings = Array.from(container.querySelectorAll("h1, h2"));
    expect(headings.length).toBeGreaterThan(1);
    expect(headings[0].tagName).toBe("H1");
    const h1Count = headings.filter(h => h.tagName === "H1").length;
    expect(h1Count).toBe(1);
  });

  it("the search input is labelled, not placeholder-only", async () => {
    const Guides = await loadPage();
    render(<Guides />);
    expect(screen.getByLabelText(/search guides/i)).toBeTruthy();
  });

  it("every interactive control has an accessible name", async () => {
    const Guides = await loadPage();
    render(<Guides />);
    const buttons = screen.queryAllByRole("button");
    for (const btn of buttons) {
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
