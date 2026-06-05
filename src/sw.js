import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request, sameOrigin }) =>
    sameOrigin &&
    ["style", "script", "image", "font"].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: "assets-cache-v1" }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({ cacheName: "api-cache-v1" }),
);

const toJson = (data) => {
  if (!data) return null;

  try {
    return data.json();
  } catch {
    return null;
  }
};

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
