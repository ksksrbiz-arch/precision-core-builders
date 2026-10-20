/**
 * The Ops Co-pilot grounds itself on this snapshot. Actual cost must come from
 * the ledger (cost_adjustment entries), not the stale `projects.actual_cost`
 * column — otherwise every project looks free and "over budget" never fires.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const tables: Record<string, unknown[]> = {};
/** Exact counts the mocked DB reports for head/count queries, by table. */
const counts: Record<string, number> = {};
/** Every `.is(col, null)` filter applied, by table. */
const isFilters: Record<string, string[]> = {};

vi.mock("../db", () => {
  function chain(table: string): any {
    const result = Promise.resolve({
      data: tables[table] ?? [],
      error: null,
      count: counts[table],
    });
    const proxy: any = new Proxy(result, {
      get(target, prop) {
        if (prop === "then") return target.then.bind(target);
        if (prop === "is") {
          return (col: string) => {
            (isFilters[table] ??= []).push(col);
            return proxy;
          };
        }
        // Every builder method (select/order/limit/eq/neq/...) is chainable.
        return () => proxy;
      },
    });
    return proxy;
  }
  return { db: { from: (t: string) => chain(t) } };
});

const getCostAdjustmentTotals = vi.fn();
vi.mock("../_data/projectsRepo", () => ({
  getCostAdjustmentTotals: () => getCostAdjustmentTotals(),
}));

import { buildOpsSnapshot } from "./opsSnapshot";

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(counts)) delete counts[k];
  for (const k of Object.keys(isFilters)) delete isFilters[k];
  getCostAdjustmentTotals.mockReset();
  tables.projects = [
    {
      id: 1,
      name: "Canby Farmhouse",
      status: "in_progress",
      contracted_budget: "100000.00",
      estimated_budget: "110000.00",
      // Stale column that must be ignored:
      actual_cost: "0",
      completion_percent: 40,
    },
    {
      id: 2,
      name: "Eugene ADU",
      status: "contracted",
      contracted_budget: "200000.00",
      estimated_budget: "190000.00",
      actual_cost: "999999",
      completion_percent: 5,
    },
  ];
});

describe("buildOpsSnapshot", () => {
  it("derives actual cost and over-budget flags from ledger totals", async () => {
    getCostAdjustmentTotals.mockResolvedValue(new Map([[1, 120000]]));

    const snap = await buildOpsSnapshot();

    expect(snap.rollups.totalActualCost).toBe(120000);
    expect(snap.rollups.totalContracted).toBe(300000);
    expect(snap.rollups.projectsOverBudget).toHaveLength(1);
    expect(snap.rollups.projectsOverBudget[0]).toContain("Canby Farmhouse");

    const payload = JSON.parse(snap.text.slice(snap.text.indexOf("{")));
    const byName = Object.fromEntries(
      payload.projects.map((p: any) => [p.name, p])
    );
    expect(byName["Canby Farmhouse"].actualCost).toBe(120000);
    // The stale 999999 column must not leak through for the other project.
    expect(byName["Eugene ADU"].actualCost).toBeNull();
  });

  it("degrades to zero cost (not a crash) when the ledger lookup fails", async () => {
    getCostAdjustmentTotals.mockRejectedValue(new Error("db down"));

    const snap = await buildOpsSnapshot();

    expect(snap.rollups.totalActualCost).toBe(0);
    expect(snap.rollups.projectsOverBudget).toEqual([]);
  });

  it("excludes archived projects, like the Command Center does", async () => {
    getCostAdjustmentTotals.mockResolvedValue(new Map());
    await buildOpsSnapshot();
    // One filter for the project list, one for the project count.
    expect(isFilters.projects).toEqual(["archived_at", "archived_at"]);
  });

  it("reports exact counts, not the length of the capped lists", async () => {
    getCostAdjustmentTotals.mockResolvedValue(new Map());
    // The lists are capped at 40 / 20 / 25 rows but the real totals are larger.
    counts.projects = 52;
    counts.pcb_leads = 87;
    counts.materials = 131;

    const snap = await buildOpsSnapshot();

    expect(snap.rollups.projectCount).toBe(52);
    expect(snap.rollups.openLeads).toBe(87);
    expect(snap.rollups.materialShortages).toBe(131);
  });

  it("falls back to the list length when a count query is unavailable", async () => {
    getCostAdjustmentTotals.mockResolvedValue(new Map());
    const snap = await buildOpsSnapshot();
    expect(snap.rollups.projectCount).toBe(2);
  });
});
