// Dev-only service worker so localhost can register push notifications.
// Production builds still use the injected Workbox worker from src/sw.js.

const toJson = (data) => {
  if (!data) return null;

  try {
    return data.json();
  } catch {
    return null;
  }
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = toJson(event.data) || {};
  const title = payload.title || "SUMILIR";
  const options = {
    body: payload.body || "Ada notifikasi baru dari SUMILIR.",
    icon: payload.icon || "/icon192.png",
    badge: payload.badge || "/icon192.png",
    tag: payload.tag || "sumilir-notification",
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification?.data?.url || "/";

  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client && client.url.includes(targetUrl)) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
