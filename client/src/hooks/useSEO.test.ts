import { describe, expect, it } from "vitest";
import { fitDescription } from "./useSEO";

describe("fitDescription", () => {
  it("leaves a description within the limit untouched", () => {
    expect(fitDescription("Short and sweet.")).toBe("Short and sweet.");
  });

  it("collapses stray whitespace", () => {
    expect(fitDescription("  one \n two   three ")).toBe("one two three");
  });

  it("trims long text to 160 characters on a word boundary", () => {
    const long = "Custom homes and remodels in Eugene Oregon. ".repeat(8);
    const out = fitDescription(long);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out.slice(0, -1).endsWith(" ")).toBe(false);
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
    // Never cuts a word in half: the text before the ellipsis ends on a whole word.
    expect(long.slice(out.length - 1, out.length)).toMatch(/[\s.]/);
  });
});
