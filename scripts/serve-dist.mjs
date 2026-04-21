#!/usr/bin/env node
/**
 * serve-dist.mjs — Minimal SPA-fallback static server for dist/public.
 * Used by mobile-audit.mjs so screenshots hit real routed pages.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, join, normalize, sep } from "node:path";

const PORT = Number(process.env.VERIFY_PORT || 8765);
const DIST = resolve(process.cwd(), "dist/public");

/**
 * Resolve a URL path safely against DIST. Decodes, normalizes, and
 * rejects anything that resolves outside DIST (incl. encoded traversal
 * like %2e%2e and backslash variants).
 */
function safeResolve(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const normalized = normalize(decoded.replace(/\\/g, "/"));
  const target = resolve(
    DIST,
    "." + (normalized.startsWith("/") ? normalized : "/" + normalized)
  );
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;
  return target;
}

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

async function send(path, res) {
  try {
    const data = await readFile(path);
    const ext = extname(path).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.statusCode = 200;
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const target = safeResolve(url.pathname);
    if (!target) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    try {
      const st = await stat(target);
      if (st.isFile() && (await send(target, res))) return;
    } catch {
      /* fall through */
    }
    if (await send(join(DIST, "index.html"), res)) return;
    res.statusCode = 404;
    res.end("Not found");
  } catch (err) {
    res.statusCode = 500;
    res.end(String(err));
  }
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`serve-dist: http://127.0.0.1:${PORT} → ${DIST}`)
);
