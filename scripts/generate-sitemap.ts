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

// Production domain (www 301-redirects to the apex). Priority scheme:
// home 1.0 · estimator/contact 0.9 · services/portfolio/about/faq 0.8 ·
// individual project pages 0.7. <lastmod> is the build date.
const BASE = "https://precisioncorebuilders.com";

type Entry = { path: string; priority: number; changefreq: string };

const STATIC_ROUTES: Entry[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/about", priority: 0.8, changefreq: "monthly" },
  { path: "/services", priority: 0.8, changefreq: "monthly" },
  { path: "/services/residential", priority: 0.8, changefreq: "monthly" },
  { path: "/services/remodels", priority: 0.8, changefreq: "monthly" },
  { path: "/services/new-construction", priority: 0.8, changefreq: "monthly" },
  { path: "/services/restoration", priority: 0.8, changefreq: "monthly" },
  { path: "/services/outdoor", priority: 0.8, changefreq: "monthly" },
  { path: "/services/painting", priority: 0.8, changefreq: "monthly" },
  { path: "/services/roofing", priority: 0.8, changefreq: "monthly" },
  { path: "/services/cabinets", priority: 0.8, changefreq: "monthly" },
  { path: "/service-areas/springfield", priority: 0.7, changefreq: "monthly" },
  { path: "/service-areas/coburg", priority: 0.7, changefreq: "monthly" },
  { path: "/service-areas/creswell", priority: 0.7, changefreq: "monthly" },
  {
    path: "/service-areas/cottage-grove",
    priority: 0.7,
    changefreq: "monthly",
  },
  {
    path: "/service-areas/junction-city",
    priority: 0.7,
    changefreq: "monthly",
  },
  { path: "/service-areas/florence", priority: 0.7, changefreq: "monthly" },
  { path: "/portfolio", priority: 0.8, changefreq: "weekly" },
  { path: "/blog", priority: 0.7, changefreq: "weekly" },
  {
    path: "/blog/kitchen-remodel-cost-eugene-oregon",
    priority: 0.7,
    changefreq: "monthly",
  },
  {
    path: "/blog/verify-oregon-ccb-license",
    priority: 0.7,
    changefreq: "monthly",
  },
  {
    path: "/blog/tadlock-residence-case-study",
    priority: 0.6,
    changefreq: "monthly",
  },
  { path: "/estimator", priority: 0.9, changefreq: "monthly" },
  { path: "/faq", priority: 0.8, changefreq: "monthly" },
  { path: "/contact", priority: 0.9, changefreq: "monthly" },
];

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
