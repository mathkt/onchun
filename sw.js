/* 부산의 활동수학 축전 · 오프라인 대비 서비스 워커 (tools/build-sw.py 가 생성) */
const VERSION = 'onchun-12b7002f44';
const PRECACHE = ["book/01/index.html", "book/02/index.html", "book/03/index.html", "book/04/index.html", "book/05/index.html", "book/06/index.html", "book/07/index.html", "book/08/index.html", "book/09/index.html", "book/10/index.html", "book/11/index.html", "book/12/index.html", "book/13/index.html", "book/14/index.html", "book/15/index.html", "book/16/index.html", "book/17/index.html", "book/book.css", "book/book.js", "book/index.html", "book/poly3d.js", "common.css", "common.js", "games/arcade/index.html", "games/online.js", "games/queen/index.html", "img/ch01.jpg", "img/ch02.jpg", "img/ch03.jpg", "img/ch04.jpg", "img/ch05.jpg", "img/ch06.jpg", "img/ch07.jpg", "img/ch08.jpg", "img/ch09.jpg", "img/ch10.jpg", "img/ch11.jpg", "img/ch12.jpg", "img/ch13.jpg", "img/ch14.jpg", "img/ch15.jpg", "img/ch16.jpg", "img/ch17.jpg", "index.html", "qr.html"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(PRECACHE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 같은 사이트 + 폰트/파이어베이스 SDK: 네트워크 우선, 실패하면 캐시 (최신 유지 + 오프라인 동작)
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cacheable = url.origin === location.origin || /gstatic\.com|googleapis\.com|cdnjs\.cloudflare\.com|cdn\.tailwindcss\.com/.test(url.host);
  if (!cacheable || url.host.includes('firebasedatabase')) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const idx = await cache.match('index.html'); if (idx) return idx; }
      throw err;
    }
  })());
});
