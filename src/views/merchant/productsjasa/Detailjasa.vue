<script setup>
// filepath: /var/www/html/KMI-SIMSLIFE-FE/src/views/merchant/productsjasa/Detailjasa.vue

import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue"; // ✅ ADD
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { getImageUrl } from "@/libs/getImageUrl.js";
import { useJasa } from "@/composables/useJasa";
import { useAuthStore } from "@/stores/auth";

const { fetchJasaDetail } = useJasa();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : (authStore.merchantSlug ?? null);
});

// Some owner-view calls may still require merchantId
const currentMerchantId = computed(() => {
  const slug = currentMerchantSlug.value;
  if (slug) {
    const merchant = authStore.getMerchantBySlug(slug);
    return merchant?.id ?? authStore.merchantId ?? null;
  }
  return authStore.merchantId ?? null;
});

// ✅ Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    label: "Jasa",
    path: `/merchant-center/${currentMerchantSlug.value}/jasas`,
  },
  {
    label: "Detail Jasa",
  },
]);

const loading = ref(false);
const jasa = ref(null);
const currentImageIndex = ref(-1);
const showAddOnsModal = ref(false);

// Lock body scroll when modal is open
useBodyScrollLock(showAddOnsModal);

// (removed unused `breadcrumbs` constant)

// ✅ Computed Properties
const coverImage = computed(() => {
  if (!jasa.value?.images) return null;
  return jasa.value.images.find((img) => img.is_cover) || jasa.value.images[0];
});

const currentImage = computed(() => {
  if (!jasa.value?.images) return null;
  if (currentImageIndex.value < 0) return null;
  return jasa.value.images[currentImageIndex.value];
});

const priceRange = computed(() => {
  if (!jasa.value?.variants || jasa.value.variants.length === 0) {
    return "Rp 0";
  }

  const prices = jasa.value.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return formatPrice(min);
  }

  return `${formatPrice(min)} - ${formatPrice(max)}`;
});

const stockRange = computed(() => {
  if (!jasa.value?.variants || jasa.value.variants.length === 0) {
    return { min: 0, max: 0, total: 0, display: "0" };
  }

  const stocks = jasa.value.variants.map((v) => v.stock);
  const min = Math.min(...stocks);
  const max = Math.max(...stocks);
  const total = stocks.reduce((sum, stock) => sum + stock, 0);

  return {
    min,
    max,
    total,
    display: min === max ? `${min}` : `${min} - ${max}`,
  };
});

// ✅ Add-ons
const totalAddOnGroups = computed(() => {
  return jasa.value?.addonGroups?.length || 0;
});

const totalAddOnOptions = computed(() => {
  if (!jasa.value?.addonGroups) return 0;
  return jasa.value.addonGroups.reduce(
    (total, group) => total + (group.options?.length || 0),
    0,
  );
});

const addOnPriceRange = computed(() => {
  if (!jasa.value?.addonGroups || jasa.value.addonGroups.length === 0) {
    return null;
  }

  const prices = jasa.value.addonGroups.flatMap((group) =>
    (group.options || []).map((opt) => opt.addon_price || 0),
  );
  const nonZeroPrices = prices.filter((p) => p > 0);

  if (nonZeroPrices.length === 0) return null;

  const min = Math.min(...nonZeroPrices);
  const max = Math.max(...nonZeroPrices);

  if (min === max) {
    return `+${formatPrice(min)}`;
  }

  return `+${formatPrice(min)} - ${formatPrice(max)}`;
});

const resolveJasaImageSrc = (image) => {
  // Prioritas: API URL terlebih dahulu (sama seperti produk)
  if (image?.url) return getImageUrl(image.url);
  if (image?.src_url) return getImageUrl(image.src_url);
  if (image?.id) return getImageUrl(image.id);
  return "";
};

// Main image src: pakai relasi images dengan API URL
const mainImageSrc = computed(() => {
  if (!jasa.value) return "";

  // Prioritas 1: cover_img.src_url dari backend (sama seperti produk)
  if (jasa.value.cover_img?.src_url) {
    return getImageUrl(jasa.value.cover_img.src_url);
  }

  const images = jasa.value.images || [];

  if (images.length && currentImageIndex.value >= 0) {
    const img = images[currentImageIndex.value] || images[0];
    return resolveJasaImageSrc(img);
  }

  if (images.length) {
    const coverImage = images.find((img) => img?.is_cover) || images[0];
    return resolveJasaImageSrc(coverImage);
  }

  return "";
});

