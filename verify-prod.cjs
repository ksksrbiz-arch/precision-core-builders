/**
 * Production-bundle verification harness.
 * Loads the locally-served prod build in headless Chrome, captures ALL
 * console messages and page errors, waits for React to mount, and
 * reports pass/fail with details.
 */
const {
  chromium,
} = require("/home/claude/.npm-global/lib/node_modules/playwright");

const URL = process.argv[2] || "http://localhost:5555/";
const ROUTES =
  process.argv.slice(3).length > 0
    ? process.argv.slice(3)
    : ["/", "/about", "/services", "/portfolio", "/contact", "/faq"];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let hadFailure = false;
  const results = [];

  for (const route of ROUTES) {
    const page = await browser.newPage();
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", msg => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", resp => {
      // Filter API endpoints — /api/trpc only exists on Netlify, not local static server
      if (resp.status() === 404 && !resp.url().includes("/api/")) {
        consoleErrors.push(`404: ${resp.url()}`);
      }
    });
    page.on("pageerror", err => {
      pageErrors.push({
        msg: err.message,
        stack: err.stack?.split("\n").slice(0, 3).join(" | "),
      });
    });

    const fullUrl = URL.replace(/\/$/, "") + route;
    let rootContent = "UNKNOWN";
    let status = "UNKNOWN";

    try {
      // Load the SPA shell first
      const resp = await page.goto(URL, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
      status = resp?.status() ?? "NO_RESPONSE";

      // If we're testing a subroute, client-side navigate to it (simulates Netlify SPA fallback)
      if (route !== "/") {
        await page.evaluate(target => {
          window.history.pushState({}, "", target);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, route);
        await page.waitForTimeout(1500);
      }

      // Wait up to 3s for React to mount something into #root
      await page
        .waitForFunction(
          () => {
            const r = document.getElementById("root");
            return r && r.children.length > 0;
          },
          { timeout: 3000 }
        )
        .catch(() => {});

      rootContent = await page.evaluate(() => {
        const r = document.getElementById("root");
        return r ? r.innerHTML.length : 0;
      });
    } catch (e) {
      pageErrors.push({ msg: "NAV: " + e.message });
    }

    const passed =
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      typeof rootContent === "number" &&
      rootContent > 100;

    if (!passed) hadFailure = true;

    results.push({
      route,
      status,
      rootContentLen: rootContent,
      consoleErrors,
      pageErrors,
      passed,
    });

    await page.close();
  }

  await browser.close();

  // Report
  console.log("\n" + "=".repeat(60));
  console.log(
    `RESULTS — ${results.filter(r => r.passed).length}/${results.length} routes OK`
  );
  console.log("=".repeat(60));
  for (const r of results) {
    const flag = r.passed ? "✓" : "✗";
    console.log(
      `\n${flag} ${r.route}  [HTTP ${r.status}]  root=${r.rootContentLen}B`
    );
    if (r.consoleErrors.length) {
      console.log("  Console errors:");
      r.consoleErrors.forEach(e => console.log("   •", e.slice(0, 200)));
    }
    if (r.pageErrors.length) {
      console.log("  Page errors:");
      r.pageErrors.forEach(e =>
        console.log(
          "   •",
          e.msg?.slice(0, 200),
          e.stack ? `\n     ${e.stack}` : ""
        )
      );
    }
  }
  console.log("");
  process.exit(hadFailure ? 1 : 0);
})().catch(e => {
  console.error("HARNESS FAILURE:", e.message);
  process.exit(2);
});
