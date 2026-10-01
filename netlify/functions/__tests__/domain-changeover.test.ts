import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { corsHeaders, isOriginAllowed } from "../_utils/corsGuard";

const canonical = "https://precisioncorebuilders.com";

describe("domain changeover", () => {
  it("uses the canonical domain for public branding and generated PDFs", () => {
    const source = readFileSync("client/src/const.ts", "utf8");
    expect(source).toContain(`website: "${canonical}"`);
    expect(source).toContain(`url: "${canonical}"`);
    expect(source).not.toContain("precision-core.netlify.app");
  });

  it("forces the exact legacy host to canonical before application routing", () => {
    const config = readFileSync("netlify.toml", "utf8");
    const rules = config.split("[[redirects]]").slice(1);
    expect(rules[0]).toContain(
      'from   = "https://precision-core.netlify.app/*"'
    );
    expect(rules[0]).toContain(`to     = "${canonical}/:splat"`);
    expect(rules[0]).toMatch(/status\s*=\s*301/);
    expect(rules[0]).toMatch(/force\s*=\s*true/);
    // No wildcard hostname rule that could redirect preview deploys.
    expect(config).not.toMatch(/from\s*=\s*"https?:\/\/\*[^"\n]*netlify\.app/);
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
