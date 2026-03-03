const CACHE_NAME = 'quran-cache-final';
const IMAGE_CACHE = 'quran-images-cache';

// فایل‌های اصلی
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/vazirmatn/33.0.0/Vazirmatn-font-face.min.css',
  'https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.css'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES))
  );
});

self.addEventListener('activate', e => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME && key !== IMAGE_CACHE) {
          return caches.delete(key);
        }
      }))
    )
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  
  // اگه تصویر قرآن هست
  if (url.includes('/images/Quran') && url.endsWith('.jpg')) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(e.request).then(cached => {
          if (cached) return cached;
          
          return fetch(e.request).then(network => {
            if (network.ok) {
              cache.put(e.request, network.clone());
            }
            return network;
          }).catch(() => {
            // برگردوندن یه تصویر خالی به جای خطا
            return new Response('', {status: 200});
          });
        });
      })
    );
    return;
  }
  
  // برای بقیه فایل‌ها
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request);
    })
  );
});
