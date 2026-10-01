/**
 * Single source of truth for the site's URL space.
 *
 * Feeds three build-time artifacts so they can never drift apart:
 *   - client/public/sitemap.xml   (scripts/generate-sitemap.ts)
 *   - client/public/_redirects    (scripts/generate-redirects.ts)
 *   - the "did you mean" suggestions on the in-app 404 (NotFound.tsx)
 * shared/siteRoutes.test.ts also checks every <Route> in client/src/App.tsx is
 * covered here, so adding a page without registering it fails CI.
 *
 * Why the redirect list is generated: Netlify evaluates `_redirects` BEFORE
 * netlify.toml, and the old `/* /index.html 200` line in `_redirects` shadowed
 * every later toml rule — legacy 301s never fired and every unknown URL
 * answered 200 (a "soft 404" to Google). One generated file, in a deliberate
 * order, with a real 404 at the end, fixes both.
 */

export const CANONICAL_HOST = "precisioncorebuilders.com";

/**
 * The pristine SPA shell (branded splash in #root), written by
 * scripts/prerender-marketing.ts. Client-rendered routes are rewritten to it
 * rather than to /index.html, because the build overwrites index.html with the
 * prerendered homepage — serving that for /admin or /auth/login would flash
 * marketing content before the app boots.
 */
export const SPA_SHELL = "/app-shell.html";

export type ChangeFreq = "weekly" | "monthly" | "yearly";
export type PublicRoute = {
  path: string;
  priority: number;
  changefreq: ChangeFreq;
};

/** Every indexable marketing page. Portfolio project pages are added from the projects catalog. */
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
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
  { path: "/showroom", priority: 0.7, changefreq: "weekly" },
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
  {
    path: "/blog/deck-cost-eugene-oregon",
    priority: 0.7,
    changefreq: "monthly",
  },
  {
    path: "/blog/bathroom-remodel-cost-eugene-oregon",
    priority: 0.7,
    changefreq: "monthly",
  },
  { path: "/faq", priority: 0.8, changefreq: "monthly" },
  { path: "/contact", priority: 0.9, changefreq: "monthly" },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" },
];

/**
 * App routes that are real but not for search engines (robots.txt blocks them).
 * `/*` suffix = any depth below that prefix is served by the SPA, whose own
 * guards and in-app 404 handle the rest.
 */
export const APP_ROUTES: readonly string[] = [
  "/auth/login",
  "/dev-login",
  "/onboarding",
  "/admin",
  "/admin/*",
  "/portal",
  "/portal/*",
];

export type LegacyRedirect = {
  from: string;
  to: string;
  status: 301 | 302;
};

/**
 * Retired URLs → where they live now. 301 for content that moved for good;
 * 302 for the old magic-link/OAuth endpoints (sign-in is password-only now),
 * since an emailed link landing on the login page is a courtesy, not a
 * permanent mapping.
 */
export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  { from: "/home", to: "/", status: 301 },
  { from: "/work", to: "/portfolio", status: 301 },
  { from: "/projects", to: "/portfolio", status: 301 },
  { from: "/team", to: "/about", status: 301 },
  // The public estimator was retired in favour of an on-site consultation.
  { from: "/quote", to: "/contact", status: 301 },
  { from: "/estimate", to: "/contact", status: 301 },
  { from: "/estimator", to: "/contact", status: 301 },
  { from: "/login", to: "/auth/login", status: 301 },
  { from: "/signin", to: "/auth/login", status: 301 },
  { from: "/auth", to: "/auth/login", status: 302 },
  { from: "/auth/callback", to: "/auth/login", status: 302 },
  { from: "/callback", to: "/auth/login", status: 302 },
  { from: "/auth/resend", to: "/auth/login", status: 302 },
  // "/expertise/*" was renamed "/services/*". Explicit slugs first (they
  // carried real search impressions), then the section root, then a catch-all
  // for stragglers with no equivalent page (e.g. /expertise/commercial).
  ...[
    "residential",
    "remodels",
    "new-construction",
    "restoration",
    "outdoor",
    "painting",
    "roofing",
    "cabinets",
  ].map(slug => ({
    from: `/expertise/${slug}`,
    to: `/services/${slug}`,
    status: 301 as const,
  })),
  { from: "/expertise", to: "/services", status: 301 },
  { from: "/expertise/*", to: "/services", status: 301 },
];

export type RedirectRule = {
  from: string;
  to: string;
  status: number;
  force?: boolean;
};

/** The ordered rule list. Order matters: Netlify applies the first match. */
export function buildRedirectRules(projectSlugs: readonly string[]) {
  const rules: RedirectRule[] = [
    // 1. One canonical host. Forced because www serves the same files.
    {
      from: `https://www.${CANONICAL_HOST}/*`,
      to: `https://${CANONICAL_HOST}/:splat`,
      status: 301,
      force: true,
    },
    {
      from: `http://www.${CANONICAL_HOST}/*`,
      to: `https://${CANONICAL_HOST}/:splat`,
      status: 301,
      force: true,
    },
    // 2. API → serverless functions.
    { from: "/api/*", to: "/.netlify/functions/:splat", status: 200 },
    // 3. Retired URLs.
    ...LEGACY_REDIRECTS,
    // 4. Real SPA routes — an explicit allow-list, so anything else can 404.
    //    "/" is skipped: index.html is a real file, Netlify serves it as-is,
    //    and rewriting "/" would only invite a redirect loop.
    ...[
      ...PUBLIC_ROUTES.map(r => r.path),
      ...projectSlugs.map(s => `/portfolio/${s}`),
      ...APP_ROUTES,
    ]
      .filter(from => from !== "/")
      .map(from => ({ from, to: SPA_SHELL, status: 200 })),
    // 5. Everything else is a genuine 404 (static branded page, real status).
    { from: "/*", to: "/404.html", status: 404 },
  ];
  return rules;
}

export function renderRedirects(projectSlugs: readonly string[]): string {
  const rules = buildRedirectRules(projectSlugs);
  const width = Math.max(...rules.map(r => r.from.length)) + 2;
  const toWidth = Math.max(...rules.map(r => r.to.length)) + 2;
  const lines = rules.map(
    r =>
      `${r.from.padEnd(width)}${r.to.padEnd(toWidth)}${r.status}${r.force ? "!" : ""}`
  );
  return [
    "# GENERATED by scripts/generate-redirects.ts from shared/siteRoutes.ts.",
    "# Do not edit by hand — change the route list and run `pnpm redirects`.",
    "# Order matters (first match wins):",
    "#   host canonicalisation → API → legacy redirects → real SPA routes → 404",
    "",
    ...lines,
    "",
  ].join("\n");
}
