/**
 * Stamp the production service worker with the deploy's immutable revision.
 *
 * Vite copies public files verbatim, so this runs after `vite build` and
 * replaces the source marker in dist/public/sw.js. Netlify supplies COMMIT_REF;
 * local builds fall back to the current Git commit.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const deployRevision = process.env.COMMIT_REF ?? process.env.GITHUB_SHA;
const fallbackRevision = deployRevision
  ? ""
  : execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim();
const revision = (deployRevision ?? fallbackRevision).trim().slice(0, 12);
const cacheVersion = `deploy-${revision}`;
const serviceWorkerPath = resolve("dist/public/sw.js");
const source = readFileSync(serviceWorkerPath, "utf8");

if (!source.includes("__PCB_CACHE_VERSION__")) {
  throw new Error("Service-worker cache-version marker was not found.");
}

writeFileSync(
  serviceWorkerPath,
  source.replaceAll("__PCB_CACHE_VERSION__", cacheVersion),
  "utf8"
);

console.log(`✓ service worker stamped with ${cacheVersion}`);
