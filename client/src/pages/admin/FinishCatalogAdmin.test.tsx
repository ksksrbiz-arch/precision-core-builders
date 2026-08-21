/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/trpc", () => {
  const base = {
    useUtils: () =>
      new Proxy({}, { get: () => new Proxy({}, { get: () => vi.fn() }) }),
  };
  const trpcProxy = new Proxy(base, {
    get(target, routerName: string) {
      if (routerName in target) return (target as any)[routerName];
      return new Proxy(
        {},
        {
          get(_t2, procName: string) {
            if (routerName === "finishCatalog" && procName === "listAdmin") {
              return {
                useQuery: () => ({
                  data: [
                    {
                      id: 1,
                      name: "Sample: White Oak Flooring",
                      category: "Flooring",
                      brand: "Shaw Floors",
                      price_tier: "$$",
                      published: true,
                      featured: false,
                      image_url: null,
                    },
                  ],
                  isLoading: false,
                }),
              };
            }
            return {
              useQuery: () => ({
                data: undefined,
                isLoading: false,
                isError: false,
                refetch: vi.fn(),
              }),
              useMutation: () => ({
                mutate: vi.fn(),
                mutateAsync: vi.fn(),
                isPending: false,
              }),
            };
          },
        }
      );
    },
  });
  return { trpc: trpcProxy };
});

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./FinishCatalogAdmin");
  return mod.default;
}

describe("FinishCatalogAdmin", () => {
  it("renders the seeded catalog item", async () => {
    const FinishCatalogAdmin = await loadPage();
    render(<FinishCatalogAdmin />);
    expect(screen.getByText("Sample: White Oak Flooring")).toBeTruthy();
  });

  it("stats grid steps down to a single column on narrow screens", async () => {
    const FinishCatalogAdmin = await loadPage();
    const { container } = render(<FinishCatalogAdmin />);
    const statsGrid = container.querySelector(
      ".grid.grid-cols-1.sm\\:grid-cols-3"
    );
    expect(statsGrid).toBeTruthy();
  });

  it("every interactive control has an accessible name", async () => {
    const FinishCatalogAdmin = await loadPage();
    render(<FinishCatalogAdmin />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
