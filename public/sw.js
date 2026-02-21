const CACHE_NAME = 'satprep-shell-v1';
const SHELL_ROUTES = ['/', '/index.html', '/sat-prep', '/sat-prep/'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.allSettled(
      SHELL_ROUTES.map(async (path) => {
        try {
          const response = await fetch(path, { cache: 'no-store' });
          if (response.ok) {
            await cache.put(path, response.clone());
          }
        } catch {
          // ignore cache prefill misses; runtime fetch will fill later
        }
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        if (fresh.ok) {
          cache.put('/index.html', fresh.clone());
        }
        return fresh;
      } catch {
        const cachedPage = await caches.match(request);
        if (cachedPage) return cachedPage;
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
        return new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const fresh = await fetch(request);
      if (fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      return caches.match('/index.html');
    }
  })());
});
