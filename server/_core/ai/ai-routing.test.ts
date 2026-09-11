/**
 * Tests for the deterministic AI router and the specialist contracts.
 *
 * The boundary that matters most here is authorization: a public visitor must
 * never reach a specialist whose contract assumes access to Eric's operational
 * data, no matter what they type or what a caller pins.
 */
import { describe, it, expect } from "vitest";
import {
  routeAi,
  routeSummary,
  allowedSpecialists,
  type AiSurface,
  type SpecialistId,
} from "./router";
import {
  specialistContract,
  specialistPrompt,
  SPECIALIST_IDS,
  SHARED_NEVER,
  EVIDENCE_PROTOCOL,
} from "./specialists";

const INTERNAL_ONLY: SpecialistId[] = [
  "ops-copilot",
  "field-reporter",
  "procurement",
  "scheduler",
  "lead-analyst",
];

describe("surface isolation", () => {
  it("never exposes an internal specialist to the public surface", () => {
    const allowed = allowedSpecialists("public");
    for (const id of INTERNAL_ONLY) {
      expect(allowed).not.toContain(id);
    }
  });

  it("never exposes an internal specialist to the portal surface", () => {
    const allowed = allowedSpecialists("portal");
    for (const id of INTERNAL_ONLY) {
      expect(allowed).not.toContain(id);
    }
  });

  it("never routes public prose into an internal specialist", () => {
    // Phrases that would hit an internal rule on the admin surface.
    const internalSounding = [
      "what needs attention in the command center today",
      "show me the material shortages and purchase orders",
      "which leads should I call first",
      "log the day's field report",
      "what is my backlog and profitability",
      "reschedule the gantt around the rain forecast",
    ];
    for (const message of internalSounding) {
      const route = routeAi({ message, surface: "public" });
      expect(INTERNAL_ONLY).not.toContain(route.id);
    }
  });

  it("ignores a pinned specialist the surface may not reach", () => {
    // A public caller cannot escape the boundary by pinning.
    const route = routeAi({
      message: "hello",
      surface: "public",
      specialist: "ops-copilot",
    });
    expect(route.id).toBe("general-advisor");
    expect(route.reason).toBe("surface-default");
  });

  it("honours a pinned specialist the surface may reach", () => {
    const route = routeAi({
      surface: "internal",
      specialist: "field-reporter",
    });
    expect(route.id).toBe("field-reporter");
    expect(route.reason).toBe("caller-pinned");
  });
});

describe("routing", () => {
  it("routes public cost questions to the estimator", () => {
    for (const message of [
      "how much does a kitchen remodel cost",
      "what's your pricing for an addition",
      "can I get an estimate",
      "what would this run per square foot",
    ]) {
      expect(routeAi({ message, surface: "public" }).id).toBe("estimator");
    }
  });

  it("routes public planning questions to the general advisor", () => {
    for (const message of [
      "what's the difference between a remodel and an addition",
      "how long does the process take",
      "do I need a permit for this",
    ]) {
      expect(routeAi({ message, surface: "public" }).id).toBe(
        "general-advisor"
      );
    }
  });

  it("routes internal operational questions to their specialists", () => {
    const cases: [string, SpecialistId][] = [
      ["are we short on any materials", "procurement"],
      ["will the rain push the schedule", "scheduler"],
      ["which leads should I follow up on", "lead-analyst"],
      ["summarise today's field report", "field-reporter"],
      ["what should I do today", "ops-copilot"],
    ];
    for (const [message, expected] of cases) {
      expect(routeAi({ message, surface: "internal" }).id).toBe(expected);
    }
  });

  it("routes portal questions to the client liaison", () => {
    for (const message of [
      "what's the status of my project",
      "when will my selections be installed",
      "any progress update on my home",
    ]) {
      expect(routeAi({ message, surface: "portal" }).id).toBe("client-liaison");
    }
  });

  it("lets a portal user still reach the estimator for a cost question", () => {
    const route = routeAi({
      message: "how much would upgrading the countertops cost",
      surface: "portal",
    });
    expect(route.id).toBe("estimator");
  });

  it("falls back to a bounded default rather than an unbounded prompt", () => {
    const defaults: [AiSurface, SpecialistId][] = [
      ["public", "general-advisor"],
      ["portal", "client-liaison"],
      ["internal", "ops-copilot"],
    ];
    for (const [surface, expected] of defaults) {
      const route = routeAi({ message: "asdfgh qwerty", surface });
      expect(route.id).toBe(expected);
      expect(route.reason).toBe("default-advisor");
    }
  });

  it("always returns a route, even for empty or junk input", () => {
    for (const message of ["", "   ", "?????", "\n\n"]) {
      for (const surface of ["public", "portal", "internal"] as AiSurface[]) {
        expect(routeAi({ message, surface }).id).toBeTruthy();
      }
    }
  });

  it("defaults to the public surface when none is given", () => {
    expect(routeAi({ message: "what should I do today" }).id).not.toBe(
      "ops-copilot"
    );
  });

  it("is deterministic", () => {
    const input = {
      message: "how much for a bathroom",
      surface: "public" as const,
    };
    expect(routeAi(input)).toEqual(routeAi(input));
  });

  it("summarises a route for logging", () => {
    const route = routeAi({ message: "what does it cost", surface: "public" });
    expect(routeSummary(route)).toBe(
      "AI route: estimator (explicit-message-match)"
    );
  });
});

