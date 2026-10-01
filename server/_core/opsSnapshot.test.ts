/**
 * The Ops Co-pilot grounds itself on this snapshot. Actual cost must come from
 * the ledger (cost_adjustment entries), not the stale `projects.actual_cost`
 * column — otherwise every project looks free and "over budget" never fires.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const tables: Record<string, unknown[]> = {};

vi.mock("../db", () => {
  function chain(table: string): any {
    const result = Promise.resolve({ data: tables[table] ?? [], error: null });
    const proxy: any = new Proxy(result, {
      get(target, prop) {
        if (prop === "then") return target.then.bind(target);
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
});
