import { describe, expect, it } from "vitest";
import {
  getErrorMessage,
  validate,
  validators,
} from "./validation";

describe("validators.required", () => {
  const rule = validators.required("Name");

  it("fails on empty / whitespace", () => {
    expect(rule.test("")).toBe(false);
    expect(rule.test("   ")).toBe(false);
    expect(rule.test(null)).toBe(false);
    expect(rule.test(undefined)).toBe(false);
  });

  it("passes on non-empty strings", () => {
    expect(rule.test("Eric")).toBe(true);
  });

  it("includes the field name in the message", () => {
    expect(rule.message).toContain("Name");
  });
});

describe("validators.email", () => {
  const rule = validators.email();

  it("accepts common valid addresses", () => {
    expect(rule.test("eric@example.com")).toBe(true);
    expect(rule.test("a.b+c@domain.co")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(rule.test("not-an-email")).toBe(false);
    expect(rule.test("missing@")).toBe(false);
    expect(rule.test("@nodomain.com")).toBe(false);
    expect(rule.test("")).toBe(false);
  });
});

describe("validators.minLength / maxLength", () => {
  it("enforces minimum length", () => {
    const rule = validators.minLength(3, "Code");
    expect(rule.test("ab")).toBe(false);
    expect(rule.test("abc")).toBe(true);
    expect(rule.message).toContain("3");
  });

  it("enforces maximum length", () => {
    const rule = validators.maxLength(5, "Code");
    expect(rule.test("abcdef")).toBe(false);
    expect(rule.test("abcde")).toBe(true);
  });
});

describe("validators.minNumber / maxNumber / number / positiveNumber", () => {
  it("minNumber", () => {
    const rule = validators.minNumber(10);
    expect(rule.test(9)).toBe(false);
    expect(rule.test(10)).toBe(true);
  });

  it("maxNumber", () => {
    const rule = validators.maxNumber(100);
    expect(rule.test(101)).toBe(false);
    expect(rule.test(100)).toBe(true);
  });

  it("number accepts numeric strings", () => {
    const rule = validators.number();
    expect(rule.test("42")).toBe(true);
    expect(rule.test("x")).toBe(false);
    expect(rule.test("")).toBe(false);
  });

  it("positiveNumber rejects zero and negatives", () => {
    const rule = validators.positiveNumber();
    expect(rule.test(0)).toBe(false);
    expect(rule.test(-1)).toBe(false);
    expect(rule.test(0.5)).toBe(true);
  });
});

describe("validators.phone", () => {
  const rule = validators.phone();

  it("accepts formatted US-style numbers", () => {
    expect(rule.test("(541) 555-1234")).toBe(true);
    expect(rule.test("+1 541-555-1234")).toBe(true);
  });

  it("rejects too-short inputs", () => {
    expect(rule.test("123")).toBe(false);
  });
});

describe("validators.url", () => {
  const rule = validators.url();

  it("accepts absolute URLs", () => {
    expect(rule.test("https://precisioncorebuilders.com")).toBe(true);
  });

  it("rejects non-URLs", () => {
    expect(rule.test("not a url")).toBe(false);
  });
});

describe("validators.date / futureDate", () => {
  it("date accepts parseable dates", () => {
    const rule = validators.date();
    expect(rule.test("2026-08-15")).toBe(true);
    expect(rule.test("not-a-date")).toBe(false);
    expect(rule.test("")).toBe(false);
  });

  it("futureDate rejects past dates", () => {
    const rule = validators.futureDate();
    expect(rule.test("2000-01-01")).toBe(false);
    // Far-future should pass
    expect(rule.test("2099-01-01")).toBe(true);
  });
});

describe("validators.passwordStrength", () => {
  const rule = validators.passwordStrength();

  it("requires length, upper, lower, and digit", () => {
    expect(rule.test("short")).toBe(false);
    expect(rule.test("alllowercase1")).toBe(false);
    expect(rule.test("ALLUPPERCASE1")).toBe(false);
    expect(rule.test("NoDigitsHere")).toBe(false);
    expect(rule.test("ValidPass1")).toBe(true);
  });
});

describe("validators.match", () => {
  it("compares against the other value", () => {
    const rule = validators.match("secret", "Confirm");
    expect(rule.test("secret")).toBe(true);
    expect(rule.test("other")).toBe(false);
  });
});

describe("validate()", () => {
  it("returns isValid true when all rules pass", () => {
    const result = validate("eric@example.com", [
      validators.required("Email"),
      validators.email(),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("collects every failing message", () => {
    const result = validate("", [
      validators.required("Email"),
      validators.email(),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain("Email");
  });
});

describe("getErrorMessage", () => {
  it("maps known auth / network messages to friendly copy", () => {
    expect(getErrorMessage(new Error("user_not_found"))).toMatch(/No account/);
    expect(getErrorMessage(new Error("invalid_grant"))).toMatch(/expired/);
    expect(getErrorMessage(new Error("Email not confirmed"))).toMatch(
      /confirm your email/i
    );
    expect(getErrorMessage(new Error("fetch failed"))).toMatch(/Network/);
  });

  it("falls back for unknown errors", () => {
    expect(getErrorMessage(new Error("weird boom"))).toBe("weird boom");
    expect(getErrorMessage(null)).toMatch(/unknown/i);
  });
});
