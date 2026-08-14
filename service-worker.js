// 期权收益计算器 - Service Worker v1.0
const CACHE_NAME = 'options-calculator-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 安装时预缓存所有资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截网络请求：优先从缓存响应，网络失败时也返回缓存
self.addEventListener('fetch', event => {
  // 仅缓存同源请求
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.startsWith('http://localhost')) {
    return;
  }
  
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then(response => {
            // 只缓存有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // 离线时返回缓存的首页
            return caches.match('./index.html');
          });
      })
  );
});