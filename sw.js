// ウォッチリスト PWA Service Worker
const CACHE = "watchlist-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./symbols.js",
  "./chart.html",
  "./manifest.webmanifest",
  "./icons/icon192.png",
  "./icons/icon512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 株価データ（外部API）はキャッシュせず常にネットワークから取得
  if (url.origin !== self.location.origin) return;

  // アプリ本体（同一オリジン）はキャッシュ優先＋裏で更新
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
