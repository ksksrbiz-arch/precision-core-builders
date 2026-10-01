import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PROJECTS } from "../client/src/data/projects";
import {
  APP_ROUTES,
  LEGACY_REDIRECTS,
  PUBLIC_ROUTES,
  SPA_SHELL,
  buildRedirectRules,
  renderRedirects,
} from "./siteRoutes";

const root = resolve(import.meta.dirname, "..");
const slugs = PROJECTS.map(p => p.slug);
const rules = buildRedirectRules(slugs);

/** Resolve a request the way Netlify does: first matching rule wins. */
function resolveRequest(path: string, host = "precisioncorebuilders.com") {
  for (const r of rules) {
    const m = r.from.match(/^(https?):\/\/([^/]+)(\/.*)$/);
    const [rHost, rPath] = m ? [m[2], m[3]] : [null, r.from];
    if (rHost && rHost !== host) continue;
    const re = new RegExp(
      "^" +
        rPath
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, "(.*)")
          .replace(/:[a-z]+/gi, "([^/]+)") +
        "/?$"
    );
    const hit = path.match(re);
    if (!hit) continue;
    const splat = hit[1] ?? "";
    return { status: r.status, to: r.to.replace(":splat", splat) };
  }
  return null;
}

describe("generated _redirects", () => {
  it("is committed and in sync with shared/siteRoutes.ts", () => {
    const committed = readFileSync(
      resolve(root, "client/public/_redirects"),
      "utf8"
    );
    expect(committed).toBe(renderRedirects(slugs));
  });

  it("serves a real 404 for unknown URLs instead of a soft-404 200", () => {
    for (const p of ["/nope", "/expertise-ish", "/portfolio/not-a-project"]) {
      expect(resolveRequest(p)).toEqual({ status: 404, to: "/404.html" });
    }
    expect(rules.at(-1)).toMatchObject({
      from: "/*",
      to: "/404.html",
      status: 404,
    });
    // No generic SPA catch-all that would shadow the 404.
    expect(rules.some(r => r.from === "/*" && r.status === 200)).toBe(false);
  });

  it("points the 404 rule at a page the build actually produces", () => {
    // 404.html is the prerendered in-app NotFound view (noindex via useSEO).
    const prerender = readFileSync(
      resolve(root, "scripts/prerender-marketing.ts"),
      "utf8"
    );
    expect(prerender).toMatch(/"\/404"/);
    expect(prerender).toContain('"404.html"');
    // ...and the pristine shell that client-rendered routes are rewritten to.
    expect(prerender).toContain('"app-shell.html"');
    expect(SPA_SHELL).toBe("/app-shell.html");
    const notFound = readFileSync(
      resolve(root, "client/src/pages/NotFound.tsx"),
      "utf8"
    );
    expect(notFound).toContain("noindex");
  });

  it("rewrites every public page, project slug and app area to the SPA", () => {
    for (const { path } of PUBLIC_ROUTES) {
      if (path === "/") continue; // index.html is served natively
      expect(resolveRequest(path), path).toEqual({
        status: 200,
        to: SPA_SHELL,
      });
    }
    for (const s of slugs) {
      expect(resolveRequest(`/portfolio/${s}`)?.status).toBe(200);
    }
    for (const p of [
      "/auth/login",
      "/admin",
      "/admin/projects/12",
      "/portal",
      "/portal/ledger",
      "/onboarding",
    ]) {
      expect(resolveRequest(p)?.status, p).toBe(200);
    }
  });

  it("covers every <Route> declared in App.tsx", () => {
    const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
    const paths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1]);
    expect(paths.length).toBeGreaterThan(40);
    for (const raw of paths) {
      if (raw === "/") continue;
      if (raw === "/404") continue; // the in-app 404 view; a hard hit is a real 404
      // Routes kept for in-app links but deliberately redirected at the edge.
      if (LEGACY_REDIRECTS.some(r => r.from === raw)) continue;
      const sample = raw.replace(/:[a-z]+/gi, slugs[0]);
      const res = resolveRequest(sample);
      expect(res?.status, `${raw} (${sample}) must not 404`).toBe(200);
    }
  });

  it("keeps the retired URLs pointing at live destinations", () => {
    for (const r of LEGACY_REDIRECTS) {
      expect(resolveRequest(r.from)?.status, r.from).toBe(r.status);
      if (r.to.includes("*")) continue;
      const dest = resolveRequest(r.to);
      expect(
        dest?.status === 200 || r.to === "/",
        `${r.from} → ${r.to} must land on a real page`
      ).toBe(true);
    }
    expect(resolveRequest("/expertise/residential")).toEqual({
      status: 301,
      to: "/services/residential",
    });
    expect(resolveRequest("/expertise/commercial")).toEqual({
      status: 301,
      to: "/services",
    });
  });

  it("sends stale magic-link URLs to the password login", () => {
    for (const p of ["/auth/callback", "/callback", "/auth/resend"]) {
      expect(resolveRequest(p)).toEqual({ status: 302, to: "/auth/login" });
    }
  });

  it("canonicalises www to the apex host, keeping the path", () => {
    expect(
      resolveRequest("/services/roofing", "www.precisioncorebuilders.com")
    ).toEqual({
      status: 301,
      to: "https://precisioncorebuilders.com/services/roofing",
    });
  });

  it("routes /api/* to functions ahead of everything else", () => {
    expect(resolveRequest("/api/trpc")).toEqual({
      status: 200,
      to: "/.netlify/functions/trpc",
    });
  });

  it("leaves netlify.toml free of redirects that _redirects would shadow", () => {
    const toml = readFileSync(resolve(root, "netlify.toml"), "utf8");
    expect(toml).not.toMatch(/^\[\[redirects\]\]/m);
  });

  it("has no duplicate or private paths in the sitemap list", () => {
    const paths = PUBLIC_ROUTES.map(r => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) {
      expect(
        APP_ROUTES.some(a => p.startsWith(a.replace("/*", "")) && a !== "/")
      ).toBe(false);
    }
  });
});
