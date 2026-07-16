<script setup>
import {
  ref,
  computed,
  nextTick,
  watch,
  onBeforeUnmount,
  onMounted,
} from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import Button from "@/components/common/Button.vue";
import { useRouter } from "vue-router";
import LogoText from "@/assets/icons/LogoWithText.png";
import LogoNoText from "@/assets/icons/LogoNoText.png";
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const searchBarRef = ref(null);
const searchInputRef = ref(null);
const searchToggleRef = ref(null);
const profileMenuRef = ref(null);

const accountToggleRef = ref(null);
const accountDropdownRef = ref(null);
const accountSheetRef = ref(null);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);
const isAdmin = computed(() => authStore.isAdmin);
const cartStore = useCartStore();

const cartItemsCount = computed(() => {
  return cartStore.totalItems || 0;
});
const showProfileMenu = ref(false);

const isAuthPage = computed(() =>
  ["Login", "Register", "Forgot Password", "Reset Password", "Email Verification"].includes(route.name)
);

const showMobileDock = computed(() => {
  const allowedPaths = ['/', '/explore', '/map', '/community', '/orders', '/profile', '/login'];
  const currentPath = route.path.replace(/\/$/, '') || '/';
  return allowedPaths.includes(currentPath);
});

const baseMenus = [
  {
    key: "home",
    label: "Beranda",
    to: "/",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>`,
  },
  {
    key: "peta",
    label: "Peta UMKM",
    to: "/map",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
    </svg>`,
  },
  {
    key: "komunitas",
    label: "Komunitas",
    to: "/community",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>`,
  },
  {
    key: "profile",
    label: "Profil",
    to: isAuthenticated.value ? "/profile" : "/login",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>`,
  },
];

const menus = computed(() => {
  return baseMenus.filter((m) => {
    if (m.key === "pesanan" && (!isAuthenticated.value || isAdmin.value)) {
      return false;
    }
    if (m.key === "service-history" && !isAuthenticated.value) {
      return false;
    }
    return true;
  });
});

// Simpan active utk menu statis
const activeKey = ref(null);

const showAccountModal = ref(false);

function openAccountModal() {
  showAccountModal.value = !showAccountModal.value;
}

function closeAccountModal() {
  showAccountModal.value = false;
}

const onAccountPointerDown = (event) => {
  if (!showAccountModal.value) return;

  const target = event?.target;
  const dropdownEl = accountDropdownRef.value;
  const sheetEl = accountSheetRef.value;
  const toggleEl = accountToggleRef.value;

  if (dropdownEl && target && dropdownEl.contains(target)) return;
  if (sheetEl && target && sheetEl.contains(target)) return;
  if (toggleEl && target && toggleEl.contains(target)) return;

  closeAccountModal();
};

watch(
  () => showAccountModal.value,
  (open) => {
    if (open) {
      document.addEventListener("pointerdown", onAccountPointerDown, true);
    } else {
      document.removeEventListener("pointerdown", onAccountPointerDown, true);
    }
  },
);

async function goToProfileFromModal() {
  closeAccountModal();
  await router.push({ name: "Profile" }).catch(() => router.push("/profile"));
}

async function goToOrdersFromModal() {
  closeAccountModal();
  await router.push("/orders").catch(() => router.push("/orders"));
}

async function goToConsultationsFromModal() {
  closeAccountModal();
  await router.push("/customer/consultations").catch(() => router.push("/customer/consultations"));
}

async function logoutFromModal() {
  closeAccountModal();
  await authStore.logout();
  router.push({ name: "Login" }).catch(() => router.push("/login"));
}

