#!/usr/bin/env node
/**
 * indexnow — submit the site's public URLs to the IndexNow API
 * (https://www.indexnow.org/) so Bing and other participating engines
 * re-crawl them promptly after a deploy instead of waiting for discovery.
 *
 * Usage:
 *   INDEXNOW_KEY=<key> node scripts/indexnow.mjs            # submit all sitemap URLs
 *   INDEXNOW_KEY=<key> node scripts/indexnow.mjs --dry-run  # print payload, send nothing
 *
 * URLs are read from client/public/sitemap.xml (run `pnpm sitemap` first —
 * it also runs automatically as part of `pnpm build`). No dependencies.
 *
 * The key comes from the INDEXNOW_KEY environment variable and is NEVER
 * committed to this repo. IndexNow verifies ownership by fetching
 * https://precisioncorebuilders.com/<key>.txt — creating that key file is a
 * one-time manual follow-up (see docs/discoverability.md).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HOST = "precisioncorebuilders.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const key = process.env.INDEXNOW_KEY?.trim();
if (!key) {
  console.error(
    "✗ INDEXNOW_KEY is not set.\n" +
      '  Generate one (e.g. node -e "console.log(crypto.randomUUID())"),\n' +
      `  serve it at https://${HOST}/<key>.txt, then re-run with:\n` +
      "  INDEXNOW_KEY=<key> node scripts/indexnow.mjs"
  );
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sitemapPath = resolve(here, "../client/public/sitemap.xml");
const xml = readFileSync(sitemapPath, "utf8");
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

if (urlList.length === 0) {
  console.error(
    `✗ No <loc> URLs found in ${sitemapPath} — run \`pnpm sitemap\` first.`
  );
  process.exit(1);
}

const payload = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${key}.txt`,
  urlList,
};

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(payload, null, 2));
  console.log(`--dry-run: ${urlList.length} URLs NOT submitted.`);
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});

// Per the IndexNow spec, HTTP 200 (OK) and 202 (Accepted) both mean success.
if (res.ok) {
  console.log(
    `✓ IndexNow accepted ${urlList.length} URLs (HTTP ${res.status}).`
  );
} else {
  const body = await res.text().catch(() => "");
  console.error(`✗ IndexNow responded HTTP ${res.status}: ${body}`);
  process.exit(1);
}
