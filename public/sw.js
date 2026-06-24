/* THV Chamados — Service Worker
 * - Web Push handler
 * - Click navega para o chamado
 * - SEM cache de app shell (para evitar conteúdo preso após deploy)
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'THV Chamados', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'THV Chamados';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/chamados' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/chamados';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const u = new URL(client.url);
        if (u.origin === self.location.origin) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});