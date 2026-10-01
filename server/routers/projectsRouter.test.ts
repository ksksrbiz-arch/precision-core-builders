/**
 * Projects router tests — authorization, repo delegation, and the
 * client-ownership guard on `getById`.
 *
 * The data-access layer (`../_data/projectsRepo`) is fully mocked so no real
 * Supabase call is made. `../db` is also mocked (the router imports it for
 * `logAdminAction`) so importing the full appRouter never constructs a live
 * client. Each test asserts the arguments the router forwards to its repo
 * function and that admin-only procedures reject non-admin / unauthenticated
 * callers.
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

vi.mock("../_data/projectsRepo", () => ({
  listProjects: vi.fn(async () => ({ data: [], total: 0 })),
  getMyProject: vi.fn(async () => ({ id: 1, name: "My Project" })),
  getProjectById: vi.fn(async () => ({
    id: 1,
    name: "Project",
    clients: { user_id: "u1" },
    client_portal_enabled: true,
  })),
  createProject: vi.fn(async () => ({
    id: 5,
    name: "New",
    client_id: 9,
    status: "lead",
  })),
  updateProject: vi.fn(async () => ({ id: 5 })),
  getProjectRow: vi.fn(async () => ({ id: 5 })),
  updateProjectProgress: vi.fn(async () => ({ id: 5 })),
  deleteProject: vi.fn(async () => ({ success: true })),
  getProjectsStats: vi.fn(async () => []),
  getProfitabilitySources: vi.fn(async () => [
    { data: { contracted_budget: 1000 }, error: null },
    { data: [], error: null },
    { data: [], error: null },
  ]),
  getPortfolioProfitability: vi.fn(async () => []),
  getCostAdjustmentTotals: vi.fn(async () => new Map()),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as repo from "../_data/projectsRepo";

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
const user = () => appRouter.createCaller(ctx("u1", "user"));
const anon = () => appRouter.createCaller(ctx());

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Projects Router — repo delegation", () => {
  it("list forwards its input to listProjects", async () => {
    const input = { page: 2, pageSize: 10, status: "in_progress" as const };
    await admin().projects.list(input);
    expect(repo.listProjects).toHaveBeenCalledWith(input);
  });

  it("list defaults to an empty input object", async () => {
    await admin().projects.list();
    expect(repo.listProjects).toHaveBeenCalledWith({});
  });

  it("getById passes input.id to getProjectById (admin skips the guard)", async () => {
    const res = await admin().projects.getById({ id: 42 });
    expect(repo.getProjectById).toHaveBeenCalledWith(42);
    expect(res).toMatchObject({ id: 1 });
  });

  it("create maps camelCase input to snake_case repo values", async () => {
    await admin().projects.create({
      clientId: 9,
      name: "New Build",
      status: "lead",
      estimatedBudget: 50000,
      clientPortalEnabled: true,
      state: "OR",
    });
    expect(repo.createProject).toHaveBeenCalledTimes(1);
    const values = vi.mocked(repo.createProject).mock.calls[0][0];
    expect(values).toMatchObject({
      client_id: 9,
      name: "New Build",
      status: "lead",
      estimated_budget: 50000,
      client_portal_enabled: true,
      state: "OR",
    });
  });

  it("update splits the id from the snake_case field patch", async () => {
    await admin().projects.update({ id: 8, name: "Renamed", clientId: 3 });
    expect(repo.updateProject).toHaveBeenCalledTimes(1);
    const [id, patch] = vi.mocked(repo.updateProject).mock.calls[0];
    expect(id).toBe(8);
    expect(patch).toMatchObject({ name: "Renamed", client_id: 3 });
  });

  it("update never injects create-time defaults (status/state/portal flag)", async () => {
    // Zod 4 applies `.default()` inside `.partial()`: a rename used to write
    // status "lead", state "OR" and client_portal_enabled true.
    await admin().projects.update({ id: 8, name: "Renamed" });
    const [, patch] = vi.mocked(repo.updateProject).mock.calls[0];
    expect(patch).toEqual({ name: "Renamed" });
  });

  it("update still changes status/portal flag when asked", async () => {
    await admin().projects.update({
      id: 8,
      status: "in_progress",
      clientPortalEnabled: false,
    });
    const [, patch] = vi.mocked(repo.updateProject).mock.calls[0];
    expect(patch).toEqual({
      status: "in_progress",
      client_portal_enabled: false,
    });
  });

  it("update can clear optional fields with null", async () => {
    await admin().projects.update({
      id: 8,
      description: null,
      address: null,
      estimatedBudget: null,
      contractedBudget: null,
      estimatedStartDate: null,
      siteCamUrl: null,
      permitNumbers: null,
    });
    const [, patch] = vi.mocked(repo.updateProject).mock.calls[0];
    expect(patch).toEqual({
      description: null,
      address: null,
      estimated_budget: null,
      contracted_budget: null,
      estimated_start_date: null,
      site_cam_url: null,
      permit_numbers: null,
    });
  });

  it("update does not forward legacy startDate/budget (no such columns)", async () => {
    await admin().projects.update({
      id: 8,
      startDate: "2026-01-01T00:00:00.000Z",
      budget: 5000,
    });
    const [, patch] = vi.mocked(repo.updateProject).mock.calls[0];
    expect(patch).toEqual({});
  });

  it("create still applies the defaults", async () => {
    await admin().projects.create({ clientId: 1, name: "New" });
    const [values] = vi.mocked(repo.createProject).mock.calls[0];
    expect(values).toMatchObject({
      status: "lead",
      state: "OR",
      client_portal_enabled: true,
    });
  });

  it("updateProgress maps completion percent to snake_case", async () => {
    await admin().projects.updateProgress({
      id: 8,
      completionPercent: 40,
    });
    expect(repo.updateProjectProgress).toHaveBeenCalledWith(8, {
      completion_percent: 40,
    });
  });

  it("updateProgress returns the row without updating when patch is empty", async () => {
    await admin().projects.updateProgress({ id: 8 });
    expect(repo.getProjectRow).toHaveBeenCalledWith(8);
    expect(repo.updateProjectProgress).not.toHaveBeenCalled();
  });

  it("delete passes input.id to deleteProject", async () => {
    await admin().projects.delete({ id: 14 });
    expect(repo.deleteProject).toHaveBeenCalledWith(14);
  });

  it("stats aggregates the rows from getProjectsStats, actual cost from the ledger", async () => {
    vi.mocked(repo.getProjectsStats).mockResolvedValueOnce([
      { id: 1, status: "lead", estimated_budget: 100 },
      { id: 2, status: "in_progress", estimated_budget: 200 },
    ] as any);
    vi.mocked(repo.getCostAdjustmentTotals).mockResolvedValueOnce(
      new Map([
        [1, 50],
        [2, 150],
      ])
    );
    const res = await admin().projects.stats();
    expect(res.total).toBe(2);
    expect(res.byStatus.lead).toBe(1);
    expect(res.byStatus.active).toBe(1);
    expect(res.totalEstimated).toBe(300);
    expect(res.totalActual).toBe(200);
  });

  it("stats.costedBasis sums the budget basis of only the projects that have logged costs", async () => {
    // Project 1: contracted wins over estimated. Project 2: no contract -> estimate.
    // Project 3 has no logged cost -> excluded. Project 4's cost is 0 -> excluded.
    vi.mocked(repo.getProjectsStats).mockResolvedValueOnce([
      {
        id: 1,
        status: "in_progress",
        estimated_budget: 90,
        contracted_budget: 100,
      },
      {
        id: 2,
        status: "in_progress",
        estimated_budget: 200,
        contracted_budget: null,
      },
      {
        id: 3,
        status: "lead",
        estimated_budget: 1_000_000,
        contracted_budget: null,
      },
      {
        id: 4,
        status: "contracted",
        estimated_budget: 500,
        contracted_budget: 500,
      },
    ] as any);
    vi.mocked(repo.getCostAdjustmentTotals).mockResolvedValueOnce(
      new Map([
        [1, 40],
        [2, 60],
        [4, 0],
      ])
    );
    const res = await admin().projects.stats();
    expect(res.costedBasis).toBe(300);
    expect(res.totalActual).toBe(100);
    // total pipeline still includes everything
    expect(res.totalEstimated).toBe(90 + 200 + 1_000_000 + 500);
  });

  it("profitability computes margin/variance from the sources, actual cost from cost_adjustment ledger entries", async () => {
    vi.mocked(repo.getProfitabilitySources).mockResolvedValueOnce([
      { data: { contracted_budget: 1000 }, error: null },
      { data: [], error: null },
      {
        data: [
          { entry_type: "cost_adjustment", amount_delta: 300 },
          { entry_type: "change_order", amount_delta: 200 },
          { entry_type: "note", amount_delta: null },
        ],
        error: null,
      },
    ] as any);
    const res = await admin().projects.profitability({ id: 3 });
    expect(repo.getProfitabilitySources).toHaveBeenCalledWith(3);
    expect(res.projectId).toBe(3);
    expect(res.contracted).toBe(1000);
    expect(res.actualCost).toBe(300);
    expect(res.changeOrderTotal).toBe(500);
    expect(res.onBudget).toBe(true);
  });

  it("profitabilitySummary rolls up portfolio totals, actual cost from the ledger", async () => {
    vi.mocked(repo.getPortfolioProfitability).mockResolvedValueOnce([
      {
        id: 1,
        name: "A",
        status: "in_progress",
        contracted_budget: 1000,
        estimated_budget: 800,
      },
    ] as any);
    vi.mocked(repo.getCostAdjustmentTotals).mockResolvedValueOnce(
      new Map([[1, 600]])
    );
    const res = await admin().projects.profitabilitySummary();
    expect(res.projects).toHaveLength(1);
    expect(res.projects[0].profit).toBe(400);
    expect(res.totals.contracted).toBe(1000);
    expect(res.totals.marginPct).toBeCloseTo(40);
  });

  it("profitabilitySummary margin only counts projects with logged costs", async () => {
    vi.mocked(repo.getPortfolioProfitability).mockResolvedValueOnce([
      // Costed: contracted 1000, spent 600 -> 40% margin on its own.
      {
        id: 1,
        name: "A",
        status: "in_progress",
        contracted_budget: 1000,
        estimated_budget: 800,
      },
      // Not started: a big budget with no logged cost must not read as profit.
      {
        id: 2,
        name: "B",
        status: "lead",
        contracted_budget: null,
        estimated_budget: 9000,
      },
    ] as any);
    vi.mocked(repo.getCostAdjustmentTotals).mockResolvedValueOnce(
      new Map([[1, 600]])
    );
    const res = await admin().projects.profitabilitySummary();
    expect(res.totals.costedBasis).toBe(1000);
    expect(res.totals.marginPct).toBeCloseTo(40); // not (1000-600+9000)/10000 = 94%
    // portfolio totals still include everything
    expect(res.totals.basis).toBe(10000);
    expect(res.projects).toHaveLength(2);
  });

  it("profitabilitySummary margin is 0 when nothing has logged costs", async () => {
    vi.mocked(repo.getPortfolioProfitability).mockResolvedValueOnce([
      {
        id: 2,
        name: "B",
        status: "lead",
        contracted_budget: null,
        estimated_budget: 9000,
      },
    ] as any);
    vi.mocked(repo.getCostAdjustmentTotals).mockResolvedValueOnce(new Map());
    const res = await admin().projects.profitabilitySummary();
    expect(res.totals.marginPct).toBe(0);
  });
});

describe("Projects Router — myProject", () => {
  it("delegates to getMyProject for a client user", async () => {
    await user().projects.myProject();
    expect(repo.getMyProject).toHaveBeenCalledWith("u1");
  });

  it("returns null for admins without querying", async () => {
    const res = await admin().projects.myProject();
    expect(res).toBeNull();
    expect(repo.getMyProject).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    await expect(anon().projects.myProject()).rejects.toThrow(/unauthorized/i);
  });
});

describe("Projects Router — getById ownership guard", () => {
  it("allows a client to read their own portal-enabled project", async () => {
    vi.mocked(repo.getProjectById).mockResolvedValueOnce({
      id: 1,
      clients: { user_id: "u1" },
      client_portal_enabled: true,
    } as any);
    const res = await user().projects.getById({ id: 1 });
    expect(res).toMatchObject({ id: 1 });
  });

  it("rejects a client reading another client's project", async () => {
    vi.mocked(repo.getProjectById).mockResolvedValueOnce({
      id: 1,
      clients: { user_id: "someone-else" },
      client_portal_enabled: true,
    } as any);
    await expect(user().projects.getById({ id: 1 })).rejects.toThrow(
      /do not have access/i
    );
  });

  it("rejects a client when the portal is disabled", async () => {
    vi.mocked(repo.getProjectById).mockResolvedValueOnce({
      id: 1,
      clients: { user_id: "u1" },
      client_portal_enabled: false,
    } as any);
    await expect(user().projects.getById({ id: 1 })).rejects.toThrow(
      /do not have access/i
    );
  });

  it("rejects with FORBIDDEN (not a bare Error) and does not leak existence", async () => {
    vi.mocked(repo.getProjectById).mockRejectedValueOnce(
      new Error("JSON object requested, multiple (or no) rows returned")
    );
    await expect(user().projects.getById({ id: 999 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("Projects Router — authorization", () => {
  it("protected queries reject unauthenticated callers", async () => {
    await expect(anon().projects.list()).rejects.toThrow(/unauthorized/i);
    await expect(anon().projects.getById({ id: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(repo.listProjects).not.toHaveBeenCalled();
  });

  it("admin procedures reject non-admin users (forbidden)", async () => {
    const u = user();
    // list returns the whole book of business + client contact details.
    await expect(u.projects.list()).rejects.toThrow(/forbidden/i);
    expect(repo.listProjects).not.toHaveBeenCalled();
    await expect(u.projects.create({ clientId: 1, name: "x" })).rejects.toThrow(
      /forbidden/i
    );
    await expect(u.projects.update({ id: 1 })).rejects.toThrow(/forbidden/i);
    await expect(u.projects.updateProgress({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    await expect(u.projects.delete({ id: 1 })).rejects.toThrow(/forbidden/i);
    await expect(u.projects.stats()).rejects.toThrow(/forbidden/i);
    await expect(u.projects.profitability({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    await expect(u.projects.profitabilitySummary()).rejects.toThrow(
      /forbidden/i
    );
    expect(repo.createProject).not.toHaveBeenCalled();
    expect(repo.deleteProject).not.toHaveBeenCalled();
  });

  it("admin procedures reject unauthenticated callers (unauthorized)", async () => {
    const a = anon();
    await expect(a.projects.create({ clientId: 1, name: "x" })).rejects.toThrow(
      /unauthorized/i
    );
    await expect(a.projects.stats()).rejects.toThrow(/unauthorized/i);
    await expect(a.projects.profitabilitySummary()).rejects.toThrow(
      /unauthorized/i
    );
    expect(repo.createProject).not.toHaveBeenCalled();
  });
});
