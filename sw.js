// Service Worker: cache-first per gli asset statici, offline-first per la PWA
const CACHE_NAME = 'calc-investimenti-v1';

const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/utils.js',
    './js/pension.js',
    './js/pac.js',
    './js/cd.js',
    './js/home.js',
    './js/covip.js',
    './js/auth.js',
    './js/app.js',
    './images/icon-192.png',
    './images/icon-512.png',
    './images/apple-touch-icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Cache-first solo per richieste same-origin (Supabase resta sempre network)
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
                return res;
            }).catch(() => cached);
        })
    );
});
