<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "vue-toastification";
import { Form } from "vee-validate";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import LeafletMap from "@/components/LeafletMap.vue";
import { useMerchants } from "@/composables/useMerchants";
import AppButton from "@/components/common/Button.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import TextField from "@/components/forms/TextField.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const { fetchMerchantProfile, deleteMerchant } = useMerchants();

// Emit untuk toggle sidebar dari parent layout
const emit = defineEmits(["toggle-sidebar"]);
const merchantSlug = computed(() => {
  const slug =
    route.params.merchantSlug ??
    authStore.merchantSlug ??
    authStore.activeMerchant?.slug ??
    null;
  return slug ? String(slug) : null;
});
// Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    label: "Profil UMKM",
  },
]);
const hasCoordinates = computed(() => {
  return (
    Number.isFinite(Number(latitude.value)) &&
    Number.isFinite(Number(longitude.value))
  );
});

function toNumberOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

const allDaysClosed = computed(() => {
  return (
    operationalHours.value.length > 0 &&
    operationalHours.value.every((day) => day.hours === "Tutup")
  );
});
function formatFullAddress(addr) {
  if (!addr) return "-";

  const detail = addr?.detail?.trim?.() || "";
  const village = addr?.village?.name || "";
  const district = addr?.district?.name || "";
  const city = addr?.city?.name || "";
  const province = addr?.province?.name || "";

  const parts = [detail, village, district, city, province].filter(
    (p) => typeof p === "string" && p.trim() !== "",
  );

  return parts.length ? parts.join(", ") : "-";
}
// Mock merchant name
const merchantName = ref("");

const isLoading = ref(true);
const latitude = ref(null);
const longitude = ref(null);
// Mock data
const merchantInfo = ref({
  name: "",
  contact: "",
  description: "",
  address: "",
  logo: "",
  coverImage: "",
});
const operationalHours = ref([]);

// Delete merchant UI state
const showDeleteMerchantModal = ref(false);
const deleteMerchantConfirmText = ref("");
const deletingMerchant = ref(false);

const merchantDisplayName = computed(() => {
  return (
    merchantName.value ||
    merchantInfo.value?.name ||
    authStore.activeMerchant?.name ||
    ""
  );
});

const canDeleteMerchant = computed(() => {
  const expected = String(merchantDisplayName.value || "").trim();
  const typed = String(deleteMerchantConfirmText.value || "").trim();
  if (!expected) return false;
  return !deletingMerchant.value && typed === expected;
});

const openDeleteMerchantModal = () => {
  deleteMerchantConfirmText.value = "";
  showDeleteMerchantModal.value = true;
};

const handleDeleteMerchant = async () => {
  if (!merchantSlug.value || !canDeleteMerchant.value) return;

  deletingMerchant.value = true;
  try {
    await deleteMerchant(merchantSlug.value);
    showDeleteMerchantModal.value = false;

    // Refresh auth snapshot so the app no longer thinks a merchant exists
    try {
      await authStore.initAuth();
    } catch {
      // ignore
    }

    router.push("/profile");
  } catch (error) {
    // Error handling is done in the composable, so we can ignore it here
  } finally {
    deletingMerchant.value = false;
  }
};

const hasLogo = computed(() => {
  const val = merchantInfo.value?.logo;
  return typeof val === "string" && val.trim().length > 0;
});

const hasCover = computed(() => {
  const val = merchantInfo.value?.coverImage;
  return typeof val === "string" && val.trim().length > 0;
});

const hasDescription = computed(() => {
  const val = merchantInfo.value?.description;
  if (typeof val !== "string") return false;
  const t = val.trim();
  return t.length > 0 && t !== "-";
});

const needsMerchantCompletion = computed(
  () =>
    !isLoading.value &&
    (!hasCover.value ||
      !hasLogo.value ||
      !hasDescription.value ||
      allDaysClosed.value),
);

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

