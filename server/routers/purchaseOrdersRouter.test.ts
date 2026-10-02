/**
 * purchaseOrdersRouter tests — admin authorization, input validation, and
 * delegation to the data-access layer.
 *
 * The repo module (`../_data/purchaseOrdersRepo`) is mocked so no real
 * Supabase client is ever constructed; each procedure is asserted to forward
 * the right arguments to the right repo function.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_data/ledgerRepo", () => ({
  appendLedgerEntry: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("../_data/purchaseOrdersRepo", () => ({
  listPurchaseOrders: vi.fn(async () => ({ data: [], count: 0 })),
  getPurchaseOrderById: vi.fn(async () => ({ id: 1 })),
  // Sentinel "no previous status" so every target status is a real transition.
  getPurchaseOrderStatus: vi.fn(async () => "none" as any),
  updatePurchaseOrderStatus: vi.fn(async () => ({ id: 1, status: "issued" })),
  getPurchaseOrderLines: vi.fn(async () => [] as any[]),
  applyPurchaseOrderReceipt: vi.fn(async () => ({ id: 1, status: "received" })),
  deletePurchaseOrder: vi.fn(async () => undefined),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  applyPurchaseOrderReceipt,
  deletePurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrderLines,
  getPurchaseOrderStatus,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
} from "../_data/purchaseOrdersRepo";
import { appendLedgerEntry } from "../_data/ledgerRepo";

const listMock = vi.mocked(listPurchaseOrders);
const getByIdMock = vi.mocked(getPurchaseOrderById);
const updateStatusMock = vi.mocked(updatePurchaseOrderStatus);
const deleteMock = vi.mocked(deletePurchaseOrder);

function ctx(userId?: string, role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: userId
      ? { id: userId, email: `${userId}@example.com`, name: userId, role }
      : null,
    req: {} as any,
    res: {} as any,
  };
}

const admin = () => appRouter.createCaller(ctx("admin-1", "admin"));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Purchase Orders Router — authorization", () => {
  it("list requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.purchaseOrders.list()).rejects.toThrow(/unauthorized/i);
  });

  it("list requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.purchaseOrders.list()).rejects.toThrow(/forbidden/i);
  });

  it("getById requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.purchaseOrders.getById({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });

  it("updateStatus requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      caller.purchaseOrders.updateStatus({ id: 1, status: "issued" })
    ).rejects.toThrow(/forbidden/i);
  });

  it("delete requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.purchaseOrders.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });
});

describe("Purchase Orders Router — list delegation", () => {
  it("passes {} to listPurchaseOrders when called with no input", async () => {
    await admin().purchaseOrders.list();
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith({});
  });

  it("passes {} when called with undefined input", async () => {
    await admin().purchaseOrders.list(undefined);
    expect(listMock).toHaveBeenCalledWith({});
  });

  it("forwards a provided projectId", async () => {
    await admin().purchaseOrders.list({ projectId: 42 });
    expect(listMock).toHaveBeenCalledWith({ projectId: 42 });
  });

  it("rejects a non-positive projectId", async () => {
    await expect(
      admin().purchaseOrders.list({ projectId: 0 })
    ).rejects.toThrow();
    expect(listMock).not.toHaveBeenCalled();
  });

  it("rejects a non-integer projectId", async () => {
    await expect(
      admin().purchaseOrders.list({ projectId: 1.5 })
    ).rejects.toThrow();
    expect(listMock).not.toHaveBeenCalled();
  });
});

describe("Purchase Orders Router — getById delegation", () => {
  it("forwards input.id to getPurchaseOrderById", async () => {
    await admin().purchaseOrders.getById({ id: 7 });
    expect(getByIdMock).toHaveBeenCalledTimes(1);
    expect(getByIdMock).toHaveBeenCalledWith(7);
  });

  it("rejects a non-positive id", async () => {
    await expect(admin().purchaseOrders.getById({ id: 0 })).rejects.toThrow();
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("rejects a missing id", async () => {
    await expect(admin().purchaseOrders.getById({} as any)).rejects.toThrow();
    expect(getByIdMock).not.toHaveBeenCalled();
  });
});

describe("Purchase Orders Router — updateStatus delegation", () => {
  it.each(["draft", "issued", "cancelled"] as const)(
    "forwards %s to updatePurchaseOrderStatus",
    async status => {
      await admin().purchaseOrders.updateStatus({ id: 1, status });
      expect(updateStatusMock).toHaveBeenCalledWith(1, status);
    }
  );

  it('refuses "partial" — a partial delivery needs quantities (use receive)', async () => {
    await expect(
      admin().purchaseOrders.updateStatus({ id: 1, status: "partial" })
    ).rejects.toThrow(/use receive/i);
    expect(updateStatusMock).not.toHaveBeenCalled();
    expect(vi.mocked(applyPurchaseOrderReceipt)).not.toHaveBeenCalled();
  });

  describe("idempotency + ledger", () => {
    const ledgerMock = vi.mocked(appendLedgerEntry);
    const statusMock = vi.mocked(getPurchaseOrderStatus);
    const linesMock = vi.mocked(getPurchaseOrderLines);
    const applyMock = vi.mocked(applyPurchaseOrderReceipt);

    it("does nothing (no receipt, no ledger entry) when the status is unchanged", async () => {
      statusMock.mockResolvedValueOnce("received");
      await admin().purchaseOrders.updateStatus({ id: 3, status: "received" });
      expect(updateStatusMock).not.toHaveBeenCalled();
      expect(applyMock).not.toHaveBeenCalled();
      expect(ledgerMock).not.toHaveBeenCalled();
      expect(getByIdMock).toHaveBeenCalledWith(3);
    });

    it("'received' receives only what is still outstanding (never double-counts)", async () => {
      statusMock.mockResolvedValueOnce("partial");
      linesMock.mockResolvedValueOnce([
        { id: 1, materialId: 10, quantity: 100, quantityReceived: 40 },
        { id: 2, materialId: 11, quantity: 20, quantityReceived: 20 },
      ]);
      applyMock.mockResolvedValueOnce({
        id: 3,
        status: "received",
        project_id: 12,
        po_number: "PO-7",
      } as any);
      await admin().purchaseOrders.updateStatus({ id: 3, status: "received" });
      expect(applyMock).toHaveBeenCalledWith(
        3,
        [
          {
            itemId: 1,
            materialId: 10,
            delta: 60,
            newReceived: 100,
            complete: true,
          },
        ],
        "received"
      );
      expect(updateStatusMock).not.toHaveBeenCalled();
      expect(ledgerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 12,
          entryType: "milestone",
          title: "PO PO-7 → received",
        })
      );
    });

    it("'received' with nothing outstanding only flips the status", async () => {
      statusMock.mockResolvedValueOnce("issued");
      linesMock.mockResolvedValueOnce([]);
      await admin().purchaseOrders.updateStatus({ id: 3, status: "received" });
      expect(applyMock).not.toHaveBeenCalled();
      expect(updateStatusMock).toHaveBeenCalledWith(3, "received");
    });

    it("won't send an order with receipts back to draft/issued", async () => {
      for (const previous of ["partial", "received"] as const) {
        statusMock.mockResolvedValueOnce(previous);
        await expect(
          admin().purchaseOrders.updateStatus({ id: 3, status: "issued" })
        ).rejects.toThrow(/already been received/i);
      }
      expect(updateStatusMock).not.toHaveBeenCalled();
    });

    it("can cancel an order that was partially received", async () => {
      statusMock.mockResolvedValueOnce("partial");
      await admin().purchaseOrders.updateStatus({ id: 3, status: "cancelled" });
      expect(updateStatusMock).toHaveBeenCalledWith(3, "cancelled");
    });

    it("logs an issue milestone, still for the shared admin session (null author)", async () => {
      statusMock.mockResolvedValueOnce("draft");
      updateStatusMock.mockResolvedValueOnce({
        id: 4,
        project_id: 5,
        po_number: "PO-9",
      } as any);
      await appRouter
        .createCaller(ctx("admin", "admin"))
        .purchaseOrders.updateStatus({ id: 4, status: "issued" });
      expect(ledgerMock).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: null, projectId: 5 })
      );
    });

    it("does not log cancelled/draft transitions", async () => {
      statusMock.mockResolvedValueOnce("issued");
      await admin().purchaseOrders.updateStatus({ id: 3, status: "cancelled" });
      expect(ledgerMock).not.toHaveBeenCalled();
    });
  });

  it("rejects an invalid status value", async () => {
    await expect(
      admin().purchaseOrders.updateStatus({
        id: 1,
        status: "shipped" as any,
      })
    ).rejects.toThrow();
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("rejects a non-positive id", async () => {
    await expect(
      admin().purchaseOrders.updateStatus({ id: -1, status: "issued" })
    ).rejects.toThrow();
    expect(updateStatusMock).not.toHaveBeenCalled();
  });
});

describe("Purchase Orders Router — delete delegation", () => {
  it("forwards input.id to deletePurchaseOrder", async () => {
    await admin().purchaseOrders.delete({ id: 9 });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(9);
  });

  it("rejects a non-positive id", async () => {
    await expect(admin().purchaseOrders.delete({ id: 0 })).rejects.toThrow();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("Purchase Orders Router — receive", () => {
  const statusMock = vi.mocked(getPurchaseOrderStatus);
  const linesMock = vi.mocked(getPurchaseOrderLines);
  const applyMock = vi.mocked(applyPurchaseOrderReceipt);
  const ledgerMock = vi.mocked(appendLedgerEntry);

  const poLines = () => [
    { id: 1, materialId: 10, quantity: 100, quantityReceived: 0 },
    { id: 2, materialId: 11, quantity: 20, quantityReceived: 0 },
  ];

  beforeEach(() => {
    statusMock.mockResolvedValue("issued");
    linesMock.mockResolvedValue(poLines());
  });

  it("requires admin", async () => {
    await expect(
      appRouter.createCaller(ctx("u1", "user")).purchaseOrders.receive({
        id: 1,
        lines: [{ itemId: 1, quantity: 5 }],
      })
    ).rejects.toThrow(/forbidden/i);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("applies exactly the quantities entered and leaves the PO partial", async () => {
    applyMock.mockResolvedValueOnce({
      id: 1,
      status: "partial",
      project_id: 9,
      po_number: "PO-1",
    } as any);
    await admin().purchaseOrders.receive({
      id: 1,
      lines: [{ itemId: 1, quantity: 40 }],
    });
    expect(applyMock).toHaveBeenCalledWith(
      1,
      [
        {
          itemId: 1,
          materialId: 10,
          delta: 40,
          newReceived: 40,
          complete: false,
        },
      ],
      "partial"
    );
    expect(ledgerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: "milestone",
        title: "PO PO-1 → partial",
        projectId: 9,
      })
    );
  });

  it("completes the PO when the last outstanding quantity arrives", async () => {
    linesMock.mockResolvedValue([
      { id: 1, materialId: 10, quantity: 100, quantityReceived: 100 },
      { id: 2, materialId: 11, quantity: 20, quantityReceived: 15 },
    ]);
    await admin().purchaseOrders.receive({
      id: 1,
      lines: [{ itemId: 2, quantity: 5 }],
    });
    expect(applyMock).toHaveBeenCalledWith(1, expect.any(Array), "received");
  });

  it("rejects over-receipt, unknown lines and zero quantities without touching inventory", async () => {
    await expect(
      admin().purchaseOrders.receive({
        id: 1,
        lines: [{ itemId: 2, quantity: 21 }],
      })
    ).rejects.toThrow(/only 20 still outstanding/);
    await expect(
      admin().purchaseOrders.receive({
        id: 1,
        lines: [{ itemId: 99, quantity: 1 }],
      })
    ).rejects.toThrow(/isn't part of this purchase order/);
    await expect(
      admin().purchaseOrders.receive({
        id: 1,
        lines: [{ itemId: 1, quantity: 0 }],
      })
    ).rejects.toThrow();
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("won't receive against a draft or cancelled order", async () => {
    for (const status of ["draft", "cancelled"] as const) {
      statusMock.mockResolvedValueOnce(status);
      await expect(
        admin().purchaseOrders.receive({
          id: 1,
          lines: [{ itemId: 1, quantity: 1 }],
        })
      ).rejects.toThrow();
    }
    expect(applyMock).not.toHaveBeenCalled();
  });
});
