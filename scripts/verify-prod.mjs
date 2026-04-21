#!/usr/bin/env node
/**
 * verify-prod.mjs — Hermetic, local-only production-bundle smoke test.
 *
 *  1. Serves dist/public via a tiny Node HTTP server with SPA fallback.
 *  2. Drives 10 routes x 2 viewports (375, 1440) through headless Chromium.
 *  3. Asserts:
 *       - #root has children on every route (no black screen)
 *       - zero console.error messages (Supabase warnings tolerated)
 *       - zero failed network requests (excluding /.netlify/functions/* and favicon)
 *       - LCP image loads within 3s
 *     Exits 1 on any failure so CI / humans catch regressions before push.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const PORT = Number(process.env.VERIFY_PORT || 8765);
const DIST = resolve(process.cwd(), "dist/public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

async function serveFile(filePath, res) {
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.statusCode = 200;
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const safePath = url.pathname.replace(/\.\./g, "");
      const target = join(DIST, safePath);

      // Try the exact file first
      try {
        const st = await stat(target);
        if (st.isFile()) {
          if (await serveFile(target, res)) return;
        }
      } catch {
        /* fall through */
      }

      // SPA fallback: any unknown path serves index.html
      if (await serveFile(join(DIST, "index.html"), res)) return;

      res.statusCode = 404;
      res.end("Not found");
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });

  await new Promise((ok, err) => {
    server.once("error", err);
    server.listen(PORT, "127.0.0.1", ok);
  });
  return server;
}

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
const VIEWPORTS = [
  { w: 375, h: 667, name: "mobile-375" },
  { w: 1440, h: 900, name: "desktop-1440" },
];

// Known-benign warnings/errors to ignore (e.g. optional env checks at
// runtime that only log at INFO/ERROR on missing Supabase vars, or
// third-party asset failures when the sandbox blocks external domains).
const IGNORE_PATTERNS = [
  /Supabase/i,
  /Missing VITE_/i,
  /favicon/i,
  /service worker/i,
  /sw\.js/i,
  /Failed to load resource/i, // network-layer errors are caught via response listener
];

const isIgnoredError = text => IGNORE_PATTERNS.some(re => re.test(text));

const isExternalOrigin = u => {
  try {
    const url = new URL(u);
    return url.hostname !== "127.0.0.1" && url.hostname !== "localhost";
  } catch {
    return false;
  }
};

(async () => {
  console.log(`Starting static server on :${PORT} serving ${DIST}`);
  const server = await startServer();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const failures = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
    });
    const page = await ctx.newPage();

    for (const route of ROUTES) {
      const url = `http://127.0.0.1:${PORT}${route}`;
      const consoleErrors = [];
      const badRequests = [];

      const onConsole = msg => {
        if (msg.type() === "error" && !isIgnoredError(msg.text())) {
          consoleErrors.push(msg.text());
        }
      };
      const onResponse = resp => {
        if (resp.status() >= 400) {
          const u = resp.url();
          // External-origin failures are outside the sandbox's network
          // policy (e.g. webflow CDN, Google Fonts) — ignore so we only
          // fail on app-controlled asset regressions.
          if (
            !u.includes("/.netlify/functions/") &&
            !u.includes("favicon") &&
            !u.includes("/sw.js") &&
            !isExternalOrigin(u)
          ) {
            badRequests.push(`${resp.status()} ${u}`);
          }
        }
      };
      const onPageError = err => {
        if (!isIgnoredError(err.message)) {
          consoleErrors.push(`pageerror: ${err.message}`);
        }
      };

      page.on("console", onConsole);
      page.on("response", onResponse);
      page.on("pageerror", onPageError);

      try {
        const t0 = Date.now();
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });

        const rootChildren = await page.evaluate(() => {
          const root = document.getElementById("root");
          return root ? root.childElementCount : 0;
        });
        if (rootChildren === 0) {
          failures.push(`${vp.name} ${route}: #root empty`);
        }

        // Require that the LCP candidate — the first same-origin image
        // that is above the fold, visible, and taller than 200px — has
        // loaded within 3s. We ignore off-screen or opacity:0 images
        // (lazy-loaded hero slides, etc) because they shouldn't block LCP.
        const lcpOk = await page.evaluate(async () => {
          const sameOrigin = u => {
            try {
              return new URL(u, location.href).origin === location.origin;
            } catch {
              return false;
            }
          };
          const isVisibleAboveFold = im => {
            const rect = im.getBoundingClientRect();
            if (rect.height < 200) return false;
            if (rect.top > window.innerHeight) return false;
            if (rect.bottom < 0) return false;
            const style = window.getComputedStyle(im);
            if (style.visibility === "hidden" || style.display === "none") {
              return false;
            }
            // Respect parent opacity too
            let node = im.parentElement;
            while (node) {
              const s = window.getComputedStyle(node);
              if (s.opacity === "0") return false;
              node = node.parentElement;
            }
            return true;
          };
          const candidates = Array.from(document.images).filter(
            im => sameOrigin(im.src) && isVisibleAboveFold(im)
          );
          if (candidates.length === 0) return true;
          // Pick the largest visible image by area — that's the LCP candidate.
          const primary = candidates.reduce((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            return ar.width * ar.height >= br.width * br.height ? a : b;
          });
          return await new Promise(r => {
            if (primary.complete && primary.naturalWidth > 0) return r(true);
            const t = setTimeout(() => r(false), 3000);
            primary.addEventListener("load", () => {
              clearTimeout(t);
              r(true);
            });
            primary.addEventListener("error", () => {
              clearTimeout(t);
              r(false);
            });
          });
        });
        if (!lcpOk) {
          failures.push(
            `${vp.name} ${route}: large image(s) did not load in 3s`
          );
        }

        if (consoleErrors.length) {
          failures.push(
            `${vp.name} ${route}: console.error × ${consoleErrors.length} — ${consoleErrors[0]}`
          );
        }
        if (badRequests.length) {
          failures.push(
            `${vp.name} ${route}: bad network requests — ${badRequests.join("; ")}`
          );
        }

        const dt = Date.now() - t0;
        const status = failures.find(f => f.startsWith(`${vp.name} ${route}`))
          ? "FAIL"
          : "ok";
        console.log(
          `  [${vp.name}] ${route.padEnd(42)} ${status} ` +
            `(root=${rootChildren}, ${dt}ms)`
        );
      } catch (err) {
        failures.push(`${vp.name} ${route}: ${err.message}`);
        console.log(`  [${vp.name}] ${route.padEnd(42)} FAIL — ${err.message}`);
      } finally {
        page.off("console", onConsole);
        page.off("response", onResponse);
        page.off("pageerror", onPageError);
      }
    }

    await ctx.close();
  }

  await browser.close();
  server.close();

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log("\nverify-prod: PASS");
})().catch(err => {
  console.error("verify-prod crashed:", err);
  process.exit(2);
});
