const CACHE_NAME = 'meowku-shell-v3';
const DEFAULT_ACTION_URL = '/app/riwayat-jadwal';

function normalizeActionUrl(actionUrl) {
  return actionUrl && actionUrl !== '/jadwal' ? actionUrl : DEFAULT_ACTION_URL;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['/','/manifest.webmanifest','/icons/favicon-16.png','/icons/favicon-32.png','/icons/icon-192.png','/icons/icon-512.png','/UI/Meowku_Logo_Kucing_Jam_Transparent.webp'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : undefined };
  }
  const title = payload.title || 'Pengingat Meowku';
  const options = {
    body: payload.body || 'Ada jadwal perawatan yang perlu dilakukan.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'meowku-notification',
    data: { actionUrl: normalizeActionUrl(payload.actionUrl) },
    silent: payload.silent === true,
    vibrate: payload.silent === true ? undefined : [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = normalizeActionUrl(event.notification.data?.actionUrl);
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((window) => 'focus' in window);
    if (existing) return existing.focus().then(() => existing.navigate(actionUrl));
    return clients.openWindow(actionUrl);
  }));
});
