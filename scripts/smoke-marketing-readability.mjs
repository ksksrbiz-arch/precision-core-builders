import { preview } from "vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const server = await preview({
  preview: { host: "127.0.0.1", port: 4198, strictPort: true },
});
const browser = await chromium.launch();
mkdirSync("audit/readability", { recursive: true });
try {
  for (const width of [320, 390, 430, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: width === 1440 ? 1.25 : 2,
      serviceWorkers: "block",
    });
    await page.route("**/*", route =>
      new URL(route.request().url()).origin === "http://127.0.0.1:4198"
        ? route.continue()
        : route.abort()
    );
    for (const path of [
      "/",
      "/services",
      "/about",
      "/contact",
      "/faq",
      "/services/remodels",
      "/blog/kitchen-remodel-cost-eugene-oregon",
    ]) {
      await page.goto("http://127.0.0.1:4198" + path);
      await page.locator(".marketing-site main h1").waitFor();
      await page.waitForTimeout(900);
      const result = await page.evaluate(() => {
        const heading = document.querySelector("main h1");
        const wrapper = document.querySelector(".marketing-site");
        const style = getComputedStyle(heading);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 2,
          transform: getComputedStyle(wrapper).transform,
          weight: style.fontWeight,
          text: heading.textContent,
          font: getComputedStyle(wrapper).fontFamily,
        };
      });
      assert.equal(result.overflow, false, `${width} ${path} overflow`);
      assert.equal(result.transform, "none");
      assert.ok(
        Number(result.weight) >= 500,
        `${width} ${path} heading weight`
      );
      if (path === "/" || path === "/services")
        await page.screenshot({
          path: `audit/readability/${width}-${path === "/" ? "home" : "services"}.png`,
        });
      if (path === "/services") {
        await page.evaluate(() => scrollTo(0, 700));
        await page.waitForTimeout(300);
        const top = await page
          .locator("header")
          .first()
          .evaluate(el => el.getBoundingClientRect().top);
        assert.ok(Math.abs(top) < 2, `${width} fixed navigation moved: ${top}`);
      }
    }
    await page.close();
  }
  console.log(
    "Readability checks passed at 320, 390, 430 and 1440px with normal motion, blocked web fonts, stable fixed navigation and no horizontal overflow."
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
