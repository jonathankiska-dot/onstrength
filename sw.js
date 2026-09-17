/* Onstrength — service worker.

   Bump CACHE_VERSION whenever you change index.html or app.html, or browsers
   will keep serving the copy they already have. This is the single most common
   reason an update appears to do nothing. */

const CACHE_VERSION = "onstrength-v96";

const SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./help.html",
  "./privacy.html",
  "./terms.html",
  "./cost/",
  "./task/",
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
      /* One file at a time, and a failure on one does not lose the rest.

         cache.addAll is atomic: if any single request in the list fails, it
         rejects and NOTHING is written. terms.html was added to this list and
         to a release, and the file itself did not make it onto the server —
         so every visitor installed a worker with an empty cache and offline
         stopped working entirely, while the app looked perfectly fine online.
         Fifteen files cached, or zero, decided by one 404.

         The shell only grows, and a new file is exactly the kind that gets
         missed in an upload. A missing file should cost that one file. */
      .then((cache) => Promise.all(SHELL.map((u) =>
        /* cache:"reload" so a deploy is not precached from the browser's own
           stale HTTP cache — the reason an update can appear to do nothing
           even after the worker version is bumped. */
        cache.add(new Request(u, { cache: "reload" })).catch(() => null)
      )))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      /* The font cache goes too. The typeface is carried inside the page as
         a data: URI now, so a cache of Google's copy is dead weight left on
         the device from an older version. */
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* Nothing is fetched from anywhere but this origin. The typeface used to
     come from Google and was cached here; it is now embedded in the page, so
     there is no cross-origin request left for this worker to handle, and a
     branch that would quietly permit one does not belong in a file whose
     whole claim is that the app talks to nobody. */
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
