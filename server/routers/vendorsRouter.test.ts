/**
 * Vendors router tests — auth, validation, and camelCase → snake_case mapping.
 *
 * The `vendorsRepo` data layer is fully mocked so no real Supabase is hit; we
 * assert on the exact arguments the router hands to each repo function. The
 * `../db` module is also mocked (mirroring routers.test.ts / blueprintRouter
 * .test.ts) so importing the full appRouter never constructs a live client.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../db", () => {
  function makeSingle() {
    return Promise.resolve({ data: null, error: null });
  }
  function makeBuilder(): any {
    const p: any = Promise.resolve({ data: [], error: null, count: 0 });
    const chain = () => makeBuilder();
    for (const m of [
      "select",
      "insert",
      "update",
      "delete",
      "upsert",
      "eq",
      "neq",
      "order",
      "limit",
      "range",
    ]) {
      p[m] = chain;
    }
    p.single = makeSingle;
    p.maybeSingle = () => Promise.resolve({ data: null, error: null });
    return p;
  }
  return {
    db: { from: () => makeBuilder() },
    paginate: () => ({ from: 0, to: 19 }),
  };
});

vi.mock("../_data/vendorsRepo", () => ({
  listVendors: vi.fn(async () => [{ id: 1, name: "Acme Supply" }]),
  getVendorById: vi.fn(async (id: number) => ({ id, name: "Acme Supply" })),
  createVendor: vi.fn(async (input: any) => ({ id: 7, ...input })),
  updateVendor: vi.fn(async (id: number, patch: any) => ({ id, ...patch })),
  deleteVendor: vi.fn(async () => ({ success: true })),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  createVendor,
  deleteVendor,
  getVendorById,
  listVendors,
  updateVendor,
} from "../_data/vendorsRepo";

const listVendorsMock = vi.mocked(listVendors);
const getVendorByIdMock = vi.mocked(getVendorById);
const createVendorMock = vi.mocked(createVendor);
const updateVendorMock = vi.mocked(updateVendor);
const deleteVendorMock = vi.mocked(deleteVendor);

function ctx(userId?: string, role: "admin" | "user" = "admin"): TrpcContext {
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

describe("Vendors Router — authorization", () => {
  it("list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.vendors.list()).rejects.toThrow(/unauthorized/i);
    expect(listVendorsMock).not.toHaveBeenCalled();
  });

  it("list rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.vendors.list()).rejects.toThrow(/forbidden/i);
    expect(listVendorsMock).not.toHaveBeenCalled();
  });

  it("create rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      caller.vendors.create({ name: "Acme Supply" })
    ).rejects.toThrow(/forbidden/i);
    expect(createVendorMock).not.toHaveBeenCalled();
  });

  it("delete rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.vendors.delete({ id: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(deleteVendorMock).not.toHaveBeenCalled();
  });
});

describe("Vendors Router — read + delete delegation", () => {
  it("list delegates to listVendors and returns its rows", async () => {
    const res = await admin().vendors.list();
    expect(listVendorsMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual([{ id: 1, name: "Acme Supply" }]);
  });

  it("getById forwards input.id to getVendorById", async () => {
    await admin().vendors.getById({ id: 42 });
    expect(getVendorByIdMock).toHaveBeenCalledTimes(1);
    expect(getVendorByIdMock).toHaveBeenCalledWith(42);
  });

  it("delete forwards input.id to deleteVendor", async () => {
    const res = await admin().vendors.delete({ id: 9 });
    expect(deleteVendorMock).toHaveBeenCalledWith(9);
    expect(res).toEqual({ success: true });
  });
});

describe("Vendors Router — create mapping", () => {
  it("passes the full validated input through to createVendor", async () => {
    const input = {
      name: "Cascade Lumber",
      contactName: "Dana Reyes",
      email: "dana@cascade.example",
      phone: "555-0100",
      website: "https://cascade.example",
      address: "12 Mill Rd",
      category: "lumber",
      accountNumber: "ACC-77",
      paymentTerms: "Net 30",
      notes: "preferred supplier",
      isActive: true,
    };
    await admin().vendors.create(input);
    expect(createVendorMock).toHaveBeenCalledTimes(1);
    // The router hands the camelCase input straight to the repo, which owns
    // the snake_case column mapping for inserts.
    expect(createVendorMock).toHaveBeenCalledWith(input);
  });

  it("accepts a name-only vendor", async () => {
    await admin().vendors.create({ name: "Solo Vendor" });
    expect(createVendorMock).toHaveBeenCalledWith({ name: "Solo Vendor" });
  });
});

describe("Vendors Router — update mapping", () => {
  it("maps multi-word camelCase fields to snake_case columns", async () => {
    await admin().vendors.update({
      id: 3,
      name: "Renamed Vendor",
      contactName: "Sam Vale",
      accountNumber: "ACC-99",
      paymentTerms: "Net 15",
      isActive: false,
    });
    expect(updateVendorMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateVendorMock.mock.calls[0];
    expect(id).toBe(3);
    expect(patch).toEqual({
      name: "Renamed Vendor",
      contact_name: "Sam Vale",
      account_number: "ACC-99",
      payment_terms: "Net 15",
      is_active: false,
    });
  });

  it("clears a field when it is passed as null", async () => {
    await admin().vendors.update({ id: 4, contactName: null });
    const [, patch] = updateVendorMock.mock.calls[0];
    expect(patch).toEqual({ contact_name: null });
    // Present-but-null must survive as an explicit null (column set NULL).
    expect(patch.contact_name).toBeNull();
  });

  it("omits fields entirely when they are left undefined", async () => {
    await admin().vendors.update({ id: 5, name: "Only Name" });
    const [, patch] = updateVendorMock.mock.calls[0];
    expect(patch).toEqual({ name: "Only Name" });
    expect("contact_name" in patch).toBe(false);
    expect("account_number" in patch).toBe(false);
    expect("payment_terms" in patch).toBe(false);
    expect("is_active" in patch).toBe(false);
  });

  it("distinguishes null (clear) from undefined (leave) per field", async () => {
    await admin().vendors.update({
      id: 6,
      accountNumber: null,
      paymentTerms: "Due on receipt",
    });
    const [, patch] = updateVendorMock.mock.calls[0];
    expect(patch).toEqual({
      account_number: null,
      payment_terms: "Due on receipt",
    });
    expect("contact_name" in patch).toBe(false);
    expect("is_active" in patch).toBe(false);
  });
});

describe("Vendors Router — input validation", () => {
  it("create rejects an invalid email", async () => {
    await expect(
      admin().vendors.create({ name: "Bad Email", email: "not-an-email" })
    ).rejects.toThrow();
    expect(createVendorMock).not.toHaveBeenCalled();
  });

  it("create rejects an empty name", async () => {
    await expect(admin().vendors.create({ name: "" })).rejects.toThrow();
    expect(createVendorMock).not.toHaveBeenCalled();
  });

  it("getById rejects non-positive ids", async () => {
    await expect(admin().vendors.getById({ id: 0 })).rejects.toThrow();
    await expect(admin().vendors.getById({ id: -3 })).rejects.toThrow();
    expect(getVendorByIdMock).not.toHaveBeenCalled();
  });

  it("delete rejects non-positive ids", async () => {
    await expect(admin().vendors.delete({ id: 0 })).rejects.toThrow();
    expect(deleteVendorMock).not.toHaveBeenCalled();
  });

  it("update rejects an invalid email", async () => {
    await expect(
      admin().vendors.update({ id: 1, email: "nope" })
    ).rejects.toThrow();
    expect(updateVendorMock).not.toHaveBeenCalled();
  });
});
