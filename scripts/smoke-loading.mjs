import { preview } from "vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const server = await preview({
  preview: { host: "127.0.0.1", port: 4199, strictPort: true },
});
const browser = await chromium.launch();
mkdirSync("audit/loading", { recursive: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      serviceWorkers: "block",
    });
    let release;
    const gate = new Promise(resolve => (release = resolve));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:4199") return route.abort();
      if (url.pathname.match(/\/assets\/index-.*\.js$/)) await gate;
      return route.continue();
    });
    const navigation = page.goto("http://127.0.0.1:4199/services");
    await page.locator("#pcb-boot-screen").waitFor({ state: "visible" });
    assert.equal(
      await page
        .locator("#root")
        .evaluate(el => getComputedStyle(el).visibility),
      "hidden"
    );
    assert.equal(await page.locator("#pcb-boot-screen svg").count(), 2);
    await page.screenshot({ path: `audit/loading/${width}-first-paint.png` });
    release();
    await navigation;
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("pcb-ready")
    );
    await page.locator("#pcb-boot-screen").waitFor({ state: "hidden" });
    await page.locator("main h1").waitFor({ state: "visible" });
    assert.equal(
      await page
        .locator("#root")
        .evaluate(el => getComputedStyle(el).visibility),
      "visible"
    );
    if (width === 390) {
      let releaseRoute;
      const routeGate = new Promise(resolve => (releaseRoute = resolve));
      await page.route("**/assets/About-*.js", async route => {
        await routeGate;
        return route.continue();
      });
      await page.evaluate(() => history.pushState(null, "", "/about"));
      await page.locator(".pcb-route-loader").waitFor({ state: "visible" });
      await page.screenshot({ path: "audit/loading/390-route-loading.png" });
      releaseRoute();
      await page.locator(".pcb-route-loader").waitFor({ state: "hidden" });
      await page.locator("main h1").waitFor({ state: "visible" });
    }
    await page.close();
  }
  const failed = await browser.newPage({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    reducedMotion: "reduce",
  });
  await failed.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:4199" || url.pathname.endsWith(".css"))
      return route.abort();
    return route.continue();
  });
  await failed.goto("http://127.0.0.1:4199/");
  await failed.locator("#pcb-boot-screen").waitFor({ state: "visible" });
  await failed
    .getByRole("link", { name: "Reload page", exact: true })
    .waitFor({ state: "visible", timeout: 20000 });
  assert.equal(
    await failed
      .locator("#root")
      .evaluate(el => getComputedStyle(el).visibility),
    "hidden"
  );
  assert.equal(
    await failed
      .locator(".pcb-loading-roof path")
      .first()
      .evaluate(el => getComputedStyle(el).animationName),
    "none"
  );
  await failed.close();
  const nojs = await browser.newPage({
    javaScriptEnabled: false,
    serviceWorkers: "block",
  });
  await nojs.goto("http://127.0.0.1:4199/services");
  await nojs.locator("main h1").waitFor({ state: "visible" });
  assert.equal(
    await nojs
      .locator("#pcb-boot-screen")
      .evaluate(el => getComputedStyle(el).display),
    "none"
  );
  await nojs.close();
  console.log(
    "Loading checks passed: branded first paint before JavaScript, desktop/mobile reveal, lazy route loading, failed-CSS recovery, reduced motion, and no-JavaScript prerender."
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
