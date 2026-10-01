import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { corsHeaders, isOriginAllowed } from "../_utils/corsGuard";
import { buildRedirectRules } from "../../../shared/siteRoutes";

const canonical = "https://precisioncorebuilders.com";

describe("domain changeover", () => {
  it("uses the canonical domain for public branding and generated PDFs", () => {
    const source = readFileSync("client/src/const.ts", "utf8");
    expect(source).toContain(`website: "${canonical}"`);
    expect(source).toContain(`url: "${canonical}"`);
    expect(source).not.toContain("precision-core.netlify.app");
  });

  it("forces the exact legacy host to canonical before application routing", () => {
    const rules = buildRedirectRules([]);
    expect(rules[0]).toEqual({
      from: "https://precision-core.netlify.app/*",
      to: `${canonical}/:splat`,
      status: 301,
      force: true,
    });
    expect(rules[1]).toEqual({
      from: "http://precision-core.netlify.app/*",
      to: `${canonical}/:splat`,
      status: 301,
      force: true,
    });
    // No wildcard hostname rule that could redirect preview deploys.
    expect(
      rules.some(rule => /^https?:\/\/\*.*netlify\.app/.test(rule.from))
    ).toBe(false);
  });

  it("uses canonical CORS defaults while preserving legacy-origin compatibility", () => {
    expect(corsHeaders(undefined)["Access-Control-Allow-Origin"]).toBe(
      canonical
    );
    expect(
      corsHeaders("https://untrusted.example")["Access-Control-Allow-Origin"]
    ).toBe(canonical);
    expect(isOriginAllowed(canonical)).toBe(true);
    expect(corsHeaders(canonical)["Access-Control-Allow-Origin"]).toBe(
      canonical
    );
    const legacy = "https://precision-core.netlify.app";
    expect(isOriginAllowed(legacy)).toBe(true);
    expect(corsHeaders(legacy)["Access-Control-Allow-Origin"]).toBe(legacy);
  });
});
