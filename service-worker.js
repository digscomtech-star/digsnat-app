const CACHE_NAME = 'digsnat-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/config.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    if (request.method !== 'GET') return;
    if (request.url.includes('supabase.co')) {
        event.respondWith(fetch(request));
        return;
    }

    event.respondWith(
        caches.match(request).then(response => {
            if (response) return response;
            
            return fetch(request).then(networkResponse => {
                if (!request.url.includes('/api/')) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, clone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                if (request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
                return new Response('Offline');
            });
        })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-actions') {
        event.waitUntil(syncPendingActions());
    }
});

async function syncPendingActions() {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_REQUIRED' });
    });
}

// Push notifications (future)
self.addEventListener('push', (event) => {
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: data.url,
            actions: data.actions || []
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data));
});
