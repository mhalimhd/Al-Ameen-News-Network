// =========================
//   PWA CACHING SYSTEM
// =========================

const CACHE_NAME = "alameen-cache-v1";
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/styles.css",
    "/script.js",
    "/Logo.png",
    "/sounds/pray.mp3",
    "/sounds/ntfn.mp3"
];

// Install event – cache everything
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.log("Failed to cache some assets:", err);
            });
        })
    );
    self.skipWaiting();
});

// Activate – remove old caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// Fetch – offline support
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cacheRes => {
            return cacheRes || fetch(event.request).then(fetchRes => {
                // Don't cache API calls or non-GET requests
                if (event.request.method !== 'GET' || 
                    event.request.url.includes('api/') ||
                    event.request.url.includes('islamicapi.com')) {
                    return fetchRes;
                }
                
                // Cache the response for future
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, fetchRes.clone());
                    return fetchRes;
                });
            });
        })
    );
});

// =========================
//   PUSH NOTIFICATIONS
// =========================

self.addEventListener('push', event => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body,
        icon: 'Logo.png',
        badge: 'Logo.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            sound: data.sound || null
        }
    };

    event.waitUntil(
        (async () => {
            await self.registration.showNotification(data.title, options);

            // Play sound if present
            if (data.sound) {
                const clientsList = await clients.matchAll({ includeUncontrolled: true });

                clientsList.forEach(client => {
                    client.postMessage({
                        type: "playSound",
                        url: data.sound
                    });
                });
            }
        })()
    );
});

// =========================
//   NOTIFICATION HANDLING
// =========================

self.addEventListener("message", event => {
    if (event.data?.type === "showNotification") {
        const options = {
            body: event.data.body,
            icon: "Logo.png",
            badge: "Logo.png",
            vibrate: [200, 100, 200],
            requireInteraction: false
        };

        event.waitUntil(
            self.registration.showNotification(event.data.title, options)
        );

        // Play sound if specified
        if (event.data.sound) {
            clients.matchAll({ includeUncontrolled: true }).then(clientsArr => {
                clientsArr.forEach(client => {
                    client.postMessage({
                        type: "playSound",
                        url: event.data.sound
                    });
                });
            });
        }
    } else if (event.data?.type === "prayerReminder") {
        const options = {
            body: event.data.body,
            icon: "Logo.png",
            badge: "Logo.png",
            vibrate: [300, 150, 300],
            requireInteraction: true
        };

        event.waitUntil(
            self.registration.showNotification(event.data.title, options)
        );

        // Play reminder sound
        clients.matchAll({ includeUncontrolled: true }).then(clientsArr => {
            clientsArr.forEach(client => {
                client.postMessage({
                    type: "playSound",
                    url: event.data.sound || "sounds/pray.mp3"
                });
            });
        });
    } else if (event.data?.type === "playSound") {
        // Handle sound playback
        event.waitUntil(
            clients.matchAll({ includeUncontrolled: true }).then(clientsArr => {
                clientsArr.forEach(client => {
                    client.postMessage({
                        type: "playSound",
                        url: event.data.url
                    });
                });
            })
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});