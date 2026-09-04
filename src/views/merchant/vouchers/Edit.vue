<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import { Form, Field, useForm } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import InputDateField from "@/components/forms/InputDateField.vue";
import Button from "@/components/common/Button.vue";
import { useVouchers } from "@/composables/useVouchers";
import api from "@/libs/axios";
import { getImageUrl } from "@/libs/getImageUrl";
import { formatPrice } from "@/libs/format";

const {
  editMerchantVoucher,
  loading,
  fetchMerchantVoucherDetail,
  loadingDetail,
} = useVouchers();

const isDev = import.meta.env.DEV;
const toast = useToast();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const voucher_name = ref("");
const voucher_code = ref("");
const voucher_description = ref("");
const is_hidden = ref(false);

const value = ref(0);
const min_purchase_amount = ref(0);
const max_discount_amount = ref(0);
const usage_limit_per_user = ref(1);
const usage_limit = ref(0);

const voucher_start_date = ref("");
const voucher_end_date = ref("");

const voucher_type = ref("percent");

// ✅ Scope / Item Restrictions State
const applies_to = ref("all"); // 'all' | 'specific'
const selectedProductIds = ref([]);
const selectedJasaIds = ref([]);
const itemSearchQuery = ref("");
const availableProducts = ref([]);
const availableJasas = ref([]);
const loadingItems = ref(false);

// ✅ Merchant slug from route params
const currentMerchantSlug = computed(() => {
  return route?.params?.merchantSlug ? String(route.params.merchantSlug) : null;
});
const voucherId = computed(() => {
  return route?.params?.id ? Number(route.params.id) : null;
});

// ✅ Validate merchant ownership
const isValidMerchant = computed(() => {
  if (!currentMerchantSlug.value) return false;
  const merchant = authStore.getMerchantBySlug(currentMerchantSlug.value);
  return !!merchant;
});

// ✅ Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    label: "Voucher",
    path: `/merchant-center/${currentMerchantSlug.value}/vouchers`,
  },
  {
    label: "Edit Voucher",
  },
]);

// ============================================================
// VALIDATION SCHEMA
// ============================================================
const schema = yup.object({
  voucher_name: yup.string().required("Nama voucher wajib diisi"),
  voucher_code: yup.string().required("Kode voucher wajib diisi"),
  voucher_description: yup.string().required("Deskripsi wajib diisi"),
  voucher_type: yup.string().required(),
  value: yup
    .number()
    .required()
    .min(1)
    .test(
      "max-percent",
      "Maksimal persentase adalah 100",
      (val) => {
        if (voucher_type.value === "percent" && val > 100) return false;
        return true;
      },
    ),
  voucher_start_date: yup.string().required(),
  voucher_end_date: yup.string().required(),
  usage_limit_per_user: yup.number().required().min(1),
  max_discount_amount: yup
    .number()
    .nullable()
    .when("voucher_type", {
      is: "percent",
      then: (s) => s.required(),
      otherwise: (s) => s.default(0),
    }),
  is_hidden: yup.boolean().default(false),
});

// ============================================================
// VEE-VALIDATE SETUP
// ============================================================
const {
  handleSubmit: veeHandleSubmit,
  errors,
  values,
  setFieldValue,
  validate,
  validateField,
} = useForm({
  validationSchema: schema,
  initialValues: {
    voucher_name: "",
    voucher_code: "",
    voucher_description: "",
    is_hidden: false,
    voucher_type: "percent",
    value: 0,
    voucher_start_date: "",
    voucher_end_date: "",
    usage_limit_per_user: 1,
    usage_limit: 0,
    min_purchase_amount: 0,
    max_discount_amount: 0,
  },
});

// ============================================================
// FETCH MERCHANT PRODUCTS & JASAS
// ============================================================
const fetchMerchantItems = async () => {
  if (!currentMerchantSlug.value) return;
  loadingItems.value = true;
  try {
    const [productsRes, jasasRes] = await Promise.allSettled([
      api.get(`/api/merchant/${currentMerchantSlug.value}/products`, {
        params: { per_page: 100 },
      }),
      api.get(`/api/merchants/${currentMerchantSlug.value}/jasas`, {
        params: { per_page: 100 },
      }),
    ]);

    if (productsRes.status === "fulfilled") {
      const pData = productsRes.value.data?.data || productsRes.value.data || [];
      availableProducts.value = Array.isArray(pData) ? pData : [];
    }

    if (jasasRes.status === "fulfilled") {
      const jData = jasasRes.value.data?.data || jasasRes.value.data || [];
      availableJasas.value = Array.isArray(jData) ? jData : [];
    }
  } catch (err) {
    if (isDev) {
      console.error("[EditVoucher] Error fetching merchant items:", err);
    }
  } finally {
    loadingItems.value = false;
  }
};

