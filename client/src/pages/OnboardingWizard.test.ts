/**
 * Unit tests for OnboardingWizard reducer + state shape.
 *
 * Covers:
 *  - initialState shape
 *  - All action types
 *  - Phase ordering invariants
 *  - State immutability
 */
import { describe, expect, it } from "vitest";
import { initialState, PHASE_ORDER, reducer } from "./OnboardingWizard";

describe("OnboardingWizard — initialState", () => {
  it("starts at the welcome phase", () => {
    const s = initialState();
    expect(s.currentPhase).toBe("welcome");
  });

  it("starts with empty token", () => {
    expect(initialState().token).toBe("");
  });

  it("initializes every phase to pending", () => {
    const s = initialState();
    for (const phase of PHASE_ORDER) {
      expect(s.phases[phase]).toBeDefined();
      expect(s.phases[phase].status).toBe("pending");
    }
  });

  it("has 8 phases in order", () => {
    expect(PHASE_ORDER).toEqual([
      "welcome",
      "github",
      "netlify",
      "supabase",
      "ai",
      "weather",
      "stripe",
      "complete",
    ]);
  });
});

describe("OnboardingWizard — reducer", () => {
  describe("SET_TOKEN", () => {
    it("stores the token", () => {
      const s = reducer(initialState(), {
        type: "SET_TOKEN",
        token: "abc",
      });
      expect(s.token).toBe("abc");
    });

    it("preserves other state", () => {
      const before = initialState();
      before.currentPhase = "ai";
      const s = reducer(before, { type: "SET_TOKEN", token: "x" });
      expect(s.currentPhase).toBe("ai");
    });
  });

  describe("CLEAR_TOKEN", () => {
    it("empties the token", () => {
      const withToken = reducer(initialState(), {
        type: "SET_TOKEN",
        token: "abc",
      });
      const cleared = reducer(withToken, { type: "CLEAR_TOKEN" });
      expect(cleared.token).toBe("");
    });
  });

  describe("GOTO_PHASE", () => {
    it("jumps to the specified phase", () => {
      const s = reducer(initialState(), {
        type: "GOTO_PHASE",
        phase: "weather",
      });
      expect(s.currentPhase).toBe("weather");
    });

    it("can jump backwards", () => {
      const midway = reducer(initialState(), {
        type: "GOTO_PHASE",
        phase: "ai",
      });
      const back = reducer(midway, {
        type: "GOTO_PHASE",
        phase: "github",
      });
      expect(back.currentPhase).toBe("github");
    });
  });

  describe("UPDATE_PHASE", () => {
    it("marks a phase verified with data", () => {
      const s = reducer(initialState(), {
        type: "UPDATE_PHASE",
        phase: "github",
        update: {
          status: "verified",
          data: { GITHUB_USERNAME: "erictadlock" },
          verifiedAt: "2026-04-16T20:00:00Z",
        },
      });
      expect(s.phases.github.status).toBe("verified");
      expect(s.phases.github.data?.GITHUB_USERNAME).toBe("erictadlock");
      expect(s.phases.github.verifiedAt).toBe("2026-04-16T20:00:00Z");
    });

    it("marks a phase skipped without data", () => {
      const s = reducer(initialState(), {
        type: "UPDATE_PHASE",
        phase: "stripe",
        update: { status: "skipped" },
      });
      expect(s.phases.stripe.status).toBe("skipped");
    });

    it("only touches the targeted phase", () => {
      const s = reducer(initialState(), {
        type: "UPDATE_PHASE",
        phase: "ai",
        update: { status: "verified" },
      });
      expect(s.phases.ai.status).toBe("verified");
      expect(s.phases.github.status).toBe("pending");
      expect(s.phases.stripe.status).toBe("pending");
    });

    it("merges updates without wiping existing data", () => {
      let s = reducer(initialState(), {
        type: "UPDATE_PHASE",
        phase: "ai",
        update: {
          status: "verified",
          data: { GROQ_API_KEY: "gsk_x" },
        },
      });
      s = reducer(s, {
        type: "UPDATE_PHASE",
        phase: "ai",
        update: { verifiedAt: "2026-04-16T21:00:00Z" },
      });
      expect(s.phases.ai.data?.GROQ_API_KEY).toBe("gsk_x");
      expect(s.phases.ai.verifiedAt).toBe("2026-04-16T21:00:00Z");
      expect(s.phases.ai.status).toBe("verified");
    });
  });

  describe("RESET", () => {
    it("returns a clean initial state", () => {
      let s = reducer(initialState(), { type: "SET_TOKEN", token: "x" });
      s = reducer(s, { type: "GOTO_PHASE", phase: "stripe" });
      s = reducer(s, {
        type: "UPDATE_PHASE",
        phase: "ai",
        update: { status: "verified" },
      });
      const reset = reducer(s, { type: "RESET" });
      expect(reset.token).toBe("");
      expect(reset.currentPhase).toBe("welcome");
      expect(reset.phases.ai.status).toBe("pending");
    });
  });

  describe("Immutability", () => {
    it("does not mutate the previous state on SET_TOKEN", () => {
      const before = initialState();
      const after = reducer(before, { type: "SET_TOKEN", token: "x" });
      expect(before.token).toBe("");
      expect(after).not.toBe(before);
    });

    it("does not mutate the phases object on UPDATE_PHASE", () => {
      const before = initialState();
      const after = reducer(before, {
        type: "UPDATE_PHASE",
        phase: "github",
        update: { status: "verified" },
      });
      expect(before.phases.github.status).toBe("pending");
      expect(after.phases).not.toBe(before.phases);
      expect(after.phases.github).not.toBe(before.phases.github);
    });
  });
});
