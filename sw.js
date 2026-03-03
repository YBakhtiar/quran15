const CACHE_NAME = 'quran-cache-v5';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/vazirmatn/33.0.0/Vazirmatn-font-face.min.css',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('کش کردن فایل‌های اصلی');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('حذف کش قدیمی:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  const requestPath = url.pathname;
  
  // مشکل اصلی اینجا بود - مسیرها رو درست تشخیص بده
  if (requestPath.includes('/images/Quran') && requestPath.endsWith('.jpg')) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return networkResponse;
            })
            .catch(() => {
              console.log('تصویر در دسترس نیست:', requestPath);
              // برگردوندن یه پاسخ ساده به جای خطا
              return new Response('', { status: 404, statusText: 'Not Found' });
            });
        })
    );
    return;
  }
  
  // برای صفحه اصلی و فایل‌های دیگه
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            // فقط پاسخ‌های موفق رو کش کن
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.log('خطا در درخواست:', error);
            // برای صفحه اصلی، همون index.html رو برگردون
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('', { status: 404, statusText: 'Not Found' });
          });
      })
  );
});
