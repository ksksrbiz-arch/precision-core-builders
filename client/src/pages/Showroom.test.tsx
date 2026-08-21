/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const queryState: {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
} = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    finishCatalog: {
      listPublished: {
        useQuery: () => ({ ...queryState, refetch: vi.fn() }),
      },
    },
  },
}));

// Layout/marketing chrome isn't what this test verifies — keep the DOM
// focused on Showroom's own loading/empty/populated states.
vi.mock("@/components/layout/SiteShell", () => ({
  SiteNav: () => null,
  SiteFooter: () => null,
  MobileCTABar: () => null,
}));
vi.mock("@/components/layout/TrustBar", () => ({ TrustBar: () => null }));
vi.mock("@/components/JsonLd", () => ({ JsonLd: () => null }));
vi.mock("@/components/ui/Reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/ui/Magnetic", () => ({
  Magnetic: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/ui/TextReveal", () => ({
  TextReveal: ({ text }: { text: string }) => <span>{text}</span>,
}));

// jsdom has no IntersectionObserver — framer-motion's whileInView needs one.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).IntersectionObserver = IntersectionObserverStub;

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./Showroom");
  return mod.default;
}

describe("Showroom", () => {
  it("shows a loading skeleton while the catalog is fetching", async () => {
    queryState.data = undefined;
    queryState.isLoading = true;
    queryState.isError = false;
    const Showroom = await loadPage();
    render(<Showroom />);
    expect(screen.getByLabelText(/loading showroom/i)).toBeTruthy();
  });

  it("shows an empty state when the catalog has no published items", async () => {
    queryState.data = [];
    queryState.isLoading = false;
    queryState.isError = false;
    const Showroom = await loadPage();
    render(<Showroom />);
    expect(screen.getByText(/showroom is being stocked/i)).toBeTruthy();
  });

  it("renders published catalog items", async () => {
    queryState.data = [
      {
        id: 1,
        name: "Sample: White Oak Flooring",
        slug: "sample-white-oak-flooring",
        category: "Flooring",
        brand: "Shaw Floors",
        description: "Wide-plank engineered white oak.",
        price_tier: "$$",
        image_url: null,
        featured: true,
        sort_order: 10,
      },
    ];
    queryState.isLoading = false;
    queryState.isError = false;
    const Showroom = await loadPage();
    render(<Showroom />);
    expect(screen.getByText("Sample: White Oak Flooring")).toBeTruthy();
    expect(screen.getAllByText("Flooring").length).toBeGreaterThan(0);
  });

  it("every interactive control has an accessible name", async () => {
    queryState.data = [
      {
        id: 1,
        name: "Sample: White Oak Flooring",
        slug: "sample-white-oak-flooring",
        category: "Flooring",
        brand: null,
        description: null,
        price_tier: null,
        image_url: null,
        featured: false,
        sort_order: 10,
      },
    ];
    queryState.isLoading = false;
    queryState.isError = false;
    const Showroom = await loadPage();
    render(<Showroom />);
    const controls = [
      ...screen.queryAllByRole("button"),
      ...screen.queryAllByRole("tab"),
      ...screen.queryAllByRole("link"),
    ];
    expect(controls.length).toBeGreaterThan(0);
    for (const el of controls) {
      const hasText = (el.textContent ?? "").trim().length > 0;
      const hasLabel = el.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
