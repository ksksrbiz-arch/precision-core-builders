/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearProgress,
  loadProgress,
  saveProgress,
  stepKey,
  toggleModule,
  toggleStep,
} from "./trainingProgress";

const KEY = "pcb.training.progress.v1";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("trainingProgress", () => {
  it("returns empty progress when nothing is stored", () => {
    expect(loadProgress()).toEqual({
      completedSteps: [],
      completedModules: [],
    });
  });

  it("round-trips saved progress", () => {
    saveProgress({ completedSteps: ["a:0"], completedModules: ["a"] });
    expect(loadProgress()).toEqual({
      completedSteps: ["a:0"],
      completedModules: ["a"],
    });
  });

  it("ignores corrupt stored JSON instead of throwing", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadProgress()).toEqual({
      completedSteps: [],
      completedModules: [],
    });
  });

  it("drops stored fields of the wrong shape", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ completedSteps: [1, 2], completedModules: "nope" })
    );
    expect(loadProgress()).toEqual({
      completedSteps: [],
      completedModules: [],
    });
  });

  it("survives localStorage throwing on read and write", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadProgress()).toEqual({
      completedSteps: [],
      completedModules: [],
    });
    expect(() =>
      saveProgress({ completedSteps: [], completedModules: [] })
    ).not.toThrow();
  });

  it("deduplicates repeated keys so progress cannot be double-counted", () => {
    saveProgress({
      completedSteps: ["a:0", "a:0", "a:1"],
      completedModules: ["a", "a"],
    });
    const loaded = loadProgress();
    expect(loaded.completedSteps).toEqual(["a:0", "a:1"]);
    expect(loaded.completedModules).toEqual(["a"]);
  });

  it("drops keys outside the current curriculum when it is provided", () => {
    saveProgress({
      completedSteps: ["a:0", "removed-module:3"],
      completedModules: ["a", "removed-module"],
    });
    const loaded = loadProgress({
      stepKeys: new Set(["a:0"]),
      moduleIds: new Set(["a"]),
    });
    expect(loaded.completedSteps).toEqual(["a:0"]);
    expect(loaded.completedModules).toEqual(["a"]);
  });

  it("clearProgress removes the stored entry", () => {
    saveProgress({ completedSteps: ["a:0"], completedModules: [] });
    clearProgress();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("toggleStep adds then removes a key without mutating the input", () => {
    const start = { completedSteps: [], completedModules: [] };
    const added = toggleStep(start, "a:0");
    expect(added.completedSteps).toEqual(["a:0"]);
    expect(start.completedSteps).toEqual([]);
    expect(toggleStep(added, "a:0").completedSteps).toEqual([]);
  });

  it("toggleModule adds then removes a module id", () => {
    const added = toggleModule(
      { completedSteps: [], completedModules: [] },
      "m1"
    );
    expect(added.completedModules).toEqual(["m1"]);
    expect(toggleModule(added, "m1").completedModules).toEqual([]);
  });

  it("stepKey is stable and unique per module/index", () => {
    expect(stepKey("m", 3)).toBe("m:3");
    expect(stepKey("m", 3)).not.toBe(stepKey("m", 4));
  });
});
