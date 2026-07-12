/**
 * Materials router tests — auth gating (list = protected, mutations = admin)
 * plus happy-path delegation and camelCase → snake_case mapping.
 *
 * The materialsRepo data layer is fully mocked so no real Supabase is hit, and
 * `../db` is mocked (mirroring vendorsRouter.test.ts) so importing the full
 * appRouter never constructs a live client.
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

vi.mock("../_data/materialsRepo", () => ({
  listMaterials: vi.fn(async () => ({ items: [{ id: 1, name: "2x4 Studs" }] })),
  createMaterial: vi.fn(async (input: any) => ({ id: 7, ...input })),
  updateMaterial: vi.fn(async (id: number, patch: any) => ({ id, ...patch })),
  deleteMaterial: vi.fn(async () => ({ success: true })),
  getMaterialQuantities: vi.fn(async () => ({
    quantity_needed: 100,
    quantity_ordered: 40,
  })),
  listMaterialsForProject: vi.fn(async () => [
    { id: 1, quantity_needed: 100, quantity_ordered: 40, is_shortage: false },
    { id: 2, quantity_needed: 10, quantity_ordered: 20, is_shortage: true },
  ]),
  setMaterialShortage: vi.fn(async () => ({ success: true })),
  computeIsShortage: vi.fn(
    (needed?: number, ordered?: number) => (needed ?? 0) > (ordered ?? 0)
  ),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  computeIsShortage,
  createMaterial,
  deleteMaterial,
  listMaterials,
  listMaterialsForProject,
  setMaterialShortage,
  updateMaterial,
} from "../_data/materialsRepo";

const listMock = vi.mocked(listMaterials);
const createMock = vi.mocked(createMaterial);
const updateMock = vi.mocked(updateMaterial);
const deleteMock = vi.mocked(deleteMaterial);
const listForProjectMock = vi.mocked(listMaterialsForProject);
const setShortageMock = vi.mocked(setMaterialShortage);
const computeIsShortageMock = vi.mocked(computeIsShortage);

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

describe("Materials Router — authorization", () => {
  it("list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.materials.list({})).rejects.toThrow(/unauthorized/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("list allows any authenticated user (protectedProcedure)", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    const res = await caller.materials.list({});
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ items: [{ id: 1, name: "2x4 Studs" }] });
  });

  it("create rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      caller.materials.create({ name: "2x4 Studs" })
    ).rejects.toThrow(/forbidden/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("update rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      caller.materials.update({ id: 1, name: "Renamed" })
    ).rejects.toThrow(/forbidden/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("checkShortages rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(
      caller.materials.checkShortages({ projectId: 1 })
    ).rejects.toThrow(/unauthorized/i);
    expect(listForProjectMock).not.toHaveBeenCalled();
  });

  it("delete rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.materials.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("Materials Router — list + delete delegation", () => {
  it("list forwards the input filters to listMaterials", async () => {
    await admin().materials.list({ projectId: 5, shortagesOnly: true });
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith({
      projectId: 5,
      shortagesOnly: true,
    });
  });

  it("delete forwards input.id to deleteMaterial", async () => {
    const res = await admin().materials.delete({ id: 9 });
    expect(deleteMock).toHaveBeenCalledWith(9);
    expect(res).toEqual({ success: true });
  });
});

describe("Materials Router — create", () => {
  it("passes the validated input through to createMaterial", async () => {
    const input = {
      name: "Rebar #4",
      projectId: 3,
      quantityNeeded: 200,
      unitPriceCurrent: 8.5,
    };
    await admin().materials.create(input);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(input);
  });

  it("rejects an invalid vendor url", async () => {
    await expect(
      admin().materials.create({ name: "Bad Url", vendorUrl: "not-a-url" })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("Materials Router — update mapping", () => {
  it("maps multi-word camelCase fields to snake_case columns", async () => {
    await admin().materials.update({
      id: 3,
      name: "Renamed Material",
      quantityReceived: 12,
      unitPriceBudgeted: 5,
      vendorName: "Cascade Supply",
      poNumber: "PO-77",
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateMock.mock.calls[0];
    expect(id).toBe(3);
    expect(patch).toMatchObject({
      name: "Renamed Material",
      quantity_received: 12,
      unit_price_budgeted: 5,
      vendor_name: "Cascade Supply",
      po_number: "PO-77",
    });
  });

  it("recomputes the shortage flag when a quantity changes", async () => {
    await admin().materials.update({ id: 4, quantityOrdered: 200 });
    const [, patch] = updateMock.mock.calls[0];
    // needed (100 from current) <= ordered (200) → not a shortage
    expect(patch).toMatchObject({
      quantity_ordered: 200,
      is_shortage: false,
    });
  });
});

describe("Materials Router — checkShortages", () => {
  it("reconciles flags and returns the shortage items", async () => {
    const res = await admin().materials.checkShortages({ projectId: 2 });
    expect(listForProjectMock).toHaveBeenCalledWith(2);
    expect(computeIsShortageMock).toHaveBeenCalled();
    // Row 1 (100 needed / 40 ordered) is a shortage but flagged false → flip it.
    expect(setShortageMock).toHaveBeenCalledWith(1, true);
    expect(res.shortages).toBe(1);
    expect(res.items[0].id).toBe(1);
  });
});
