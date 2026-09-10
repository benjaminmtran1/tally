/* Tally service worker — cache the shell, offer an update, never impose one.
   file:// skips this entirely (a service worker needs a secure origin).

   The shell is served from cache FIRST so a job being priced never stalls on
   the network, and revalidated in the background. When the revalidation finds
   a genuinely different index.html the page is told, and it offers a reload —
   it is never swapped in under someone mid-estimate.

   Note on why this is stale-while-revalidate rather than plain cache-first
   with a version bump: sw.js is usually byte-identical across deploys, so the
   browser never reinstalls it, so a bump-the-constant scheme pins every
   returning visitor to the first version they ever loaded. Revalidation has
   to live in the fetch handler, not the install handler. */
const CACHE = 'tally-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function tellClients() {
  const cs = await self.clients.matchAll({ type: 'window' });
  for (const c of cs) c.postMessage({ type: 'tally-update' });
}

const isShell = (url) => /\/(index\.html)?$/.test(url.pathname);

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });

    const revalidate = fetch(e.request).then(async (res) => {
      if (!res || !res.ok || res.type === 'opaque') return res;
      const fresh = res.clone();
      if (cached && isShell(url)) {
        const [a, b] = await Promise.all([cached.clone().text(), res.clone().text()]);
        if (a !== b) { await cache.put(e.request, fresh); await tellClients(); return res; }
      }
      await cache.put(e.request, fresh);
      return res;
    }).catch(() => null);

    if (cached) { e.waitUntil(revalidate); return cached; }
    return (await revalidate) || cache.match('./index.html');
  })());
});