onMounted(async () => {
  isLoading.value = true;

  try {
    if (!merchantSlug.value) {
      throw new Error("Missing merchantSlug");
    }

    const data = await fetchMerchantProfile(merchantSlug.value);

    merchantName.value = data.name;

    const primaryAddress =
      data?.primary_address ?? data?.primaryAddress ?? null;

    const latRaw = primaryAddress?.latitude ?? data?.latitude ?? null;
    const lngRaw = primaryAddress?.longitude ?? data?.longitude ?? null;

    latitude.value = toNumberOrNull(latRaw);
    longitude.value = toNumberOrNull(lngRaw);

    merchantInfo.value = {
      name: data.name,
      contact: data.phone,
      description:
        typeof data?.description === "string" ? data.description.trim() : "",
      address: formatFullAddress(primaryAddress),
      logo:
        typeof data?.logo_url === "string" && data.logo_url.trim()
          ? data.logo_url
          : "",
      coverImage:
        typeof data?.banner_url === "string" && data.banner_url.trim()
          ? data.banner_url
          : "",
    };

    const hours = data.operational_hours ?? {};

    operationalHours.value = DAYS.map((day) => {
      const item = hours[day.key];

      if (!item || item.is_open === false) {
        return {
          name: day.label,
          hours: "Tutup",
        };
      }

      return {
        name: day.label,
        hours: `[${item.open} - ${item.close}]`,
      };
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Failed load merchant profile", error);
    }
  } finally {
    isLoading.value = false;
  }
});

const goToEdit = () => {
  if (merchantSlug.value) {
    router.push({
      name: "Merchant - Profile Edit",
      params: { merchantSlug: merchantSlug.value },
    });
    return;
  }

  router.push({ name: "Merchant Profile - Edit" });
};
</script>

<template>
  <div class="">
    <!-- Header - FIXED (sama seperti halaman produk) -->
    <div
      class="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <!-- Hamburger Button (Mobile) -->
        <button
          @click="$emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background sm:hidden"
        >
          <i class="pi pi-bars text-muted-foreground"></i>
        </button>

        <div>
          <!-- Desktop: Show breadcrumb -->
          <div class="hidden sm:block">
            <Breadcrumb :items="breadcrumbItems" :merchantId="merchantSlug" />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              <span v-if="isLoading">Memuat...</span>
              <span v-else>
                {{ merchantName }}
              </span>
            </p>
          </div>

          <!-- Mobile: Show simple title -->
          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-merchant-primary">
              Profil UMKM
            </h1>
            <p class="text-xs text-muted-foreground">
              <span v-if="isLoading">Memuat...</span>
              <span v-else>
                {{ merchantName }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Desktop Edit Button -->
      <div class="hidden gap-3 sm:flex">
        <AppButton
          @click="openDeleteMerchantModal"
          variant="danger-outline"
          size="md"
        >
          <i class="pi pi-trash"></i>
          <span>Hapus UMKM</span>
        </AppButton>

        <AppButton @click="goToEdit" variant="merchant" size="md">
          <i class="pi pi-pencil"></i>
          <span>Edit UMKM</span>
        </AppButton>
      </div>
    </div>

    <!-- Spacer untuk kompensasi fixed header -->
    <div class="h-24 sm:h-0"></div>

    <div
      v-if="isLoading"
      class="flex justify-center items-center min-h-[80dvh] w-full rounded-lg mx-0"
    >
      <div
        class="w-10 h-10 border-4 rounded-full border-muted-foreground border-t-merchant-primary animate-spin"
      ></div>
    </div>

    <!-- Content -->
    <div v-else class="px-4 pb-0 sm:pb-6 sm:px-6">
      <!-- Merchant completion banner -->
      <div
        v-if="needsMerchantCompletion"
        class="p-4 mb-3 border rounded-2xl sm:mx-0 bg-amber-50 border-amber-200"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-5 h-5 mt-0.5 text-amber-700 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
            />
          </svg>
          <div class="flex-1">
            <div class="font-semibold text-amber-900">
              Profil UMKM belum lengkap
            </div>
            <div class="mt-1 text-sm text-amber-800">
              <span v-if="!hasLogo">Logo belum diisi. </span>

              <span v-if="!hasCover">Banner belum diisi. </span>
              <span v-if="!hasCover && (!hasLogo || !hasDescription)"> </span>
              <span v-if="!hasLogo && !hasDescription"> </span>
              <span v-if="!hasDescription">Tentang UMKM belum diisi. </span>
              <span v-if="allDaysClosed"
                >Jam operasional belum diatur atau semua hari tutup.
              </span>
              <span> Lengkapi agar UMKM terlihat lebih meyakinkan.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cover & Logo -->
      <div class="relative mb-2 overflow-visible bg-white sm:mb-4 sm:shadow-sm">
        <div
          class="relative w-full overflow-hidden rounded-2xl aspect-24/9 lg:aspect-4/1"
        >
          <img
            v-if="hasCover"
            :src="merchantInfo.coverImage"
            alt="Cover"
            class="absolute inset-0 object-cover w-full h-full"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted-background to-muted-foreground"
            aria-hidden="true"
          >
            <span>
              <svg
                class="w-12 h-12 text-white sm:w-16 sm:h-16"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 19V5h14v14H5zm8-7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-6 7l3-4 2.5 3 3.5-5 4 6H7z"
                />
              </svg>
            </span>
          </div>
        </div>

        <div class="absolute -bottom-10 sm:-bottom-12 left-10 sm:left-8">
          <img
            v-if="hasLogo"
            :src="merchantInfo.logo"
            alt="Logo"
            class="object-cover w-24 h-24 border-4 border-white shadow-lg rounded-2xl sm:w-32 sm:h-32"
          />
          <span v-else>
            <svg
              class="w-24 h-24 p-4 text-gray-300 bg-gray-100 border-4 border-white shadow-lg rounded-2xl sm:w-32 sm:h-32 sm:p-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z"
              />
            </svg>
          </span>
        </div>
      </div>

      <!-- Info Content -->
      <div class="pt-14 sm:pt-16">
        <div
          class="p-4 mb-2 space-y-6 bg-white shadow-sm sm:mb-4 sm:p-6 sm:space-y-8 rounded-2xl"
        >
          <!-- Title tanpa background (sama seperti "Produk") -->
          <h2 class="text-xl font-bold sm:text-2xl text-merchant-primary">
            Informasi UMKM
          </h2>

          <!-- Grid Layout for Desktop -->
          <div
            class="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6"
          >
            <!-- Nama UMKM -->
            <div>
              <label
                class="block mb-2 text-sm font-medium sm:text-base text-merchant-primary"
              >
                Nama UMKM
              </label>
              <div
                class="p-3 text-sm text-gray-700 bg-gray-100 rounded-xl sm:p-4 sm:text-base"
              >
                {{ merchantInfo.name }}
              </div>
            </div>

            <!-- Kontak -->
            <div>
              <label
                class="block mb-2 text-sm font-medium sm:text-base text-merchant-primary"
              >
                Kontak
              </label>
              <div
                class="p-3 text-sm text-gray-700 bg-gray-100 rounded-xl sm:p-4 sm:text-base"
              >
                {{ merchantInfo.contact }}
              </div>
            </div>

            <!-- Tentang - Full Width -->
            <div class="sm:col-span-2">
              <label
                class="block mb-2 text-sm font-medium sm:text-base text-merchant-primary"
              >
                Tentang
              </label>
              <div
                class="p-3 text-sm leading-relaxed text-gray-700 bg-gray-100 rounded-xl sm:p-4 sm:text-base"
              >
                {{ merchantInfo.description || "-" }}
              </div>
            </div>

            <!-- Lokasi - Full Width -->
            <div class="sm:col-span-2">
              <label
                class="block mb-2 text-sm font-medium sm:text-base text-merchant-primary"
              >
                Lokasi
              </label>
              <div
                class="relative h-48 overflow-hidden bg-gray-100 rounded-xl sm:h-64 lg:h-80"
              >
                <!-- MAP -->
                <div v-if="hasCoordinates" class="absolute inset-0">
                  <LeafletMap
                    :lat="latitude"
                    :lng="longitude"
                    :zoom="15"
                    variant="merchant"
                    :readonly="true"
                  />
                </div>

                <!-- PLACEHOLDER -->
                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-green-200 to-green-400"
                >
                  <div class="text-center">
                    <svg
                      class="w-12 h-12 mx-auto mb-2 text-red-600 sm:w-16 sm:h-16"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                      />
                    </svg>
                    <p class="text-sm font-medium text-gray-700 sm:text-base">
                      {{ merchantInfo.address }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Alamat (selalu tampil, termasuk saat map tampil) -->
              <div class="p-3 mt-3 bg-gray-100 rounded-xl sm:p-4">
                <p class="text-sm text-gray-700 sm:text-base">
                  {{ merchantInfo.address }}
                </p>
              </div>
            </div>
          </div>

          <!-- Jam Operasional -->
          <div class="pt-4">
            <h3 class="mb-4 text-lg font-bold sm:text-xl text-merchant-primary">
              Jam Operasional
            </h3>
            <div
              class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4"
            >
              <div
                v-for="day in operationalHours"
                :key="day.name"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-xl sm:p-4"
              >
                <span
                  class="px-4 py-2 bg-merchant-primary text-white rounded-full text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[110px] text-center"
                >
                  {{ day.name }}
                </span>
                <span
                  class="ml-3 text-sm font-medium text-gray-700 sm:text-base"
                  >{{ day.hours }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Edit Button (bawah) -->
        <div class="justify-end hidden gap-3 mt-4 sm:flex">
          <AppButton
            @click="openDeleteMerchantModal"
            variant="danger-outline"
            size="md"
          >
            <i class="pi pi-trash"></i>
            <span>Hapus UMKM</span>
          </AppButton>

          <AppButton @click="goToEdit" variant="merchant" size="md">
            <i class="pi pi-pencil"></i>
            <span>Edit UMKM</span>
          </AppButton>
        </div>

        <!-- Mobile Edit Button - Fixed at Bottom -->
        <div
          class="fixed bottom-0 left-0 right-0 z-20 p-4 bg-white border-t border-gray-200 sm:hidden"
        >
          <div class="grid grid-cols-2 gap-3">
            <AppButton
              @click="openDeleteMerchantModal"
              variant="danger-outline"
            >
              <i class="pi pi-trash"></i>
              <span>Hapus</span>
            </AppButton>
            <AppButton @click="goToEdit" variant="merchant">
              <i class="pi pi-pencil"></i>
              <span>Edit</span>
            </AppButton>
          </div>
        </div>

        <!-- Spacer for Mobile Fixed Button -->
        <div class="h-20 sm:h-0"></div>
      </div>
    </div>

    <!-- Delete Merchant Confirmation -->
    <ResponsiveModal
      :show="showDeleteMerchantModal"
      @close="showDeleteMerchantModal = false"
      title="Hapus UMKM"
    >
      <div class="space-y-4">
        <div
          class="p-4 border rounded-xl bg-danger-background/10 border-danger-foreground/20"
        >
          <div class="font-semibold text-danger-foreground">
            Tindakan ini permanen
          </div>
          <p class="mt-1 text-sm text-gray-700">
            UMKM ini akan dihapus beserta produk/jasa/voucher yang terkait.
          </p>
        </div>

        <Form class="space-y-2" @submit="() => {}">
          <TextField
            name="merchant_delete_confirm"
            label="Ketik nama UMKM untuk konfirmasi"
            :placeholder="merchantDisplayName || 'Nama UMKM'"
            variant="muted"
            :alignWithPassword="false"
            v-model="deleteMerchantConfirmText"
          />
          <p class="text-xs text-gray-500">
            Nama harus sama persis:
            <span class="font-semibold">{{ merchantDisplayName }}</span>
          </p>
        </Form>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <AppButton
            variant="muted-outline"
            class="w-full"
            @click="showDeleteMerchantModal = false"
            :disabled="deletingMerchant"
          >
            Batal
          </AppButton>
          <AppButton
            variant="danger"
            class="w-full"
            @click="handleDeleteMerchant"
            :loading="deletingMerchant"
            :disabled="!canDeleteMerchant"
          >
            Hapus UMKM
          </AppButton>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
/* Custom scrollbar for desktop */
@media (min-width: 640px) {
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
}
</style>
