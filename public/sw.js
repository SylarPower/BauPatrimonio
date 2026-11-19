const ROOT = new URL(self.registration.scope).pathname;
const NAMESPACE = "bau-static-" + encodeURIComponent(ROOT);
const CACHE = NAMESPACE + "-dev-v4";
const PRECACHE = [
  ROOT + "index.html",
  ROOT + "icon.svg",
  ROOT + "manifest.webmanifest",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(NAMESPACE + "-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  // Solo shell HTML e asset statici: mai API, estratti conto, callback o file importati.
  if (event.request.mode === "navigate" && url.pathname === ROOT) {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            cache.put(ROOT + "index.html", response.clone());
          }
          return response;
        })
        .catch(() => caches.match(ROOT + "index.html")),
    );
    return;
  }
  if (
    !url.pathname.startsWith(ROOT + "assets/") &&
    !PRECACHE.includes(url.pathname)
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const old = await cache.match(event.request, { ignoreVary: true });
      if (old) return old;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    }),
  );
});
