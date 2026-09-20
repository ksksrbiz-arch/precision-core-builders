/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const useRealtimeTableMock = vi.fn((_opts: unknown) => ({
  isLive: true,
  lastEvent: null,
}));

/** Mutable query state shared with the trpc mock below. */
const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: [],
  isLoading: false,
  isError: false,
};

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: (opts: unknown) => useRealtimeTableMock(opts),
}));

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

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

function setQueryState(next: Partial<typeof queryState> = {}) {
  queryState.data = "data" in next ? next.data : [];
  queryState.isLoading = next.isLoading ?? false;
  queryState.isError = next.isError ?? false;
}

async function loadPage() {
  vi.resetModules();
  const mod = await import("./PortfolioAdmin");
  return mod.default;
}

describe("PortfolioAdmin", () => {
  it("renders with completely empty data without crashing", async () => {
    setQueryState();
    const PortfolioAdmin = await loadPage();
    expect(() => render(<PortfolioAdmin />)).not.toThrow();
    expect(screen.getByText(/no portfolio projects yet/i)).toBeTruthy();
  });

  it("shows a skeleton while the list loads", async () => {
    setQueryState({ data: undefined, isLoading: true });
    const PortfolioAdmin = await loadPage();
    const { container } = render(<PortfolioAdmin />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control when the list fails to load", async () => {
    setQueryState({ data: undefined, isError: true });
    const PortfolioAdmin = await loadPage();
    render(<PortfolioAdmin />);
    expect(screen.getByText(/unable to load/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("gives every form input an accessible label, not just a placeholder", async () => {
    setQueryState();
    const PortfolioAdmin = await loadPage();
    render(<PortfolioAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));

    const expectedLabels = [
      /project title/i,
      /category/i,
      /location/i,
      /year completed/i,
      /square footage/i,
      /cover image url/i,
      /gallery image urls/i,
      /short description/i,
      /full description/i,
      /client name/i,
      /client testimonial/i,
    ];
    for (const label of expectedLabels) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it("subscribes to realtime updates on portfolio_projects", async () => {
    setQueryState();
    useRealtimeTableMock.mockClear();
    const PortfolioAdmin = await loadPage();
    render(<PortfolioAdmin />);
    expect(useRealtimeTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ table: "portfolio_projects" })
    );
  });
});
