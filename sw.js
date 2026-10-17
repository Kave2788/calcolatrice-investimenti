// Service Worker
// - file dell'app (same-origin): network-first → gli aggiornamenti arrivano al primo avvio online,
//   offline si usa l'ultima copia in cache
// - supabase-js (versione fissata, immutabile): cache-first → login disponibile anche dopo un avvio offline
// - API Supabase: mai in cache
const CACHE_NAME = 'calc-investimenti-v6';
const NETWORK_TIMEOUT_MS = 3000;   // rete lenta: oltre questa soglia si serve la cache

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js';

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
            .then(cache => cache.addAll(PRECACHE_URLS).then(() =>
                // la CDN non deve bloccare l'installazione se irraggiungibile
                cache.add(new Request(SUPABASE_JS, { mode: 'cors' })).catch(() => {})
            ))
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

async function networkFirst(req) {
    const cache = await caches.open(CACHE_NAME);
    const fromNetwork = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
    });
    fromNetwork.catch(() => {});   // l'errore è gestito sotto: evita unhandled rejection
    try {
        return await Promise.race([
            fromNetwork,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS))
        ]);
    } catch (e) {
        const cached = await cache.match(req, { ignoreSearch: true })
            || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
        // senza copia in cache si aspetta comunque la rete (lenta ma magari arriva)
        return cached || fromNetwork;
    }
}

async function cacheFirst(req) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
}

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.href === SUPABASE_JS) { event.respondWith(cacheFirst(req)); return; }
    if (url.origin === self.location.origin) event.respondWith(networkFirst(req));
});
