import { preview } from "vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = "http://127.0.0.1:4179";
const server = await preview({
  preview: { host: "127.0.0.1", port: 4179, strictPort: true },
});
const browser = await chromium.launch();
const sitemap = await readFile("client/public/sitemap.xml", "utf8");
const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  match => new URL(match[1]).pathname
);
const samples = [
  "/services",
  "/about",
  "/portfolio",
  "/showroom",
  "/blog",
  "/faq",
  "/estimator",
  "/contact",
];
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.origin === origin && !url.pathname.startsWith("/api/")
        ? route.continue()
        : route.abort();
    });
    for (const path of routes) {
      await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(expected => {
        const canonical = document.querySelector<HTMLLinkElement>(
          'link[rel="canonical"]'
        );
        return (
          !!document.querySelector("main h1") &&
          canonical &&
          new URL(canonical.href).pathname === expected
        );
      }, path);
      if (path !== "/") {
        await page.locator(".marketing-page").waitFor();
        assert.equal(
          await page.locator(".marketing-page main h1").count(),
          1,
          path
        );
        const colors = await page.evaluate(() => ({
          surface: getComputedStyle(document.querySelector(".marketing-page")!)
            .backgroundColor,
          nav: getComputedStyle(document.querySelector(".marketing-nav")!)
            .backgroundColor,
        }));
        assert.equal(
          colors.surface,
          "rgb(246, 243, 237)",
          `${path}: public palette`
        );
        assert.equal(
          colors.nav,
          "rgb(20, 18, 16)",
          `${path}: charcoal navigation`
        );
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2
        ),
        `${path}: overflow at ${width}px`
      );
      if (process.argv.includes("--screenshots") && samples.includes(path)) {
        // Reveal below-fold content before full-page visual snapshots.
        for (
          let offset = 0;
          offset < (await page.evaluate(() => document.body.scrollHeight));
          offset += 700
        ) {
          await page.evaluate(y => window.scrollTo(0, y), offset);
          await page.waitForTimeout(120);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(800);
        await page.screenshot({
          path: join(tmpdir(), `pcb-${path.slice(1)}-${width}.png`),
          fullPage: true,
        });
      }
    }
    if (width === 390) {
      await page.goto(`${origin}/services`);
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Showroom", exact: true })
        .waitFor();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .waitFor();
    }
    for (const path of ["/auth/login", "/admin", "/portal"]) {
      await page.goto(`${origin}${path}`);
      await page.locator("body").waitFor();
      assert.equal(
        await page.locator(".marketing-page").count(),
        0,
        `${path}: private UI must stay isolated`
      );
    }
    await page.close();
  }
  console.log(
    `Verified ${routes.length} public pages at mobile and desktop widths: blended palette, navigation, headings, overflow, and private-route isolation.`
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close(error => (error ? reject(error) : resolve()))
  );
}
