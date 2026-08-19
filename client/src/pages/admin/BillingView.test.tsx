/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const useRealtimeTableMock = vi.fn((_opts: unknown) => ({
  isLive: true,
  lastEvent: null,
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: (opts: unknown) => useRealtimeTableMock(opts),
}));

vi.mock("@/lib/authHeader", () => ({
  getAuthHeader: vi.fn().mockResolvedValue({}),
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
          get() {
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
    const BillingView = await loadPage();
    expect(() => render(<BillingView />)).not.toThrow();
  });
});
