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
  data: { data: [] },
  isLoading: false,
  isError: false,
};

const setLocationMock = vi.fn();

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: (opts: unknown) => useRealtimeTableMock(opts),
}));

vi.mock("@/lib/authHeader", () => ({
  getAuthHeader: vi.fn().mockResolvedValue({}),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/billing", setLocationMock],
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
            if (
              (routerName === "projects" || routerName === "clients") &&
              procName === "list"
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
                data: { data: [] },
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
  queryState.data = "data" in next ? next.data : { data: [] };
  queryState.isLoading = next.isLoading ?? false;
  queryState.isError = next.isError ?? false;
}

async function loadPage() {
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ invoices: [] }),
    })
  );
  const mod = await import("./BillingView");
  return mod.default;
}

describe("BillingView", () => {
  it("subscribes to realtime updates on billing_events, to re-pull Stripe invoices on webhook activity", async () => {
    setQueryState();
    useRealtimeTableMock.mockClear();
    const BillingView = await loadPage();
    render(<BillingView />);
    expect(useRealtimeTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ table: "billing_events" })
    );
  });

  it("renders without crashing when the background Stripe invoice fetch fails", async () => {
    // fetchStripeInvoices() degrades silently to cached data on failure by
    // design (Stripe may not be configured yet) — assert the page still
    // renders rather than throwing.
    setQueryState();
    const BillingView = await loadPage();
    expect(() => render(<BillingView />)).not.toThrow();
  });

  it("renders with completely empty data and offers a usable next step", async () => {
    setQueryState();
    setLocationMock.mockClear();
    const BillingView = await loadPage();
    render(<BillingView />);
    // The Stripe invoice fetch runs on mount and the spinner is up until it
    // settles, so wait for the empty state rather than asserting synchronously.
    await screen.findByText(/no invoices yet/i);
    expect(screen.getAllByText(/no invoices yet/i).length).toBeGreaterThan(0);
    // The empty state must not dead-end: with zero projects the CTA points at
    // project creation.
    fireEvent.click(
      screen.getByRole("button", { name: /create your first project/i })
    );
    expect(setLocationMock).toHaveBeenCalledWith("/admin/projects/new");
  });

  it("does not show misleading $0 tiles when there are no invoices", async () => {
    setQueryState();
    const BillingView = await loadPage();
    render(<BillingView />);
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("shows a skeleton in the invoice form while reference data loads", async () => {
    setQueryState({ data: undefined, isLoading: true });
    const BillingView = await loadPage();
    const { container } = render(<BillingView />);
    fireEvent.click(screen.getByRole("button", { name: /new invoice/i }));
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control when reference data fails to load", async () => {
    setQueryState({ data: undefined, isError: true });
    const BillingView = await loadPage();
    render(<BillingView />);
    fireEvent.click(screen.getByRole("button", { name: /new invoice/i }));
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });
});
