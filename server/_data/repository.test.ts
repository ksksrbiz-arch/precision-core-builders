import { describe, expect, it } from "vitest";
import { escapePostgrestFilterTerm } from "./repository";

describe("escapePostgrestFilterTerm", () => {
  it("leaves plain alphanumeric terms unchanged", () => {
    expect(escapePostgrestFilterTerm("Acme Roofing")).toBe("Acme Roofing");
  });

  it("escapes commas so a term cannot inject an extra or() clause", () => {
    const malicious = "x,role.eq.admin";
    const escaped = escapePostgrestFilterTerm(malicious);
    expect(escaped).toBe("x\\,role\\.eq\\.admin");
    expect(escaped).not.toContain(",role.eq.admin");
  });

  it("escapes dots so a term cannot introduce a fake operator boundary", () => {
    expect(escapePostgrestFilterTerm("a.b")).toBe("a\\.b");
  });

  it("escapes parens so a term cannot close/open filter groups", () => {
    expect(escapePostgrestFilterTerm("(x)")).toBe("\\(x\\)");
  });

  it("escapes percent signs so a term cannot widen the ilike match", () => {
    expect(escapePostgrestFilterTerm("100%")).toBe("100\\%");
  });

  it("escapes a literal backslash first so later escapes aren't double-escaped", () => {
    expect(escapePostgrestFilterTerm("a\\b")).toBe("a\\\\b");
  });

  it("escapes a realistic multi-character injection attempt", () => {
    const malicious = "x%),status.eq.approved,(y";
    const escaped = escapePostgrestFilterTerm(malicious);
    // No unescaped structural characters should survive.
    expect(escaped).toBe("x\\%\\)\\,status\\.eq\\.approved\\,\\(y");
  });
});
