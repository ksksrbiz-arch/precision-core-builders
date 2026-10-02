/**
 * Site-plans router tests — auth gating (all-admin) plus happy-path delegation
 * to the `sitePlansRepo` object data layer, including the ctx-derived author id
 * and camelCase → snake_case mapping on create/update.
 *
 * The repo is mocked as an object (matching the router's `import { sitePlansRepo
 * }` style) so no real Supabase is hit, and `../db` is mocked (mirroring
 * vendorsRouter.test.ts) so importing the appRouter never builds a live client.
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

vi.mock("../_data/sitePlansRepo", () => ({
  sitePlansRepo: {
    list: vi.fn(async () => [{ id: 1, name: "Lot 12 Layout" }]),
    getById: vi.fn(async (id: number) => ({ id, name: "Lot 12 Layout" })),
    create: vi.fn(async (input: any) => ({ id: 7, ...input })),
    update: vi.fn(async (id: number, patch: any) => ({ id, ...patch })),
    delete: vi.fn(async () => ({ success: true })),
  },
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { sitePlansRepo } from "../_data/sitePlansRepo";

const listMock = vi.mocked(sitePlansRepo.list);
const getByIdMock = vi.mocked(sitePlansRepo.getById);
const createMock = vi.mocked(sitePlansRepo.create);
const updateMock = vi.mocked(sitePlansRepo.update);
const deleteMock = vi.mocked(sitePlansRepo.delete);

function ctx(userId?: string, role: "admin" | "user" = "admin"): TrpcContext {
  return {
    user: userId
      ? { id: userId, email: `${userId}@example.com`, name: userId, role }
      : null,
    req: {} as any,
    res: {} as any,
  };
}

const ADMIN_UUID = "3f2b8c1e-5d4a-4b7e-9a10-0c2d3e4f5a6b";
const admin = () => appRouter.createCaller(ctx(ADMIN_UUID, "admin"));
// Shared admin session token => synthetic, non-UUID id.
const sharedAdmin = () => appRouter.createCaller(ctx("admin", "admin"));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SitePlans Router — authorization", () => {
  it("list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.sitePlans.list({})).rejects.toThrow(/unauthorized/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("list rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.sitePlans.list({})).rejects.toThrow(/forbidden/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("getById rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.sitePlans.getById({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("create rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.sitePlans.create({ name: "New Plan" })).rejects.toThrow(
      /unauthorized/i
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("update rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      caller.sitePlans.update({ id: 1, name: "Renamed" })
    ).rejects.toThrow(/forbidden/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("delete rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.sitePlans.delete({ id: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("SitePlans Router — read + delete delegation", () => {
  it("list forwards the projectId filter to the repo", async () => {
    const res = await admin().sitePlans.list({ projectId: 5 });
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(5);
    expect(res).toEqual([{ id: 1, name: "Lot 12 Layout" }]);
  });

  it("getById forwards input.id to the repo", async () => {
    await admin().sitePlans.getById({ id: 42 });
    expect(getByIdMock).toHaveBeenCalledWith(42);
  });

  it("delete forwards input.id to the repo", async () => {
    const res = await admin().sitePlans.delete({ id: 9 });
    expect(deleteMock).toHaveBeenCalledWith(9);
    expect(res).toEqual({ success: true });
  });
});

describe("SitePlans Router — create", () => {
  it("maps input to snake_case and derives author_id from ctx", async () => {
    await admin().sitePlans.create({
      name: "Lot 12 Layout",
      projectId: 3,
      elements: "[1]",
      appState: "{}",
      thumbnailDataUrl: "data:image/png;base64,AAA",
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      name: "Lot 12 Layout",
      project_id: 3,
      author_id: ADMIN_UUID,
      elements: "[1]",
      app_state: "{}",
      thumbnail_data_url: "data:image/png;base64,AAA",
    });
  });

  it("applies defaults and nulls when optional fields are omitted", async () => {
    await admin().sitePlans.create({ name: "Bare Plan" });
    const arg = createMock.mock.calls[0][0];
    expect(arg).toMatchObject({
      name: "Bare Plan",
      project_id: null,
      author_id: ADMIN_UUID,
      elements: "[]",
      app_state: "{}",
      thumbnail_data_url: null,
    });
    // An uncalibrated create doesn't write the scale column at all.
    expect(arg).not.toHaveProperty("scale_px_per_ft");
  });

  it("stores a calibrated scale and rejects an absurd one", async () => {
    await admin().sitePlans.create({ name: "Scaled", scalePxPerFt: 32.5 });
    expect(createMock.mock.calls[0][0]).toMatchObject({
      scale_px_per_ft: 32.5,
    });
    await expect(
      admin().sitePlans.create({ name: "Bad", scalePxPerFt: 0 })
    ).rejects.toThrow();
    await expect(
      admin().sitePlans.create({ name: "Bad", scalePxPerFt: 99999 })
    ).rejects.toThrow();
  });
});

describe("SitePlans Router — update mapping", () => {
  it("maps multi-word camelCase fields to snake_case and stamps updated_at", async () => {
    await admin().sitePlans.update({
      id: 3,
      name: "Renamed Plan",
      appState: '{"zoom":2}',
      thumbnailDataUrl: "data:image/png;base64,BBB",
      projectId: 8,
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateMock.mock.calls[0];
    expect(id).toBe(3);
    expect(patch).toMatchObject({
      name: "Renamed Plan",
      app_state: '{"zoom":2}',
      thumbnail_data_url: "data:image/png;base64,BBB",
      project_id: 8,
    });
    expect(typeof patch.updated_at).toBe("string");
  });

  it("passes projectId through as null to clear the association", async () => {
    await admin().sitePlans.update({ id: 4, projectId: null });
    const [, patch] = updateMock.mock.calls[0];
    expect(patch.project_id).toBeNull();
  });
});

describe("SitePlans Router — scale on update", () => {
  it("sends the scale only when the caller changed it; null clears it", async () => {
    await admin().sitePlans.update({ id: 3, name: "Just a rename" });
    expect(updateMock.mock.calls[0][1]).not.toHaveProperty("scale_px_per_ft");

    await admin().sitePlans.update({ id: 3, scalePxPerFt: 24 });
    expect(updateMock.mock.calls[1][1]).toMatchObject({ scale_px_per_ft: 24 });

    await admin().sitePlans.update({ id: 3, scalePxPerFt: null });
    expect(updateMock.mock.calls[2][1]).toMatchObject({
      scale_px_per_ft: null,
    });
  });
});

describe("SitePlans Router — takeoff", () => {
  const room = (extra: object) => ({
    type: "rectangle",
    isDeleted: false,
    ...extra,
  });

  it("rejects non-admin and unauthenticated callers", async () => {
    await expect(
      appRouter.createCaller(ctx("u1", "user")).sitePlans.takeoff({ id: 1 })
    ).rejects.toThrow(/forbidden/i);
    await expect(
      appRouter.createCaller(ctx()).sitePlans.takeoff({ id: 1 })
    ).rejects.toThrow(/unauthorized/i);
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("computes quantities from the STORED drawing and scale", async () => {
    getByIdMock.mockResolvedValueOnce({
      id: 4,
      name: "Kitchen reno",
      scale_px_per_ft: "40.0000", // numeric columns can arrive as strings
      elements: JSON.stringify([
        room({
          id: "r",
          width: 400,
          height: 400,
          customData: { pcb: { kind: "room", name: "Kitchen" } },
        }),
      ]),
    } as never);
    const res = await admin().sitePlans.takeoff({ id: 4 });
    expect(res.calibrated).toBe(true);
    expect(res.takeoff.scalePxPerFt).toBe(40);
    expect(res.takeoff.rooms).toEqual([
      { id: "r", name: "Kitchen", areaSqFt: 100, perimeterFt: 40 },
    ]);
  });

  it("an uncalibrated plan uses the default scale and says so", async () => {
    getByIdMock.mockResolvedValueOnce({
      id: 5,
      name: "Sketch",
      scale_px_per_ft: null,
      elements: "[]",
    } as never);
    const res = await admin().sitePlans.takeoff({ id: 5 });
    expect(res.calibrated).toBe(false);
    expect(res.takeoff.scalePxPerFt).toBe(20);
  });

  it("refuses unreadable drawing data instead of guessing", async () => {
    getByIdMock.mockResolvedValueOnce({
      id: 6,
      name: "Corrupt",
      scale_px_per_ft: null,
      elements: "{not json",
    } as never);
    await expect(admin().sitePlans.takeoff({ id: 6 })).rejects.toThrow(
      /unreadable/i
    );
  });
});
