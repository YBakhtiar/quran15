const APP_CACHE_NAME = 'quran-app-v3'; 
const IMAGE_CACHE_NAME = 'quran-cache-v1';

// فایل‌های ضروری برای اجرای آفلاین (شامل فونت‌ها و CSS)
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // فونت وزیر (CSS و فایل‌های فونت)
  'https://cdnjs.cloudflare.com/ajax/libs/vazirmatn/33.0.0/Vazirmatn-font-face.min.css',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.css',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.woff2',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.woff',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.ttf'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then(cache => {
        console.log('App shell and fonts cached');
        // استفاده از addAll با catch برای جلوگیری از شکست کل کش در صورت عدم موفقیت یک فایل
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => console.log('Failed to cache', url, err))
          )
        );
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('quran-app-') && cacheName !== APP_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // برای تصاویر قرآن: ابتدا کش، سپس نتورک
  if (url.includes('images/Quran')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
    );
  } 
  // برای درخواست‌های فونت (woff2, woff, ttf) و CSS فونت: استراتژی کش اول
  else if (url.includes('Vazir') || url.includes('vazirmatn') || url.includes('fontcdn')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // اگر در کش بود، همان را برگردان و در پس‌زمینه آپدیت کن
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(APP_CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        // اگر در کش نبود، از شبکه بگیر و کش کن
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(APP_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // در صورت خطا (آفلاین) و نبود در کش، یک استایل پیش‌فرش (اما فونت از کار می‌افتد)
          // می‌توان یک پاسخ خالی یا خطا برگرداند
        });
      })
    );
  }
  // سایر درخواست‌ها
  else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
               caches.open(APP_CACHE_NAME).then(cache => {
                 cache.put(event.request, networkResponse.clone());
               });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(APP_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(async () => {
           if (event.request.mode === 'navigate') {
             return caches.match('./index.html');
           }
        });
      })
    );
  }
});
