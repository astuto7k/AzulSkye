const CACHE = 'azulskye-shell-v3';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html', '/brand/azulskye-simbolo-v3-192.png']))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
self.addEventListener('push',event=>{
  const notice=event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(notice.title || 'AzulSkye',{
    body:notice.body || 'Confira as novidades no painel.',tag:notice.tag,
    icon:'/brand/azulskye-simbolo-v3-192.png',data:{url:'/#/admin/pedidos'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.openWindow('/#/admin/pedidos'));
});
