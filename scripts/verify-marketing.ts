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
const redirects = readFileSync("netlify.toml", "utf8");
assert.match(redirects, /from = "\/\*"\s+to = "\/404.html"\s+status = 404/);
console.log(
  `Verified ${urls.length} public pages: content, H1, canonical, metadata, form attribution, and 404 configuration.`
);
