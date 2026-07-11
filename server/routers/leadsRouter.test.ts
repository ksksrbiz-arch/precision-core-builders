/**
 * Leads router tests — repo delegation, auth enforcement, and input validation.
 *
 * The `leadsRepo` data layer is mocked so no real Supabase is hit; each test
 * asserts the router delegates to the repo with correctly mapped arguments.
 * `../db` is mocked (mirroring blueprintRouter.test.ts) so importing the full
 * appRouter never constructs a real Supabase client.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../db", () => {
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
      "gte",
      "neq",
      "order",
      "limit",
      "range",
    ]) {
      p[m] = chain;
    }
    p.single = () => Promise.resolve({ data: null, error: null });
    p.maybeSingle = () => Promise.resolve({ data: null, error: null });
    return p;
  }
  return {
    db: { from: () => makeBuilder() },
    paginate: () => ({ from: 0, to: 19 }),
  };
});

vi.mock("../_data/leadsRepo", () => ({
  leadsRepo: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { leadsRepo } from "../_data/leadsRepo";

const listMock = vi.mocked(leadsRepo.list);
const createMock = vi.mocked(leadsRepo.create);
const deleteMock = vi.mocked(leadsRepo.delete);
const clearMock = vi.mocked(leadsRepo.clear);

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

const validLead = {
  name: "Jane Contractor",
  projectType: "Kitchen remodel",
  budget: "$50k-$75k",
  location: "Eugene, OR",
  timeline: "Q3 2026",
  message: "Interested in a full remodel.",
  score: 82,
  priority: "high" as const,
  reasoning: "High budget, clear timeline.",
  suggestedAction: "Call within 24h.",
  estimatedValue: 62000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Leads Router — authorization", () => {
  it("list requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.leads.list({})).rejects.toThrow(/unauthorized/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("list rejects non-admin users", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.leads.list({})).rejects.toThrow(/forbidden/i);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("create requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.leads.create(validLead)).rejects.toThrow(/forbidden/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("delete requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.leads.delete({ id: 1 })).rejects.toThrow(/forbidden/i);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("clear requires admin role", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await expect(caller.leads.clear()).rejects.toThrow(/forbidden/i);
    expect(clearMock).not.toHaveBeenCalled();
  });

  it("clear rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.leads.clear()).rejects.toThrow(/unauthorized/i);
    expect(clearMock).not.toHaveBeenCalled();
  });
});

describe("Leads Router — repo delegation", () => {
  it("list forwards an explicit limit to the repo", async () => {
    listMock.mockResolvedValue([]);
    await admin().leads.list({ limit: 25 });
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(25);
  });

  it("list defaults the limit to 50 when omitted", async () => {
    const rows = [{ id: 1, name: "Lead" }];
    listMock.mockResolvedValue(rows as any);
    const res = await admin().leads.list({});
    expect(listMock).toHaveBeenCalledWith(50);
    expect(res).toBe(rows);
  });

  it("create maps camelCase input to snake_case repo columns", async () => {
    createMock.mockResolvedValue({ id: 7 } as any);
    await admin().leads.create(validLead);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      name: "Jane Contractor",
      project_type: "Kitchen remodel",
      budget: "$50k-$75k",
      location: "Eugene, OR",
      timeline: "Q3 2026",
      message: "Interested in a full remodel.",
      score: 82,
      priority: "high",
      reasoning: "High budget, clear timeline.",
      suggested_action: "Call within 24h.",
      estimated_value: 62000,
      scored_by: "admin-1",
    });
  });

  it("create coerces a missing estimatedValue to null", async () => {
    createMock.mockResolvedValue({ id: 8 } as any);
    const { estimatedValue: _omit, ...minimal } = validLead;
    await admin().leads.create(minimal);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toMatchObject({
      estimated_value: null,
      scored_by: "admin-1",
    });
  });

  it("delete forwards the numeric id to the repo", async () => {
    deleteMock.mockResolvedValue({ success: true });
    const res = await admin().leads.delete({ id: 42 });
    expect(deleteMock).toHaveBeenCalledWith(42);
    expect(res).toEqual({ success: true });
  });

  it("clear delegates to the repo with no arguments", async () => {
    clearMock.mockResolvedValue({ success: true });
    const res = await admin().leads.clear();
    expect(clearMock).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledWith();
    expect(res).toEqual({ success: true });
  });
});

describe("Leads Router — input validation", () => {
  it("list rejects a limit above the maximum", async () => {
    await expect(admin().leads.list({ limit: 101 })).rejects.toThrow();
    expect(listMock).not.toHaveBeenCalled();
  });

  it("list rejects a non-positive limit", async () => {
    await expect(admin().leads.list({ limit: 0 })).rejects.toThrow();
    expect(listMock).not.toHaveBeenCalled();
  });

  it("create rejects an invalid priority enum value", async () => {
    await expect(
      admin().leads.create({ ...validLead, priority: "critical" as any })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("create rejects a score above 100", async () => {
    await expect(
      admin().leads.create({ ...validLead, score: 150 })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("create rejects a negative score", async () => {
    await expect(
      admin().leads.create({ ...validLead, score: -1 })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("create rejects an empty name", async () => {
    await expect(
      admin().leads.create({ ...validLead, name: "" })
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("delete rejects a non-positive id", async () => {
    await expect(admin().leads.delete({ id: 0 })).rejects.toThrow();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("delete rejects a non-integer id", async () => {
    await expect(admin().leads.delete({ id: 1.5 })).rejects.toThrow();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
