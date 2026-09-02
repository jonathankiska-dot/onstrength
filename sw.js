/* Onstrength — service worker.

   Bump CACHE_VERSION whenever you change index.html or app.html, or browsers
   will keep serving the copy they already have. This is the single most common
   reason an update appears to do nothing. */

const CACHE_VERSION = "onstrength-v26";

const SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./help.html",
  "./privacy.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-64.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(
        /* cache:"reload" so a deploy is not precached from the browser's own
           stale HTTP cache — the reason an update can appear to do nothing
           even after the worker version is bumped. */
        SHELL.map((u) => new Request(u, { cache: "reload" }))
      ))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION && k !== CACHE_VERSION + "-fonts")
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Google Fonts: serve from cache, refresh in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(CACHE_VERSION + "-fonts").then((cache) =>
        cache.match(req).then((hit) => {
          const live = fetch(req)
            .then((res) => { cache.put(req, res.clone()).catch(() => {}); return res; })
            .catch(() => hit);
          return hit || live;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Pages: prefer the network so an update lands, fall back to cache offline.
     There are two pages now, so each is cached under its own path — caching
     every navigation as index.html would make the landing page and the app
     overwrite each other. The query string is dropped from the cache key, so
     app.html?demo=1 still resolves offline. */
  if (req.mode === "navigate") {
    const key = url.pathname;
    event.respondWith(
      /* Same reason: GitHub Pages sends a max-age, so a plain fetch() here can
         be answered by the browser's HTTP cache with the previous deploy.
         Requesting the URL fresh is what makes "network first" actually mean
         the network. */
      fetch(url.href, { cache: "reload", credentials: "same-origin" })
        .then((res) => {
          /* Only cache a page that actually loaded. Without this a single 500
             from the host replaces the good offline copy, and the app breaks
             precisely when the network is already unreliable. */
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(key, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(key)
            .then((hit) => hit || caches.match("./app.html"))
            .then((hit) => hit || caches.match("./index.html"))
            .then((hit) => hit || caches.match("./"))
        )
    );
    return;
  }

  // Everything else we ship: cache first.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
