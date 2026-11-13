/* 练账 · Service Worker
   目的只有一个：每次打开都拿到最新的 index.html（热量账本同款「网络优先」）。
   只有断网时才回退到缓存，避免 iOS PWA 长期卡在旧版本。 */
const CACHE = 'lianzhang-v12';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // 页面导航：永远先走网络（no-store），拿不到才用缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 版本号文件不缓存
  if (req.url.indexOf('version.txt') > -1) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => new Response('')));
    return;
  }

  // 其它静态资源：缓存优先，后台补网络
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
