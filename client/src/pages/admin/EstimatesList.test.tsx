/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

const queryState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: true,
  isError: false,
};

const deleteMutateAsync = vi.fn(async (_input: unknown) => ({ success: true }));

vi.mock("@/hooks/useRealtimeTable", () => ({
  useRealtimeTable: () => ({ isLive: true, lastEvent: null }),
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
            if (routerName === "estimates" && procName === "list") {
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
                mutateAsync:
                  routerName === "estimates" && procName === "delete"
                    ? deleteMutateAsync
                    : vi.fn(),
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

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/estimates", vi.fn()],
}));

window.matchMedia =
  window.matchMedia ||
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  const mod = await import("./EstimatesList");
  return mod.default;
}

describe("EstimatesList", () => {
  it("shows a skeleton while estimates are loading", async () => {
    queryState.data = undefined;
    queryState.isLoading = true;
    queryState.isError = false;
    const EstimatesList = await loadPage();
    const { container } = render(<EstimatesList />);
    expect(
      container.querySelectorAll('[class*="animate-pulse"]').length
    ).toBeGreaterThan(0);
  });

  it("shows QueryError with a retry control on error", async () => {
    queryState.data = undefined;
    queryState.isLoading = false;
    queryState.isError = true;
    const EstimatesList = await loadPage();
    render(<EstimatesList />);
    expect(
      screen.getByRole("button", { name: /retry|try again/i })
    ).toBeTruthy();
  });

  it("every interactive control has an accessible name", async () => {
    queryState.data = { data: [], total: 0 };
    queryState.isLoading = false;
    queryState.isError = false;
    const EstimatesList = await loadPage();
    render(<EstimatesList />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      if (btn.getAttribute("data-slot") === "tooltip-trigger") continue;
      const hasText = (btn.textContent ?? "").trim().length > 0;
      const hasLabel = btn.hasAttribute("aria-label");
      expect(hasText || hasLabel).toBe(true);
    }
  });
});

describe("EstimatesList delete / lock", () => {
  const base = {
    project_type: "kitchen",
    estimated_low: 1000,
    estimated_high: 2000,
    created_at: "2026-09-01T00:00:00.000Z",
    projects: { name: "Farmhouse" },
    clients: { name: "Reynolds" },
  };

  async function renderRows() {
    queryState.data = {
      total: 2,
      data: [
        { ...base, id: 1, sent_to_client: false, approved_by_client: false },
        { ...base, id: 2, sent_to_client: true, approved_by_client: true },
      ],
    };
    queryState.isLoading = false;
    queryState.isError = false;
    const EstimatesList = await loadPage();
    return render(<EstimatesList />);
  }

  it("deletes a draft estimate only after confirmation", async () => {
    deleteMutateAsync.mockClear();
    await renderRows();
    // Exactly one delete control: the approved estimate is locked, not deletable.
    fireEvent.click(screen.getByRole("button", { name: "Delete estimate" }));
    expect(deleteMutateAsync).not.toHaveBeenCalled();
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Delete estimate" })
    );
    await waitFor(() =>
      expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 1 })
    );
  });

  it("shows approved estimates as locked with no Edit or Delete", async () => {
    await renderRows();
    expect(screen.getByText("Locked")).toBeTruthy();
    // Only the draft row keeps an Edit action.
    expect(screen.getAllByTitle("Edit estimate")).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "Delete estimate" })
    ).toHaveLength(1);
  });
});
