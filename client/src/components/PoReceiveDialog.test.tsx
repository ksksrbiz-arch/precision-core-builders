/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const receiveMutateAsync = vi.fn(async (_input: unknown) => ({ id: 1 }));

const PO = {
  id: 1,
  po_number: "PO-1",
  purchase_order_items: [
    {
      id: 11,
      description: "2x4 studs",
      quantity: "100",
      quantity_received: "40",
      materials: { unit: "ea" },
    },
    {
      id: 12,
      description: "Joist hangers",
      quantity: "20",
      quantity_received: "20",
      materials: { unit: "ea" },
    },
    {
      id: 13,
      description: "Deck screws",
      quantity: "5",
      quantity_received: "0",
      materials: null,
    },
  ],
};

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock("@/lib/trpc", () => {
  const utils = new Proxy(
    {},
    { get: () => new Proxy({}, { get: () => vi.fn() }) }
  );
  return {
    trpc: {
      useUtils: () => utils,
      purchaseOrders: {
        getById: {
          useQuery: () => ({ data: PO, isLoading: false }),
        },
        receive: {
          useMutation: () => ({
            mutateAsync: receiveMutateAsync,
            isPending: false,
          }),
        },
      },
    },
  };
});

import { PoReceiveDialog } from "./PoReceiveDialog";

function open() {
  const onOpenChange = vi.fn();
  render(
    <PoReceiveDialog
      poId={1}
      poNumber="PO-1"
      open
      onOpenChange={onOpenChange}
    />
  );
  return onOpenChange;
}

const qty = (name: RegExp) => screen.getByLabelText(name) as HTMLInputElement;

beforeEach(() => receiveMutateAsync.mockClear());
afterEach(cleanup);

describe("PoReceiveDialog", () => {
  it("shows ordered / received / outstanding per line", () => {
    open();
    expect(
      screen.getByText(/Ordered 100 ea · received 40 · 60 outstanding/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Ordered 20 ea · received 20 · complete/)
    ).toBeTruthy();
  });

  it("disables completed lines and keeps Record receipt off until something is entered", () => {
    open();
    expect(qty(/joist hangers/i).disabled).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /record receipt/i,
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("sends only the lines with a quantity", async () => {
    open();
    fireEvent.change(qty(/2x4 studs/i), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: /record receipt/i }));
    await waitFor(() =>
      expect(receiveMutateAsync).toHaveBeenCalledWith({
        id: 1,
        lines: [{ itemId: 11, quantity: 25 }],
      })
    );
  });

  it("blocks a quantity above what's outstanding", () => {
    open();
    fireEvent.change(qty(/deck screws/i), { target: { value: "6" } });
    expect(screen.getByRole("alert").textContent).toMatch(
      /only 5 outstanding/i
    );
    expect(
      (
        screen.getByRole("button", {
          name: /record receipt/i,
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("'Fill all outstanding' enters exactly the remaining quantity on open lines", async () => {
    open();
    fireEvent.click(
      screen.getByRole("button", { name: /fill all outstanding/i })
    );
    expect(qty(/2x4 studs/i).value).toBe("60");
    expect(qty(/deck screws/i).value).toBe("5");
    expect(qty(/joist hangers/i).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: /record receipt/i }));
    await waitFor(() =>
      expect(receiveMutateAsync).toHaveBeenCalledWith({
        id: 1,
        lines: [
          { itemId: 11, quantity: 60 },
          { itemId: 13, quantity: 5 },
        ],
      })
    );
  });
});