function isMenuActive(m) {
  if (!m || typeof m !== "object") return false; // <-- Guard clause
  // Profile menu aktif jika route dimulai dengan /profile atau /login (saat belum auth)
  if (m.key === "profile") {
    return (
      route.path.startsWith("/profile") ||
      route.path.startsWith("/my-order") ||
      route.path.startsWith("/service-history") ||
      (!isAuthenticated.value && route.path === "/login")
    );
  }
  // Komunitas aktif jika route dimulai dengan /community
  if (m.key === "komunitas") {
    return route.path.startsWith("/community");
  }
  // Pastikan m.to ada dan bertipe string
  if (!m.to || typeof m.to !== "string") return false;
  if (m.to !== "#") return route.path === m.to;
  return activeKey.value === m.key;
}

function onMenuClick(m, e) {
  if (m.to === "#") {
    e.preventDefault();
    activeKey.value = m.key;
  } else {
    activeKey.value = null;
    showProfileMenu.value = false;
  }
}
function goToLogin() {
  router.push({ name: "Login" }).catch(() => router.push("/login"));
}
function toggleProfileMenu() {
  if (!isAuthenticated.value) {
    goToLogin();
    return;
  }

  showProfileMenu.value = !showProfileMenu.value;
}

function closeProfileMenu() {
  showProfileMenu.value = false;
}

function goToProfileMenu(path) {
  showProfileMenu.value = false;
  router.push(path);
}

function getMobileProfileTarget() {
  return isAuthenticated.value ? "/profile" : "/login";
}

function getMobileHistoryTarget() {
  return isAuthenticated.value ? "/service-history" : "/login";
}

function isMobileProfileActive() {
  return route.path.startsWith("/profile") || (!isAuthenticated.value && route.path === "/login");
}

function isMobileHistoryActive() {
  return route.path.startsWith("/service-history");
}

async function handleLogout() {
  showProfileMenu.value = false;
  await authStore.logout();
  router.push("/login");
}

const showSearch = ref(false);
const searchQuery = ref("");

const onDocumentPointerDown = (event) => {
  const target = event?.target;
  const panelEl = searchBarRef.value;
  const toggleEl = searchToggleRef.value;
  const profileEl = profileMenuRef.value;

  const clickedInsideSearch = panelEl && target && panelEl.contains(target);
  const clickedSearchToggle = toggleEl && target && toggleEl.contains(target);
  const clickedInsideProfile = profileEl && target && profileEl.contains(target);

  if (showSearch.value && !clickedInsideSearch && !clickedSearchToggle) {
    showSearch.value = false;
  }

  if (showProfileMenu.value && !clickedInsideProfile) {
    showProfileMenu.value = false;
  }
};

watch(
  () => [showSearch.value, showProfileMenu.value],
  ([searchOpen, profileOpen]) => {
    if (searchOpen || profileOpen) {
      // Use pointerdown so it closes immediately on outside click
      document.addEventListener("pointerdown", onDocumentPointerDown, true);
    } else {
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    }
  },
);

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await cartStore.fetchCartCount(true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  document.removeEventListener("pointerdown", onAccountPointerDown, true);
});

function toggleSearch() {
  if (route.path === "/" || route.path === "/explore") {
    // HOME / PRODUCT-LAYANAN / EXPLORE → fokus ke search utama di halaman
    router.push({
      path: route.path,
      query: { ...route.query, focusSearch: "1" },
    });
  } else {
    // PAGE LAIN → tampilkan searchbar fixed
    showSearch.value = !showSearch.value;

    nextTick(() => {
      if (showSearch.value && searchInputRef.value) {
        searchInputRef.value.focus();
      }
    });
  }
}

function goToCart() {
  router.push({ path: "/cart" }).catch(() => router.push("/login"));
}

