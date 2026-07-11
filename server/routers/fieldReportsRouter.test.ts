/**
 * Field reports router tests — auth enforcement, repo delegation with
 * camelCase→snake_case field mapping, client scoping, and input validation.
 *
 * The data-access layer (`../_data/fieldReportsRepo`) is fully mocked so no
 * real Supabase is hit; `../db` is mocked so `logAdminAction` is inert.
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

vi.mock("../_data/fieldReportsRepo", () => ({
  listFieldReports: vi.fn(),
  getFieldReportById: vi.fn(),
  createFieldReport: vi.fn(),
  updateFieldReport: vi.fn(),
  publishFieldReport: vi.fn(),
  unpublishFieldReport: vi.fn(),
  getFieldReportProjectId: vi.fn(),
  deleteFieldReport: vi.fn(),
  listPublishedFieldReports: vi.fn(),
  getWeeklyStatsRows: vi.fn(),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as repo from "../_data/fieldReportsRepo";

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
  vi.mocked(repo.listFieldReports).mockResolvedValue({
    data: [],
    count: 0,
  } as any);
  vi.mocked(repo.getFieldReportById).mockResolvedValue({
    id: 1,
    projects: { clients: { user_id: "client-1" } },
  } as any);
  vi.mocked(repo.createFieldReport).mockResolvedValue({
    id: 10,
    report_date: "2026-01-01T00:00:00.000Z",
  } as any);
  vi.mocked(repo.updateFieldReport).mockResolvedValue({ id: 10 } as any);
  vi.mocked(repo.publishFieldReport).mockResolvedValue({
    id: 10,
    project_id: 5,
  } as any);
  vi.mocked(repo.unpublishFieldReport).mockResolvedValue({
    id: 10,
    project_id: 5,
  } as any);
  vi.mocked(repo.getFieldReportProjectId).mockResolvedValue({
    data: { project_id: 5 },
    error: null,
  } as any);
  vi.mocked(repo.deleteFieldReport).mockResolvedValue(undefined as any);
  vi.mocked(repo.listPublishedFieldReports).mockResolvedValue([] as any);
  vi.mocked(repo.getWeeklyStatsRows).mockResolvedValue([] as any);
});

describe("Field Reports Router — authorization", () => {
  it("list requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.fieldReports.list({})).rejects.toThrow(/unauthorized/i);
  });

  it("getById requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.fieldReports.getById({ id: 1 })).rejects.toThrow(
      /unauthorized/i
    );
  });

  it("listPublished requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(
      caller.fieldReports.listPublished({ projectId: 1 })
    ).rejects.toThrow(/unauthorized/i);
  });

  it("create requires admin role", async () => {
    const userCaller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      userCaller.fieldReports.create({ projectId: 1 })
    ).rejects.toThrow(/forbidden/i);
  });

  it("update requires admin role", async () => {
    const userCaller = appRouter.createCaller(ctx("u1", "user"));
    await expect(
      userCaller.fieldReports.update({ id: 1, summary: "x" })
    ).rejects.toThrow(/forbidden/i);
  });

  it("publish requires admin role", async () => {
    const userCaller = appRouter.createCaller(ctx("u1", "user"));
    await expect(userCaller.fieldReports.publish({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });

  it("delete requires admin role", async () => {
    const userCaller = appRouter.createCaller(ctx("u1", "user"));
    await expect(userCaller.fieldReports.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
  });

  it("weeklyStats requires admin role", async () => {
    const userCaller = appRouter.createCaller(ctx("u1", "user"));
    await expect(userCaller.fieldReports.weeklyStats()).rejects.toThrow(
      /forbidden/i
    );
  });
});

describe("Field Reports Router — client scoping (getById)", () => {
  it("allows a client to read a report for their own project", async () => {
    const caller = appRouter.createCaller(ctx("client-1", "user"));
    const res = await caller.fieldReports.getById({ id: 1 });
    expect(res).toMatchObject({ id: 1 });
    expect(repo.getFieldReportById).toHaveBeenCalledWith(1);
  });

  it("forbids a client from reading another client's report", async () => {
    const caller = appRouter.createCaller(ctx("other-client", "user"));
    await expect(caller.fieldReports.getById({ id: 1 })).rejects.toThrow(
      /do not have permission/i
    );
  });

  it("allows an admin to read any report regardless of ownership", async () => {
    const res = await admin().fieldReports.getById({ id: 1 });
    expect(res).toMatchObject({ id: 1 });
  });
});

describe("Field Reports Router — repo delegation & field mapping", () => {
  it("list delegates the raw input to the repo", async () => {
    const caller = appRouter.createCaller(ctx("u1", "user"));
    await caller.fieldReports.list({ projectId: 7, page: 2, pageSize: 10 });
    expect(repo.listFieldReports).toHaveBeenCalledWith({
      projectId: 7,
      page: 2,
      pageSize: 10,
    });
  });

  it("create maps camelCase input to snake_case columns and JSON-encodes arrays", async () => {
    await admin().fieldReports.create({
      projectId: 5,
      summary: "Poured footings",
      tasksCompleted: ["dig", "pour"],
      issuesFlagged: ["rebar short"],
    });
    expect(repo.createFieldReport).toHaveBeenCalledTimes(1);
    const values = vi.mocked(repo.createFieldReport).mock.calls[0][0];
    expect(values).toMatchObject({
      project_id: 5,
      author_id: "admin-1",
      summary: "Poured footings",
      tasks_completed: JSON.stringify(["dig", "pour"]),
      issues_flagged: JSON.stringify(["rebar short"]),
      // Omitted array inputs map to null, not undefined.
      materials_used: null,
      material_shortages: null,
      photo_urls: null,
    });
    // report_date defaults to an ISO timestamp when not supplied.
    expect(typeof (values as any).report_date).toBe("string");
  });

  it("create passes an explicit reportDate through unchanged", async () => {
    const when = "2026-05-01T12:00:00.000Z";
    await admin().fieldReports.create({ projectId: 5, reportDate: when });
    const values = vi.mocked(repo.createFieldReport).mock.calls[0][0];
    expect((values as any).report_date).toBe(when);
  });

  it("update maps only provided fields and stringifies arrays", async () => {
    await admin().fieldReports.update({
      id: 42,
      summary: "Revised",
      materialsUsed: ["2x4", "nails"],
    });
    expect(repo.updateFieldReport).toHaveBeenCalledTimes(1);
    const [id, values] = vi.mocked(repo.updateFieldReport).mock.calls[0];
    expect(id).toBe(42);
    expect(values).toEqual({
      summary: "Revised",
      materials_used: JSON.stringify(["2x4", "nails"]),
    });
    // Untouched array fields are not written at all.
    expect(values).not.toHaveProperty("tasks_completed");
    expect(values).not.toHaveProperty("id");
  });

  it("publish delegates by id and returns the repo result", async () => {
    const res = await admin().fieldReports.publish({ id: 10 });
    expect(repo.publishFieldReport).toHaveBeenCalledWith(10);
    expect(res).toMatchObject({ id: 10, project_id: 5 });
  });

  it("unpublish delegates by id", async () => {
    await admin().fieldReports.unpublish({ id: 10 });
    expect(repo.unpublishFieldReport).toHaveBeenCalledWith(10);
  });

  it("delete looks up the project id then deletes", async () => {
    const res = await admin().fieldReports.delete({ id: 10 });
    expect(repo.getFieldReportProjectId).toHaveBeenCalledWith(10);
    expect(repo.deleteFieldReport).toHaveBeenCalledWith(10);
    expect(res).toEqual({ success: true });
  });

  it("delete throws when the report cannot be found", async () => {
    vi.mocked(repo.getFieldReportProjectId).mockResolvedValueOnce({
      data: null,
      error: { message: "not found" },
    } as any);
    await expect(admin().fieldReports.delete({ id: 999 })).rejects.toThrow(
      /not found/i
    );
    expect(repo.deleteFieldReport).not.toHaveBeenCalled();
  });

  it("listPublished scopes the query to the requested project id", async () => {
    const caller = appRouter.createCaller(ctx("client-1", "user"));
    await caller.fieldReports.listPublished({ projectId: 88 });
    expect(repo.listPublishedFieldReports).toHaveBeenCalledWith(88);
  });

  it("weeklyStats aggregates repo rows into per-week buckets", async () => {
    vi.mocked(repo.getWeeklyStatsRows).mockResolvedValueOnce([
      {
        report_date: "2026-06-01T00:00:00.000Z",
        published_to_client: true,
        issues_flagged: JSON.stringify(["leak"]),
      },
      {
        report_date: "2026-06-02T00:00:00.000Z",
        published_to_client: false,
        issues_flagged: "[]",
      },
    ] as any);
    const res = await admin().fieldReports.weeklyStats();
    expect(repo.getWeeklyStatsRows).toHaveBeenCalledTimes(1);
    // Sum across buckets (week boundaries depend on the runtime timezone).
    const totals = res.reduce(
      (acc, w) => ({
        reports: acc.reports + w.reports,
        issues: acc.issues + w.issues,
        published: acc.published + w.published,
      }),
      { reports: 0, issues: 0, published: 0 }
    );
    expect(totals).toEqual({ reports: 2, issues: 1, published: 1 });
  });
});

describe("Field Reports Router — input validation", () => {
  it("create rejects non-positive project IDs", async () => {
    await expect(
      admin().fieldReports.create({ projectId: 0 })
    ).rejects.toThrow();
    expect(repo.createFieldReport).not.toHaveBeenCalled();
  });

  it("create rejects malformed photo URLs", async () => {
    await expect(
      admin().fieldReports.create({ projectId: 1, photoUrls: ["not-a-url"] })
    ).rejects.toThrow();
    expect(repo.createFieldReport).not.toHaveBeenCalled();
  });

  it("getById rejects non-positive ids", async () => {
    await expect(admin().fieldReports.getById({ id: 0 })).rejects.toThrow();
    expect(repo.getFieldReportById).not.toHaveBeenCalled();
  });

  it("update rejects non-positive ids", async () => {
    await expect(
      admin().fieldReports.update({ id: -1, summary: "x" })
    ).rejects.toThrow();
    expect(repo.updateFieldReport).not.toHaveBeenCalled();
  });

  it("list rejects a pageSize above the maximum", async () => {
    await expect(
      admin().fieldReports.list({ pageSize: 500 })
    ).rejects.toThrow();
    expect(repo.listFieldReports).not.toHaveBeenCalled();
  });
});
