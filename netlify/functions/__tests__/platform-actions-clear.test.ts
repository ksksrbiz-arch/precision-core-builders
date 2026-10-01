/**
 * clear-demo-data: removes the seeded "Demo:" project(s) without leaving
 * orphans and without deleting a client that still owns other projects.
 *
 * Schema facts this guards (drizzle/schema.ts):
 *  - estimates.project_id / site_plans.project_id are ON DELETE SET NULL, so
 *    they must be deleted explicitly or they are orphaned.
 *  - projects.client_id is ON DELETE RESTRICT, so a client with another
 *    project can't (and must not) be deleted.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/_core/auth/verifyToken", () => ({
  verifyAdminToken: vi.fn(async () => ({
    ok: true,
    user: { id: "u", email: "e@x.com", name: "E", role: "admin" },
  })),
}));
vi.mock("../../../server/_core/llm", () => ({ invokeLLM: vi.fn() }));

type Op = { table: string; op: string; filter?: string; value?: unknown };
const ops: Op[] = [];
let demoProjects: Array<{ id: number; client_id: number | null }> = [];
let remainingProjectsByClient: Record<number, number> = {};

function builder(table: string) {
  let current: Op = { table, op: "select" };
  let head = false;
  const b: any = {
    select(_cols?: string, opts?: { head?: boolean }) {
      head = Boolean(opts?.head);
      return b;
    },
    delete() {
      current = { table, op: "delete" };
      return b;
    },
    like() {
      return b;
    },
    in(col: string, vals: unknown) {
      current = { ...current, filter: col, value: vals };
      return b;
    },
    eq(col: string, val: unknown) {
      current = { ...current, filter: col, value: val };
      return b;
    },
    then(resolve: (v: unknown) => void) {
      ops.push(current);
      if (table === "projects" && current.op === "select" && head) {
        resolve({
          data: null,
          error: null,
          count: remainingProjectsByClient[current.value as number] ?? 0,
        });
      } else if (table === "projects" && current.op === "select") {
        resolve({ data: demoProjects, error: null });
      } else {
        resolve({ data: null, error: null });
      }
    },
  };
  return b;
}

vi.mock("../../../server/_core/supabase", () => ({
  getSupabaseAdmin: () => ({ from: (t: string) => builder(t) }),
}));

async function clear() {
  vi.resetModules();
  const { handler } = await import("../platform-actions");
  const res = await handler(
    {
      httpMethod: "POST",
      headers: {},
      body: JSON.stringify({ action: "clear-demo-data", adminToken: "t" }),
    } as never,
    {} as never
  );
  return { statusCode: res!.statusCode, body: JSON.parse(res!.body as string) };
}

const deletes = (table: string) =>
  ops.filter(o => o.table === table && o.op === "delete");

beforeEach(() => {
  ops.length = 0;
  demoProjects = [{ id: 11, client_id: 5 }];
  remainingProjectsByClient = {};
  vi.stubEnv("SETUP_ADMIN_TOKEN", "t");
});

describe("clear-demo-data", () => {
  it("deletes demo estimates and site plans so they are not orphaned", async () => {
    const { statusCode } = await clear();
    expect(statusCode).toBe(200);
    for (const table of [
      "field_reports",
      "materials",
      "estimates",
      "site_plans",
      "billing_events",
    ]) {
      expect(deletes(table)).toHaveLength(1);
      expect(deletes(table)[0]).toMatchObject({
        filter: "project_id",
        value: [11],
      });
    }
  });

  it("removes children before the project, and the project before its client", async () => {
    await clear();
    const order = ops.filter(o => o.op === "delete").map(o => o.table);
    expect(order.indexOf("estimates")).toBeLessThan(order.indexOf("projects"));
    expect(order.indexOf("projects")).toBeLessThan(order.indexOf("clients"));
  });

  it("deletes the demo client once it has no projects left", async () => {
    const { body } = await clear();
    expect(deletes("clients")).toHaveLength(1);
    expect(deletes("clients")[0]).toMatchObject({ filter: "id", value: 5 });
    expect(body.data).toMatchObject({ projectsDeleted: 1, clientsDeleted: 1 });
  });

  it("keeps a client that still owns another (real) project", async () => {
    remainingProjectsByClient = { 5: 2 };
    const { statusCode, body } = await clear();
    expect(statusCode).toBe(200);
    expect(deletes("clients")).toHaveLength(0);
    expect(body.data).toMatchObject({ projectsDeleted: 1, clientsDeleted: 0 });
  });

  it("is a no-op when there is no demo data", async () => {
    demoProjects = [];
    const { body } = await clear();
    expect(body.message).toMatch(/No demo data/i);
    expect(ops.some(o => o.op === "delete")).toBe(false);
  });
});
