import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const out = resolve("dist/public");
const urls = [
  ...readFileSync(resolve(out, "sitemap.xml"), "utf8").matchAll(
    /<loc>(.*?)<\/loc>/g
  ),
].map(m => m[1]);
let homeH1: string | undefined;
for (const url of urls) {
  const path = new URL(url).pathname;
  const file = path === "/" ? "index.html" : `${path.slice(1)}/index.html`;
  const doc = new JSDOM(readFileSync(resolve(out, file), "utf8")).window
    .document;
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1, path);
  assert.equal(
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    url,
    path
  );
  assert.equal(doc.querySelectorAll("main h1").length, 1, `Single H1: ${path}`);
  // A page prerendered from a stale shell carries another page's content under
  // its own canonical/title. Every page's H1 must differ from the homepage's.
  assert.ok(
    doc.querySelector("#root[data-prerendered]"),
    `Root marked for the prerender hand-off: ${path}`
  );
  const h1 = doc.querySelector("main h1")?.textContent?.trim();
  if (path === "/") homeH1 = h1;
  else assert.notEqual(h1, homeH1, `Prerender captured the homepage: ${path}`);
  assert.ok(
    doc.querySelector("#pcb-boot-screen svg"),
    `Branded first paint: ${path}`
  );
  for (const link of doc.querySelectorAll('link[rel="stylesheet"]'))
    assert.doesNotMatch(
      link.getAttribute("href") ?? "",
      /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/,
      `No build-server stylesheet URLs: ${path}`
    );
  assert.doesNotMatch(
    doc.documentElement.innerHTML,
    /"priceRange"\s*:/,
    `No published price metadata: ${path}`
  );
  assert.equal(
    doc.querySelectorAll('a[href="/estimator"]').length,
    0,
    `No calculator links: ${path}`
  );
  assert.doesNotMatch(
    doc.body.textContent ?? "",
    /Typical budget:|AI estimator|online cost estimator|preliminary cost estimator|\$\d[\d,.]*(?:k)?\s*[–-]\s*\$?\d/i,
    `No public pricing ranges: ${path}`
  );
  assert.equal(
    doc.querySelectorAll(
      '[name="budget"], [name="estimatedMid"], [name="estimatedLow"], [name="estimatedHigh"]'
    ).length,
    0,
    `No published estimate fields: ${path}`
  );
  assert.ok(
    (doc.querySelector("main")?.textContent?.trim().length ?? 0) > 100,
    `Public content: ${path}`
  );
  assert.ok(
    doc.querySelector('meta[name="description"]')?.getAttribute("content"),
    path
  );
  assert.equal(
    doc.querySelectorAll('meta[name="description"]').length,
    1,
    path
  );
  assert.equal(
    doc.querySelectorAll('script[src*="googletagmanager"]').length,
    0,
    "Do not snapshot injected third-party scripts"
  );
  for (const form of doc.querySelectorAll('form[data-netlify="true"]'))
    assert.ok(
      form.querySelector('[name="utm_source"]'),
      `Registered attribution: ${path}`
    );
}
const notFound = new JSDOM(readFileSync(resolve(out, "404.html"), "utf8"))
  .window.document;
assert.ok(
  notFound
    .querySelector('meta[name="robots"]')
    ?.getAttribute("content")
    ?.includes("noindex")
);
// Netlify reads _redirects before netlify.toml, so the 404 rule must live in
// the generated _redirects (and no SPA catch-all may precede it).
const redirects = readFileSync(resolve(out, "_redirects"), "utf8");
assert.match(redirects, /^\/\*\s+\/404\.html\s+404\s*$/m);
assert.doesNotMatch(redirects, /^\/\*\s+\/index\.html\s+200/m);
// Client-rendered routes get the pristine branded shell, never the prerendered
// homepage (which would flash marketing content on /admin and /auth/login).
const shell = readFileSync(resolve(out, "app-shell.html"), "utf8");
assert.match(shell, /pcb-splash:start/);
assert.doesNotMatch(shell, /<main/);
assert.match(redirects, /^\/admin\/\*\s+\/app-shell\.html\s+200/m);
console.log(
  `Verified ${urls.length} public pages: content, H1, canonical, metadata, form attribution, and 404 configuration.`
);