// ============================================================
// LIFECYCLE HOOKS
// ============================================================
onMounted(async () => {
  if (!currentMerchantSlug.value || !voucherId.value) {
    toast.error("ID merchant / voucher tidak valid");
    router.push("/merchant-center");
    return;
  }

  fetchMerchantItems();

  try {
    const res = await fetchMerchantVoucherDetail(
      currentMerchantSlug.value,
      voucherId.value,
    );

    const v = res.data ?? res;

    voucher_name.value = v.voucher_name ?? "";
    voucher_code.value = v.voucher_code ?? "";
    voucher_description.value = v.voucher_description ?? "";
    is_hidden.value = Boolean(v.is_hidden ?? false);
    voucher_type.value = v.voucher_type ?? "percent";

    value.value = Number(v.value ?? 0);
    min_purchase_amount.value = Number(v.min_purchase_amount ?? 0);
    usage_limit_per_user.value = Number(v.usage_limit_per_user ?? 1);
    usage_limit.value = Number(v.usage_limit ?? 0);
    max_discount_amount.value = Number(v.max_discount_amount ?? 0);

    voucher_start_date.value = v.voucher_start_date
      ? v.voucher_start_date.slice(0, 10)
      : "";
    voucher_end_date.value = v.voucher_end_date
      ? v.voucher_end_date.slice(0, 10)
      : "";

    // Load restricted products / jasas
    const restrictedProds = v.restricted_products || v.restrictedProducts || [];
    const restrictedJas = v.restricted_jasas || v.restrictedJasas || [];

    selectedProductIds.value = restrictedProds.map((p) => p.id);
    selectedJasaIds.value = restrictedJas.map((j) => j.id);

    if (v.applies_to) {
      applies_to.value = v.applies_to;
    } else if (
      selectedProductIds.value.length > 0 ||
      selectedJasaIds.value.length > 0
    ) {
      applies_to.value = "specific";
    } else {
      applies_to.value = "all";
    }

    // Sync ke vee-validate
    setFieldValue("voucher_name", voucher_name.value);
    setFieldValue("voucher_code", voucher_code.value);
    setFieldValue("voucher_description", voucher_description.value);
    setFieldValue("is_hidden", is_hidden.value);
    setFieldValue("voucher_type", voucher_type.value);
    setFieldValue("value", value.value);
    setFieldValue("voucher_start_date", voucher_start_date.value);
    setFieldValue("voucher_end_date", voucher_end_date.value);
    setFieldValue("usage_limit_per_user", usage_limit_per_user.value);
    setFieldValue("max_discount_amount", max_discount_amount.value);
  } catch (e) {
    toast.error("Gagal memuat detail voucher");
    router.push(`/merchant-center/${currentMerchantSlug.value}/vouchers`);
  }
});

// ============================================================
// FILTERED ITEMS & SELECTION HANDLERS
// ============================================================
const filteredProducts = computed(() => {
  if (!itemSearchQuery.value.trim()) return availableProducts.value;
  const q = itemSearchQuery.value.toLowerCase();
  return availableProducts.value.filter((p) =>
    (p.name || p.nama || "").toLowerCase().includes(q),
  );
});

const filteredJasas = computed(() => {
  if (!itemSearchQuery.value.trim()) return availableJasas.value;
  const q = itemSearchQuery.value.toLowerCase();
  return availableJasas.value.filter((j) =>
    (j.title || j.nama || j.name || "").toLowerCase().includes(q),
  );
});

const totalSelectedItemsCount = computed(
  () => selectedProductIds.value.length + selectedJasaIds.value.length,
);

const totalAvailableItemsCount = computed(
  () => availableProducts.value.length + availableJasas.value.length,
);

const isAllSelected = computed(() => {
  return (
    totalAvailableItemsCount.value > 0 &&
    selectedProductIds.value.length === availableProducts.value.length &&
    selectedJasaIds.value.length === availableJasas.value.length
  );
});

