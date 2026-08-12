const CACHE_NAME = "wataxi-v4";
const STATIC_ASSETS = ["/", "/login", "/register", "/manifest.json", "/favicon.ico", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/") || event.request.url.includes("/socket.io")) return;

  // For HTML navigations, prefer fresh network response to avoid stale SPA shells.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match("/");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Push notifications — recibe desde servidor o desde showNotification directo
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || "Tienes una nueva notificación",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "wataxi-notif",
    data: { url: data.url || "/" },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Passenger 🚗", options)
  );
});

// Clic en notificación — abre la URL correspondiente
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfócala y navega
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Si no hay ventana abierta, abre una nueva
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
