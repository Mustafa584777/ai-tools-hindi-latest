const CACHE_NAME = 'aitoolhindi-pages-v5';
const META_CACHE_NAME = 'aitoolhindi-meta-v5';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== META_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldCacheRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);

  // Only cache same-origin requests
  if (url.origin !== self.location.origin) return false;

  // Skip Service Worker itself, dev HMR, and dynamic AI endpoints
  if (
    url.pathname === '/sw.js' ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/__nextjs') ||
    url.pathname.startsWith('/api/ai-supervisor') ||
    url.pathname.startsWith('/api/tools') ||
    url.pathname.startsWith('/api/articles') ||
    url.pathname.startsWith('/admin')
  ) {
    return false;
  }

  return true;
}

function isNavigationOrHtml(request) {
  const accept = request.headers.get('accept') || '';
  return request.mode === 'navigate' || accept.includes('text/html');
}

async function isCacheFresh(request) {
  try {
    const metaCache = await caches.open(META_CACHE_NAME);
    const metaResp = await metaCache.match(request.url);
    if (!metaResp) return false;
    const timestamp = Number(await metaResp.text());
    if (!timestamp || Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp < SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

async function storeWithTimestamp(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const metaCache = await caches.open(META_CACHE_NAME);
    await cache.put(request, response.clone());
    await metaCache.put(request.url, new Response(String(Date.now())));
  } catch {
    // Ignore storage quota errors
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldCacheRequest(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      // For HTML pages: return 7-day cached page immediately (0ms) AND refresh in background
      // so layout/feature updates always sync cleanly across all visited articles.
      if (isNavigationOrHtml(request)) {
        if (cachedResponse) {
          event.waitUntil(
            fetch(request, { cache: 'no-cache' })
              .then((networkResponse) => {
                if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
                  return storeWithTimestamp(request, networkResponse);
                }
              })
              .catch(() => {})
          );
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request, { cache: 'no-cache' });
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            await storeWithTimestamp(request, networkResponse);
          }
          return networkResponse;
        } catch (err) {
          if (cachedResponse) return cachedResponse;
          throw err;
        }
      }

      // For static assets / JSON / images: 7-day Cache-First
      if (cachedResponse) {
        const fresh = await isCacheFresh(request);
        if (fresh) {
          return cachedResponse;
        }
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          await storeWithTimestamp(request, networkResponse);
        }
        return networkResponse;
      } catch (err) {
        if (cachedResponse) {
          return cachedResponse;
        }
        throw err;
      }
    })()
  );
});
