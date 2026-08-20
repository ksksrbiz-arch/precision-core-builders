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
            if (routerName === "portfolio" && procName === "listAdmin") {
              return {
                useQuery: () => ({
                  data: [
                    {
                      id: 1,
                      title: "The Hendricks Remodel",
                      published: true,
                      featured: false,
                      imageUrl: null,
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
  const mod = await import("./PortfolioAdmin");
  return mod.default;
}

describe("PortfolioAdmin", () => {
  it("stats grid steps down to a single column on narrow screens", async () => {
    const PortfolioAdmin = await loadPage();
    const { container } = render(<PortfolioAdmin />);
    const statsGrid = container.querySelector(
      ".grid.grid-cols-1.sm\\:grid-cols-3"
    );
    expect(statsGrid).toBeTruthy();
  });

  it("every interactive control has an accessible name", async () => {
    const PortfolioAdmin = await loadPage();
    render(<PortfolioAdmin />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
