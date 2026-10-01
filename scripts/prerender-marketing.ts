/** Render public routes in a clean browser, then merge content into the original
 * build shell. Never snapshot third-party scripts, sessions, or private routes. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { preview } from "vite";
import { chromium } from "playwright";

const out = resolve("dist/public");
const shell = readFileSync(resolve(out, "index.html"), "utf8");
// The shell's #root holds the branded static splash (client/index.html),
// delimited by markers. A shell without them is already-prerendered HTML.
const ROOT =
  /<div id="root">\s*<!-- pcb-splash:start -->[\s\S]*?<!-- pcb-splash:end -->\s*<\/div>/;
if (!ROOT.test(shell))
  throw new Error(
    "Prerender requires a fresh Vite build, not previously prerendered HTML. Run pnpm build."
  );
// Keep the untouched shell for client-rendered routes (/admin, /portal, login…):
// index.html itself becomes the prerendered homepage below.
writeFileSync(resolve(out, "app-shell.html"), shell);
const paths = [
  ...readFileSync(resolve(out, "sitemap.xml"), "utf8").matchAll(
    /<loc>(.*?)<\/loc>/g
  ),
].map(m => new URL(m[1]).pathname);
const server = await preview({
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
const browser = await chromium.launch({ headless: true });
try {
  for (const path of [...paths, "/404"]) {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    // Public marketing markup must not depend on analytics or remote services.
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (
        url.origin !== "http://127.0.0.1:4173" ||
        url.pathname.startsWith("/api/")
      )
        return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:4173${path}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () =>
        !!document.querySelector("main h1") &&
        !!document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content")
    );
    // Wait for the page's SEO effect, rather than accepting the base shell.
    if (path !== "/404")
      await page.waitForFunction(
        expected =>
          new URL(
            document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!
              .href
          ).pathname === expected,
        path
      );
    const snapshot = await page.evaluate(() => {
      const root = document
        .querySelector("#root")!
        .cloneNode(true) as HTMLElement;
      for (const el of root.querySelectorAll<HTMLElement>("[style]")) {
        if (el.style.opacity === "0") el.style.opacity = "1";
        if (el.style.transform) el.style.removeProperty("transform");
      }
      for (const el of root.querySelectorAll("iframe")) el.remove();
      for (const el of root.querySelectorAll('[aria-busy="true"]')) el.remove();
      return {
        styles: [...document.head.querySelectorAll('link[rel="stylesheet"]')]
          .map(el => el.outerHTML)
          .join("\n"),
        root: root.innerHTML,
        title: document.title,
        tags: [
          ...document.head.querySelectorAll(
            'meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]'
          ),
        ]
          .map(el => el.outerHTML)
          .join("\n"),
      };
    });
    if (snapshot.root.length < 500) throw new Error(`Empty prerender: ${path}`);
    let html = shell
      .replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${snapshot.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>`
      )
      .replace(
        /<meta\s+[^>]*(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/g,
        ""
      )
      .replace(/<link\s+[^>]*rel="canonical"[^>]*>/g, "")
      .replace(/<link\s+[^>]*rel="stylesheet"[^>]*>/g, "")
      .replace("</head>", `${snapshot.tags}\n${snapshot.styles}\n</head>`)
      .replace(ROOT, () => `<div id="root">${snapshot.root}</div>`);
    // Do not preload the homepage hero on every service/article route.
    if (path !== "/")
      html = html.replace(
        /<link\s+[^>]*rel="preload"[^>]*as="image"[^>]*>/g,
        ""
      );
    const fields = [
      "landingPage",
      "referrer",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]
      .map(name => `<input type="hidden" name="${name}" />`)
      .join("");
    html = html.replace(
      /(<form\b[^>]*data-netlify="true"[^>]*>)/g,
      `$1${fields}`
    );
    const target =
      path === "/"
        ? resolve(out, "index.html")
        : path === "/404"
          ? resolve(out, "404.html")
          : resolve(out, path.slice(1), "index.html");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
    console.log(`Prerendered ${path}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise<void>((done, reject) =>
    server.httpServer.close(error => (error ? reject(error) : done()))
  );
}
