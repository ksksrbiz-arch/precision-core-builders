/**
 * Schedule router tests — auth, validation, and repo delegation.
 *
 * The router is a thin validation + camelCase→snake_case shaping layer over
 * `../_data/scheduleRepo`. We mock that repo so no real Supabase is hit and
 * assert each procedure delegates to the correct repo function with the
 * correctly-mapped arguments. `../db` is also mocked (mirroring
 * blueprintRouter.test.ts) because importing `appRouter` pulls in every router.
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

vi.mock("../_data/scheduleRepo", () => ({
  createScheduleItem: vi.fn(),
  deleteScheduleItem: vi.fn(),
  getWeatherSensitiveItems: vi.fn(),
  listScheduleItems: vi.fn(),
  updateScheduleItem: vi.fn(),
  updateScheduleItemOrder: vi.fn(),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import {
  createScheduleItem,
  deleteScheduleItem,
  getWeatherSensitiveItems,
  listScheduleItems,
  updateScheduleItem,
  updateScheduleItemOrder,
} from "../_data/scheduleRepo";

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
const user = () => appRouter.createCaller(ctx("u1", "user"));
const anon = () => appRouter.createCaller(ctx());

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Schedule Router — authorization", () => {
  it("list requires authentication", async () => {
    await expect(anon().schedule.list({ projectId: 1 })).rejects.toThrow(
      /unauthorized/i
    );
    expect(listScheduleItems).not.toHaveBeenCalled();
  });

  it("list works for any authenticated user", async () => {
    vi.mocked(listScheduleItems).mockResolvedValue([{ id: 1 }] as any);
    const res = await user().schedule.list({ projectId: 42 });
    expect(listScheduleItems).toHaveBeenCalledWith(42);
    expect(res).toEqual([{ id: 1 }]);
  });

  it("create requires authentication", async () => {
    await expect(
      anon().schedule.create({ projectId: 1, title: "x" })
    ).rejects.toThrow(/unauthorized/i);
    expect(createScheduleItem).not.toHaveBeenCalled();
  });

  it("create requires admin role", async () => {
    await expect(
      user().schedule.create({ projectId: 1, title: "x" })
    ).rejects.toThrow(/forbidden/i);
    expect(createScheduleItem).not.toHaveBeenCalled();
  });

  it("update requires admin role", async () => {
    await expect(user().schedule.update({ id: 1, title: "x" })).rejects.toThrow(
      /forbidden/i
    );
  });

  it("updateStatus requires admin role", async () => {
    await expect(
      user().schedule.updateStatus({ id: 1, status: "complete" })
    ).rejects.toThrow(/forbidden/i);
  });

  it("delete requires admin role", async () => {
    await expect(user().schedule.delete({ id: 1 })).rejects.toThrow(
      /forbidden/i
    );
    expect(deleteScheduleItem).not.toHaveBeenCalled();
  });

  it("getWeatherSensitive requires admin role", async () => {
    await expect(
      user().schedule.getWeatherSensitive({
        projectId: 1,
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-07-08T00:00:00.000Z",
      })
    ).rejects.toThrow(/forbidden/i);
  });

  it("updateOrder requires admin role", async () => {
    await expect(
      user().schedule.updateOrder({ projectId: 1, updates: [] })
    ).rejects.toThrow(/forbidden/i);
  });
});

describe("Schedule Router — repo delegation", () => {
  it("create maps camelCase input to snake_case repo columns", async () => {
    await admin().schedule.create({
      projectId: 7,
      parentId: 3,
      title: "Frame walls",
      description: "north wing",
      taskType: "framing",
      status: "in_progress",
      isOutdoor: true,
      weatherSensitive: true,
      plannedStart: "2026-07-01T08:00:00.000Z",
      plannedEnd: "2026-07-05T17:00:00.000Z",
      durationDays: 4,
      dependsOn: "1,2",
      sortOrder: 5,
      assignedTo: "crew-a",
      notes: "careful",
    });
    expect(createScheduleItem).toHaveBeenCalledWith({
      project_id: 7,
      parent_id: 3,
      title: "Frame walls",
      description: "north wing",
      task_type: "framing",
      status: "in_progress",
      is_outdoor: true,
      weather_sensitive: true,
      planned_start: "2026-07-01T08:00:00.000Z",
      planned_end: "2026-07-05T17:00:00.000Z",
      duration_days: 4,
      depends_on: "1,2",
      sort_order: 5,
      assigned_to: "crew-a",
      notes: "careful",
    });
  });

  it("create applies zod defaults for omitted optional fields", async () => {
    await admin().schedule.create({ projectId: 9, title: "Pour slab" });
    expect(createScheduleItem).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 9,
        title: "Pour slab",
        task_type: "other",
        status: "pending",
        is_outdoor: false,
        weather_sensitive: false,
        sort_order: 0,
      })
    );
  });

  it("update maps provided fields to snake_case columns", async () => {
    await admin().schedule.update({
      id: 9,
      title: "New title",
      taskType: "roofing",
      isOutdoor: true,
    });
    // The update input merges `ScheduleItemInput.partial()`, whose Zod defaults
    // (status, sortOrder, weatherSensitive) still apply, so those land in the
    // mapped payload alongside the explicitly-provided fields.
    const [id, values] = vi.mocked(updateScheduleItem).mock.calls[0];
    expect(id).toBe(9);
    expect(values).toMatchObject({
      title: "New title",
      task_type: "roofing",
      is_outdoor: true,
    });
    expect(values).not.toHaveProperty("projectId");
    expect(values).not.toHaveProperty("taskType");
    expect(values).not.toHaveProperty("isOutdoor");
  });

  it("updateStatus forwards status and optional actual timestamps", async () => {
    await admin().schedule.updateStatus({
      id: 12,
      status: "complete",
      actualStart: "2026-07-02T08:00:00.000Z",
      actualEnd: "2026-07-06T17:00:00.000Z",
    });
    expect(updateScheduleItem).toHaveBeenCalledWith(12, {
      status: "complete",
      actual_start: "2026-07-02T08:00:00.000Z",
      actual_end: "2026-07-06T17:00:00.000Z",
    });
  });

  it("updateStatus omits timestamps when not provided", async () => {
    await admin().schedule.updateStatus({ id: 12, status: "blocked" });
    expect(updateScheduleItem).toHaveBeenCalledWith(12, {
      status: "blocked",
    });
  });

  it("delete forwards the id", async () => {
    await admin().schedule.delete({ id: 15 });
    expect(deleteScheduleItem).toHaveBeenCalledWith(15);
  });

  it("getWeatherSensitive passes the validated window object", async () => {
    const input = {
      projectId: 7,
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-07-08T00:00:00.000Z",
    };
    await admin().schedule.getWeatherSensitive(input);
    expect(getWeatherSensitiveItems).toHaveBeenCalledWith(input);
  });

  it("updateOrder calls the repo per update and returns success", async () => {
    const res = await admin().schedule.updateOrder({
      projectId: 4,
      updates: [
        { id: 1, order: 0 },
        { id: 2, order: 1 },
      ],
    });
    expect(updateScheduleItemOrder).toHaveBeenCalledTimes(2);
    expect(updateScheduleItemOrder).toHaveBeenNthCalledWith(1, 1, 0, 4);
    expect(updateScheduleItemOrder).toHaveBeenNthCalledWith(2, 2, 1, 4);
    expect(res).toEqual({ success: true });
  });
});

describe("Schedule Router — input validation", () => {
  it("list rejects non-positive project IDs", async () => {
    await expect(admin().schedule.list({ projectId: 0 })).rejects.toThrow();
    expect(listScheduleItems).not.toHaveBeenCalled();
  });

  it("create rejects an unknown task type", async () => {
    await expect(
      admin().schedule.create({
        projectId: 1,
        title: "x",
        taskType: "teleportation" as any,
      })
    ).rejects.toThrow();
    expect(createScheduleItem).not.toHaveBeenCalled();
  });

  it("create rejects an empty title", async () => {
    await expect(
      admin().schedule.create({ projectId: 1, title: "" })
    ).rejects.toThrow();
    expect(createScheduleItem).not.toHaveBeenCalled();
  });

  it("updateStatus rejects an unknown status", async () => {
    await expect(
      admin().schedule.updateStatus({ id: 1, status: "bogus" as any })
    ).rejects.toThrow();
    expect(updateScheduleItem).not.toHaveBeenCalled();
  });

  it("delete rejects non-positive ids", async () => {
    await expect(admin().schedule.delete({ id: -1 })).rejects.toThrow();
    expect(deleteScheduleItem).not.toHaveBeenCalled();
  });

  it("getWeatherSensitive rejects a malformed start date", async () => {
    await expect(
      admin().schedule.getWeatherSensitive({
        projectId: 1,
        startDate: "not-a-date",
        endDate: "2026-07-08T00:00:00.000Z",
      })
    ).rejects.toThrow();
    expect(getWeatherSensitiveItems).not.toHaveBeenCalled();
  });
});
