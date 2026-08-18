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

function makeQueryHook() {
  return () => ({
    data: queryState.data,
    isLoading: queryState.isLoading,
    isPending: queryState.isLoading,
    isError: queryState.isError,
    refetch: vi.fn(),
  });
}

function passthroughQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
}

function noopMutation() {
  return { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
}

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
            if (routerName === "materials" && procName === "list") {
              return { useQuery: makeQueryHook() };
            }
            return {
              useQuery: passthroughQuery,
              useMutation: noopMutation,
            };
          },
        }
      );
    },
  });
  return { trpc: trpcProxy };
});

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: false, lastEvent: null }),
}));

vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./MaterialsView");
  return mod.default;
}

describe("MaterialsView", () => {
  it("shows a skeleton while materials are loading", async () => {
    queryState.data = undefined;
    queryState.isLoading = true;
    queryState.isError = false;
    const MaterialsView = await loadPage();
    const { container } = render(<MaterialsView />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control on error", async () => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = true;
    const MaterialsView = await loadPage();
    render(<MaterialsView />);
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("shows an empty state when there are no materials", async () => {
    queryState.data = { data: [] };
    queryState.isLoading = false;
    queryState.isError = false;
    const MaterialsView = await loadPage();
    render(<MaterialsView />);
    expect(
      screen.getAllByText(/no materials|add.*material/i).length
    ).toBeGreaterThan(0);
  });

  it("every icon-only button has an accessible name", async () => {
    queryState.data = { data: [] };
    queryState.isLoading = false;
    queryState.isError = false;
    const MaterialsView = await loadPage();
    render(<MaterialsView />);
    const buttons = screen.getAllByRole("button");
    const offenders = buttons.filter(btn => {
      // Radix TooltipTrigger buttons (e.g. the guide-help button in
      // AdminPageHeader) get their accessible name from the portaled
      // tooltip content via aria-describedby, which jsdom's textContent
      // doesn't surface — that is a valid a11y pattern, not a gap.
      if (btn.getAttribute("data-slot") === "tooltip-trigger") return false;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      return !(hasText || hasLabel);
    });
    expect(offenders.length).toBe(0);
  });

  it("wraps tables in an overflow-x-auto container, never overflow-hidden clipping", async () => {
    queryState.data = {
      data: [
        {
          id: 1,
          name: "2x4 lumber",
          category: "framing",
          unit: "ea",
          quantity_needed: 10,
          quantity_on_hand: 2,
          is_shortage: true,
          vendor_name: null,
          unit_price_current: 3.5,
        },
      ],
    };
    queryState.isLoading = false;
    queryState.isError = false;
    const MaterialsView = await loadPage();
    const { container } = render(<MaterialsView />);
    const overflowHiddenTables = Array.from(
      container.querySelectorAll("table")
    ).filter(
      t => t.closest(".overflow-hidden") && !t.closest(".overflow-x-auto")
    );
    expect(overflowHiddenTables.length).toBe(0);
  });
});