// ✅ Methods
const formatNumber = (num) => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "jt";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "rb";
  }
  return num.toString();
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

const nextImage = () => {
  if (!jasa.value?.images) return;
  if (!jasa.value.images.length) return;
  const baseIndex = currentImageIndex.value < 0 ? 0 : currentImageIndex.value;
  currentImageIndex.value =
    (baseIndex + 1) % jasa.value.images.length;
};

const prevImage = () => {
  if (!jasa.value?.images) return;
  if (!jasa.value.images.length) return;
  const baseIndex = currentImageIndex.value < 0 ? 0 : currentImageIndex.value;
  currentImageIndex.value =
    baseIndex === 0
      ? jasa.value.images.length - 1
      : baseIndex - 1;
};

const selectImage = (index) => {
  currentImageIndex.value = index;
};

const openAddOnsModal = () => {
  showAddOnsModal.value = true;
};

const closeAddOnsModal = () => {
  showAddOnsModal.value = false;
};

const goBack = () => {
  router.back();
};

const editProduct = () => {
  router.push(
    `/merchant-center/${currentMerchantSlug.value}/jasas/${route.params.id}/edit`,
  );
};

const loadDetail = async () => {
  loading.value = true;
  jasa.value = null;
  try {
    const productId = route.params.id;
    console.log("[Detail] Loading jasa", productId);

    const data = await fetchJasaDetail(
      productId,
      true,
      currentMerchantId.value,
    );
    jasa.value = data;

    // Default tampilan gunakan cover_img.src_url dari API
    currentImageIndex.value = -1;

    console.log("[Detail] Jasa loaded", jasa.value);
  } catch (err) {
    console.error("[Detail] Error loading jasa", err);
    const status = err?.response?.status;
    if (status === 404) {
      toast.error("Jasa tidak ditemukan");
      router.push(`/merchant-center/${currentMerchantSlug.value}/jasas`);
    } else if (status === 403) {
      toast.error("Anda tidak memiliki akses ke jasa ini");
      router.push(`/merchant-center/${currentMerchantSlug.value}/jasas`);
    } else {
      toast.error(err?.response?.data?.message || "Gagal memuat detail jasa");
    }
  } finally {
    loading.value = false;
  }
};

// ✅ Mount
onMounted(() => {
  loadDetail();
});

// Helper: return a human readable label for add-on group selection rules
const getSelectionTypeLabel = (group) => {
  if (!group) return "Opsional";
  const min = group.min_selection ?? 0;
  const max = group.max_selection ?? 0;

  if (min > 0 && max > 0) {
    return min === max ? `Pilih ${min}` : `Pilih ${min} - ${max}`;
  }
  if (min > 0) return `Minimal ${min}`;
  if (max > 0) return `Maksimal ${max}`;
  return "Opsional";
};
</script>

