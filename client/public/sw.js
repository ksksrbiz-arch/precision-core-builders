/**
 * Precision Core Builders — Service Worker
 * Cache-first for static assets, network-first for API calls.
 * Offline fallback for when Eric's on-site with spotty signal.
 */

// Bump these version numbers whenever we ship a client change that users
// must pick up immediately. On activate, any cache whose name is not in the
// current list is deleted, purging stale HTML/JS/CSS from returning users.
const CACHE_NAME = "pcb-v3";
const STATIC_CACHE = "pcb-static-v3";
const API_CACHE = "pcb-api-v3";

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

// Activate — clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith("http")) return;

  // API calls — network first, cache fallback
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/")
  ) {
    event.respondWith(networkFirstStrategy(request));
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
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try cached version of the page
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fall back to cached index (SPA)
    const index = await caches.match("/");
    if (index) return index;
    // Last resort offline page
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
    .catch(() => cached);

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
