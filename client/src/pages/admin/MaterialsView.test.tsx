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
} from "@testing-library/react";

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

const updateMutateAsync = vi.fn(async (_input: unknown) => ({ id: 1 }));
const deleteMutateAsync = vi.fn(async (_input: unknown) => ({ success: true }));

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
            if (routerName === "materials" && procName === "update") {
              return {
                useQuery: passthroughQuery,
                useMutation: () => ({
                  ...noopMutation(),
                  mutateAsync: updateMutateAsync,
                }),
              };
            }
            if (routerName === "materials" && procName === "delete") {
              return {
                useQuery: passthroughQuery,
                useMutation: () => ({
                  ...noopMutation(),
                  mutateAsync: deleteMutateAsync,
                }),
              };
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

describe("MaterialsView edit / delete", () => {
  const row = {
    id: 7,
    name: "2x6 PT Lumber",
    category: "lumber",
    unit: "ea",
    vendor_name: "Pro Build",
    quantity_needed: 40,
    quantity_ordered: 10,
    quantity_received: 5,
    unit_price_current: 8.5,
    phase_needed: "framing",
    notes: "Check for crowning",
    is_shortage: true,
  };

  async function renderWithRow() {
    queryState.data = { data: [row], total: 1 };
    queryState.isLoading = false;
    queryState.isError = false;
    const MaterialsView = await loadPage();
    return render(<MaterialsView />);
  }

  it("edits a material: prefills the form and sends null for cleared fields", async () => {
    // The server's materials.update existed but nothing in the UI called it, so
    // a typo or a received quantity could never be corrected.
    updateMutateAsync.mockClear();
    await renderWithRow();

    fireEvent.click(screen.getByRole("button", { name: "Edit 2x6 PT Lumber" }));
    expect(screen.getByText("Edit Material")).toBeTruthy();

    // Prefilled from the row, including the edit-only quantity fields.
    expect(
      (screen.getByLabelText("Quantity ordered") as HTMLInputElement).value
    ).toBe("10");
    expect(
      (screen.getByLabelText("Quantity received") as HTMLInputElement).value
    ).toBe("5");

    fireEvent.change(screen.getByLabelText("Quantity ordered"), {
      target: { value: "40" },
    });
    fireEvent.change(screen.getByLabelText("Quantity received"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Phase"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0]).toMatchObject({
      id: 7,
      name: "2x6 PT Lumber",
      quantityNeeded: 40,
      quantityOrdered: 40,
      quantityReceived: 0, // 0 is a valid value, not "blank"
      unitPriceCurrent: 8.5,
      phaseNeeded: null,
      notes: null,
      category: "lumber",
    });
  });

  it("blocks a negative received quantity on the field", async () => {
    updateMutateAsync.mockClear();
    await renderWithRow();
    fireEvent.click(screen.getByRole("button", { name: "Edit 2x6 PT Lumber" }));
    fireEvent.change(screen.getByLabelText("Quantity received"), {
      target: { value: "-3" },
    });
    expect(screen.getByText("Can't be negative.")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Save Changes",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("deletes a material only after confirmation", async () => {
    deleteMutateAsync.mockClear();
    await renderWithRow();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete 2x6 PT Lumber" })
    );
    expect(deleteMutateAsync).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 7 })
    );
  });
});
