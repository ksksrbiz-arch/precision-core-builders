import { describe, expect, it } from "vitest";
import { REDACTED_AMOUNT, redactDollarFigures } from "../_lib/moneyGuard";

describe("redactDollarFigures", () => {
  it.each([
    ["Rough cost is $12,500 total", 1],
    ["about $1.2k for framing", 1],
    ["$3.5M build", 1],
    ["labor ~ $85/hr and $450.00 materials", 2],
    ["USD 2,000 allowance", 1],
    ["2,000 USD allowance", 1],
    ["roughly 1200 dollars", 1],
  ])("withholds money in %j", (input, count) => {
    const res = redactDollarFigures(input);
    expect(res.redacted).toBe(count);
    expect(res.text).toContain(REDACTED_AMOUNT);
    expect(res.text).not.toMatch(/\$\s?\d/);
  });

  it("leaves plain quantities and dimensions alone", () => {
    const input =
      "12 sheets of 1/2 inch drywall over 400 sq ft, 2x4 studs at 16 in.";
    const res = redactDollarFigures(input);
    expect(res.redacted).toBe(0);
    expect(res.text).toBe(input);
  });

  it("is a no-op on empty text", () => {
    expect(redactDollarFigures("")).toEqual({ text: "", redacted: 0 });
  });
});