function submitSearch() {
  if (!searchQuery.value.trim()) return;

  router.push({
    path: "/search",
    query: { q: searchQuery.value },
  });

  showSearch.value = false;
}
watch(
  () => route.path,
  (path) => {
    if (path === "/") {
      showSearch.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col min-h-screen pb-16 sm:pb-0">
    <!-- Navbar Desktop (hidden on mobile, hidden on auth pages) -->
    <div
      v-if="!isAuthPage"
      class="hidden sm:block sticky top-0 z-50 w-full h-[68px] bg-white border-b border-gray-200 shadow-sm"
    >
      <div class="max-w-[1440px] mx-auto h-full px-4">
        <div class="flex items-center h-full">
          <!-- Brand -->
          <RouterLink
            to="/"
            class="text-[30px] font-bold leading-[100%] tracking-[0] text-black"
            title="Sumilir – Marketplace UMKM Lokal Banyuanyar"
          >
            <img :src="LogoText" alt="SUMILIR" class="hidden h-8 md:block" />
            <img :src="LogoNoText" alt="SUMILIR" class="h-8 md:hidden" />
          </RouterLink>

          <!-- Menu Desktop (tanpa profile, karena sudah di kanan) -->
          <ul
            class="absolute flex items-center gap-8 -translate-x-1/2 left-1/2"
          >
            <li
              v-for="m in menus
                .filter((menu) => menu.key !== 'profile')
                .filter((menu) => menu.key !== 'pesanan')
                .slice(0, 5)"
              :key="m.key"
              class="flex items-center"
            >
              <RouterLink
                :to="m.to"
                @click="(e) => onMenuClick(m, e)"
                class="group relative inline-block text-sm font-semibold leading-[100%] tracking-[0]"
                :aria-current="isMenuActive(m) ? 'page' : null"
              >
                <!-- Icon dan label seperti sebelumnya -->
                <span
                  v-html="m.icon"
                  class="block w-6 h-6 transition-colors duration-200 lg:hidden hover:text-primary"
                  :class="isMenuActive(m) ? 'text-primary' : 'text-black'"
                ></span>
                <span class="relative hidden lg:inline-block">
                  <span
                    class="block transition-colors duration-200 select-none hover:text-primary"
                    :class="isMenuActive(m) ? 'text-primary' : 'text-black'"
                  >
                    {{ m.label }}
                  </span>
                </span>
              </RouterLink>
            </li>
          </ul>

          <!-- Right side -->
          <div class="flex items-center gap-4 ml-auto">
            <!-- Search Button -->
            <div class="px-4 border-r border-muted-foreground">
              <button
                v-if="isAuthenticated && !isAdmin"
                @click="goToCart"
                class="relative p-2 px-3 transition rounded-full text-primary hover:bg-gray-100"
                aria-label="Keranjang"
              >
                <i class="pi pi-shopping-cart"></i>
                <span
                  v-if="cartItemsCount > 0"
                  class="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {{ cartItemsCount > 9 ? "9+" : cartItemsCount }}
                </span>
              </button>
              <button
                @click="toggleSearch"
                ref="searchToggleRef"
                class="p-2 px-3 transition rounded-full hover:bg-gray-100"
                aria-label="Cari"
              >
                <i class="pi pi-search"></i>
              </button>
            </div>

            <template v-if="isAuthenticated">
              <div class="relative">
                <button
                  ref="accountToggleRef"
                  type="button"
                  @click="openAccountModal"
                  class="flex items-center gap-4 p-2 transition md:gap-2 hover:opacity-80 hover:text-primary group"
                  aria-label="Menu akun"
                >
                  <img
                    v-if="user?.profile_picture || user?.avatar"
                    :src="user?.profile_picture_urls?.thumb || (user?.profile_picture ? user.profile_picture + '&size=thumb' : user?.avatar)"
                    alt="Foto Profil"
                    class="object-cover w-8 h-8 transition-transform rounded-full group-hover:scale-105"
                  />
                  <span
                    v-else
                    class="flex items-center justify-center w-8 h-8 text-2xl font-bold transition-transform rounded-full bg-muted-background text-muted-foreground group-hover:scale-105"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-muted-foreground"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 1 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                      />
                    </svg>
                  </span>
                  <span
                    class="text-sm font-bold leading-[100%] tracking-[0] md:block hidden"
                  >
                    {{ user?.name ? user.name.split(" ")[0] : "Profil" }}
                  </span>
                </button>

                <!-- Popup akun (desktop) -->
                <div
                  v-if="showAccountModal"
                  ref="accountDropdownRef"
                  class="absolute right-0 z-50 hidden w-56 p-2 mt-2 bg-white border border-gray-200 shadow-lg sm:block rounded-xl"
                >
                  <button
                    type="button"
                    @click="goToProfileFromModal"
                    class="w-full px-3 py-2 text-sm font-semibold text-left text-black rounded-lg hover:bg-gray-100"
                  >
                    Akun Saya
                  </button>
                  <button
                    type="button"
                    @click="logoutFromModal"
                    class="w-full px-3 py-2 text-sm font-semibold text-left rounded-lg text-danger-foreground hover:bg-danger-background"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <Button variant="secondary" @click="goToLogin"> Login </Button>
            </template>
          </div>
        </div>
      </div>
    </div>
    <!-- SEARCH BAR (Desktop) -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-if="showSearch"
        ref="searchBarRef"
        class="hidden sm:block bg-white border-b border-gray-200 shadow-sm fixed top-[68px] left-0 right-0 z-1002"
      >
        <div class="max-w-[1440px] mx-auto px-4 py-4">
          <form @submit.prevent="submitSearch" class="relative">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Cari produk, jasa, atau UMKM…"
              class="w-full h-12 pl-12 pr-4 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
              autofocus
            />

            <span
              class="absolute text-gray-400 -translate-y-1/2 left-4 top-1/2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 10.5 18a7.5 7.5 0 0 0 6.15-3.35Z"
                />
              </svg>
            </span>
          </form>
        </div>
      </div>
    </transition>

    <!-- Main Content -->
    <main class="flex-1">
      <router-view />
    </main>

    <!-- Bottom Dock Navigation (Mobile only) -->
    <nav
      v-if="showMobileDock"
      class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg sm:hidden"
    >
      <div class="flex items-center justify-around h-16 px-1">
        <template v-for="m in menus.filter((menu) => menu.key !== 'keranjang')" :key="m.key">
          <RouterLink
            v-if="m.key !== 'profile'"
            :to="m.to"
            @click="(e) => onMenuClick(m, e)"
            class="flex flex-col items-center justify-center flex-1 h-full transition-colors"
            :class="
              isMenuActive(m) ? 'text-primary' : 'text-black hover:text-primary'
            "
          >
            <span v-html="m.icon" class="w-6 h-6"></span>
          </RouterLink>

          <div
            v-else
            class="flex flex-col items-center justify-center flex-1 h-full transition-colors"
            :class="
              isMobileProfileActive() ? 'text-primary' : 'text-black hover:text-primary'
            "
          >
            <RouterLink
              :to="getMobileProfileTarget()"
              class="flex flex-col items-center justify-center w-full h-full"
              @click="showProfileMenu = false"
            >
              <img
                v-if="isAuthenticated && (user?.profile_picture || user?.avatar)"
                :src="user?.profile_picture_urls?.thumb || (user?.profile_picture ? user.profile_picture + '&size=thumb' : user?.avatar)"
                alt="Foto Profil"
                class="object-cover w-6 h-6 transition-colors rounded-full"
                :class="
                  isMobileProfileActive()
                    ? 'border-2 border-primary'
                    : 'hover:border-2 border-primary'
                "
              />
              <span
                v-else
                class="flex items-center justify-center text-2xl font-bold text-black rounded-full w-7 h-7 bg-muted-background"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="w-4 h-4 text-black"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  /></svg
              ></span>
            </RouterLink>
          </div>
        </template>
      </div>
    </nav>

    <!-- Footer Desktop -->
    <!-- <footer
      class="hidden py-6 text-sm text-center bg-gray-100 sm:block text-muted-foreground"
    >
      <p>&copy; {{ new Date().getFullYear() }} SUMILIR. All rights reserved.</p>
    </footer> -->
  </div>
</template>