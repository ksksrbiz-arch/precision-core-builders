import { preview } from "vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const server = await preview({
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    reducedMotion: "reduce",
  });
  let submitted: URLSearchParams | undefined;
  await page.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.origin !== "http://127.0.0.1:4174" ||
      url.pathname.startsWith("/api/")
    )
      return route.abort();
    if (request.method() === "POST") {
      submitted = new URLSearchParams(request.postData() ?? "");
      return route.fulfill({
        status: 200,
        body: "mocked local form acceptance",
      });
    }
    return route.continue();
  });
  await page.goto(
    "http://127.0.0.1:4174/services?utm_source=local-test&utm_campaign=remodel"
  );
  await page.waitForFunction(
    () => sessionStorage.getItem("pcb_campaign_context") !== null
  );
  await page.goto(
    "http://127.0.0.1:4174/contact?finishes=" +
      encodeURIComponent(JSON.stringify(["White Oak Flooring"]))
  );
  await page.waitForFunction(() =>
    document
      .querySelector<HTMLTextAreaElement>("#message")
      ?.value.includes("White Oak Flooring")
  );
  await page.locator("#name").fill("Local test only");
  await page.locator("#email").fill("local-test@example.invalid");
  await page.getByRole("button", { name: /Send Project Inquiry/ }).click();
  await page.getByRole("heading", { name: "Message received." }).waitFor();
  assert.equal(submitted?.get("utm_source"), "local-test");
  assert.equal(submitted?.get("landingPage"), "/services");
  assert.ok(submitted?.get("message")?.includes("White Oak Flooring"));
  for (const path of [
    "/",
    "/services",
    "/contact",
    "/privacy",
    "/blog/kitchen-remodel-cost-eugene-oregon",
  ]) {
    await page.goto(`http://127.0.0.1:4174${path}`);
    await page.waitForFunction(
      expected =>
        !!document.querySelector("main h1") &&
        new URL(
          document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href
        ).pathname === expected,
      path
    );
    assert.equal(await page.locator("main h1").count(), 1, path);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 2
      ),
      `Mobile overflow: ${path}`
    );
  }
  console.log(
    "Mobile marketing smoke passed: route rendering, overflow checks, showroom inquiry prefill, and mocked form attribution. No real inquiry sent."
  );
} finally {
  await browser.close();
  await new Promise<void>((done, reject) =>
    server.httpServer.close(error => (error ? reject(error) : done()))
  );
}