const toggleSelectAllItems = () => {
  if (isAllSelected.value) {
    selectedProductIds.value = [];
    selectedJasaIds.value = [];
  } else {
    selectedProductIds.value = availableProducts.value.map((p) => p.id);
    selectedJasaIds.value = availableJasas.value.map((j) => j.id);
  }
};

const toggleProductSelection = (productId) => {
  const idx = selectedProductIds.value.indexOf(productId);
  if (idx > -1) {
    selectedProductIds.value.splice(idx, 1);
  } else {
    selectedProductIds.value.push(productId);
  }
};

const toggleJasaSelection = (jasaId) => {
  const idx = selectedJasaIds.value.indexOf(jasaId);
  if (idx > -1) {
    selectedJasaIds.value.splice(idx, 1);
  } else {
    selectedJasaIds.value.push(jasaId);
  }
};

// Helper image resolver (supporting thumbnail size)
const getItemImage = (item, size = "thumb") => {
  if (!item) return "";

  // 1. Direct cover_image string (e.g. from ProductController::index => URL string)
  if (typeof item.cover_image === "string" && item.cover_image.trim()) {
    return getImageUrl(item.cover_image, size);
  }

  // 2. cover_image object
  if (item.cover_image && typeof item.cover_image === "object") {
    const candidate =
      item.cover_image.thumb_url ||
      item.cover_image.src_url ||
      item.cover_image.url ||
      item.cover_image.image_path ||
      item.cover_image.path ||
      item.cover_image.id;
    if (candidate) return getImageUrl(candidate, size);
  }

  // 3. coverImage object (camelCase)
  if (item.coverImage && typeof item.coverImage === "object") {
    const candidate =
      item.coverImage.thumb_url ||
      item.coverImage.src_url ||
      item.coverImage.url ||
      item.coverImage.image_path ||
      item.coverImage.path ||
      item.coverImage.id;
    if (candidate) return getImageUrl(candidate, size);
  }

  // 4. cover_img object (common in Jasa)
  if (item.cover_img && typeof item.cover_img === "object") {
    const candidate =
      item.cover_img.thumb_url ||
      item.cover_img.src_url ||
      item.cover_img.url ||
      item.cover_img.image_path ||
      item.cover_img.id;
    if (candidate) return getImageUrl(candidate, size);
  }

  // 5. item.image (string or object)
  if (typeof item.image === "string" && item.image.trim()) {
    return getImageUrl(item.image, size);
  }

  // 6. item.image_path (string)
  if (typeof item.image_path === "string" && item.image_path.trim()) {
    return getImageUrl(item.image_path, size);
  }

  // 7. images array
  if (Array.isArray(item.images) && item.images.length > 0) {
    const firstImg = item.images.find((img) => img.is_cover) || item.images[0];
    if (typeof firstImg === "string") return getImageUrl(firstImg, size);
    if (firstImg && typeof firstImg === "object") {
      const candidate =
        firstImg.thumb_url ||
        firstImg.src_url ||
        firstImg.url ||
        firstImg.image_path ||
        firstImg.path ||
        firstImg.id;
      if (candidate) return getImageUrl(candidate, size);
    }
  }

  return "";
};

// ============================================================
// WATCHERS
// ============================================================
watch(voucher_name, (v) => setFieldValue("voucher_name", v));
watch(voucher_code, (v) => setFieldValue("voucher_code", v));
watch(voucher_description, (v) => setFieldValue("voucher_description", v));
watch(is_hidden, (v) => setFieldValue("is_hidden", v));

watch(voucher_type, (v) => {
  setFieldValue("voucher_type", v);
  if (v === "fixed") {
    setFieldValue("max_discount_amount", 0);
  }
  validateField("value");
});

watch(value, (v) => setFieldValue("value", v));
watch(max_discount_amount, (v) => setFieldValue("max_discount_amount", v));
watch(voucher_start_date, (v) => setFieldValue("voucher_start_date", v));
watch(voucher_end_date, (v) => setFieldValue("voucher_end_date", v));
watch(usage_limit_per_user, (v) => setFieldValue("usage_limit_per_user", v));

