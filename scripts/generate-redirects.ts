/**
 * generate-redirects — build-time writer for client/public/_redirects.
 *
 * The rules come from shared/siteRoutes.ts (the same list that feeds the
 * sitemap) plus every portfolio slug in the projects catalog. Runs before
 * `vite build` (see the "build" script in package.json); the output is also
 * committed so the deployed rules are reviewable in PRs.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PROJECTS } from "../client/src/data/projects";
import { buildRedirectRules, renderRedirects } from "../shared/siteRoutes";

const slugs = PROJECTS.map(p => p.slug);
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(
  resolve(here, "../client/public/_redirects"),
  renderRedirects(slugs)
);
console.log(
  `✓ _redirects written — ${buildRedirectRules(slugs).length} rules ` +
    `(${slugs.length} portfolio slugs)`
);
