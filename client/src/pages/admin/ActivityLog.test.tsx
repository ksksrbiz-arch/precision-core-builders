/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isPending: boolean; isError: boolean } = {
  data: undefined,
  isPending: true,
  isError: false,
};

const useRealtimeTableMock = vi.fn((_opts: unknown) => ({ isLive: true, lastEvent: null }));

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
            if (routerName === "ledger" && procName === "auditLog") {
              return {
                useQuery: () => ({
                  data: queryState.data,
                  isPending: queryState.isPending,
                  isError: queryState.isError,
                  error: queryState.isError ? new Error("boom") : null,
                  refetch: vi.fn(),
                }),
              };
            }
            return {
              useQuery: () => ({
                data: undefined,
                isPending: false,
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
  const mod = await import("./ActivityLog");
  return mod.default;
}

describe("ActivityLog", () => {
  it("subscribes to realtime updates through the shared hook (not a raw channel)", async () => {
    queryState.data = [];
    queryState.isPending = false;
    queryState.isError = false;
    useRealtimeTableMock.mockClear();
    const ActivityLog = await loadPage();
    render(<ActivityLog />);
    expect(useRealtimeTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ table: "ledger_entries" })
    );
  });

  it("shows a skeleton while the audit log is pending", async () => {
    queryState.data = undefined;
    queryState.isPending = true;
    queryState.isError = false;
    const ActivityLog = await loadPage();
    const { container } = render(<ActivityLog />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control on error", async () => {
    queryState.data = undefined;
    queryState.isPending = false;
    queryState.isError = true;
    const ActivityLog = await loadPage();
    render(<ActivityLog />);
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("every interactive control has an accessible name", async () => {
    queryState.data = [];
    queryState.isPending = false;
    queryState.isError = false;
    const ActivityLog = await loadPage();
    render(<ActivityLog />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});
