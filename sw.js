// sw.js
const CACHE_NAME = 'quran-cache-v3'; // نام کش باید با HTML یکی باشد

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/vazirmatn/33.0.0/Vazirmatn-font-face.min.css',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.css'
];

// 1. نصب و کش کردن فایل‌های حیاتی
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. پاک کردن کش‌های قدیمی
self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    })
  );
});

// 3. استراتژی شبکه اول، سپس کش (مناسب برای آپدیت بودن محتوا)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkRes => {
        // اگر دانلود موفق بود، در کش ذخیره کن (برای دفعات بعد)
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkRes;
      })
      .catch(() => {
        // اگر اینترنت نبود، از کش بخوان
        return caches.match(event.request, { ignoreSearch: true }).then(cached => {
          if (cached) return cached;
          // اگر صفحه اصلی بود و آفلاین، همین ایندکس را نشان بده
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
