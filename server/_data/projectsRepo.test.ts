import { beforeEach, describe, expect, it, vi } from "vitest";

let response: {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
} = { data: [], error: null };

vi.mock("../db", () => ({
  db: {
    from: () => {
      const result = Promise.resolve(response);
      return Object.assign(result, {
        select: () => result,
        eq: () => result,
        is: () => result,
      });
    },
  },
  paginate: () => ({ from: 0, to: 19 }),
}));

import {
  getProjectsStats,
  getCostAdjustmentTotals,
  getProjectActualCost,
} from "./projectsRepo";

beforeEach(() => {
  response = { data: [], error: null };
});

describe("Command Center metric sources", () => {
  it.each([
    ["projects", () => getProjectsStats()],
    ["portfolio costs", () => getCostAdjustmentTotals()],
    ["project costs", () => getProjectActualCost(1)],
  ])(
    "propagates %s query failures instead of returning zero/empty data",
    async (_name, query) => {
      response = { data: null, error: { message: "Database unavailable" } };
      await expect(query()).rejects.toThrow("Database unavailable");
    }
  );

  it("still returns a genuinely empty workspace", async () => {
    await expect(getProjectsStats()).resolves.toEqual([]);
    await expect(getCostAdjustmentTotals()).resolves.toEqual(new Map());
    await expect(getProjectActualCost(1)).resolves.toBe(0);
  });

  it("aggregates decimal costs and credits by project", async () => {
    response.data = [
      { project_id: 1, amount_delta: "250.50" },
      { project_id: 1, amount_delta: "-25.25" },
      { project_id: 2, amount_delta: "100" },
    ];
    await expect(getCostAdjustmentTotals()).resolves.toEqual(
      new Map([
        [1, 225.25],
        [2, 100],
      ])
    );
  });
});
