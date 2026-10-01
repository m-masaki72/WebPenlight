const CACHE_NAME = 'スマホサイリウム-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// インストール時にファイルをキャッシュします
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// フェッチイベント（リクエスト）が発生したときに、キャッシュから応答を返します
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにファイルがあれば、それを返します
        if (response) {
          return response;
        }
        // なければ、ネットワークから取得しにいきます
        return fetch(event.request);
      }
    )
  );
});
