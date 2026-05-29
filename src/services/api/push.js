import api from "@/libs/axios";

const isSupported = () =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

const getPublicKey = async () => {
  const response = await api.get("/api/push/public-key");
  const publicKey = response.data?.publicKey;

  if (!publicKey) {
    throw new Error("Kunci publik push notification belum dikonfigurasi.");
  }

  return publicKey;
};

const getServiceWorkerRegistration = async () => {
  if (!isSupported()) return null;

  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    return existing;
  }

  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
};

const getCurrentSubscription = async () => {
  if (!isSupported()) return null;

  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  return registration.pushManager.getSubscription();
};

const getSubscriptionState = async () => {
  if (!isSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      enabled: false,
      subscription: null,
    };
  }

  const subscription = await getCurrentSubscription();

  return {
    supported: true,
    permission: Notification.permission,
    enabled: Boolean(subscription),
    subscription,
  };
};

const subscribe = async () => {
  if (!isSupported()) {
    throw new Error(
      "Push notification hanya bisa aktif di HTTPS atau localhost yang aman.",
    );
  }

  const permission =
    Notification.permission === "granted"
      ? Notification.permission
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Izin notifikasi belum diberikan.");
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error("Service worker belum siap.");
  }

  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    await api.post("/api/push-subscriptions", existing.toJSON());
    return existing;
  }

  const publicKey = await getPublicKey();
  let subscription;

  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Browser sedang memblokir Push API. Jika Anda memakai mode incognito/private, buka halaman ini di window biasa lalu aktifkan notifikasi ulang.",
      );
    }

    throw error;
  }

  await api.post("/api/push-subscriptions", subscription.toJSON());
  return subscription;
};

const unsubscribe = async () => {
  if (!isSupported()) {
    throw new Error(
      "Push notification hanya bisa dimatikan di HTTPS atau localhost yang aman.",
    );
  }

  const subscription = await getCurrentSubscription();

  if (!subscription) {
    return false;
  }

  await api.delete("/api/push-subscriptions", {
    data: {
      endpoint: subscription.endpoint,
    },
  });

  await subscription.unsubscribe();
  return true;
};

export {
  getSubscriptionState,
  isSupported as supportsPushNotifications,
  subscribe as subscribePushNotifications,
  unsubscribe as unsubscribePushNotifications,
};
