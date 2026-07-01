<script setup>
// =========================
// IMPORTS
// =========================
import { onMounted, computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { Form } from "vee-validate";
import { useUserStore } from "@/stores/user";
import { useAuthStore } from "@/stores/auth";
import Button from "@/components/common/Button.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import TextField from "@/components/forms/TextField.vue";
import ResponsiveImage from "@/components/common/ResponsiveImage.vue";
import {
  getSubscriptionState,
  subscribePushNotifications,
  supportsPushNotifications,
  unsubscribePushNotifications,
} from "@/services/api/push";

// =========================
// STATE & REFS
// =========================
const router = useRouter();
const toast = useToast();
const userStore = useUserStore();
const authStore = useAuthStore();

const merchantsLoading = ref(false);
const isLoggingOut = ref(false);
const pushLoading = ref(false);
const pushEnabled = ref(false);
const pushPermission = ref("default");

const imgLoaded = ref(!!userStore.user?.profile_picture);
const imgError = ref(false);

const showDeleteAccountModal = ref(false);
const deletePassword = ref("");
const deletingAccount = ref(false);

const merchantAccordionOpen = ref(false);

// =========================
// COMPUTED PROPERTIES
// =========================
const isInitialProfileLoading = computed(
  () => userStore.loading && !userStore.user,
);

const user = computed(() => userStore.user || {});

const myMerchants = computed(() => {
  return authStore.allMerchants || [];
});

const hasProfilePictureUrl = computed(() => {
  const url = user.value?.profile_picture;
  return typeof url === "string" && url.trim().length > 0;
});

const addressText = computed(() => {
  const a = userStore.user?.full_address ?? userStore.user?.address;
  return a && String(a).trim() ? String(a).trim() : "-";
});

const hasAddress = computed(() => {
  const a = userStore.user?.full_address ?? userStore.user?.address;
  return !!(a && String(a).trim());
});

const canDeleteAccount = computed(() => {
  return !deletingAccount.value && !!String(deletePassword.value || "").trim();
});

const pushSupported = computed(() => supportsPushNotifications());

const pushStatusMessage = computed(() => {
  if (!pushSupported.value) {
    return "Browser Anda tidak mendukung fitur notifikasi ini.";
  }

  if (pushPermission.value === "denied") {
    return "Izin notifikasi diblokir. Silakan aktifkan dari pengaturan browser Anda.";
  }

  if (pushEnabled.value) {
    return "Aktif: Anda akan menerima pemberitahuan pesanan secara langsung.";
  }

  return "Aktifkan agar perangkat Anda dapat menerima notifikasi pesanan secara langsung.";
});

const pushButtonLabel = computed(() =>
  pushEnabled.value ? "Matikan Notifikasi PWA" : "Aktifkan Notifikasi PWA",
);

const canTogglePush = computed(
  () => pushSupported.value && pushPermission.value !== "denied",
);

const openDeleteAccountModal = () => {
  deletePassword.value = "";
  showDeleteAccountModal.value = true;
};

const menuItems = computed(() => [
  {
    icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
    label: "Edit Profile",
    action: () => router.push("/profile/edit"),
  },
  {
    icon: "M12 2C8.686 2 6 4.686 6 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.314-2.686-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z",
    label: "Alamat Saya",
    action: () => router.push("/profile/address"),
  },
  {
    icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    label: "Ubah Kata Sandi",
    action: () => router.push("/profile/change-password"),
  },
]);

// =========================
// WATCHERS
// =========================
watch(
  () => user.value?.profile_picture,
  () => {
    // Only show image skeleton when we actually have a URL to load.
    imgLoaded.value = false;
    imgError.value = false;
  },
);

// =========================
// METHODS
// =========================
const handleLogout = async () => {
  isLoggingOut.value = true;
  try {
    await authStore.logout();
    router.push("/auth/login");
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      "Gagal logout";
    toast.error(msg);
  } finally {
    isLoggingOut.value = false;
  }
};

const handleDeleteAccount = async () => {
  if (!canDeleteAccount.value) return;

  deletingAccount.value = true;
  try {
    await userStore.deleteAccount({ password: deletePassword.value });
    toast.success("Akun berhasil dihapus");
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      "Gagal menghapus akun";
    toast.error(msg);
    return;
  } finally {
    deletingAccount.value = false;
  }

  // Clear session & local state (logout endpoint may fail because user is already deleted)
  try {
    await authStore.logout({ silent: true, skipRequest: true });
  } catch {
    // ignore
  }

  showDeleteAccountModal.value = false;
  router.push("/auth/login");
};

const refreshPushStatus = async () => {
  const state = await getSubscriptionState();
  pushPermission.value = state.permission;
  pushEnabled.value = state.enabled;
};

const togglePushNotifications = async () => {
  if (!pushSupported.value) {
    toast.error("Browser ini tidak mendukung notifikasi PWA.");
    return;
  }

  pushLoading.value = true;

  try {
    if (pushEnabled.value) {
      await unsubscribePushNotifications();
      toast.success("Notifikasi PWA dimatikan.");
    } else {
      await subscribePushNotifications();
      toast.success("Notifikasi PWA diaktifkan.");
    }

    await refreshPushStatus();
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Gagal mengubah status notifikasi.";
    toast.error(msg);
  } finally {
    pushLoading.value = false;
  }
};

// =========================
// LIFECYCLE
// =========================

onMounted(async () => {
  // Always refresh profile data so the page shows latest info after edits.
  try {
    await userStore.fetchProfile();
  } catch {
    // ignore: error state is handled elsewhere / via UI
  }

  try {
    await refreshPushStatus();
  } catch {
    // ignore: push state is optional
  }

  // Admin tidak perlu memuat data merchant di halaman profil.
  if (authStore.isAdmin) return;
});
</script>

<template>
  <div class="sm:pb-0">
    <!-- Content Container -->
    <div class="px-4 py-4 mx-auto max-w-7xl">
      <!-- DESKTOP LAYOUT -->
      <div class="hidden gap-8 lg:grid lg:grid-cols-12">
        <!-- Left: Profile Card -->
        <div class="lg:col-span-4">
          <div
            class="sticky p-8 bg-white border border-gray-100 shadow-sm rounded-2xl top-24"
          >
            <div class="flex flex-col items-center">
              <div class="relative w-40 h-40">
                <div
                  v-if="
                    isInitialProfileLoading ||
                    (hasProfilePictureUrl && !imgLoaded && !imgError)
                  "
                  class="w-40 h-40 bg-gray-200 border-4 border-white rounded-full shadow-lg animate-pulse"
                />
                <ResponsiveImage
                  v-else-if="hasProfilePictureUrl && !imgError"
                  :src="user.profile_picture"
                  :urls="user.profile_picture_urls"
                  :alt="user.name"
                  loading="lazy"
                  customClass="object-cover w-40 h-40 border-4 border-white rounded-full shadow-lg"
                  :class="imgLoaded ? '' : 'opacity-0'"
                  @load="imgLoaded = true"
                  @error="
                    imgError = true;
                    imgLoaded = true;
                  "
                />
                <span v-else>
                  <svg
                    class="w-40 h-40 p-8 text-gray-300 bg-gray-100 border-4 border-white rounded-full shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                    />
                  </svg>
                </span>
              </div>

              <div
                v-if="isInitialProfileLoading"
                class="w-48 mt-6 bg-gray-200 rounded h-7 animate-pulse"
              />
              <h2 v-else class="mt-6 text-2xl font-bold text-gray-900">
                {{ user.name }}
              </h2>

              <!-- Quick Info -->
              <div class="w-full mt-4 space-y-4">
                <div
                  class="flex items-center min-w-0 gap-3 text-gray-600 flex-nowrap"
                >
                  <svg
                    class="w-5 h-5 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div
                    v-if="isInitialProfileLoading"
                    class="w-40 h-4 bg-gray-200 rounded animate-pulse"
                  />
                  <span v-else class="min-w-0 text-sm truncate">{{
                    user.email
                  }}</span>
                </div>
                <div
                  class="flex items-center min-w-0 gap-3 text-gray-600 flex-nowrap"
                >
                  <svg
                    class="w-5 h-5 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <div
                    v-if="isInitialProfileLoading"
                    class="h-4 bg-gray-200 rounded w-28 animate-pulse"
                  />
                  <span v-else class="min-w-0 text-sm">{{ user.phone }}</span>
                </div>
                <div
                  class="flex items-start min-w-0 gap-3 text-gray-600 flex-nowrap"
                >
                  <svg
                    class="w-5 h-5 mt-0.5 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 1114 0z"
                    />
                  </svg>
                  <div
                    v-if="isInitialProfileLoading"
                    class="w-full h-4 bg-gray-200 rounded animate-pulse"
                  />
                  <span v-else class="min-w-0 text-sm wrap-break-word">{{
                    addressText
                  }}</span>
                </div>

                <div
                  v-if="!isInitialProfileLoading && !hasAddress"
                  class="p-3 text-sm border border-amber-200 rounded-xl bg-amber-50 text-amber-900"
                >
                  Alamat belum diisi.
                  <button
                    class="font-semibold underline underline-offset-2"
                    @click="router.push('/profile/address')"
                  >
                    Isi alamat sekarang
                  </button>
                </div>
              </div>
            </div>

            <Button
              @click="handleLogout"
              class="w-full mt-4"
              variant="danger"
              :loading="isLoggingOut"
            >
              Logout
            </Button>

            <Button
              @click="openDeleteAccountModal"
              class="w-full mt-3"
              variant="danger-outline"
            >
              Hapus Akun
            </Button>
          </div>
        </div>

        <!-- Right: Menu List -->
        <div class="lg:col-span-8">
          <div
            class="p-8 bg-white border border-gray-100 shadow-sm rounded-2xl"
          >
            <h3 class="mb-6 text-xl font-bold text-gray-900">
              Pengaturan Akun
            </h3>
            <div class="space-y-3">
              <button
                v-for="item in menuItems"
                :key="item.label"
                @click="item.action"
                class="flex items-center w-full gap-4 p-5 text-left transition-all bg-gray-50 rounded-xl hover:bg-gray-100 group hover:shadow-md"
              >
                <div
                  class="p-3 transition-colors bg-white rounded-lg group-hover:bg-primary/10"
                >
                  <svg
                    class="w-6 h-6 text-gray-500 transition-colors group-hover:text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      :d="item.icon"
                    />
                  </svg>
                </div>
                <span
                  class="flex-1 font-semibold text-gray-700 group-hover:text-gray-900"
                  >{{ item.label }}</span
                >
                <svg
                  class="w-5 h-5 text-gray-400 transition-colors group-hover:text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <div
                v-if="pushSupported && pushPermission !== 'denied'"
                class="flex items-center justify-between w-full p-5 transition-all bg-gray-50 rounded-xl hover:bg-gray-100 group hover:shadow-md gap-4"
              >
                <div class="flex items-center gap-4 flex-1 min-w-0">
                  <div class="p-3 transition-colors bg-white rounded-lg group-hover:bg-primary/10 shrink-0">
                    <svg class="w-6 h-6 text-gray-500 transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.157V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.157c0 .538-.214 1.055-.595 1.438L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0 pr-2">
                    <span class="font-semibold text-gray-700 group-hover:text-gray-900 block truncate">Notifikasi PWA</span>
                    <p class="text-xs text-gray-500 mt-0.5 leading-snug">{{ pushStatusMessage }}</p>
                  </div>
                </div>
                <button
                  @click="togglePushNotifications"
                  :disabled="pushLoading"
                  class="relative inline-flex items-center h-6 transition-colors rounded-full w-11 shrink-0 focus:outline-none"
                  :class="pushEnabled ? 'bg-merchant-primary' : 'bg-gray-300'"
                >
                  <span
                    class="inline-block w-4 h-4 transition-transform transform bg-white rounded-full"
                    :class="pushEnabled ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
              </div>

              <!-- Accordion for merchant access -->
              <div
                v-if="authStore.isAdmin"
                class="border border-gray-200 rounded-xl bg-gray-50"
              >
                <button
                  class="flex items-center justify-between w-full px-5 py-4 text-left transition-all rounded-xl focus:outline-none hover:shadow-md hover:bg-merchant-primary/10"
                  @click="router.push({ name: 'Admin - Dashboard' })"
                >
                  <span class="font-semibold text-gray-700"
                    >Dashboard Admin</span
                  >
                  <svg
                    class="w-5 h-5 text-gray-400 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              <div v-else class="border border-gray-200 rounded-xl bg-gray-50">
                <button
                  class="flex items-center justify-between w-full px-5 py-4 text-left rounded-xl focus:outline-none"
                  @click="merchantAccordionOpen = !merchantAccordionOpen"
                >
                  <span class="font-semibold text-gray-700"
                    >Akses & Kelola UMKM</span
                  >
                  <svg
                    :class="merchantAccordionOpen ? 'rotate-180' : ''"
                    class="w-5 h-5 text-gray-400 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  v-show="merchantAccordionOpen"
                  class="px-5 pt-2 pb-4 space-y-2"
                >
                  <template v-if="merchantsLoading && !myMerchants.length">
                    <div class="space-y-2">
                      <div
                        class="w-full h-12 bg-gray-200 rounded-lg animate-pulse"
                      />
                      <div
                        class="w-full h-12 bg-gray-200 rounded-lg animate-pulse"
                      />
                    </div>
                  </template>
                  <template v-if="myMerchants.length">
                    <div
                      v-for="m in myMerchants.filter((m) => m && m.id)"
                      :key="m.id"
                    >
                      <button
                        class="flex items-center w-full gap-3 px-4 py-3 mb-1 text-left transition-all bg-white rounded-lg hover:bg-primary/10 group hover:shadow"
                        @click="router.push(`/merchant-center/${m.slug}`)"
                      >
                        <svg
                          class="w-5 h-5 text-merchant-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                        <span class="flex-1 font-medium text-gray-700">
                          {{ m.name }}
                          <span v-if="m.segmentation?.id == 1">(Toko)</span>
                          <span v-else-if="m.segmentation?.id == 2"
                            >(Kuliner)</span
                          >
                          <span v-else>(Jasa)</span></span
                        >
                        <svg
                          class="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </template>
                  <button
                    class="flex items-center w-full gap-3 px-4 py-3 mt-2 text-left transition-all bg-white rounded-lg hover:bg-primary/10 group hover:shadow"
                    @click="router.push('/merchant-register')"
                  >
                    <svg
                      class="w-5 h-5 text-merchant-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span class="flex-1 font-medium text-gray-700"
                      >Buka UMKM Baru</span
                    >
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MOBILE LAYOUT -->
      <div class="lg:hidden">
        <div class="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div class="flex flex-col items-center">
            <div class="relative w-32 h-32">
              <div
                v-if="
                  isInitialProfileLoading ||
                  (hasProfilePictureUrl && !imgLoaded && !imgError)
                "
                class="w-32 h-32 bg-gray-200 border-4 border-white rounded-full shadow-lg animate-pulse"
              />
              <ResponsiveImage
                v-else-if="hasProfilePictureUrl && !imgError"
                :src="user.profile_picture"
                :urls="user.profile_picture_urls"
                :alt="user.name"
                loading="lazy"
                customClass="object-cover w-32 h-32 border-4 border-white rounded-full shadow-lg"
                :class="imgLoaded ? '' : 'opacity-0'"
                @load="imgLoaded = true"
                @error="
                  imgError = true;
                  imgLoaded = true;
                "
              />
              <span v-else>
                <svg
                  class="w-32 h-32 p-8 text-gray-300 bg-gray-100 border-4 border-white rounded-full shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                </svg>
              </span>
            </div>

            <div
              v-if="isInitialProfileLoading"
              class="w-48 mt-2 bg-gray-200 rounded h-7 animate-pulse"
            />
            <h2 v-else class="my-2 text-2xl font-bold text-gray-900">
              {{ user.name }}
            </h2>

            <!-- Quick Info -->
            <div class="w-full mt-2 space-y-2">
              <div
                class="flex items-center min-w-0 gap-3 text-gray-600 flex-nowrap"
              >
                <svg
                  class="w-5 h-5 text-gray-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <div
                  v-if="isInitialProfileLoading"
                  class="w-40 h-4 bg-gray-200 rounded animate-pulse"
                />
                <span v-else class="min-w-0 text-sm truncate">{{
                  user.email
                }}</span>
              </div>
              <div
                class="flex items-center min-w-0 gap-3 text-gray-600 flex-nowrap"
              >
                <svg
                  class="w-5 h-5 text-gray-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <div
                  v-if="isInitialProfileLoading"
                  class="h-4 bg-gray-200 rounded w-28 animate-pulse"
                />
                <span v-else class="min-w-0 text-sm">{{ user.phone }}</span>
              </div>
              <div
                class="flex items-start min-w-0 gap-3 text-gray-600 flex-nowrap"
              >
                <svg
                  class="w-5 h-5 mt-0.5 text-gray-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 1114 0z"
                  />
                </svg>
                <div
                  v-if="isInitialProfileLoading"
                  class="w-full h-4 bg-gray-200 rounded animate-pulse"
                />
                <span v-else class="min-w-0 text-sm wrap-break-word">{{
                  addressText
                }}</span>
              </div>

              <div
                v-if="!isInitialProfileLoading && !hasAddress"
                class="p-3 mt-2 text-sm border border-amber-200 rounded-xl bg-amber-50 text-amber-900"
              >
                Alamat belum diisi.
                <button
                  class="font-semibold underline underline-offset-2"
                  @click="router.push('/profile/address')"
                >
                  Isi alamat sekarang
                </button>
              </div>
            </div>
          </div>

          <Button
            @click="handleLogout"
            variant="danger"
            class="w-full mt-4"
            :loading="isLoggingOut"
          >
            Logout
          </Button>

          <Button
            @click="openDeleteAccountModal"
            variant="danger-outline"
            class="w-full mt-3"
          >
            Hapus Akun
          </Button>
        </div>

        <div
          class="p-5 mt-5 bg-white border border-gray-100 shadow-sm rounded-2xl"
        >
          <h3 class="mb-4 text-lg font-bold text-gray-900">Pengaturan Akun</h3>

          <div class="space-y-3">
            <button
              v-for="item in menuItems"
              :key="item.label"
              @click="item.action"
              class="flex items-center w-full gap-4 p-4 text-left transition-colors bg-gray-50 rounded-xl hover:bg-gray-100 group"
            >
              <div
                class="p-2 transition-colors bg-white rounded-lg group-hover:bg-primary/10"
              >
                <svg
                  class="w-5 h-5 text-gray-500 transition-colors group-hover:text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    :d="item.icon"
                  />
                </svg>
              </div>
              <span
                class="flex-1 font-medium text-gray-700 group-hover:text-gray-900"
                >{{ item.label }}</span
              >
              <svg
                class="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div
              v-if="pushSupported && pushPermission !== 'denied'"
              class="flex items-center justify-between w-full p-4 transition-colors bg-gray-50 rounded-xl hover:bg-gray-100 group gap-3"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="p-2 transition-colors bg-white rounded-lg group-hover:bg-primary/10 shrink-0">
                  <svg class="w-5 h-5 text-gray-500 transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.157V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.157c0 .538-.214 1.055-.595 1.438L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0 pr-1">
                  <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900 block truncate">Notifikasi PWA</span>
                  <p class="text-[10px] text-gray-500 mt-0.5 leading-tight">{{ pushStatusMessage }}</p>
                </div>
              </div>
              <button
                @click="togglePushNotifications"
                :disabled="pushLoading"
                class="relative inline-flex items-center h-6 transition-colors rounded-full w-11 shrink-0 focus:outline-none"
                :class="pushEnabled ? 'bg-merchant-primary' : 'bg-gray-300'"
              >
                <span
                  class="inline-block w-4 h-4 transition-transform transform bg-white rounded-full"
                  :class="pushEnabled ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- Accordion for merchant access (mobile) -->
            <div
              v-if="authStore.isAdmin"
              class="border border-gray-200 rounded-xl bg-gray-50"
            >
              <button
                class="flex items-center justify-between w-full px-4 py-4 text-left rounded-xl focus:outline-none"
                @click="router.push({ name: 'Admin - Dashboard' })"
              >
                <span class="font-semibold text-gray-700">Dashboard Admin</span>
                <svg
                  class="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div v-else class="border border-gray-200 rounded-xl bg-gray-50">
              <button
                class="flex items-center justify-between w-full px-4 py-4 text-left rounded-xl focus:outline-none"
                @click="merchantAccordionOpen = !merchantAccordionOpen"
              >
                <span class="font-semibold text-gray-700"
                  >Akses & Kelola UMKM</span
                >
                <svg
                  :class="merchantAccordionOpen ? 'rotate-180' : ''"
                  class="w-5 h-5 text-gray-400 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <div
                v-show="merchantAccordionOpen"
                class="px-4 pt-1 pb-4 space-y-2"
              >
                <template v-if="myMerchants.length">
                  <div
                    v-for="m in myMerchants.filter((m) => m && m.id)"
                    :key="m.id"
                  >
                    <button
                      class="flex items-center w-full gap-3 px-4 py-3 text-left transition-all bg-white rounded-lg hover:bg-primary/10 group"
                      @click="router.push(`/merchant-center/${m.slug}`)"
                    >
                      <svg
                        class="w-5 h-5 text-merchant-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                      <span class="flex-1 font-medium text-gray-700 truncate"
                        >{{ m.name }}
                        <span v-if="m.segmentation?.id == 1">(Toko)</span>
                        <span v-else-if="m.segmentation?.id == 2"
                          >(Kuliner)</span
                        >
                        <span v-else>(Jasa)</span>
                      </span>
                      <svg
                        class="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </template>

                <button
                  class="flex items-center w-full gap-3 px-4 py-3 mt-2 text-left transition-all bg-white rounded-lg hover:bg-primary/10 group"
                  @click="router.push('/merchant-register')"
                >
                  <svg
                    class="w-5 h-5 text-merchant-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span class="flex-1 font-medium text-gray-700"
                    >Buka UMKM +</span
                  >
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Account Confirmation -->
    <ResponsiveModal
      :show="showDeleteAccountModal"
      @close="showDeleteAccountModal = false"
      title="Hapus Akun"
    >
      <div class="space-y-4">
        <div
          class="p-4 border rounded-xl bg-danger-background/10 border-danger-foreground/20"
        >
          <div class="font-semibold text-danger-foreground">
            Tindakan ini permanen
          </div>
          <p class="mt-1 text-sm text-gray-700">
            Akun Anda akan dihapus, termasuk semua UMKM dan data terkait.
          </p>
        </div>

        <Form class="space-y-2" @submit="handleDeleteAccount">
          <TextField
            name="delete_account_password"
            label="Masukkan kata sandi untuk konfirmasi"
            type="password"
            autocomplete="current-password"
            placeholder="Kata sandi"
            variant="muted"
            :alignWithPassword="false"
            v-model="deletePassword"
          />
        </Form>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <Button
            variant="muted-outline"
            class="w-full"
            @click="showDeleteAccountModal = false"
            :disabled="deletingAccount"
          >
            Batal
          </Button>
          <Button
            class="w-full"
            variant="danger"
            @click="handleDeleteAccount"
            :loading="deletingAccount"
            :disabled="!canDeleteAccount"
          >
            Hapus Akun
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>
