const ROOT = new URL(self.registration.scope).pathname;
const NAMESPACE = "bau-static-" + encodeURIComponent(ROOT);
const CACHE = NAMESPACE+"-8411d2352813";
const PRECACHE = ["/BauPatrimonio/index.html","/BauPatrimonio/GUIDA.html","/BauPatrimonio/examples/saldi.csv","/BauPatrimonio/examples/posizioni.csv","/BauPatrimonio/examples/movimenti.csv","/BauPatrimonio/icon.svg","/BauPatrimonio/icon-192.png","/BauPatrimonio/icon-512.png","/BauPatrimonio/manifest.webmanifest","/BauPatrimonio/assets/dm-sans-latin-400-normal-BwCSEQnW.woff","/BauPatrimonio/assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","/BauPatrimonio/assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","/BauPatrimonio/assets/dm-sans-latin-500-normal-Dr3UlScf.woff","/BauPatrimonio/assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","/BauPatrimonio/assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","/BauPatrimonio/assets/dm-sans-latin-700-normal-CUSSCpQX.woff","/BauPatrimonio/assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","/BauPatrimonio/assets/dm-sans-latin-ext-400-normal-BjWJ59Pq.woff","/BauPatrimonio/assets/dm-sans-latin-ext-400-normal-BtiwyxMk.woff2","/BauPatrimonio/assets/dm-sans-latin-ext-500-normal-BJfUCQsA.woff2","/BauPatrimonio/assets/dm-sans-latin-ext-500-normal-DR84L5F-.woff","/BauPatrimonio/assets/dm-sans-latin-ext-600-normal-4vooXBpG.woff2","/BauPatrimonio/assets/dm-sans-latin-ext-600-normal-DRtaDpgU.woff","/BauPatrimonio/assets/dm-sans-latin-ext-700-normal-BLI3TTWz.woff","/BauPatrimonio/assets/dm-sans-latin-ext-700-normal-CJIcxD6K.woff2","/BauPatrimonio/assets/index-BrcwT7UB.js","/BauPatrimonio/assets/index-D63xFvWc.css","/BauPatrimonio/assets/newsreader-latin-400-italic-CEihAR-f.woff2","/BauPatrimonio/assets/newsreader-latin-400-italic-CNZoH1hn.woff","/BauPatrimonio/assets/newsreader-latin-ext-400-italic-BMTE_bNQ.woff2","/BauPatrimonio/assets/newsreader-latin-ext-400-italic-qdgKLcPG.woff","/BauPatrimonio/assets/newsreader-vietnamese-400-italic-QbB8kb5s.woff","/BauPatrimonio/assets/newsreader-vietnamese-400-italic-bZegYFuM.woff2"];
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
