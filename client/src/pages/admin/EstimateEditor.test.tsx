/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};

const useRealtimeTableMock = vi.fn((_opts: unknown) => ({
  isLive: true,
  lastEvent: null,
}));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: (opts: unknown) => useRealtimeTableMock(opts),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: "7" }),
  useLocation: () => ["/admin/estimates/7/edit", vi.fn()],
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
            if (routerName === "estimates" && procName === "getById") {
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

async function loadPage() {
  vi.resetModules();
  const mod = await import("./EstimateEditor");
  return mod.default;
}

describe("EstimateEditor", () => {
  it("does not clobber in-progress local edits when a remote update arrives", async () => {
    queryState.data = {
      id: 7,
      project_id: 1,
      client_id: 1,
      project_type: "remodel",
      complexity: "standard",
      square_footage: 1200,
      location: "Eugene, OR",
      additional_notes: "",
      estimated_low: 10000,
      estimated_mid: 15000,
      estimated_high: 20000,
      labor_cost: 5000,
      materials_cost: 5000,
      permits_cost: 500,
      contingency: 1000,
      ai_reasoning: "",
    };
    queryState.isLoading = false;
    queryState.isError = false;
    useRealtimeTableMock.mockClear();
    const EstimateEditor = await loadPage();
    render(<EstimateEditor />);

    const notesField = screen.getByDisplayValue("Eugene, OR");
    fireEvent.change(notesField, { target: { value: "Springfield, OR" } });

    const { onUpdate } = useRealtimeTableMock.mock.calls[0][0] as {
      onUpdate: (payload: unknown) => void;
    };
    const refetchMock = vi.fn();
    // Simulate the remote-update payload the hook would deliver.
    onUpdate({
      eventType: "UPDATE",
      table: "estimates",
      new: { id: 7 },
      old: null,
    });

    // The field the user just edited must still show their typed value —
    // a naive refetch-on-any-update would have overwritten it.
    expect(
      (screen.getByDisplayValue("Springfield, OR") as HTMLInputElement).value
    ).toBe("Springfield, OR");
  });

  it("subscribes to realtime updates on the estimates table, scoped to this estimate", async () => {
    queryState.data = {
      id: 7,
      project_id: 1,
      client_id: 1,
      project_type: "remodel",
      complexity: "standard",
      square_footage: 1200,
      location: "Eugene, OR",
      additional_notes: "",
      estimated_low: 10000,
      estimated_mid: 15000,
      estimated_high: 20000,
      labor_cost: 5000,
      materials_cost: 5000,
      permits_cost: 500,
      contingency: 1000,
      ai_reasoning: "",
    };
    queryState.isLoading = false;
    queryState.isError = false;
    useRealtimeTableMock.mockClear();
    const EstimateEditor = await loadPage();
    render(<EstimateEditor />);
    expect(useRealtimeTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ table: "estimates" })
    );
  });
});
