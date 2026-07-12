/**
 * Sub-contractors router tests — auth gating (all-admin) plus happy-path
 * delegation to the subContractorsRepo data layer.
 *
 * The repo is fully mocked so no real Supabase is hit, `../db` is mocked
 * (mirroring vendorsRouter.test.ts) so importing the appRouter never builds a
 * live client, and `../_core/notification` is mocked so `sendBriefing` never
 * fires a real notification.
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

vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn(async () => ({ success: true })),
}));

vi.mock("../_data/subContractorsRepo", () => ({
  listSubContractors: vi.fn(async () => [{ id: 1, name: "Ace Plumbing" }]),
  getSubContractorById: vi.fn(async (id: number) => ({
    id,
    name: "Ace Plumbing",
  })),
  createSubContractor: vi.fn(async (input: any) => ({ id: 7, ...input })),
  updateSubContractor: vi.fn(async (id: number, patch: any) => ({
    id,
    ...patch,
  })),
  deleteSubContractor: vi.fn(async () => ({ success: true })),
  getSubContractorContact: vi.fn(async (id: number) => ({
    id,
    name: "Ace Plumbing",
    email: "ace@example.com",
    phone: "555-0100",
  })),
  getProjectBriefingInfo: vi.fn(async (id: number) => ({
    id,
    name: "Riverside Remodel",
    address: "1 River Rd",
    city: "Eugene, OR",
  })),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { notifyOwner } from "../_core/notification";
import {
  createSubContractor,
  deleteSubContractor,
  getSubContractorById,
  listSubContractors,
  updateSubContractor,
} from "../_data/subContractorsRepo";

const notifyOwnerMock = vi.mocked(notifyOwner);
const listMock = vi.mocked(listSubContractors);
const getByIdMock = vi.mocked(getSubContractorById);
const createMock = vi.mocked(createSubContractor);
const updateMock = vi.mocked(updateSubContractor);
const deleteMock = vi.mocked(deleteSubContractor);

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

describe("SubContractors Router — authorization", () => {
  it("list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.subContractors.list()).rejects.toThrow(/unauthorized/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("list rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.subContractors.list()).rejects.toThrow(/forbidden/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("getById rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.subContractors.getById({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("create rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(
      caller.subContractors.create({ name: "Ace Plumbing" })
    ).rejects.toThrow(/unauthorized/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("update rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      caller.subContractors.update({ id: 1, name: "Renamed" })
    ).rejects.toThrow(/forbidden/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sendBriefing rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      caller.subContractors.sendBriefing({
        subContractorId: 1,
        projectId: 2,
        scheduleDetails: "Mon 8am",
      })
    ).rejects.toThrow(/forbidden/i);
    expect(notifyOwnerMock).not.toHaveBeenCalled();
  });

  it("delete rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.subContractors.delete({ id: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("SubContractors Router — read + delete delegation", () => {
  it("list delegates to listSubContractors and returns its rows", async () => {
    const res = await admin().subContractors.list();
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(res).toEqual([{ id: 1, name: "Ace Plumbing" }]);
  });

  it("getById forwards input.id to getSubContractorById", async () => {
    await admin().subContractors.getById({ id: 42 });
    expect(getByIdMock).toHaveBeenCalledTimes(1);
    expect(getByIdMock).toHaveBeenCalledWith(42);
  });

  it("delete forwards input.id to deleteSubContractor", async () => {
    const res = await admin().subContractors.delete({ id: 9 });
    expect(deleteMock).toHaveBeenCalledWith(9);
    expect(res).toEqual({ success: true });
  });
});

describe("SubContractors Router — create + update", () => {
  it("passes the validated input through to createSubContractor", async () => {
    const input = {
      name: "Cascade Electric",
      company: "Cascade LLC",
      email: "info@cascade.example",
      phone: "555-0199",
      trade: "electrical" as const,
    };
    await admin().subContractors.create(input);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(input);
  });

  it("maps multi-word camelCase fields to snake_case on update", async () => {
    await admin().subContractors.update({
      id: 3,
      name: "Renamed Sub",
      licenseNumber: "LIC-88",
      insuranceExpiry: "2027-01-01T00:00:00.000Z",
      isActive: false,
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateMock.mock.calls[0];
    expect(id).toBe(3);
    expect(patch).toEqual({
      name: "Renamed Sub",
      license_number: "LIC-88",
      insurance_expiry: "2027-01-01T00:00:00.000Z",
      is_active: false,
    });
  });
});

describe("SubContractors Router — sendBriefing", () => {
  it("builds the briefing and notifies the owner", async () => {
    const res = await admin().subContractors.sendBriefing({
      subContractorId: 1,
      projectId: 2,
      scheduleDetails: "Mon 8am pour",
      siteAccessCode: "1234",
      safetyNotes: "Hard hats required",
    });
    expect(notifyOwnerMock).toHaveBeenCalledTimes(1);
    const payload = notifyOwnerMock.mock.calls[0][0];
    expect(payload.title).toContain("Ace Plumbing");
    expect(payload.content).toContain("Riverside Remodel");
    expect(payload.content).toContain("Mon 8am pour");
    expect(res).toEqual({
      success: true,
      subName: "Ace Plumbing",
      briefingContent: expect.stringContaining("Schedule: Mon 8am pour"),
    });
  });
});
