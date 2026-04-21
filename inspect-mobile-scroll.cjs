const {
  chromium,
} = require("/home/claude/.npm-global/lib/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(process.argv[2] || "http://localhost:5555/", {
    waitUntil: "networkidle",
  });

  // Slow-scroll to trigger whileInView animations
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let y = 0;
      const totalHeight = document.body.scrollHeight;
      const step = 300;
      const interval = setInterval(() => {
        window.scrollTo(0, y);
        y += step;
        if (y >= totalHeight) {
          clearInterval(interval);
          window.scrollTo(0, 0);
          setTimeout(resolve, 500);
        }
      }, 200);
    });
  });

  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "/tmp/mobile-home-scrolled.png",
    fullPage: true,
  });
  console.log("Screenshot with scroll triggers: /tmp/mobile-home-scrolled.png");

  // Still check opacity of every motion element
  const opacities = await page.evaluate(() => {
    return [...document.querySelectorAll("section, article, blockquote, div")]
      .filter(el => {
        const s = getComputedStyle(el);
        return parseFloat(s.opacity) < 1 && el.offsetHeight > 50;
      })
      .map(el => ({
        tag: el.tagName,
        class: (el.className || "").toString().slice(0, 60),
        opacity: getComputedStyle(el).opacity,
        rect: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
      }))
      .slice(0, 20);
  });
  console.log("\nStill-invisible elements (opacity < 1):");
  opacities.forEach(o =>
    console.log(" ", o.opacity, o.rect, "|", o.tag, "|", o.class)
  );

  await browser.close();
})();
