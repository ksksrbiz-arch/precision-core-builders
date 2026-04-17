const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");

const URL = process.argv[2] || "http://localhost:5555/";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  // iPhone-ish viewport
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", e => errors.push("PAGE: " + e.message));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1500);

  // Full page screenshot
  await page.screenshot({ path: "/tmp/mobile-home.png", fullPage: true });
  console.log("Full-page mobile screenshot: /tmp/mobile-home.png");

  // Horizontal-overflow check (common mobile glitch)
  const overflow = await page.evaluate(() => {
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;
    const offenders = [];
    if (bodyWidth > viewportWidth) {
      document.querySelectorAll("*").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > viewportWidth + 1) {
          offenders.push({
            tag: el.tagName,
            class: (el.className || "").toString().slice(0, 80),
            right: Math.round(r.right),
            id: el.id || "",
          });
        }
      });
    }
    return { bodyWidth, viewportWidth, offenders: offenders.slice(0, 10) };
  });
  console.log("Horizontal overflow:", JSON.stringify(overflow, null, 2));

  // Image aspect sanity — find any img that's been squeezed
  const imgSanity = await page.evaluate(() => {
    return [...document.querySelectorAll("img")].map(img => {
      const r = img.getBoundingClientRect();
      return {
        src: img.src.slice(0, 80),
        displayed: `${Math.round(r.width)}x${Math.round(r.height)}`,
        natural: `${img.naturalWidth}x${img.naturalHeight}`,
        fit: getComputedStyle(img).objectFit,
        pos: getComputedStyle(img).objectPosition,
      };
    }).filter(i => i.displayed !== "0x0").slice(0, 15);
  });
  console.log("\nImages rendered:");
  imgSanity.forEach(i => console.log(" ", i.displayed, i.fit, i.pos, "|", i.src));

  if (errors.length) {
    console.log("\nConsole/page errors:");
    errors.forEach(e => console.log(" •", e.slice(0, 200)));
  } else {
    console.log("\nNo JS errors.");
  }

  await browser.close();
})();
