import { createApp, nextTick } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import router from "./router";
import App from "./App.vue";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import "./style.css";
import { useAuthStore } from "@/stores/auth";
import ProductCard from "@/components/Card/ProductCard.vue";
import EventCard from "@/components/Card/EventCard.vue";
import "leaflet/dist/leaflet.css";
import { registerSW } from "virtual:pwa-register";

// Clean up any stale service workers (e.g. from previous dev-sw.js or selfDestroying ones)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    const expectedSw = import.meta.env.DEV ? "push-sw.js" : "sw.js";
    
    for (const registration of registrations) {
      const swUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
      if (swUrl && !swUrl.includes(expectedSw)) {
        console.log(`Unregistering stale service worker: ${swUrl} (expected ${expectedSw})`);
        registration.unregister();
      }
    }
  });
}

// Minimal waktu splash (ms)
const MIN_SPLASH_MS = Number(import.meta.env.VITE_SPLASH_MIN_MS || 1000);

function hideSplash() {
  const el = document.getElementById("splash");
  if (!el) return;
  el.classList.add("splash-hidden");
  setTimeout(() => el.remove(), 300);
}

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(Toast);
app.use(pinia);
app.use(router);

app.component("ProductCard", ProductCard);
app.component("EventCard", EventCard);

if (!import.meta.env.DEV) {
  registerSW({
    immediate: true,
  });
}

// ✅ Auth initialization moved to App.vue (synchronous from localStorage)
// Removed async initAuth() to prevent race condition that clears user on page refresh
// The initializeFromStorage() call in App.vue handles session restoration

// Mount ASAP
app.mount("#app");

// Wait for router to be ready before hiding splash
router
  .isReady()
  .then(() => {
    const isDesktop = window.matchMedia("(min-width: 640px)").matches;

    if (isDesktop) {
      hideSplash();
    } else {
      const minTimePromise = new Promise((r) => setTimeout(r, MIN_SPLASH_MS));
      minTimePromise.finally(() => nextTick().then(hideSplash));
    }
  })
  .catch((err) => {
    console.error("[App] Router failed to initialize:", err);
    hideSplash();
  });
