// ============================================
// SERVICE WORKER PASIRPOGORCELL
// ============================================

const CACHE_NAME = 'pasirpogor-v1';
const OFFLINE_URL = 'offline.html';

// Daftar file yang akan di-cache
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap'
];

// ============================================
// INSTALL: Menyimpan file ke cache
// ============================================
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching assets...');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] Install complete!');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// ============================================
// ACTIVATE: Membersihkan cache lama
// ============================================
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    
    const cacheWhitelist = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[SW] Claiming clients...');
            return self.clients.claim();
        })
    );
});

// ============================================
// FETCH: Menangani request
// ============================================
self.addEventListener('fetch', event => {
    // Abaikan request ke API eksternal
    if (event.request.url.includes('aladhan.com') || 
        event.request.url.includes('telegram.org')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Jika ada di cache, kembalikan dari cache
                if (response) {
                    return response;
                }
                
                // Jika tidak ada, ambil dari network
                return fetch(event.request)
                    .then(response => {
                        // Simpan response ke cache untuk digunakan nanti
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Jika offline, tampilkan halaman offline
                        return caches.match(OFFLINE_URL);
                    });
            })
    );
});

// ============================================
// PUSH NOTIFICATION (Opsional)
// ============================================
self.addEventListener('push', event => {
    console.log('[SW] Push received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Ada promo baru!',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            { action: 'explore', title: 'Lihat Promo', icon: 'icon-192.png' },
            { action: 'close', title: 'Tutup', icon: 'icon-192.png' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('📢 PasirPogorCell', options)
    );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification click:', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else {
        event.waitUntil(
            clients.matchAll({
                type: 'window'
            })
            .then(windowClients => {
                for (let client of windowClients) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});