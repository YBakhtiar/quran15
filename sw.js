// نام کش را به v3 تغییر دادیم تا گوشی کاربران متوجه تغییرات بشود و کش قبلی را آپدیت کند
const APP_CACHE_NAME = 'quran-app-v3'; 
const IMAGE_CACHE_NAME = 'quran-cache-v1';

// فایل‌هایی که برای اجرای اولیه و آفلاین برنامه نیاز هستند
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
  // اگر فایل آیکون (مثل icon-192.png) داری، مسیر آن را هم اضافه کن
];

// مرحله نصب: کش کردن فایل‌های اصلی برنامه
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then(cache => {
        console.log('App shell cached');
        return cache.addAll(urlsToCache);
      })
  );
});

// مرحله فعال‌سازی: پاک کردن کش‌های قدیمی برنامه
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

// مرحله درخواست: استراتژی استاندارد موزیلا برای مدیریت آفلاین/آنلاین
self.addEventListener('fetch', event => {
  
  // ۱. درخواست‌های مربوط به تصاویر قرآن (ابتدا کش، سپس نتورک)
  if (event.request.url.includes('images/Quran')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
    );
  } 
  
  // ۲. سایر درخواست‌ها (بر اساس آموزش موزیلا)
  else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // اگر فایل در کش بود، همان را فورا نشان بده (برای کارکرد قطعی در حالت آفلاین)
        if (cachedResponse) {
          // در پس‌زمینه سعی می‌کنیم نسخه جدید را هم از اینترنت بگیریم
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
               caches.open(APP_CACHE_NAME).then(cache => {
                 cache.put(event.request, networkResponse.clone());
               });
            }
          }).catch(() => {}); // اگر اینترنت قطع بود، خطا ندهد
          
          return cachedResponse;
        }
        
        // اگر فایل در کش نبود، آن را از اینترنت دانلود کن
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(APP_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(async () => {
           // اگر اینترنت قطع بود و کاربر صفحه جدیدی را باز کرد (مثلاً با رفرش)، index.html را نشان بده
           if (event.request.mode === 'navigate') {
             return caches.match('./index.html');
           }
        });
      })
    );
  }
});
