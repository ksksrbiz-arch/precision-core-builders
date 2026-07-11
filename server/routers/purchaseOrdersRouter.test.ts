/**
 * purchaseOrdersRouter tests — admin authorization, input validation, and
 * delegation to the data-access layer.
 *
 * The repo module (`../_data/purchaseOrdersRepo`) is mocked so no real
 * Supabase client is ever constructed; each procedure is asserted to forward
 * the right arguments to the right repo function.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_data/purchaseOrdersRepo", () => ({
  listPurchaseOrders: vi.fn(async () => ({ data: [], count: 0 })),
  getPurchaseOrderById: vi.fn(async () => ({ id: 1 })),
  updatePurchaseOrderStatus: vi.fn(async () => ({ id: 1, status: "issued" })),
  deletePurchaseOrder: vi.fn(async () => undefined),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  deletePurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
} from "../_data/purchaseOrdersRepo";

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
  it("forwards (id, status) to updatePurchaseOrderStatus", async () => {
    await admin().purchaseOrders.updateStatus({ id: 3, status: "received" });
    expect(updateStatusMock).toHaveBeenCalledTimes(1);
    expect(updateStatusMock).toHaveBeenCalledWith(3, "received");
  });

  it.each(["draft", "issued", "partial", "received", "cancelled"] as const)(
    "accepts the valid status %s",
    async status => {
      await admin().purchaseOrders.updateStatus({ id: 1, status });
      expect(updateStatusMock).toHaveBeenCalledWith(1, status);
    }
  );

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
