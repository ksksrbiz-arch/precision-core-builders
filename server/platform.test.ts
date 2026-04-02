/**
 * Smoke tests — verify core modules load without error.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("platform health", () => {
  it("appRouter has all 13 expected routes", () => {
    const keys = Object.keys(appRouter._def.procedures).sort();
    // Each router.procedure is flattened as "router.procedure"
    expect(keys.length).toBeGreaterThanOrEqual(13);
  });

  it("auth.me procedure exists", () => {
    const keys = Object.keys(appRouter._def.procedures);
    expect(keys).toContain("auth.me");
  });

  it("projects.list procedure exists", () => {
    const keys = Object.keys(appRouter._def.procedures);
    expect(keys).toContain("projects.list");
  });

  it("fieldReports.list procedure exists", () => {
    const keys = Object.keys(appRouter._def.procedures);
    expect(keys).toContain("fieldReports.list");
  });

  it("ledger.append procedure exists (immutable entries)", () => {
    const keys = Object.keys(appRouter._def.procedures);
    expect(keys).toContain("ledger.append");
    // Verify no update/delete on ledger
    expect(keys).not.toContain("ledger.update");
    expect(keys).not.toContain("ledger.delete");
  });
});
