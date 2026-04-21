#!/usr/bin/env node
/**
 * mobile-audit.mjs — Iterates key routes across four viewports and saves
 * screenshots to audit/<viewport>/<route>.png so regressions are reviewable.
 *
 * Prereqs: `pnpm build` has run, a local static server is hosting dist/public
 *          at the URL passed as argv[2] (default http://localhost:8765).
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = process.argv[2] || "http://localhost:8765";
const OUT_DIR = resolve(process.cwd(), "audit");

const VIEWPORTS = [
  { name: "375x667", width: 375, height: 667 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x900", width: 1440, height: 900 },
];

const ROUTES = [
  "/",
  "/portfolio",
  "/portfolio/tadlock-residence",
  "/portfolio/full-house-restoration",
  "/portfolio/composite-hot-tub-deck",
  "/portfolio/bath-remodel-schluter",
  "/portfolio/side-yard-shed-build",
  "/portfolio/does-not-exist",
  "/about",
  "/services",
];

const routeSlug = r =>
  r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_") || "home";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let failures = 0;

  for (const vp of VIEWPORTS) {
    const dir = resolve(OUT_DIR, vp.name);
    await mkdir(dir, { recursive: true });

    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce", // stable screenshots
    });
    const page = await ctx.newPage();

    for (const route of ROUTES) {
      const url = BASE.replace(/\/$/, "") + route;
      const out = resolve(dir, routeSlug(route) + ".png");
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        // wait for fonts + images to settle
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(600);
        await page.screenshot({ path: out, fullPage: false });
        console.log(`  ${vp.name} ${route} → ${out}`);
      } catch (err) {
        failures += 1;
        console.error(`  FAIL ${vp.name} ${route}: ${err.message}`);
      }
    }

    await ctx.close();
  }

  await browser.close();

  if (failures > 0) {
    console.error(`\n${failures} screenshot(s) failed.`);
    process.exit(1);
  }
  console.log(
    `\nDone — ${VIEWPORTS.length * ROUTES.length} screenshots saved to ${OUT_DIR}`
  );
})();
