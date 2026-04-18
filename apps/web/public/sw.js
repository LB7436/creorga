/* Creorga OS - Service Worker */
/* eslint-disable no-restricted-globals */

const VERSION = 'creorga-v1.0.0';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const API_CACHE = `${VERSION}-api`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/creorga.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html',
];

const OFFLINE_HTML = `<!doctype html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hors ligne - Creorga OS</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a;text-align:center;padding:20px}
.c{max-width:420px}h1{font-size:24px;margin-bottom:12px;color:#6366f1}p{color:#64748b;line-height:1.5}
button{margin-top:20px;padding:12px 24px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}</style>
</head><body><div class="c"><h1>Vous êtes hors ligne</h1>
<p>Vérifiez votre connexion internet. Vos modifications seront synchronisées dès le retour du réseau.</p>
<button onclick="location.reload()">Réessayer</button></div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url).catch(() => null)));
      await cache.put('/offline.html', new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: VERSION }));
    })()
  );
});

const isApiRequest = (url) => url.pathname.startsWith('/api/');
const isStaticAsset = (url) => /\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'Hors ligne' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 504 });
  }
}

async function htmlStrategy(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/offline.html');
    return offline || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    if (!self.navigator.onLine) event.respondWith(queueRequest(request));
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) event.respondWith(networkFirst(request));
  else if (isStaticAsset(url)) event.respondWith(cacheFirst(request));
  else event.respondWith(htmlStrategy(request));
});

async function queueRequest(request) {
  try {
    const body = await request.clone().text();
    const queue = await getQueue();
    queue.push({
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body,
      timestamp: Date.now(),
    });
    await setQueue(queue);
    if ('sync' in self.registration) {
      await self.registration.sync.register('creorga-sync');
    }
    return new Response(
      JSON.stringify({ queued: true, message: 'Action mise en file, synchronisation à la reconnexion' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'queue-failed' }), { status: 500 });
  }
}

async function getQueue() {
  const cache = await caches.open(API_CACHE);
  const res = await cache.match('/__queue__');
  if (!res) return [];
  try { return await res.json(); } catch { return []; }
}

async function setQueue(queue) {
  const cache = await caches.open(API_CACHE);
  await cache.put('/__queue__', new Response(JSON.stringify(queue), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'creorga-sync') event.waitUntil(flushQueue());
});

async function flushQueue() {
  const queue = await getQueue();
  const remaining = [];
  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: new Headers(item.headers),
        body: item.body,
      });
      if (!res.ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  await setQueue(remaining);
  const clients = await self.clients.matchAll();
  clients.forEach((c) => c.postMessage({ type: 'SYNC_COMPLETE', synced: queue.length - remaining.length }));
}

self.addEventListener('push', (event) => {
  let data = { title: 'Creorga OS', body: 'Nouvelle notification' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* ignore */ }
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: data.url ? { url: data.url } : {},
    tag: data.tag || 'creorga-notif',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(url); return client.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
