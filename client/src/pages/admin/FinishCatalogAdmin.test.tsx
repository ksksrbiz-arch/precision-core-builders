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
            if (routerName === "finishCatalog" && procName === "listAdmin") {
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
  const mod = await import("./FinishCatalogAdmin");
  return mod.default;
}

describe("FinishCatalogAdmin", () => {
  it("renders with completely empty data without crashing", async () => {
    setQueryState();
    const FinishCatalogAdmin = await loadPage();
    expect(() => render(<FinishCatalogAdmin />)).not.toThrow();
    expect(screen.getByText(/no catalog items yet/i)).toBeTruthy();
  });

  it("shows a skeleton while the list loads", async () => {
    setQueryState({ data: undefined, isLoading: true });
    const FinishCatalogAdmin = await loadPage();
    const { container } = render(<FinishCatalogAdmin />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control when the list fails to load", async () => {
    setQueryState({ data: undefined, isError: true });
    const FinishCatalogAdmin = await loadPage();
    render(<FinishCatalogAdmin />);
    expect(screen.getByText(/unable to load/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("gives every form input an accessible label, not just a placeholder", async () => {
    setQueryState();
    const FinishCatalogAdmin = await loadPage();
    render(<FinishCatalogAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /new item/i }));

    const expectedLabels = [
      /item name/i,
      /category/i,
      /brand/i,
      /price tier/i,
      /image url/i,
      /description/i,
    ];
    for (const label of expectedLabels) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it("subscribes to realtime updates on finish_catalog_items", async () => {
    setQueryState();
    useRealtimeTableMock.mockClear();
    const FinishCatalogAdmin = await loadPage();
    render(<FinishCatalogAdmin />);
    expect(useRealtimeTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ table: "finish_catalog_items" })
    );
  });
});