// ============================================================
// SUBMIT HANDLER
// ============================================================
const onSubmit = veeHandleSubmit(async () => {
  if (loading.value) return;

  if (!isValidMerchant.value) {
    toast.error("Merchant tidak valid");
    return;
  }

  if (applies_to.value === "specific" && totalSelectedItemsCount.value === 0) {
    toast.error("Silakan pilih minimal 1 produk atau jasa untuk voucher ini.");
    return;
  }

  const payload = {
    voucher_name: voucher_name.value,
    voucher_code: voucher_code.value,
    voucher_description: voucher_description.value,
    is_hidden: is_hidden.value,
    voucher_type: voucher_type.value,
    value: value.value,
    voucher_start_date: voucher_start_date.value,
    voucher_end_date: voucher_end_date.value,
    min_purchase_amount: min_purchase_amount.value,
    usage_limit_per_user: usage_limit_per_user.value,
    usage_limit: usage_limit.value,
    max_discount_amount:
      voucher_type.value === "percent"
        ? Number(max_discount_amount.value ?? 0)
        : 0,
    applies_to: applies_to.value,
    product_ids: applies_to.value === "specific" ? selectedProductIds.value : [],
    jasa_ids: applies_to.value === "specific" ? selectedJasaIds.value : [],
  };

  loading.value = true;
  try {
    await editMerchantVoucher(
      currentMerchantSlug.value,
      voucherId.value,
      payload,
    );

    router.push(`/merchant-center/${currentMerchantSlug.value}/vouchers`);
  } catch (err) {
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen pb-20 bg-gray-50 sm:pb-0">
    <!-- Mobile Header -->
    <div
      class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-6 text-white sm:hidden bg-merchant-primary rounded-b-2xl"
    >
      <button
        @click="router.push(`/merchant-center/${currentMerchantSlug}/vouchers`)"
        class="absolute flex items-center justify-center w-10 h-10 transition rounded-full left-4 hover:bg-white/10"
      >
        <i class="pi pi-arrow-left"></i>
      </button>
      <h1 class="text-lg font-semibold">Edit Voucher</h1>
    </div>

    <!-- Desktop Header -->
    <div class="sticky top-0 left-0 right-0 z-30 hidden py-6 bg-gray-50 sm:block">
      <div
        class="flex flex-wrap items-center justify-between px-4 mx-auto sm:px-6 gap-y-2 gap-x-4"
      >
        <div>
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="text-xs text-muted-foreground lg:text-sm">
            {{
              loadingDetail
                ? "Memuat data voucher..."
                : voucher_name || "Edit Voucher"
            }}
          </p>
        </div>

        <div v-if="!loadingDetail" class="flex items-center gap-3">
          <Button
            @click="onSubmit"
            variant="merchant"
            size="md"
            :loading="loading"
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan Perubahan" }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Spacer for Mobile Only -->
    <div class="h-[72px] sm:h-0"></div>

    <div
      v-if="loadingDetail"
      class="flex flex-col items-center justify-center gap-3 py-20"
    >
      <div
        class="w-12 h-12 border-4 border-gray-300 rounded-full border-t-merchant-primary animate-spin"
      ></div>
      <p class="text-sm text-muted-foreground">Memuat data voucher...</p>
    </div>

    <!-- Container Responsive -->
    <div v-else class="px-4 pt-4 mx-auto sm:px-6 sm:py-6 sm:pt-0">
      <!-- Info Banner -->
      <div
        class="p-4 mb-2 border border-blue-200 sm:mb-4 bg-blue-50 rounded-xl"
      >
        <div class="flex gap-3">
          <i
            class="pi pi-info-circle text-merchant-primary text-lg shrink-0 mt-0.5"
          ></i>
          <div class="flex-1">
            <h4 class="mb-1 text-sm font-semibold text-merchant-primary">
              Informasi Penting
            </h4>
            <ul class="pl-4 space-y-1 text-xs list-disc text-merchant-primary">
              <li>
                Kode voucher tidak boleh sama dengan voucher lain di toko Anda.
              </li>
              <li>Pilih tipe voucher: Persentase (%) atau Nilai Tetap (Rp).</li>
              <li>
                Jika tipe Persentase (%), wajib mengisi nilai maksimal diskon (Rp).
              </li>
              <li>
                Anda dapat menentukan apakah voucher berlaku untuk semua produk atau produk tertentu.
              </li>
              <li>Voucher hanya berlaku pada periode yang ditentukan.</li>
            </ul>
          </div>
        </div>
      </div>

      <Form @submit="onSubmit">
        <!-- Info Dasar -->
        <div
          class="p-4 mb-2 space-y-3 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
            <i class="pi pi-info-circle text-merchant-primary"></i>
            Informasi Dasar
          </h3>

          <TextField
            name="voucher_name"
            label="Nama Voucher"
            v-model="voucher_name"
            placeholder="Contoh: Voucher Diskon 10%"
            required
          />
          <TextField
            name="voucher_code"
            label="Kode Voucher"
            v-model="voucher_code"
            placeholder="Contoh: DISKON10"
            required
          />
          <TextField
            name="voucher_description"
            label="Deskripsi"
            v-model="voucher_description"
            textarea
            :rows="4"
            placeholder="Jelaskan detail voucher Anda"
            required
          />

          <div class="grid grid-cols-1 gap-3">
            <div class="relative">
              <SelectField
                name="voucher_type"
                label="Tipe Voucher"
                :options="[
                  { label: 'Persentase (%)', value: 'percent' },
                  { label: 'Nilai Tetap (Rp)', value: 'fixed' },
                ]"
                v-model="voucher_type"
                required
              />
            </div>
          </div>
        </div>

        <!-- ✅ Cakupan Produk & Jasa -->
        <div
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
              <i class="pi pi-box text-merchant-primary"></i>
              Cakupan Produk & Jasa
            </h3>
            <span
              v-if="applies_to === 'specific'"
              class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-merchant-primary/10 text-merchant-primary"
            >
              {{ totalSelectedItemsCount }} Item Dipilih
            </span>
          </div>

          <!-- Radio Selection Cards -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <!-- Option 1: Semua Produk & Jasa -->
            <label
              class="relative flex items-start p-4 transition-all border-2 rounded-xl cursor-pointer"
              :class="
                applies_to === 'all'
                  ? 'border-merchant-primary bg-merchant-primary/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              "
            >
              <div class="flex items-center h-5 mt-0.5 shrink-0">
                <input
                  type="radio"
                  value="all"
                  v-model="applies_to"
                  class="w-4.5 h-4.5 border-1 border-muted-foreground text-merchant-primary focus:ring-merchant-primary accent-merchant-primary cursor-pointer"
                />
              </div>
              <div class="ml-3">
                <span class="block text-sm font-semibold text-gray-900">
                  Semua Produk & Jasa
                </span>
                <span class="block mt-0.5 text-xs text-gray-500">
                  Voucher berlaku untuk seluruh produk dan jasa yang tersedia di toko Anda.
                </span>
              </div>
            </label>

            <!-- Option 2: Produk / Jasa Tertentu -->
            <label
              class="relative flex items-start p-4 transition-all border-2 rounded-xl cursor-pointer"
              :class="
                applies_to === 'specific'
                  ? 'border-merchant-primary bg-merchant-primary/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              "
            >
              <div class="flex items-center h-5 mt-0.5 shrink-0">
                <input
                  type="radio"
                  value="specific"
                  v-model="applies_to"
                  class="w-4.5 h-4.5 border-1 border-muted-foreground text-merchant-primary focus:ring-merchant-primary accent-merchant-primary cursor-pointer"
                />
              </div>
              <div class="ml-3">
                <span class="block text-sm font-semibold text-gray-900">
                  Produk / Jasa Tertentu
                </span>
                <span class="block mt-0.5 text-xs text-gray-500">
                  Voucher hanya berlaku untuk produk atau jasa yang Anda tentukan di bawah.
                </span>
              </div>
            </label>
          </div>

          <!-- Item Selector Panel -->
          <div
            v-if="applies_to === 'specific'"
            class="pt-3 border-t border-gray-100 space-y-3"
          >
            <!-- Search & Quick Action Toolbar -->
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="relative flex-1">
                <i class="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2 pi pi-search text-xs"></i>
                <input
                  type="text"
                  v-model="itemSearchQuery"
                  placeholder="Cari produk atau jasa..."
                  class="w-full py-2 pl-9 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-merchant-primary/20 focus:border-merchant-primary"
                />
              </div>

              <div class="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  @click="toggleSelectAllItems"
                  class="text-xs font-medium text-merchant-primary hover:underline"
                >
                  {{ isAllSelected ? "Batalkan Semua" : "Pilih Semua" }}
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div
              v-if="loadingItems"
              class="flex items-center justify-center py-8 text-xs text-gray-400 gap-2"
            >
              <div class="w-4 h-4 border-2 border-gray-300 rounded-full border-t-merchant-primary animate-spin"></div>
              <span>Memuat daftar item toko...</span>
            </div>

            <!-- Empty Items State -->
            <div
              v-else-if="filteredProducts.length === 0 && filteredJasas.length === 0"
              class="p-6 text-center border border-dashed rounded-xl border-gray-200"
            >
              <i class="pi pi-box text-2xl text-gray-300 mb-1"></i>
              <p class="text-xs text-gray-500">
                {{ itemSearchQuery ? "Tidak ada produk/jasa yang cocok dengan pencarian." : "Belum ada produk atau jasa di toko Anda." }}
              </p>
            </div>

            <!-- Items List -->
            <div v-else class="space-y-2 overflow-y-auto max-h-72 pr-1">
              <!-- Products Group -->
              <div v-if="filteredProducts.length > 0" class="space-y-1.5">
                <p class="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Produk Fisik ({{ filteredProducts.length }})
                </p>
                <div
                  v-for="p in filteredProducts"
                  :key="`prod-${p.id}`"
                  @click="toggleProductSelection(p.id)"
                  class="flex items-center gap-3 p-2.5 transition-colors border rounded-xl cursor-pointer hover:bg-gray-50"
                  :class="
                    selectedProductIds.includes(p.id)
                      ? 'border-merchant-primary/50 bg-merchant-primary/5'
                      : 'border-gray-200 bg-white'
                  "
                >
                  <input
                    type="checkbox"
                    :checked="selectedProductIds.includes(p.id)"
                    @click.stop="toggleProductSelection(p.id)"
                    class="appearance-none w-4.5 h-4.5 shrink-0 border-1 border-muted-foreground rounded-sm bg-transparent cursor-pointer transition-all duration-200 checked:bg-merchant-primary checked:border-merchant-primary focus:outline-none focus:ring-2 focus:ring-merchant-primary focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
                  />
                  <div class="w-10 h-10 overflow-hidden bg-gray-100 rounded-lg shrink-0 border border-gray-100 flex items-center justify-center">
                    <img
                      v-if="getItemImage(p)"
                      :src="getItemImage(p, 'thumb')"
                      :alt="p.name || p.nama"
                      class="object-cover w-full h-full"
                      @error="(e) => (e.target.style.display = 'none')"
                    />
                    <i v-else class="pi pi-image text-gray-300"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-semibold text-gray-900 truncate">
                      {{ p.name || p.nama }}
                    </h4>
                    <p class="text-[11px] font-medium text-merchant-primary">
                      {{ formatPrice(p.min_price || p.price || p.harga || (p.variants && p.variants[0]?.price) || 0) }}
                    </p>
                  </div>
                  <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-merchant-primary text-white shrink-0">
                    Produk
                  </span>
                </div>
              </div>

              <!-- Jasas Group -->
              <div v-if="filteredJasas.length > 0" class="space-y-1.5 pt-2">
                <p class="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Layanan Jasa ({{ filteredJasas.length }})
                </p>
                <div
                  v-for="j in filteredJasas"
                  :key="`jasa-${j.id}`"
                  @click="toggleJasaSelection(j.id)"
                  class="flex items-center gap-3 p-2.5 transition-colors border rounded-xl cursor-pointer hover:bg-gray-50"
                  :class="
                    selectedJasaIds.includes(j.id)
                      ? 'border-merchant-primary/50 bg-merchant-primary/5'
                      : 'border-gray-200 bg-white'
                  "
                >
                  <input
                    type="checkbox"
                    :checked="selectedJasaIds.includes(j.id)"
                    @click.stop="toggleJasaSelection(j.id)"
                    class="appearance-none w-4.5 h-4.5 shrink-0 border-1 border-muted-foreground rounded-sm bg-transparent cursor-pointer transition-all duration-200 checked:bg-merchant-primary checked:border-merchant-primary focus:outline-none focus:ring-2 focus:ring-merchant-primary focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
                  />
                  <div class="w-10 h-10 overflow-hidden bg-gray-100 rounded-lg shrink-0 border border-gray-100 flex items-center justify-center">
                    <img
                      v-if="getItemImage(j)"
                      :src="getItemImage(j, 'thumb')"
                      :alt="j.title || j.nama || j.name"
                      class="object-cover w-full h-full"
                      @error="(e) => (e.target.style.display = 'none')"
                    />
                    <i v-else class="pi pi-wrench text-gray-300"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-semibold text-gray-900 truncate">
                      {{ j.title || j.nama || j.name }}
                    </h4>
                    <p class="text-[11px] font-medium text-merchant-primary">
                      {{ formatPrice(j.price || j.fixed_price || j.base_price || j.harga || 0) }}
                    </p>
                  </div>
                  <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-emerald-50 text-emerald-600 shrink-0">
                    Jasa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Nilai & Stok Voucher -->
        <div
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
            <i class="pi pi-tag text-merchant-primary"></i>
            Nilai & Stok Voucher
          </h3>

          <div class="space-y-4">
            <TextField
              v-if="voucher_type === 'percent'"
              name="value"
              label="Nilai"
              type="number"
              placeholder="0"
              suffix="%"
              v-model.number="value"
              required
            />

            <TextField
              v-else
              name="value"
              label="Nilai"
              type="number"
              placeholder="0"
              prefix="Rp"
              v-model.number="value"
              required
            />
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="min_purchase_amount"
                label="Minimal Pembelian"
                type="number"
                placeholder="0"
                prefix="Rp"
                v-model.number="min_purchase_amount"
                required
              />
              <TextField
                v-show="voucher_type === 'percent'"
                name="max_discount_amount"
                label="Maksimal Besaran Diskon"
                type="number"
                prefix="Rp"
                v-model.number="max_discount_amount"
              />
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="usage_limit_per_user"
                label="Pemakaian Per User"
                type="number"
                placeholder="0"
                v-model.number="usage_limit_per_user"
                required
              />
              <TextField
                name="usage_limit"
                label="Total Stok Voucher"
                type="number"
                placeholder="0"
                v-model.number="usage_limit"
                min="0"
                max="9999"
                required
              />
            </div>
          </div>
        </div>

        <!-- Periode Tanggal -->
        <div
          class="grid grid-cols-1 gap-3 p-4 mb-2 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm sm:grid-cols-2"
        >
          <InputDateField
            name="voucher_start_date"
            label="Tanggal Mulai Berlaku"
            v-model="voucher_start_date"
            :min="new Date().toISOString().split('T')[0]"
            required
          />
          <InputDateField
            name="voucher_end_date"
            label="Tanggal Kadaluarsa"
            v-model="voucher_end_date"
            :min="new Date().toISOString().split('T')[0]"
            required
          />
        </div>

        <!-- Pengaturan Lainnya -->
        <div
          class="p-4 mb-2 space-y-3 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
            <i class="pi pi-eye-slash text-merchant-primary"></i>
            Pengaturan Lainnya
          </h3>
          <div class="flex flex-col gap-2">
            <label class="flex items-start gap-3 p-3.5 border border-gray-200 rounded-lg cursor-pointer bg-gray-50/70 hover:bg-gray-100/80 transition-colors">
              <input
                type="checkbox"
                v-model="is_hidden"
                class="appearance-none w-4.5 h-4.5 mt-0.5 shrink-0 border-1 border-muted-foreground rounded-sm bg-transparent cursor-pointer transition-all duration-200 checked:bg-merchant-primary checked:border-merchant-primary focus:outline-none focus:ring-2 focus:ring-merchant-primary focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
              />
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-900 select-none">Voucher Tersembunyi</span>
                <span class="text-xs text-gray-500 mt-0.5 select-none">Voucher tidak akan muncul di daftar promo pelanggan. Pelanggan harus memasukkan kode secara manual.</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Desktop Submit Button -->
        <div class="justify-end hidden gap-3 sm:flex">
          <Button
            @click="onSubmit"
            type="button"
            variant="merchant"
            size="md"
            :loading="loading"
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan Perubahan" }}</span>
          </Button>
        </div>

        <!-- Mobile Submit Button -->
        <div
          class="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 sm:hidden"
        >
          <Button
            @click="onSubmit"
            type="button"
            :loading="loading"
            variant="merchant"
            block
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan Perubahan" }}</span>
          </Button>
        </div>
      </Form>
    </div>
  </div>
</template>

<style scoped>
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
</style>
