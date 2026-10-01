import { describe, expect, it } from "vitest";
import { computeReorder } from "./scheduleOrder";

const tasks = [
  { id: 10, sort_order: 0 },
  { id: 11, sort_order: 0 },
  { id: 12, sort_order: 0 },
];

describe("computeReorder", () => {
  it("renumbers equal sort_orders and swaps the pair (rows already at their number are skipped)", () => {
    // 10,11,12 -> 11,10,12: task 11 is already 0, so only 10 and 12 change.
    expect(computeReorder(tasks, 11, "up")).toEqual([
      { id: 10, order: 1 },
      { id: 12, order: 2 },
    ]);
  });

  it("only sends rows whose number changes", () => {
    const ordered = [
      { id: 1, sort_order: 0 },
      { id: 2, sort_order: 1 },
      { id: 3, sort_order: 2 },
    ];
    expect(computeReorder(ordered, 3, "up")).toEqual([
      { id: 3, order: 1 },
      { id: 2, order: 2 },
    ]);
  });

  it("refuses to move past either end or an unknown task", () => {
    expect(computeReorder(tasks, 10, "up")).toBeNull();
    expect(computeReorder(tasks, 12, "down")).toBeNull();
    expect(computeReorder(tasks, 99, "down")).toBeNull();
  });

  it("treats a null sort_order as 0", () => {
    const rows = [
      { id: 1, sort_order: null },
      { id: 2, sort_order: 1 },
    ];
    expect(computeReorder(rows, 1, "down")).toEqual([
      { id: 2, order: 0 },
      { id: 1, order: 1 },
    ]);
  });
});
