import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAY_LABELS,
  TOTAL_TRAINING_STEPS,
  TRAINING_MODULES,
  modulesByDay,
  totalTrainingMinutes,
} from "./training-data";
import { GUIDES } from "./guides-data";

describe("training-data", () => {
  it("has unique module ids", () => {
    const ids = TRAINING_MODULES.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every module points at a guide that exists", () => {
    const guideIds = new Set(GUIDES.map(g => g.id));
    for (const m of TRAINING_MODULES) {
      expect(guideIds.has(m.guideId), `${m.id} → ${m.guideId}`).toBe(true);
    }
  });

  it("every module points at a route actually registered in App.tsx", () => {
    // A prefix check is not enough: "/admin/reports/new" looks like an admin
    // route and is not registered, which shipped a dead "Open the screen"
    // button. Compare against the real route table instead.
    const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    const registered = new Set(
      Array.from(app.matchAll(/path=\s*"([^"]+)"/g), m => m[1])
    );
    expect(registered.size).toBeGreaterThan(10);

    for (const m of TRAINING_MODULES) {
      expect(registered.has(m.path), `${m.id} → ${m.path} is not a route`).toBe(
        true
      );
    }
  });

  it("every module has an objective, steps, and a realistic duration", () => {
    for (const m of TRAINING_MODULES) {
      expect(m.objective.length).toBeGreaterThan(10);
      expect(m.steps.length).toBeGreaterThan(0);
      expect(m.minutes).toBeGreaterThan(0);
      expect(m.minutes).toBeLessThanOrEqual(60);
      for (const step of m.steps) {
        expect(step.action.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every day used by a module has a label", () => {
    for (const m of TRAINING_MODULES) {
      expect(DAY_LABELS[m.day], `day ${m.day}`).toBeTruthy();
    }
  });

  it("modulesByDay groups in ascending day order and loses nothing", () => {
    const grouped = modulesByDay();
    const days = grouped.map(g => g.day);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    expect(grouped.flatMap(g => g.modules).length).toBe(
      TRAINING_MODULES.length
    );
  });

  it("totals match the module data", () => {
    expect(TOTAL_TRAINING_STEPS).toBe(
      TRAINING_MODULES.reduce((n, m) => n + m.steps.length, 0)
    );
    expect(totalTrainingMinutes()).toBe(
      TRAINING_MODULES.reduce((n, m) => n + m.minutes, 0)
    );
  });
});