<template>
  <div class="min-h-screen pb-20 bg-gray-50 sm:pb-0">
    <!-- Mobile Header -->
    <MerchantMobileHeader title="Detail Jasa" />

    <!-- Desktop Header -->
    <div class="sticky top-0 left-0 right-0 z-30 hidden py-6 sm:block">
      <div
        class="flex flex-wrap items-center justify-between px-4 mx-auto sm:px-6 lg:px-8 gap-y-2 gap-x-4"
      >
        <div>
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantId"
          />
          <p class="text-xs text-muted-foreground lg:text-sm">
            {{ jasa?.title || "Loading..." }}
          </p>
        </div>

        <div v-if="jasa" class="flex items-center gap-3">
          <div
            class="items-center hidden gap-3 mr-4 text-xs text-gray-500 sm:flex"
          >
            <div
              class="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full bg-gray-50"
            >
              <i class="text-xs text-gray-400 pi pi-image"></i>
              <span>Galeri</span>
            </div>
            <div
              class="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full bg-gray-50"
            >
              <i class="text-xs text-gray-400 pi pi-wallet"></i>
              <span>Harga</span>
            </div>
            <div
              class="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-full bg-gray-50"
            >
              <i class="text-xs text-gray-400 pi pi-check-circle"></i>
              <span>Status</span>
            </div>
          </div>

          <Button @click="editProduct" variant="merchant" size="md">
            <i class="pi pi-pencil"></i>
            <span>Edit Jasa</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Spacer for Mobile -->
    <div class="h-[72px] sm:h-0"></div>

    <!-- ✅ Loading State -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center gap-3 py-20"
    >
      <div
        class="w-12 h-12 border-4 border-gray-300 rounded-full border-t-merchant-primary animate-spin"
      ></div>
      <p class="text-sm text-muted-foreground">Memuat detail jasa...</p>
    </div>

    <!-- ✅ Error State (product not loaded) -->
    <div
      v-else-if="!jasa"
      class="flex flex-col items-center justify-center py-20"
    >
      <i
        class="mb-4 text-5xl pi pi-exclamation-triangle text-danger-foreground"
      ></i>
      <p class="mb-2 text-lg font-semibold text-black">Jasa Tidak Ditemukan</p>
      <Button @click="goBack" variant="muted-outline">
        <i class="mr-2 pi pi-arrow-left"></i>
        Kembali
      </Button>
    </div>

    <!-- ✅ Content - RESPONSIVE GRID -->
    <div v-else class="px-0 pb-6 mx-auto sm:px-4 lg:px-6">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Left Column (Images + Basic Info) -->
        <div class="space-y-2 lg:col-span-1 sm:space-y-4">
          <!-- Image Gallery Card -->
          <div v-if="(jasa.images && jasa.images.length > 0) || jasa.cover_img">
            <!-- Main Image -->
            <div
              class="relative flex items-center justify-center max-w-2xl mx-auto mb-4 -mt-4 overflow-hidden bg-gray-100 shadow-sm aspect-square sm:mt-0 sm:rounded-2xl"
            >
              <img
                v-if="mainImageSrc"
                :src="mainImageSrc"
                :alt="jasa.title"
                class="object-contain max-w-full max-h-full"
                @error="(e) => (e.target.style.display = 'none')"
              />
              <!-- Navigation Arrows -->
              <button
                v-if="jasa.images.length > 1"
                @click="prevImage"
                class="absolute flex items-center justify-center w-10 h-10 text-gray-800 transition -translate-y-1/2 rounded-full shadow-lg left-3 top-1/2 bg-white/90 hover:bg-white backdrop-blur-sm active:scale-95"
              >
                <i class="text-sm font-bold pi pi-chevron-left"></i>
              </button>
              <button
                v-if="jasa.images.length > 1"
                @click="nextImage"
                class="absolute flex items-center justify-center w-10 h-10 text-gray-800 transition -translate-y-1/2 rounded-full shadow-lg right-3 top-1/2 bg-white/90 hover:bg-white backdrop-blur-sm active:scale-95"
              >
                <i class="text-sm font-bold pi pi-chevron-right"></i>
              </button>
            </div>

            <!-- Thumbnails -->
            <div
              v-if="jasa.images && jasa.images.length > 0"
              class="grid grid-cols-4 gap-2 sm:grid-cols-6"
            >
              <button
                v-for="(image, index) in jasa.images"
                :key="image.id"
                @click="selectImage(index)"
                :class="{
                  'border-merchant-primary ring-2 ring-merchant-primary/20 scale-105':
                    currentImageIndex === index,
                  'border-gray-200 hover:border-merchant-primary/50 hover:scale-105':
                    currentImageIndex !== index,
                }"
                class="relative flex items-center justify-center overflow-hidden transition border rounded-lg aspect-square bg-gray-50"
              >
                <img
                  v-if="resolveJasaImageSrc(image)"
                  :src="resolveJasaImageSrc(image)"
                  :alt="`${jasa.title} ${index + 1}`"
                  class="object-contain max-w-full max-h-full"
                  @error="(e) => (e.target.style.display = 'none')"
                />
              </button>
            </div>
          </div>

          <!-- No Images State -->
          <div v-else class="flex items-center justify-center">
            <div
              class="inline-flex flex-col items-center justify-center max-w-xs px-4 py-6 text-center border border-gray-300 border-dashed rounded-xl bg-gray-50"
            >
              <div
                class="flex items-center justify-center w-10 h-10 mb-2 bg-white rounded-full shadow-sm"
              >
                <i class="text-lg text-gray-400 pi pi-image"></i>
              </div>
              <p class="text-sm font-medium text-gray-600">
                Tidak ada gambar untuk jasa ini.
              </p>
              <p class="mt-1 text-xs text-gray-400">
                Tambahkan gambar dari halaman edit agar pelanggan lebih mudah
                mengenali layanan.
              </p>
            </div>
          </div>
        </div>

        <!-- Right Column (Details) -->
        <div class="space-y-2 lg:col-span-1 sm:space-y-4">
          <!-- Product Name Card -->
          <div class="p-4 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm">
            <div class="flex items-start gap-3">
              <div
                class="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-merchant-primary/10"
              >
                <i class="text-lg pi pi-briefcase text-merchant-primary"></i>
              </div>
              <div class="flex-1 min-w-0">
                <h2
                  class="mb-1 text-lg font-bold text-gray-900 truncate sm:text-xl"
                >
                  {{ jasa.title }}
                </h2>
                <p class="flex items-center gap-2 text-xs text-gray-500">
                  <i class="text-xs text-gray-400 pi pi-tag"></i>
                  <span class="truncate">{{
                    jasa.category?.name || "Tanpa kategori"
                  }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Harga Card -->
          <div class="p-4 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm">
            <h3
              class="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-900"
            >
              <i class="text-gray-400 pi pi-wallet"></i>
              Harga
            </h3>

            <!-- Kedua harga diisi -->
            <div
              v-if="
                jasa.fixed_price &&
                jasa.fixed_price > 0 &&
                jasa.base_price &&
                jasa.base_price > 0
              "
              class="space-y-1"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1 text-xs text-gray-500">
                  <i class="text-xs pi pi-check-circle text-emerald-500"></i>
                  <span>Harga tetap</span>
                </span>
                <span
                  class="text-lg font-bold sm:text-2xl text-merchant-primary"
                >
                  {{ formatPrice(jasa.fixed_price) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1 text-xs text-gray-500">
                  <i class="text-xs text-gray-400 pi pi-arrow-right"></i>
                  <span>Mulai dari</span>
                </span>
                <span class="text-base font-semibold text-gray-900 sm:text-lg">
                  {{ formatPrice(jasa.base_price) }}
                </span>
              </div>
            </div>

            <!-- Hanya fixed price -->
            <div v-else-if="jasa.fixed_price && jasa.fixed_price > 0">
              <p class="text-2xl font-bold text-merchant-primary">
                {{ formatPrice(jasa.fixed_price) }}
              </p>
              <p class="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <i class="text-xs pi pi-check-circle text-emerald-500"></i>
                <span>Harga tetap</span>
              </p>
            </div>

            <!-- Hanya base price -->
            <div v-else-if="jasa.base_price && jasa.base_price > 0">
              <p class="text-2xl font-bold text-merchant-primary">
                {{ formatPrice(jasa.base_price) }}
              </p>
              <p class="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <i class="text-xs text-gray-400 pi pi-arrow-right"></i>
                <span>Mulai dari</span>
              </p>
            </div>

            <!-- Tidak ada harga -->
            <div v-else>
              <p class="flex items-center gap-2 text-sm text-gray-500">
                <i class="text-sm text-gray-400 pi pi-info-circle"></i>
                <span>Belum ada harga yang diatur.</span>
              </p>
            </div>
          </div>

          <!-- Description Card - Desktop Only -->
          <div
            v-if="jasa.description"
            class="p-4 border-l-4 border-blue-500 bg-linear-to-r from-blue-50 to-transparent sm:p-6 sm:rounded-xl sm:shadow-sm"
          >
            <h3
              class="flex items-center gap-2 mb-3 text-sm font-semibold text-blue-900"
            >
              <i class="text-blue-600 pi pi-align-left"></i>
              Deskripsi Jasa
            </h3>
            <p
              class="text-sm leading-relaxed text-gray-700 whitespace-pre-line"
            >
              {{ jasa.description }}
            </p>
          </div>

          <!-- Status & Category Card -->
          <div
            class="p-4 space-y-3 border-l-4 bg-linear-to-r from-emerald-50 to-transparent sm:p-6 sm:rounded-xl sm:shadow-sm border-emerald-500"
          >
            <!-- Status -->
            <div class="flex items-center justify-between gap-3">
              <span class="flex items-center gap-2 text-sm text-gray-600">
                <i class="text-sm text-gray-400 pi pi-check-circle"></i>
                <span>Status</span>
              </span>
              <StatusLabel
                :status="
                  (jasa?.is_active ?? jasa?.status === 'active')
                    ? 'success'
                    : 'muted'
                "
                variant="general"
                :label="
                  (jasa?.is_active ?? jasa?.status === 'active')
                    ? 'Aktif'
                    : 'Tidak Aktif'
                "
                size="md"
              />
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-100"></div>

            <!-- Main Category -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Kategori</span>
              <div class="text-sm font-medium text-right text-gray-900">
                <div>{{ jasa.category?.name || "-" }}</div>
                <div
                  v-if="jasa.subcategory?.name"
                  class="text-xs text-gray-500"
                >
                  {{ jasa.subcategory.name }}
                </div>
              </div>
            </div>

            <!-- Min Purchase -->
            <div v-if="jasa.min_purchase">
              <div class="mb-3 border-t border-gray-100"></div>
              <div class="flex items-start justify-between gap-3 mt-3">
                <span class="shrink-0 text-sm text-gray-600"
                  >Minimal Pembelian</span
                >
                <span class="text-sm font-medium text-gray-900">
                  {{ jasa.min_purchase }} unit
                </span>
              </div>
            </div>
          </div>

          <!-- Lokasi & Layanan Card -->
          <div class="p-4 space-y-3 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm">
            <h3
              class="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900"
            >
              <i class="text-gray-400 pi pi-map-marker"></i>
              Lokasi & Layanan
            </h3>

            <!-- Service Type -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Tipe Layanan</span>
              <span class="text-sm font-medium text-gray-900">
                <template v-if="jasa.service_type === 'at_location'"
                  >Di Tempat Saya</template
                >
                <template v-else-if="jasa.service_type === 'on_site'"
                  >Ke Rumah/Lokasi Pelanggan</template
                >
                <template v-else-if="jasa.service_type === 'online'"
                  >Online</template
                >
                <template v-else>{{ jasa.service_type || "-" }}</template>
              </span>
            </div>

            <!-- Location Address (ambil dari jasa atau profil UMKM) -->
            <div
              v-if="
                jasa.location_address ||
                jasa.merchant?.address ||
                jasa.merchant?.alamat
              "
            >
              <div class="mb-3 border-t border-gray-100"></div>
              <div class="flex items-start justify-between gap-3">
                <span class="shrink-0 text-sm text-gray-600"
                  >Alamat Tempat Layanan</span
                >
                <span class="text-sm font-medium text-right text-gray-900">
                  {{
                    jasa.location_address ||
                    jasa.merchant?.address ||
                    jasa.merchant?.alamat ||
                    "-"
                  }}
                </span>
              </div>
            </div>

            <!-- Service Area -->
            <div v-if="jasa.service_area">
              <div class="mb-3 border-t border-gray-100"></div>
              <div class="flex items-start justify-between gap-3">
                <span class="shrink-0 text-sm text-gray-600">Area Layanan</span>
                <span class="text-sm font-medium text-right text-gray-900">
                  {{ jasa.service_area }}
                </span>
              </div>
            </div>
          </div>

          <!-- Payment Methods Card -->
          <div class="p-4 space-y-3 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm">
            <h3
              class="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900"
            >
              <i class="text-gray-400 pi pi-wallet"></i>
              Metode Pembayaran
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="method in (jasa.payment_methods || '')
                  .split(',')
                  .filter((m) => m.trim())"
                :key="method"
                class="px-3 py-1 text-sm text-green-700 bg-green-100 rounded-full"
              >
                <template v-if="method.trim() === 'cod'"
                  >COD (Bayar di Tempat)</template
                >
                <template v-else>{{ method.trim() }}</template>
              </span>
              <span
                v-if="!jasa.payment_methods || !jasa.payment_methods.trim()"
                class="text-sm text-gray-500"
              >
                Tidak ada metode pembayaran
              </span>
            </div>
          </div>

          <!-- Special Notes Card -->
          <div
            v-if="jasa.special_notes"
            class="p-4 bg-white sm:p-6 sm:rounded-xl sm:shadow-sm"
          >
            <h3
              class="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900"
            >
              <i class="text-gray-400 pi pi-info-circle"></i>
              Catatan Khusus
            </h3>
            <p
              class="text-sm leading-relaxed text-gray-700 whitespace-pre-line"
            >
              {{ jasa.special_notes }}
            </p>
          </div>

          <!-- Add-ons Card -->
          <button
            v-if="totalAddOnGroups > 0"
            @click="openAddOnsModal"
            class="flex items-center justify-between w-full p-4 transition bg-white sm:p-6 hover:bg-gray-50 active:bg-gray-100 sm:rounded-xl sm:shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-merchant-primary/10"
              >
                <i class="pi pi-plus-circle text-merchant-primary"></i>
              </div>
              <div class="text-left">
                <p class="text-sm font-semibold text-gray-900">Grup Add-on</p>
                <p class="text-xs text-gray-500">
                  {{ totalAddOnGroups }} grup | {{ totalAddOnOptions }} opsi
                  <span v-if="addOnPriceRange"> | {{ addOnPriceRange }}</span>
                </p>
              </div>
            </div>
            <i class="text-gray-400 pi pi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ✅ Add-ons Modal -->
    <ResponsiveModal
      v-model:show="showAddOnsModal"
      title="Grup Add-on"
      show-footer
      footer-class="inline sm:hidden"
      @close="closeAddOnsModal"
    >
      <div v-if="jasa && jasa.addonGroups">
        <!-- Summary Card -->
        <div
          class="p-4 mb-4 border bg-merchant-primary/5 rounded-xl border-merchant-primary/20"
        >
          <div class="mb-3">
            <p class="mb-1 text-xs text-muted-foreground">
              Rentang Harga Add-on
            </p>
            <p class="text-base font-semibold truncate text-merchant-primary">
              {{ addOnPriceRange || "Semua Gratis" }}
            </p>
          </div>

          <div
            class="grid grid-cols-2 gap-4 pt-3 border-t border-merchant-primary/20"
          >
            <div>
              <p class="mb-1 text-xs text-muted-foreground">Total Grup</p>
              <p class="text-lg font-bold text-merchant-primary">
                {{ totalAddOnGroups }}
              </p>
            </div>
            <div>
              <p class="mb-1 text-xs text-muted-foreground">Total Opsi</p>
              <p class="text-lg font-bold text-merchant-primary">
                {{ totalAddOnOptions }}
              </p>
            </div>
          </div>
        </div>

        <!-- Add-on Groups List -->
        <div class="space-y-4">
          <div
            v-for="(group, gIndex) in jasa.addonGroups"
            :key="group.id"
            class="overflow-hidden bg-white border border-muted-background rounded-xl"
          >
            <!-- Group Header -->
            <div
              class="p-4 border-b bg-merchant-primary/5 border-merchant-primary/20"
            >
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex-1">
                  <h3 class="mb-2 text-sm font-bold text-black">
                    {{ gIndex + 1 }}. {{ group.addon_group_name }}
                  </h3>
                  <div class="flex flex-wrap items-center gap-2">
                    <!-- Required Badge -->
                    <StatusLabel
                      v-if="group.min_selection > 0"
                      status="merchant"
                      variant="general"
                      label="Wajib"
                      size="xs"
                      :show-icon="false"
                    />

                    <!-- Selection Type -->
                    <StatusLabel
                      status="warning"
                      variant="general"
                      :label="getSelectionTypeLabel(group)"
                      size="xs"
                      :show-icon="false"
                    />

                    <!-- Options Count -->
                    <StatusLabel
                      status="muted"
                      variant="general"
                      :label="`${group.options?.length || 0} opsi`"
                      size="xs"
                      :show-icon="false"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Options List -->
            <div class="p-4 space-y-2">
              <div
                v-for="(option, oIndex) in group.options"
                :key="option.id"
                class="flex items-center justify-between px-4 py-3 transition rounded-lg bg-gray-50 hover:bg-gray-100"
              >
                <div class="flex items-center flex-1 min-w-0 gap-3">
                  <!-- Number Badge -->
                  <StatusLabel
                    status="processing"
                    variant="custom"
                    :label="`${oIndex + 1}`"
                    custom-class="text-white bg-merchant-primary"
                    size="xs"
                    :show-icon="false"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-black truncate">
                      {{ option.addon?.addon_name || option.addon_name || "-" }}
                    </p>
                  </div>
                </div>
                <div class="shrink-0">
                  <!-- Price Badge -->
                  <StatusLabel
                    v-if="option.addon_price > 0"
                    status="primary"
                    variant="general"
                    :label="`+${formatPrice(option.addon_price)}`"
                    size="sm"
                    :show-icon="false"
                  />
                  <StatusLabel
                    v-else
                    status="success"
                    variant="general"
                    label="Gratis"
                    size="sm"
                    :show-icon="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <Button @click="closeAddOnsModal" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
/* Custom scrollbar for modal */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Smooth transitions */
img {
  transition: transform 0.3s ease;
}

button:active img {
  transform: scale(0.98);
}
</style>