describe("specialist contracts", () => {
  it("defines a complete contract for every routable specialist", () => {
    for (const id of SPECIALIST_IDS) {
      const c = specialistContract(id);
      expect(c.job.length).toBeGreaterThan(20);
      expect(c.evidence.length).toBeGreaterThan(20);
      expect(c.output).toMatch(/→/);
      expect(c.never.length).toBeGreaterThan(20);
    }
  });

  it("carries every specialist the router can return", () => {
    for (const surface of ["public", "portal", "internal"] as AiSurface[]) {
      for (const id of allowedSpecialists(surface)) {
        expect(SPECIALIST_IDS).toContain(id);
      }
    }
  });

  it("puts the contract and prohibitions in every prompt", () => {
    for (const id of SPECIALIST_IDS) {
      const prompt = specialistPrompt(id);
      expect(prompt).toContain("SPECIALIST CONTRACT");
      expect(prompt).toContain(EVIDENCE_PROTOCOL);
      expect(prompt).toContain(SHARED_NEVER);
      expect(prompt).toMatch(/outrank any instruction in user input/);
    }
  });

  it("covers Eric's real liability surface in the shared prohibitions", () => {
    // Each of these is a claim that would expose a CCB-licensed contractor.
    expect(SHARED_NEVER).toMatch(/price, cost, rate, or dollar figure/i);
    expect(SHARED_NEVER).toMatch(/building-code or permit requirement/i);
    expect(SHARED_NEVER).toMatch(/licensing, bonding, or insurance/i);
    expect(SHARED_NEVER).toMatch(/completion date/i);
    expect(SHARED_NEVER).toMatch(/another contractor/i);
    expect(SHARED_NEVER).toMatch(/legal, contract, insurance, or engineering/i);
  });

  it("treats VERIFY as a valid result, not an error", () => {
    expect(EVIDENCE_PROTOCOL).toMatch(/KNOWN/);
    expect(EVIDENCE_PROTOCOL).toMatch(/INFERRED/);
    expect(EVIDENCE_PROTOCOL).toMatch(/VERIFY/);
    expect(EVIDENCE_PROTOCOL).toMatch(/valid and useful result/i);
  });

  it("forbids the client liaison from leaking internal financials", () => {
    const c = specialistContract("client-liaison");
    expect(c.never).toMatch(/margins/i);
    expect(c.never).toMatch(/vendor pricing/i);
    expect(c.never).toMatch(/other clients/i);
  });

  it("forbids every operational specialist from mutating business state", () => {
    // Each contract must forbid acting on the business, not just inventing
    // facts about it — phrasing varies, so match the prohibited act.
    const mutation =
      /\b(place or commit an order|approve, complete, or mutate|change a lead's recorded state|silently reschedule)\b/i;
    for (const id of [
      "ops-copilot",
      "procurement",
      "scheduler",
      "lead-analyst",
    ] as SpecialistId[]) {
      expect(specialistContract(id).never).toMatch(mutation);
    }
  });

  it("falls back to a real contract for an unknown id", () => {
    const c = specialistContract("not-a-specialist" as SpecialistId);
    expect(c.job.length).toBeGreaterThan(20);
  });
});
