import { describe, expect, it } from "vitest";
import {
  findDependencyProblem,
  formatDependsOn,
  isValidDependsOn,
  parseDependsOn,
  withoutDependency,
} from "./scheduleDeps";

describe("scheduleDeps format", () => {
  it("parses ids, ignoring junk and duplicates", () => {
    expect(parseDependsOn("3, 5,5,x,0,-2,7")).toEqual([3, 5, 7]);
    expect(parseDependsOn(null)).toEqual([]);
    expect(parseDependsOn("")).toEqual([]);
  });

  it("formats an empty list as null so the column is cleared", () => {
    expect(formatDependsOn([])).toBeNull();
    expect(formatDependsOn([4, 4, 9])).toBe("4,9");
    expect(formatDependsOn([9, 2, 10])).toBe("2,9,10");
  });

  it("validates API input strictly", () => {
    expect(isValidDependsOn("1,2,30")).toBe(true);
    for (const bad of ["", "1,", ",1", "1 2", "a", "1;2", "1,,2"]) {
      expect(isValidDependsOn(bad)).toBe(false);
    }
  });

  it("drops a deleted task from a dependency list", () => {
    expect(withoutDependency("1,2,3", 2)).toBe("1,3");
    expect(withoutDependency("2", 2)).toBeNull();
    expect(withoutDependency(null, 2)).toBeNull();
  });
});

describe("findDependencyProblem", () => {
  const tasks = [
    { id: 1, dependsOn: null },
    { id: 2, dependsOn: "1" },
    { id: 3, dependsOn: "2" },
    { id: 4, dependsOn: null },
  ];

  it("accepts valid predecessors", () => {
    expect(findDependencyProblem(4, [3], tasks)).toBeNull();
    expect(findDependencyProblem(3, [1, 4], tasks)).toBeNull();
    expect(findDependencyProblem(null, [1], tasks)).toBeNull();
  });

  it("rejects self-dependency and unknown tasks", () => {
    expect(findDependencyProblem(2, [2], tasks)).toMatch(/itself/);
    expect(findDependencyProblem(2, [99], tasks)).toMatch(
      /isn't in this project/
    );
  });

  it("rejects direct and indirect cycles", () => {
    expect(findDependencyProblem(1, [2], tasks)).toMatch(/circular/);
    expect(findDependencyProblem(1, [3], tasks)).toMatch(/circular/);
  });

  it("tolerates a cycle already present in the data without hanging", () => {
    const loopy = [
      { id: 1, dependsOn: "2" },
      { id: 2, dependsOn: "1" },
      { id: 3, dependsOn: null },
    ];
    expect(findDependencyProblem(3, [1], loopy)).toBeNull();
  });
});
