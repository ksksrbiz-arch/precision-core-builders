/**
 * Tests for deterministic project-state extraction.
 *
 * The property that matters: it must never invent a value the visitor did not
 * supply. An LLM asked to "extract the project" will confidently produce a
 * square footage from "a big kitchen"; this must not.
 */
import { describe, it, expect } from "vitest";
import {
  inferProjectState,
  nextSteps,
  estimateReady,
  type ProjectState,
} from "./projectState";

const user = (content: string) => ({ role: "user", content });

describe("inferProjectState — extraction", () => {
  it("identifies a project type the visitor named", () => {
    const cases: [string, string][] = [
      ["we want to redo our kitchen", "kitchen"],
      ["thinking about a bathroom remodel", "bathroom"],
      ["looking to build a new home", "new-home"],
      ["we need an ADU in the back yard", "adu"],
      ["the roof needs replacing", "roofing"],
      ["want to add a deck off the back", "outdoor"],
      ["planning an addition over the garage", "addition"],
      ["custom cabinetry for the study", "cabinets"],
    ];
    for (const [message, expected] of cases) {
      expect(inferProjectState(message).projectType).toBe(expected);
    }
  });

  it("labels the type from the estimating basis, not a hand-written map", () => {
    const state = inferProjectState("kitchen remodel please");
    expect(state.projectTypeLabel).toBe("Kitchen Remodel");
  });

  it("leaves the type unset when none was named", () => {
    const state = inferProjectState("what areas do you serve?");
    expect(state.projectType).toBeUndefined();
    expect(state.projectTypeLabel).toBeUndefined();
  });

  it("extracts an explicit square footage", () => {
    for (const [message, expected] of [
      ["it's about 2400 sq ft", 2400],
      ["roughly 1,800 square feet", 1800],
      ["320 sf addition", 320],
    ] as [string, number][]) {
      expect(inferProjectState(message).squareFootage).toBe(expected);
    }
  });

  it("never invents a square footage from vague size language", () => {
    for (const message of [
      "we have a big kitchen",
      "it's a large house",
      "pretty spacious, maybe medium sized",
      "about 3 bedrooms",
    ]) {
      expect(inferProjectState(message).squareFootage).toBeUndefined();
    }
  });

  it("ignores an implausible square footage", () => {
    expect(inferProjectState("900000 sq ft").squareFootage).toBeUndefined();
  });

  it("reads complexity only from explicit finish-level language", () => {
    expect(inferProjectState("we want high-end everything").complexity).toBe(
      "high"
    );
    expect(inferProjectState("keeping it budget friendly").complexity).toBe(
      "low"
    );
    expect(inferProjectState("we want a kitchen").complexity).toBeUndefined();
  });

  it("collects premium interests the visitor mentioned", () => {
    const state = inferProjectState(
      "quartz countertops, hardwood floors and smart home wiring"
    );
    expect(state.interests).toEqual(
      expect.arrayContaining([
        "High-end countertops",
        "Hardwood flooring",
        "Smart home integration",
      ])
    );
  });

  it("does not invent interests", () => {
    expect(inferProjectState("we want a bathroom").interests).toBeUndefined();
  });
});

describe("inferProjectState — accumulation", () => {
  it("retains facts across turns", () => {
    const history = [user("we're redoing our kitchen")];
    let state = inferProjectState("we're redoing our kitchen");
    state = inferProjectState("it's about 300 sq ft", state, history);

    expect(state.projectType).toBe("kitchen");
    expect(state.squareFootage).toBe(300);
  });

  it("keeps the first explicit type when another is mentioned later", () => {
    const state = inferProjectState(
      "while you're here the roof is old too",
      { projectType: "kitchen", projectTypeLabel: "Kitchen Remodel" },
      [user("we're redoing our kitchen")]
    );
    expect(state.projectType).toBe("kitchen");
  });

  it("re-derives stage each turn as intent moves", () => {
    let state = inferProjectState("just starting to look into this");
    expect(state.stage).toBe("Researching");

    state = inferProjectState("comparing a remodel versus an addition", state);
    expect(state.stage).toBe("Comparing options");

    state = inferProjectState("what's your timeline and permit process", state);
    expect(state.stage).toBe("Planning");

    state = inferProjectState("can you come out and measure", state);
    expect(state.stage).toBe("Ready for estimate");
  });

  it("is deterministic", () => {
    const a = inferProjectState("2000 sq ft high-end kitchen");
    const b = inferProjectState("2000 sq ft high-end kitchen");
    expect(a).toEqual(b);
  });
});

describe("nextSteps", () => {
  it("returns at most three, with no duplicates", () => {
    const state = inferProjectState(
      "high-end 2000 sq ft kitchen with quartz, comparing options"
    );
    const steps = nextSteps(state);
    expect(steps.length).toBeLessThanOrEqual(3);
    expect(new Set(steps.map(s => s.prompt)).size).toBe(steps.length);
  });

  it("always offers something, even with no state", () => {
    expect(nextSteps({}).length).toBeGreaterThan(0);
  });

  it("steers an unpriced project type toward the on-site visit", () => {
    const steps = nextSteps(inferProjectState("we want to build an ADU"));
    expect(steps.some(s => /on-site estimate/i.test(s.prompt))).toBe(true);
  });

  it("asks for square footage when the type needs it and it is missing", () => {
    const steps = nextSteps(inferProjectState("planning a new home build"));
    expect(steps.some(s => /square footage/i.test(s.prompt))).toBe(true);
  });

  it("does not ask for square footage on a flat-priced type", () => {
    const steps = nextSteps(inferProjectState("kitchen remodel"));
    expect(steps.some(s => /square footage/i.test(s.prompt))).toBe(false);
  });
});

describe("estimateReady", () => {
  it("is true as soon as intent is explicit", () => {
    const state = inferProjectState("can you come out and measure?");
    expect(estimateReady(state, [])).toBe(true);
  });

  it("is false for a bare first question", () => {
    const state = inferProjectState("do you work in Springfield?");
    expect(estimateReady(state, [])).toBe(false);
  });

  it("does not fire on turn one from a single detail", () => {
    const state = inferProjectState("thinking about a kitchen");
    expect(estimateReady(state, [])).toBe(false);
  });

  it("fires once a planning visitor has given a detail", () => {
    const state: ProjectState = {
      projectType: "kitchen",
      stage: "Planning",
    };
    expect(estimateReady(state, [])).toBe(true);
  });

  it("fires when enough detail accumulates over a conversation", () => {
    const state: ProjectState = {
      projectType: "kitchen",
      complexity: "high",
      stage: "Researching",
    };
    expect(estimateReady(state, [user("a"), user("b")])).toBe(true);
  });
});
