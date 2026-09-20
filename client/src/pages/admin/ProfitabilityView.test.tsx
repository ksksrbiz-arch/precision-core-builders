/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
};

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
            if (
              routerName === "projects" &&
              procName === "profitabilitySummary"
            ) {
              return {
                useQuery: () => ({
                  data: queryState.data,
                  isLoading: queryState.isLoading,
                  isError: queryState.isError,
                  refetch: vi.fn(),
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

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./ProfitabilityView");
  return mod.default;
}

describe("ProfitabilityView", () => {
  it("shows a skeleton while the summary is loading", async () => {
    queryState.data = undefined;
    queryState.isLoading = true;
    queryState.isError = false;
    const ProfitabilityView = await loadPage();
    const { container } = render(<ProfitabilityView />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control on error", async () => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = true;
    const ProfitabilityView = await loadPage();
    render(<ProfitabilityView />);
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("shows an empty state when there are no projects", async () => {
    queryState.data = { projects: [] };
    queryState.isLoading = false;
    queryState.isError = false;
    const ProfitabilityView = await loadPage();
    render(<ProfitabilityView />);
    expect(
      screen.getAllByText(/no.*data|no.*projects/i).length
    ).toBeGreaterThan(0);
  });

  it("renders the header with exactly one h1 when data is empty", async () => {
    queryState.data = { projects: [] };
    queryState.isLoading = false;
    queryState.isError = false;
    const ProfitabilityView = await loadPage();
    const { container } = render(<ProfitabilityView />);
    const headings = container.querySelectorAll("h1");
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain("Profitability");
  });

  it("does not leak internal roadmap language", async () => {
    queryState.data = { projects: [] };
    queryState.isLoading = false;
    queryState.isError = false;
    const ProfitabilityView = await loadPage();
    const { container } = render(<ProfitabilityView />);
    expect(container.textContent).not.toContain("Phase 5");
  });

  it("scrolls the project table instead of squashing it", async () => {
    queryState.data = {
      projects: [
        {
          id: "p1",
          name: "Riverbend Residence",
          contracted: 100000,
          actualCost: 80000,
          profit: 20000,
          variance: 0,
          basis: 100000,
          marginPct: 20,
          hasData: true,
        },
      ],
      totals: {
        contracted: 100000,
        actualCost: 80000,
        profit: 20000,
        basis: 100000,
        marginPct: 20,
      },
    };
    queryState.isLoading = false;
    queryState.isError = false;
    const ProfitabilityView = await loadPage();
    const { container } = render(<ProfitabilityView />);
    const region = container.querySelector('[role="region"]');
    expect(region).toBeTruthy();
    expect(region?.className).toContain("overflow-x-auto");
    expect(region?.getAttribute("tabindex")).toBe("0");
    expect(region?.firstElementChild?.className).toContain("min-w-[640px]");
    expect(container.querySelector("table")).toBeTruthy();
  });
});
