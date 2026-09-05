/* Creorga : cache des seuls fichiers publics, aucune écriture métier différée. */
const VERSION = 'creorga-v2.0.0';
const STATIC_CACHE = VERSION + '-static';
const RECOVERY_CACHE = 'creorga-recovery-readonly';
const OFFLINE_HTML = '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Hors ligne</title><body><h1>Connexion indisponible</h1><p>Aucune modification n’a été envoyée au serveur. Les formulaires qui proposent un brouillon local le conservent sur cet appareil. Reconnectez-vous pour vérifier et enregistrer.</p><button onclick="location.reload()">Réessayer</button></body></html>';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Préserver les anciennes écritures pour examen, sans leurs jetons périmés.
  // Retirer ensuite uniquement les caches Creorga, jamais ceux d'une autre application.
  for (const key of await caches.keys()) {
    if (!/^creorga-v/.test(key) || key === STATIC_CACHE) continue;
    const old = await caches.open(key);
    const queue = await old.match('/__queue__');
    if (queue) {
      const entries = await queue.json().catch(() => []);
      if (Array.isArray(entries) && entries.length) {
        const recovered = entries.map(item => ({ url: item.url, method: item.method, body: item.body, timestamp: item.timestamp, status: 'NON_REJOUE_IDENTITE_A_VERIFIER' }));
        const recovery = await caches.open(RECOVERY_CACHE);
        await recovery.put('/legacy-queue-' + encodeURIComponent(key), new Response(JSON.stringify(recovered), { headers: { 'Content-Type': 'application/json' } }));
      }
    }
    await caches.delete(key);
  }
  await self.clients.claim();
})()));

async function networkOnly(request) {
  try { return await fetch(request); }
  catch { return new Response(JSON.stringify({ error: 'offline', message: 'Non enregistré : connexion serveur indisponible.' }), { status: 503, headers: { 'Content-Type': 'application/json' } }); }
}
async function publicAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/') || request.headers.has('Authorization')) {
    event.respondWith(networkOnly(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Noms compilés publics uniquement : aucun média RH/client ni page authentifiée.
  if (url.pathname.startsWith('/assets/') && /\.(js|css|woff2?|ttf|png|svg|webp)$/.test(url.pathname)) event.respondWith(publicAsset(request));
  else if (request.mode === 'navigate') event.respondWith(fetch(request).catch(() => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
self.addEventListener('sync', event => {
  // Un ancien événement de synchronisation peut survivre à la mise à jour.
  if (event.tag === 'creorga-sync') event.waitUntil(Promise.resolve());
});
self.addEventListener('push', event => {
  let data = { title: 'Creorga', body: 'Nouvelle notification' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  const options = { body: data.body, icon: '/icon-192.png', data: { url: data.url || '/' }, tag: data.tag || 'creorga-notif' };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    if (list[0]) { list[0].navigate(url.href); return list[0].focus(); }
    return self.clients.openWindow(url.href);
  }));
});
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
