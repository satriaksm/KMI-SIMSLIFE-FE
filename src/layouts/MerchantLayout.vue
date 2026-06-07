<script setup>
// filepath: /var/www/html/KMI-SIMSLIFE-FE/src/layouts/MerchantLayout.vue
import { ref, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import Button from "@/components/common/Button.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import LogoWithText from "@/assets/icons/Merchant-with-Text.png";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const isOpen = ref(false);
const showLogoutModal = ref(false);
const showMerchantSwitcher = ref(false);

const allMerchants = computed(() => authStore.allMerchants);

// ✅ Get merchantSlug dari route params (URL menggunakan slug)
const currentMerchantSlug = computed(() => {
  if (!route || !route.params || typeof route.params !== "object") {
    return authStore.merchantSlug;
  }

  return route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : authStore.merchantSlug;
});

// ✅ Get merchant data berdasarkan merchantId di route
const currentMerchant = computed(() => {
  const merchantSlug = currentMerchantSlug.value;
  if (!merchantSlug) return null;

  return authStore.getMerchantBySlug(merchantSlug);
});

// ✅ Display merchant name & type dari current merchant (bukan active merchant)
const merchantName = computed(() => {
  return currentMerchant.value?.name || authStore.user?.name || "Merchant";
});

const merchantType = computed(() => {
  return currentMerchant.value?.segmentation?.name || "UMKM";
});

const merchantsCount = computed(() => authStore.merchantsCount);

const userInitial = computed(() => {
  const name = merchantName.value;
  return name.charAt(0).toUpperCase();
});

const showMerchantSelector = computed(() => merchantsCount.value > 1);

const getMerchantInitial = (name) =>
  name ? name.charAt(0).toUpperCase() : "?";

const getMerchantStatusColor = (status) => {
  if (status === "approved") return "bg-green-400";
  if (status === "pending") return "bg-yellow-400";
  return "bg-gray-400";
};

const switchMerchant = (slug) => {
  if (slug === currentMerchantSlug.value) {
    showMerchantSwitcher.value = false;
    return;
  }
  authStore.setSelectedMerchantSlug(slug);
  showMerchantSwitcher.value = false;
  router.push(`/merchant-center/${slug}/dashboard`);
};

// ✅ Watch route changes untuk update active merchant
watch(
  () => (route && route.params ? route.params : {}),
  (params) => {
    if (!params?.merchantSlug) return;
    const merchant = authStore.getMerchantBySlug(String(params.merchantSlug));
    if (!merchant?.slug) return;
  },
  { immediate: true },
);

// ✅ Menu items berdasarkan tipe merchant
const menuItems = computed(() => {
  const segmentationId = Number(currentMerchant.value?.segmentation?.id);
  const isJasaMerchant = segmentationId === 3;

  return [
    {
      label: "Dashboard",
      icon: "pi-chart-bar",
      route: `/merchant-center/${currentMerchantSlug.value}/dashboard`,
    },

    // 🛒 Pesanan Masuk — hanya untuk Toko/Kuliner
    ...(isJasaMerchant ? [] : [{
      label: "Pesanan Masuk",
      icon: "pi-shopping-bag",
      route: `/merchant-center/${currentMerchantSlug.value}/orders`,
    }]),

    // 📊 Laporan — semua merchant
    {
      label: "Laporan",
      icon: "pi-file",
      route: `/merchant-center/${currentMerchantSlug.value}/reports`,
    },

    // 📦 Produk / Jasa
    isJasaMerchant
      ? {
          label: "Jasa",
          icon: "pi-briefcase",
          route: `/merchant-center/${currentMerchantSlug.value}/jasas`,
        }
      : {
          label: "Produk",
          icon: "pi-box",
          route: `/merchant-center/${currentMerchantSlug.value}/products`,
        },

    // 🔧 History Layanan Jasa — hanya untuk Jasa
    ...(isJasaMerchant ? [{
      label: "History Layanan Jasa",
      icon: "pi-history",
      route: `/merchant-center/${currentMerchantSlug.value}/bookings`,
    }] : []),

    // 💬 Konsultasi — hanya untuk Jasa
    ...(isJasaMerchant ? [{
      label: "Konsultasi",
      icon: "pi-comments",
      route: `/merchant-center/${currentMerchantSlug.value}/consultations`,
    }] : []),

    // 🎫 Voucher — semua merchant
    {
      label: "Voucher",
      icon: "pi-tag",
      route: `/merchant-center/${currentMerchantSlug.value}/vouchers`,
    },

    // 📅 Events — semua merchant
    {
      label: "Events",
      icon: "pi-calendar",
      route: `/merchant-center/${currentMerchantSlug.value}/events`,
    },
  ];
});

const logout = async () => {
  try {
    await authStore.logout();
    showLogoutModal.value = false;
    router.push("/login");
  } catch (error) {
    console.error("Logout failed:", error);
    showLogoutModal.value = false;
  }
};

const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const closeSidebar = () => {
  isOpen.value = false;
};

const navigateTo = (routePath) => {
  // Guard: jangan navigasi jika routePath tidak valid
  if (!routePath || typeof routePath !== 'string') return;
  // Guard: jika route untuk merchant tapi slug kosong, abort
  if (routePath.includes('/merchant-center/') && !currentMerchantSlug.value) {
    return;
  }
  router.push(routePath);
  if (window.innerWidth < 1024) {
    closeSidebar();
  }
};

const isActive = (routePath) => {
  if (route.path === routePath) {
    return true;
  }

  const currentPath = route.path;
  const menuPath = routePath;

  if (currentPath.startsWith(menuPath)) {
    return true;
  }

  return false;
};

defineExpose({
  toggleSidebar,
});
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Backdrop for Mobile Only -->
    <transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        @click="closeSidebar"
        class="fixed inset-0 z-40 bg-black/50 sm:hidden"
      ></div>
    </transition>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed top-0 left-0 h-full bg-white shadow-sm z-40 transition-all duration-300 flex flex-col',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'sm:translate-x-0',
        isOpen ? 'w-64' : 'w-64 sm:w-16',
      ]"
    >
      <!-- Header -->
      <div
        :class="[
          'flex items-center h-16',
          isOpen
            ? 'justify-between px-4'
            : 'justify-between px-4 sm:justify-center',
        ]"
      >
        <router-link to="/">
          <img
            :src="LogoWithText"
            alt="SUMILIR"
            :class="[
              'h-8 transition-all duration-300',
              isOpen
                ? 'ms-3 opacity-100'
                : 'sm:opacity-0 sm:h-0 sm:ms-0 ms-3',
            ]"
          />
        </router-link>

        <!-- Hamburger Button -->
        <button
          @click="toggleSidebar"
          class="flex items-center justify-center w-8 h-8 transition rounded-full hover:bg-gray-100"
        >
          <i
            :class="[
              'pi text-gray-600 transition-transform duration-300',
              isOpen ? 'pi-times' : 'pi-bars',
            ]"
          ></i>
        </button>
      </div>

      <!-- Menu Items -->
      <nav class="flex-1 px-3 py-2 overflow-y-auto">
        <ul class="space-y-1">
          <li v-for="item in menuItems" :key="item.route">
            <button
              @click="navigateTo(item.route)"
              :class="[
                'w-full flex items-center rounded-lg text-sm font-medium transition-all',
                isOpen
                  ? 'px-4 py-3 gap-3'
                  : 'px-4 py-3 gap-3 sm:px-3 sm:justify-center sm:gap-0',
                isActive(item.route)
                  ? 'bg-merchant-primary/10 text-merchant-primary'
                  : 'text-gray-700 hover:bg-gray-50',
              ]"
              :title="!isOpen ? item.label : ''"
            >
              <i
                :class="[
                  'pi text-lg shrink-0',
                  item.icon,
                  isActive(item.route)
                    ? 'text-merchant-primary'
                    : 'text-gray-600',
                ]"
              ></i>
              <span
                :class="[
                  'transition-all duration-300',
                  isOpen
                    ? 'opacity-100 w-auto'
                    : 'opacity-100 w-auto sm:opacity-0 sm:w-0 sm:overflow-hidden sm:hidden',
                ]"
              >
                {{ item.label }}
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- Footer -->
      <div class="p-3 space-y-2 border-t border-gray-200">
        <!-- Logout -->
        <button
          @click="logout"
          :class="[
            'w-full flex items-center rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition',
            isOpen
              ? 'px-4 py-3 gap-3'
              : 'px-4 py-3 gap-3 sm:justify-center sm:px-3 sm:gap-0',
          ]"
          :title="!isOpen ? 'Log Out' : ''"
        >
          <i class="text-lg shrink-0 pi pi-sign-out"></i>
          <span
            :class="[
              'transition-all duration-300',
              isOpen
                ? 'opacity-100 w-auto'
                : 'opacity-100 w-auto sm:opacity-0 sm:w-0 sm:overflow-hidden',
            ]"
          >
            Log Out
          </span>
        </button>

        <!-- Profile Card -->
        <div v-if="isOpen" class="mt-2 overflow-hidden rounded-xl">
          <!-- Merchant info header -->
          <div
            class="p-3 text-white bg-linear-to-r from-merchant-primary to-merchant-primary/80"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center w-10 h-10 text-lg font-bold rounded-full shrink-0 bg-white/20"
              >
                {{ userInitial }}
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate" :title="merchantName">
                  {{ merchantName }}
                </p>
                <p class="text-xs truncate opacity-90" :title="merchantType">
                  {{ merchantType }}
                </p>
              </div>

              <!-- Profile btn -->
              <button
                @click="
                  navigateTo(`/merchant-center/${currentMerchantSlug}/profile`)
                "
                class="flex items-center justify-center transition rounded-full w-7 h-7 shrink-0 hover:bg-white/20"
                title="Profil Merchant"
              >
                <i class="text-sm pi pi-user"></i>
              </button>

              <!-- Switcher toggle -->
              <button
                v-if="showMerchantSelector"
                @click="showMerchantSwitcher = !showMerchantSwitcher"
                class="flex items-center justify-center transition rounded-full w-7 h-7 shrink-0 hover:bg-white/20"
                :title="showMerchantSwitcher ? 'Tutup' : 'Ganti Merchant'"
              >
                <i
                  :class="[
                    'pi text-sm transition-transform duration-200',
                    showMerchantSwitcher ? 'pi-chevron-up' : 'pi-chevron-down',
                  ]"
                ></i>
              </button>
            </div>
          </div>

          <!-- Merchant switcher list -->
          <transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-60"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 max-h-60"
            leave-to-class="opacity-0 max-h-0"
          >
            <div
              v-if="showMerchantSwitcher"
              class="overflow-y-auto bg-white border border-gray-200 max-h-60"
            >
              <p
                class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1"
              >
                Pilih Merchant
              </p>
              <button
                v-for="merchant in allMerchants"
                :key="merchant.id"
                @click="switchMerchant(merchant.slug)"
                :class="[
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left transition hover:bg-gray-50',
                  merchant.slug === currentMerchantSlug
                    ? 'bg-merchant-primary/5'
                    : '',
                ]"
              >
                <div
                  :class="[
                    'flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold text-white',
                    merchant.slug === currentMerchantSlug
                      ? 'bg-merchant-primary'
                      : 'bg-gray-400',
                  ]"
                >
                  {{ getMerchantInitial(merchant.name) }}
                </div>

                <div class="flex-1 min-w-0">
                  <p
                    :class="[
                      'text-sm font-medium truncate',
                      merchant.slug === currentMerchantSlug
                        ? 'text-merchant-primary'
                        : 'text-gray-800',
                    ]"
                  >
                    {{ merchant.name }}
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    {{ merchant.segmentation?.name || "UMKM" }}
                  </p>
                </div>

                <span
                  :class="[
                    'w-2 h-2 rounded-full shrink-0',
                    getMerchantStatusColor(merchant.status),
                  ]"
                  :title="merchant.status"
                ></span>

                <i
                  v-if="merchant.slug === currentMerchantSlug"
                  class="text-xs pi pi-check text-merchant-primary shrink-0"
                ></i>
              </button>
            </div>
          </transition>
        </div>

        <!-- Collapsed State (Profile only icon) -->
        <div v-if="!isOpen" class="flex flex-col items-center gap-1">
          <button
            @click="
              navigateTo(`/merchant-center/${currentMerchantSlug}/profile`)
            "
            class="flex items-center justify-center w-full p-3 transition rounded-lg bg-merchant-primary/10 hover:bg-merchant-primary/20"
            :title="`${merchantName} — Profil`"
          >
            <span class="text-lg font-bold text-merchant-primary">
              {{ userInitial }}
            </span>
          </button>

          <!-- Show dots if multiple merchants -->
          <div v-if="showMerchantSelector" class="flex gap-1">
            <span
              v-for="m in allMerchants.slice(0, 4)"
              :key="m.id"
              :class="[
                'w-1.5 h-1.5 rounded-full transition',
                m.slug === currentMerchantSlug
                  ? 'bg-merchant-primary'
                  : 'bg-gray-300',
              ]"
            ></span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div
      :class="[
        'flex-1 min-w-0 min-h-screen transition-all duration-300',
        !isOpen ? 'sm:ml-16' : 'sm:ml-64',
      ]"
    >
      <router-view :key="$route.fullPath" v-slot="{ Component }">
        <transition
          name="fade"
          mode="out-in"
          enter-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <component :is="Component" @toggle-sidebar="toggleSidebar" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style scoped>
nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>