/**
 * generate-sitemap — build-time sitemap generator.
 *
 * Writes client/public/sitemap.xml from a single source of truth: the static
 * marketing routes plus every portfolio project slug in the projects catalog.
 * Run automatically before `vite build` (see the "build" script in
 * package.json) so the sitemap never drifts from the actual routes.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PROJECTS } from "../client/src/data/projects";
import { CANONICAL_HOST, PUBLIC_ROUTES } from "../shared/siteRoutes";

// Production domain (www 301-redirects to the apex). Priority scheme:
// home 1.0 · estimator/contact 0.9 · services/portfolio/about/faq 0.8 ·
// individual project pages 0.7. <lastmod> is the build date.
const BASE = `https://${CANONICAL_HOST}`;

type Entry = { path: string; priority: number; changefreq: string };

// Static pages come from shared/siteRoutes.ts, the same list that drives
// client/public/_redirects, so the sitemap and the redirects cannot drift.
const STATIC_ROUTES: readonly Entry[] = PUBLIC_ROUTES;

const PROJECT_ROUTES: Entry[] = PROJECTS.map(p => ({
  path: `/portfolio/${p.slug}`,
  priority: 0.7,
  changefreq: "monthly",
}));

const today = new Date().toISOString().slice(0, 10);

const entries = [...STATIC_ROUTES, ...PROJECT_ROUTES];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    e => `  <url>
    <loc>${BASE}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../client/public/sitemap.xml");
writeFileSync(outPath, xml);
console.log(
  `✓ sitemap.xml written — ${entries.length} URLs ` +
    `(${STATIC_ROUTES.length} static + ${PROJECT_ROUTES.length} projects)`
);
