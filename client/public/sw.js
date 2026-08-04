/**
 * Precision Core Builders — Service Worker
 * Cache-first for static assets, network-first for API calls.
 * Offline fallback for when Eric's on-site with spotty signal.
 */

// `scripts/stamp-service-worker.ts` replaces this marker in the production
// build with the deploy commit SHA. A new deploy therefore always gets fresh
// cache names, and activation purges every prior app shell/chunk cache. Keeping
// a hand-maintained version here caused returning users to combine old lazy
// route chunks with a new app shell, leaving admin routes blank.
const CACHE_VERSION = "__PCB_CACHE_VERSION__";
const CACHE_NAME = `pcb-${CACHE_VERSION}`;
const STATIC_CACHE = `pcb-static-${CACHE_VERSION}`;
const API_CACHE = `pcb-api-${CACHE_VERSION}`;

// Shell files to precache on install
const PRECACHE_URLS = ["/", "/admin", "/offline.html"];

// Install — precache shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches and notify clients so the SPA can prompt a refresh
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
      // Broadcast a controllerchange-style hint to all open windows. The app
      // listens for `{ type: "SW_UPDATED" }` and surfaces a refresh notice so
      // users don't end up with a half-old shell and a freshly-cached bundle
      // (which manifests as "buttons don't respond" after a deploy).
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({ type: "SW_UPDATED", cache: CACHE_NAME });
      }
    })()
  );
});

// Fetch strategy
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith("http")) return;

  // Never intercept cross-origin requests (Google Fonts, Netlify RUM, Supabase,
  // maps, etc.). Passing them through the SW added no value and — when a
  // response was CSP-blocked and uncached — the handler resolved to `undefined`,
  // throwing "Failed to convert value to 'Response'" and failing the request.
  if (url.origin !== self.location.origin) return;

  // API calls (tRPC + Netlify Functions) — DO NOT intercept. Serving these from
  // the SW cached stale/partial responses and, on a cache miss, could return a
  // corrupted response. Let the browser fetch them directly so every API call
  // hits the live function fresh.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/")
  ) {
    return;
  }

  // Static assets (JS, CSS, images, fonts) — cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Navigation requests — network first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Everything else — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Strategies ────────────────────────────────────────────────────────────

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return (
      cached ||
      new Response(JSON.stringify({ error: "offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    );
  }
}

async function navigationStrategy(request) {
  const url = new URL(request.url);
  const isAdmin = url.pathname.startsWith("/admin");
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try cached version of the requested page first.
    const cached = await caches.match(request);
    if (cached) return cached;
    // Never fall back to the public index for an /admin/* navigation: that
    // silently bounces the user out of the admin shell on flaky connectivity,
    // which presents as "the admin app stopped working".
    if (!isAdmin) {
      const index = await caches.match("/");
      if (index) return index;
    }
    const offline = await caches.match("/offline.html");
    return offline || new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    // Never resolve to `undefined` — respondWith() throws
    // "Failed to convert value to 'Response'" if it isn't a Response.
    .catch(() => cached || new Response("Offline", { status: 503 }));

  return cached || fetchPromise;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|eot)(\?.*)?$/.test(
    pathname
  );
}

// ── Background sync for field reports ─────────────────────────────────────

self.addEventListener("sync", event => {
  if (event.tag === "sync-field-reports") {
    event.waitUntil(syncFieldReports());
  }
});

async function syncFieldReports() {
  // TODO: Pull queued reports from IndexedDB and POST to server
  // This enables Eric to file reports on-site with no signal,
  // and have them sync when connectivity returns
  console.log("[SW] Background sync: field reports");
}

// ── Push notifications ────────────────────────────────────────────────────

self.addEventListener("push", event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "New update",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "pcb-notification",
    data: { url: data.url || "/admin" },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Precision Core Builders",
      options
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(clients => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
