<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import { Form } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import api from "@/libs/axios";

// File uploads
const imageFiles = ref([]);
const imagePreviews = ref([]);
const imageInputRef = ref(null);
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB sesuai backend
const MAX_IMAGE_COUNT = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const isAllowedImageFile = (file) => {
  const mime = String(file?.type || "").toLowerCase();
  if (ALLOWED_IMAGE_TYPES.includes(mime)) return true;
  const ext = file?.name?.split('.').pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

const validateSelectedImages = (files) => {
  for (const file of files || []) {
    const ext = file?.name?.split('.').pop()?.toLowerCase();
    if (!isAllowedImageFile(file)) {
      return `Format tidak didukung. Gunakan: JPG, PNG, WEBP`;
    }
    if (!file.size || file.size <= 0) {
      return `File tidak valid: ${file.name}`;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return `Ukuran maksimal 2MB per gambar`;
    }
  }
  return "";
};

const buildImagePreviews = (files) => {
  imagePreviews.value.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
  });
  imagePreviews.value = (files || []).map((file) => URL.createObjectURL(file));
};

// Format currency helper
const formatCurrency = (value) => {
  if (!value) return "";
  const num = Number(value);
  return ` ${num.toLocaleString("id-ID")}`;
};

const parseCurrency = (value) => {
  if (!value) return 0;
  return Number(String(value).replace(/\D/g, ""));
};

// Format number with Indonesian thousand separator (display only)
const formatNumberID = (value) => {
  const number = String(value || "").replace(/\D/g, "");
  if (!number) return "";
  return Number(number).toLocaleString("id-ID");
};

// Parse formatted number back to raw number
const parseNumberID = (value) => {
  return Number(String(value || "").replace(/\D/g, "")) || 0;
};

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : authStore.merchantSlug ?? null;
});

const currentMerchantId = computed(() => {
  const slug = currentMerchantSlug.value;
  if (slug) {
    const merchant = authStore.getMerchantBySlug(slug);
    return merchant?.id ?? authStore.merchantId ?? null;
  }
  return authStore.merchantId ?? null;
});

const currentMerchantData = computed(() => {
  if (currentMerchantSlug.value) return authStore.getMerchantBySlug(currentMerchantSlug.value);
  if (currentMerchantId.value) return authStore.getMerchantById(currentMerchantId.value);
  return null;
});

const merchantProfileFromApi = ref(null);

const normalizeAddressPart = (part) => {
  if (!part) return "";
  if (typeof part === "string") return part.trim();
  if (typeof part === "object") return String(part.name || part.label || part.value || "").trim();
  return "";
};

const formatMerchantAddress = (merchant) => {
  if (!merchant) return "";
  const primaryAddress = merchant.primary_address || merchant.primaryAddress || merchant.address_primary ||
    (Array.isArray(merchant.addresses) ? merchant.addresses.find((addr) => addr?.is_primary) || merchant.addresses[0] : null);
  if (primaryAddress) {
    const parts = [
      normalizeAddressPart(primaryAddress.detail || primaryAddress.address),
      normalizeAddressPart(primaryAddress.village),
      normalizeAddressPart(primaryAddress.district),
      normalizeAddressPart(primaryAddress.city),
      normalizeAddressPart(primaryAddress.province),
    ].filter((item) => item && item.length > 0);
    if (parts.length) return parts.join(", ");
    if (typeof primaryAddress.full_address === "string") return primaryAddress.full_address.trim();
  }
  return merchant.full_address || merchant.address || merchant.alamat || "";
};

const merchantProfileAddress = computed(() => {
  return formatMerchantAddress(currentMerchantData.value) || formatMerchantAddress(merchantProfileFromApi.value);
});

const loadMerchantProfileAddress = async () => {
  if (!currentMerchantSlug.value) return;
  if (merchantProfileAddress.value) return;
  try {
    const { data } = await api.get(`/api/merchant/${currentMerchantSlug.value}/profile`);
    merchantProfileFromApi.value = data?.data ?? data ?? null;
  } catch (error) {
    console.error("[Createjasa] Gagal memuat profil merchant", error);
  }
};

const breadcrumbItems = computed(() => [
  { label: "Jasa", path: `/merchant-center/${currentMerchantSlug.value}/jasas` },
  { label: "Tambah Jasa" },
]);

const loading = ref(false);
import { useCategories } from "@/composables/useCategories";
const { categoriesLevel1, categoriesLevel2, fetchLevel1Categories, fetchSubCategories } = useCategories();
const jasaCategories = categoriesLevel1;
const jasaSubcategories = categoriesLevel2;
const formKey = ref(0);

// Submit state flags — prevent restore after submit
const isSubmitting = ref(false);
const isSubmittedSuccessfully = ref(false);
const queryParamsCleared = ref(false); // Track if URL query params were cleared
const SUBMIT_SUCCESS_KEY = computed(() => `jasa-create-submitted-${currentMerchantSlug.value || "default"}`);

const FORM_DRAFT_KEY = computed(() => `jasa-create-draft-${currentMerchantSlug.value || "default"}`);

const formData = ref({
  title: "",
  description: "",
  jasa_category_id: null,
  jasa_subcategory_id: null,
  fixed_price: 0,
  base_price: 0,
  operating_times: "",
  delivery_type: "in-store",
  booking_type: "keranjang", // keranjang | booking | konsultasi — SATU-SATUNYA field untuk cara pemesanan
  location_address: "",
  special_notes: "",
  payment_methods: ["cod"],
  status: "draft",
});

// Helper untuk menormalisasi payment_methods - defensive approach
const normalizePaymentMethods = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return ['cod'];
};

// Toggle payment method - pastikan hanya satu item yang berubah
const togglePaymentMethod = (method) => {
  const current = normalizePaymentMethods(formData.value.payment_methods);
  if (current.includes(method)) {
    formData.value.payment_methods = current.filter(item => item !== method);
  } else {
    formData.value.payment_methods = [...current, method];
  }
};

// Cek apakah metode pembayaran selected
const isPaymentMethodSelected = (method) => {
  return normalizePaymentMethods(formData.value.payment_methods).includes(method);
};

// Pastikan payment_methods selalu berupa array
formData.value.payment_methods = normalizePaymentMethods(formData.value.payment_methods);

// Validation schema
const validationSchema = yup.object({
  title: yup.string().required("Nama layanan wajib diisi")
    .min(5, "Nama layanan minimal 5 karakter")
    .max(70, "Nama layanan maksimal 70 karakter"),
  description: yup.string()
    .required("Deskripsi layanan wajib diisi")
    .min(10, "Minimal 10 karakter")
    .max(1000, "Deskripsi maksimal 1000 karakter"),
  jasa_category_id: yup.mixed().transform((value) => (value === "" || value === null ? null : Number(value))).nullable(),
  jasa_subcategory_id: yup.mixed().transform((value) => (value === "" || value === null ? null : Number(value))).nullable(),
  fixed_price: yup.number().transform((value) => (isNaN(value) || value === "" ? 0 : Number(value))).min(0),
  base_price: yup.number().transform((value) => (isNaN(value) || value === "" ? 0 : Number(value))).min(0),
  operating_times: yup.string().nullable(),
  delivery_type: yup.string().required("Tipe layanan wajib dipilih"),
  booking_type: yup.string().required("Pilih cara pemesanan terlebih dahulu").oneOf(['keranjang', 'booking', 'konsultasi'], "Pilih 'Keranjang', 'Booking' atau 'Konsultasi'"),
  location_address: yup.string().nullable(),
  special_notes: yup.string().nullable(),
  payment_methods: yup.array().nullable(),
  status: yup.string(),
});

const OPERATING_TIME_GROUPS = [
  { key: "morning", label: "Pagi", times: ["07.00", "08.00", "09.00", "10.00", "11.00"] },
  { key: "noon", label: "Siang", times: ["12.00", "13.00", "14.00"] },
  { key: "afternoon", label: "Sore", times: ["15.00", "16.00", "17.00"] },
  { key: "night", label: "Malam", times: ["18.00", "19.00", "20.00"] },
];

const allOperatingTimeOptions = OPERATING_TIME_GROUPS.flatMap((group) => group.times);

const selectedOperatingTimes = computed(() => {
  return String(formData.value.operating_times || "").split(",").map((time) => time.trim()).filter(Boolean).sort();
});

const customOperatingTime = ref("");

const setOperatingTimes = (nextTimes) => {
  const joined = [...new Set(nextTimes)].sort().join(",");
  formData.value.operating_times = joined;
};

const toggleOperatingTime = (time) => {
  const current = [...selectedOperatingTimes.value];
  const index = current.indexOf(time);
  if (index >= 0) current.splice(index, 1);
  else current.push(time);
  setOperatingTimes(current);
};

const isOperatingTimeSelected = (time) => selectedOperatingTimes.value.includes(time);

const isAllOperatingTimesSelected = computed(() => {
  if (!allOperatingTimeOptions.length) return false;
  return allOperatingTimeOptions.every((time) => selectedOperatingTimes.value.includes(time));
});

const toggleSelectAllOperatingTimes = () => {
  if (isAllOperatingTimesSelected.value) {
    setOperatingTimes([]);
    return;
  }
  setOperatingTimes(allOperatingTimeOptions);
};

const isGroupFullySelected = (groupTimes) => groupTimes.every((time) => selectedOperatingTimes.value.includes(time));

// Computed: Harga Tetap disabled saat booking_type = konsultasi
const isFixedPriceDisabled = computed(() => formData.value.booking_type === 'konsultasi');

const toggleGroupOperatingTimes = (groupTimes) => {
  const current = [...selectedOperatingTimes.value];
  const allSelected = groupTimes.every((time) => current.includes(time));
  if (allSelected) {
    setOperatingTimes(current.filter((time) => !groupTimes.includes(time)));
    return;
  }
  setOperatingTimes([...current, ...groupTimes]);
};

const addCustomOperatingTime = () => {
  const raw = String(customOperatingTime.value || "").trim();
  if (!raw) return;
  const match = raw.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (!match) {
    toast.error("Format jam tidak valid. Gunakan HH.MM atau HH:MM");
    return;
  }
  const hh = String(match[1]).padStart(2, "0");
  const mm = match[2];
  const normalized = `${hh}.${mm}`;
  const current = [...selectedOperatingTimes.value];
  if (!current.includes(normalized)) {
    current.push(normalized);
    setOperatingTimes(current);
    toast.success("Jam berhasil ditambahkan");
  } else {
    toast.info("Jam sudah ada");
  }
  customOperatingTime.value = "";
};

const loadCategories = fetchLevel1Categories;
const loadSubcategories = fetchSubCategories;

const JASA_ROOT_CATEGORY_NAME = "Jasa & Layanan";

const findJasaRootCategory = () => {
  const list = Array.isArray(jasaCategories.value) ? jasaCategories.value : [];

  return list.find((category) => {
    const name = String(category?.name || category?.label || "").trim().toLowerCase();
    return name === JASA_ROOT_CATEGORY_NAME.toLowerCase();
  });
};

const ensureJasaRootCategorySelected = async () => {
  if (!Array.isArray(jasaCategories.value) || jasaCategories.value.length === 0) {
    await loadCategories();
  }

  const jasaRootCategory = findJasaRootCategory();

  if (!jasaRootCategory) {
    toast.error("Kategori Jasa & Layanan tidak ditemukan");
    return false;
  }

  const categoryId = jasaRootCategory.value ?? jasaRootCategory.id;

  formData.value.jasa_category_id = categoryId;

  await loadSubcategories(categoryId);

  return true;
};

// Auto-save form — skip if submitting (prevents race condition with clearFormDraft)
watch(formData, (newData) => {
  if (isSubmitting.value || isSubmittedSuccessfully.value) return;
  try { localStorage.setItem(FORM_DRAFT_KEY.value, JSON.stringify(newData)); }
  catch (error) { console.error("Failed to save form draft:", error); }
}, { deep: true });

const restoreFormDraft = () => {
  // 🚫 Skip ALL restore if:
  // 1. Just submitted successfully — flag or sessionStorage
  if (isSubmittedSuccessfully.value) {
    isSubmittedSuccessfully.value = false;
    console.log('[Createjasa] Skip restore: just submitted successfully (flag)');
    return;
  }
  if (sessionStorage.getItem('jasa-create-just-submitted')) {
    sessionStorage.removeItem('jasa-create-just-submitted');
    console.log('[Createjasa] Skip restore: just submitted successfully (session)');
    return;
  }
  // 2. URL has query params — this means URL is carrying form data, which is wrong.
  if (Object.keys(route.query).length > 0 && !queryParamsCleared.value) {
    console.log('[Createjasa] Skip restore: URL has query params', route.query);
    return;
  }
  try {
    const saved = localStorage.getItem(FORM_DRAFT_KEY.value);
    if (saved) {
      const parsed = JSON.parse(saved);
      formData.value = { ...formData.value, ...parsed };
      if (parsed.jasa_category_id) loadSubcategories(parsed.jasa_category_id);
      formKey.value += 1;
      toast.info("Data form sebelumnya dipulihkan");
    }
  } catch (error) { console.error("Failed to restore form draft:", error); }
};

const clearFormDraft = () => {
  try { localStorage.removeItem(FORM_DRAFT_KEY.value); }
  catch (error) { console.error("Failed to clear form draft:", error); }
};

// Image handling
const handleImageChange = (e) => {
  const files = e.target.files;
  if (files && files.length) {
    const picked = Array.from(files);
    const merged = [...imageFiles.value];
    const rejected = [];

    picked.forEach((file) => {
      const ext = file?.name?.split('.').pop()?.toLowerCase();
      if (!isAllowedImageFile(file)) {
        rejected.push(`${file.name}: format JPG/PNG/WEBP`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejected.push(`${file.name}: maksimal 2MB`);
        return;
      }
      const exists = merged.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
      if (!exists) merged.push(file);
    });

    if (merged.length > MAX_IMAGE_COUNT) {
      toast.error(`Maksimal ${MAX_IMAGE_COUNT} gambar`);
      return;
    }
    if (rejected.length > 0) toast.error(rejected[0]);

    imageFiles.value = merged;
    buildImagePreviews(imageFiles.value);
    imageInputRef.value.value = "";
  }
};

const removeSelectedImage = (index) => {
  if (index < 0 || index >= imageFiles.value.length) return;
  imageFiles.value.splice(index, 1);
  buildImagePreviews(imageFiles.value);
};



const submitForm = async () => {
  console.log('=== SUBMIT START ===');
  console.log('1. currentMerchantSlug:', currentMerchantSlug.value);
  console.log('2. currentMerchantId:', currentMerchantId.value);
  console.log('3. isAuthenticated:', authStore.isAuthenticated);
  console.log('4. booking_type:', formData.value.booking_type);
  console.log('5. operating_times:', formData.value.operating_times);
  console.log('6. fixed_price:', formData.value.fixed_price);
  console.log('7. base_price:', formData.value.base_price);

  if (!currentMerchantSlug.value) {
    console.log('❌ Gagal: Merchant slug tidak ditemukan');
    toast.error("Merchant slug tidak ditemukan"); return;
  }
  if (!currentMerchantId.value) {
    console.log('❌ Gagal: Merchant ID tidak ditemukan');
    toast.error("Merchant ID tidak ditemukan"); return;
  }
  if (!authStore.isAuthenticated) {
    console.log('❌ Gagal: Belum login');
    toast.error("Silakan login terlebih dahulu."); router.push("/login"); return;
  }

  // Validasi: booking_type wajib dipilih
  if (!formData.value.booking_type) {
    console.log('❌ Gagal: Cara pemesanan belum dipilih');
    toast.error("Pilih cara pemesanan terlebih dahulu");
    return;
  }

  // Validasi: booking_type = booking wajib ada jam layanan
  if (formData.value.booking_type === 'booking' && !formData.value.operating_times?.trim()) {
    console.log('❌ Gagal: Booking tanpa jam layanan');
    toast.error("Jam layanan wajib diisi untuk Booking");
    return;
  }

  // IMPORTANT: Use ?? instead of || to handle 0 values (0 is falsy)
  let fixedPrice = Number(formData.value.fixed_price ?? 0);
  let basePrice = Number(formData.value.base_price ?? 0);

  // Logic Harga untuk konsultasi: Harga Tetap disabled& dikosongkan
  if (formData.value.booking_type === 'konsultasi') {
    fixedPrice = 0;
    formData.value.fixed_price = 0;
    // base_price wajib diisi untuk konsultasi
    if (!basePrice) {
      console.log('❌ Gagal: Konsultasi tanpa Harga Mulai Dari');
      toast.error("Harga Mulai Dari wajib diisi untuk Konsultasi");
      return;
    }
  } else {
    // Aturan pilih salah satu harga (keranjang/booking)
    if (!fixedPrice && !basePrice) {
      console.log('❌ Gagal: Tidak ada harga diisi');
      toast.error("Pilih salah satu: Harga Tetap atau Harga Mulai Dari");
      return;
    }
    if (fixedPrice && basePrice) {
      console.log('❌ Gagal: Kedua harga terisi');
      toast.error("Jangan isi keduanya sekaligus");
      return;
    }
  }

  console.log("[Createjasa] Prices parsed:", { fixedPrice, basePrice });
  console.log('✅ Semua validasi awal PASSED');

  isSubmitting.value = true;
  loading.value = true;
  try {
    const categoryReady = await ensureJasaRootCategorySelected();
    if (!categoryReady) return;

    const fd = new FormData();

    // Text fields - use ?? for proper 0 handling
    fd.set("title", formData.value.title || "");
    fd.set("description", formData.value.description || "");
    // IMPORTANT: Always send numeric values, never empty string for price columns
    fd.set("fixed_price", String(fixedPrice));
    fd.set("base_price", String(basePrice));
    // Legacy price field mirrors whichever price is set
    fd.set("price", String(fixedPrice > 0 ? fixedPrice : basePrice));
    fd.set("delivery_type", formData.value.delivery_type || "in-store");

    const bookingType = formData.value.booking_type || "keranjang";

    const caraPemesananMap = {
      keranjang: "langsung_pesan",
      booking: "booking",
      konsultasi: "memerlukan_konsultasi",
    };

    const caraPemesanan = caraPemesananMap[bookingType] || "langsung_pesan";

    // Kirim semua field kompatibel agar create tidak jatuh ke default keranjang
    fd.set("booking_type", bookingType);
    fd.set("order_method", bookingType);
    fd.set("cara_pemesanan", caraPemesanan);

    fd.set("location_address", formData.value.location_address || "");
    // Operating times: send as JSON array for booking, empty for others
    if (formData.value.booking_type === 'booking') {
      const times = selectedOperatingTimes.value;
      fd.set("operating_times", JSON.stringify(times));
      console.log("[Createjasa] Booking operating_times:", times);
    } else {
      fd.set("operating_times", "");
    }
    fd.set("operating_days", "1,2,3,4,5,6,7"); // Default all days
    fd.set("special_notes", formData.value.special_notes || "");
    fd.set("payment_methods", normalizePaymentMethods(formData.value.payment_methods).join(","));
    fd.set("status", "draft");

    console.log("[Createjasa] Price fields:", {
      fixed_price: fd.get("fixed_price"),
      base_price: fd.get("base_price"),
      price: fd.get("price")
    });

    if (formData.value.jasa_category_id) {
      fd.set("jasa_category_id", String(formData.value.jasa_category_id));
    }
    if (formData.value.jasa_subcategory_id) {
      fd.set("jasa_subcategory_id", String(formData.value.jasa_subcategory_id));
    }

    // Debug: log all FormData entries
    console.log("[Createjasa] FormData entries:");
    for (let [key, value] of fd.entries()) {
      console.log(`  ${key}:`, typeof value === "object" ? value.name : value);
    }

    console.log("[Createjasa] FormData ready, sending...");
    console.log("[Createjasa] API endpoint:", `/api/merchants/${currentMerchantSlug.value}/jasas`);

    // === UPLOAD GAMBAR: hanya images[] berisi File object ===
    const filesToUpload = (imageFiles.value || [])
      .filter((file) => file instanceof File)
      .slice(0, 10);

    console.log('selectedImages (imageFiles):', imageFiles.value);

    filesToUpload.forEach((file) => {
      fd.append('images[]', file);
    });

    // Debug: log semua FormData entries
    for (const [key, value] of fd.entries()) {
      console.log('FORMDATA:', key, value instanceof File ? `File(${value.name})` : value);
    }

    const { data: response } = await api.post(
      `/api/merchants/${currentMerchantSlug.value}/jasas`,
      fd
    );
    console.log('Response create jasa:', response);

    // ✅ Mark as submitted BEFORE clearing anything
    isSubmittedSuccessfully.value = true;
    sessionStorage.setItem('jasa-create-just-submitted', '1');

    // Clear draft
    clearFormDraft();

    const createdJasa = response?.data;
    const message = response?.message || "Jasa berhasil disimpan";
    toast.success(message);
    router.push(`/merchant-center/${currentMerchantSlug.value}/jasas`);
  } catch (error) {
    console.error('Error create jasa:', error.response?.data || error);
    isSubmitting.value = false;

    // Show Laravel validation errors
    const errors = error.response?.data?.errors;
    if (errors && Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, messages]) => {
        messages.forEach((msg) => {
          toast.error(`${field}: ${msg}`);
        });
      });
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error("Gagal menyimpan layanan jasa. Silakan coba lagi.");
    }
  } finally {
    isSubmitting.value = false;
    loading.value = false;
  }
};

onMounted(async () => {
  // ✅ Clear query params immediately on mount — URL should never carry form data for create page
  if (Object.keys(route.query).length > 0) {
    console.log('[Createjasa] Clearing query params on mount:', route.query);
    queryParamsCleared.value = true;
    await router.replace({ path: route.path, query: {} });
  } else {
    queryParamsCleared.value = true;
  }

  await ensureJasaRootCategorySelected();
  loadMerchantProfileAddress();
  restoreFormDraft();
  await ensureJasaRootCategorySelected();
});

onBeforeUnmount(() => {
  imagePreviews.value.forEach((url) => { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } });
  // NOTE: Do NOT clear sessionStorage flag here — it needs to persist so restoreFormDraft()
  // skips on the next visit (e.g. if user presses back, or if component re-mounts).
  // The flag is cleared at the START of restoreFormDraft() instead.
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <div class="max-w-3xl mx-auto px-4 py-6">
      <!-- Header Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div class="bg-gradient-to-r from-merchant-primary to-merchant-primary/80 px-6 py-5">
          <Breadcrumb :items="breadcrumbItems" textClass="text-white/80" />
          <h1 class="mt-3 text-2xl font-bold text-white">Buat Layanan Jasa</h1>
          <p class="mt-1 text-sm text-white/80">Tambahkan layanan baru untuk bisnis Anda</p>
        </div>
      </div>

      <Form :key="formKey" :validation-schema="validationSchema" :initial-values="formData">
        <form @submit.prevent="submitForm" class="space-y-5">

          <!-- Section 1: Info Dasar -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="text-sm font-bold text-blue-600">1</span>
              </div>
              <h2 class="text-base font-semibold text-slate-800">Informasi Dasar</h2>
            </div>

            <div class="space-y-4">
              <div>
                <TextField name="title" :modelValue="formData.title" @update:modelValue="(val) => { formData.title = val; }" label="Nama Layanan" placeholder="Contoh: Jasa Kebersihan Rumah" required />
                <div class="flex justify-end mt-1">
                  <span :class="formData.title?.length > 70 ? 'text-red-500' : formData.title?.length >= 5 ? 'text-emerald-500' : 'text-slate-400'" class="text-xs font-medium">
                    {{ formData.title?.length || 0 }} / 70 karakter
                  </span>
                </div>
              </div>

              <div>
                <SelectField
                  name="jasa_subcategory_id"
                  label="Jenis Layanan"
                  :placeholder="jasaSubcategories.length ? 'Pilih jenis layanan...' : 'Tidak tersedia'"
                  :options="jasaSubcategories.map((s) => ({
                    value: s.value ?? s.id,
                    label: s.label ?? s.name
                  }))"
                  v-model="formData.jasa_subcategory_id"
                  :disabled="!jasaSubcategories.length"
                />
                <p class="mt-1 text-xs text-slate-400">
                  Kategori utama otomatis: Jasa & Layanan
                </p>
              </div>

              <div>
                <label for="description" class="block text-sm font-semibold text-slate-700 mb-1.5">
                  Deskripsi Layanan <span class="text-red-500">*</span>
                </label>
                <textarea id="description" name="description" v-model="formData.description" placeholder="Jelaskan detail layanan Anda secara lengkap..." class="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows="4"></textarea>
                <div class="flex items-center justify-between mt-1.5">
                  <p class="text-xs text-slate-500">Minimal 50, maksimal 1000 karakter</p>
                  <span :class="formData.description?.length < 50 ? 'text-amber-500' : formData.description?.length > 1000 ? 'text-red-500' : 'text-emerald-500'" class="text-xs font-semibold">
                    {{ formData.description?.length || 0 }} karakter
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Cara Pemesanan -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center">
                <span class="text-sm font-bold text-pink-600">2</span>
              </div>
              <h2 class="text-base font-semibold text-slate-800">Cara Pemesanan</h2>
            </div>

            <div class="space-y-2.5">
              <label v-for="opt in [
                { value: 'keranjang', icon: 'pi-shopping-cart', label: 'Keranjang', desc: 'Tanpa jadwal, langsung checkout' },
                { value: 'booking', icon: 'pi-calendar', label: 'Booking', desc: 'Pilih tanggal & jam dulu' },
                { value: 'konsultasi', icon: 'pi-comments', label: 'Konsultasi', desc: 'Chat untuk negosiasi' }
              ]" :key="opt.value"
                class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition"
                :class="formData.booking_type === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'"
                @click="formData.booking_type = opt.value">
                <div class="w-10 h-10 rounded-full flex items-center justify-center"
                  :class="formData.booking_type === opt.value ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'">
                  <i :class="['pi', opt.icon]"></i>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-slate-700">{{ opt.label }}</p>
                  <p class="text-xs text-slate-400">{{ opt.desc }}</p>
                </div>
                <div v-if="formData.booking_type === opt.value" class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <i class="pi pi-check text-white text-[10px]"></i>
                </div>
              </label>
            </div>

            <div v-if="formData.booking_type === 'booking'" class="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p class="text-sm text-amber-700 flex items-start gap-2">
                <i class="pi pi-info-circle mt-0.5"></i>
                <span><strong>Booking:</strong> Jam layanan wajib diisi agar customer bisa memilih jadwal</span>
              </p>
            </div>
            <div v-else-if="formData.booking_type === 'konsultasi'" class="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p class="text-sm text-purple-700 flex items-start gap-2">
                <i class="pi pi-comments mt-0.5"></i>
                <span><strong>Konsultasi:</strong> Customer chat untuk negosiasi harga & jadwal</span>
              </p>
            </div>
          </div>

          <!-- Section 3: Harga -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <span class="text-sm font-bold text-emerald-600">3</span>
              </div>
              <h2 class="text-base font-semibold text-slate-800">Harga Layanan</h2>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Fixed Price -->
              <div>
                <label for="fixed_price" class="block text-sm font-semibold text-slate-700 mb-1.5">
                  Harga Tetap <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                  <input
                    id="fixed_price"
                    name="fixed_price"
                    :value="formatNumberID(formData.fixed_price)"
                    @input="(e) => {
                      formData.fixed_price = parseNumberID(e.target.value);
                      if (formData.fixed_price > 0) formData.base_price = 0;
                    }"
                    type="text"
                    inputmode="numeric"
                    placeholder="0"
                    class="w-full pl-10 pr-4 py-3 text-sm border rounded-xl focus:outline-none transition disabled:bg-slate-50"
                    :class="isFixedPriceDisabled ? 'border-slate-200 bg-slate-50' : formData.base_price > 0 ? 'border-slate-200 bg-slate-50' : formData.fixed_price > 0 && formData.base_price > 0 ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'"
                    :disabled="isFixedPriceDisabled"
                  />
                </div>
                <p v-if="isFixedPriceDisabled" class="mt-1 text-xs text-purple-500">Tidak berlaku untuk Konsultasi</p>
              </div>

              <!-- Base Price -->
              <div>
                <label for="base_price" class="block text-sm font-semibold text-slate-700 mb-1.5">
                  Harga Mulai Dari <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                  <input
                    id="base_price"
                    name="base_price"
                    :value="formatNumberID(formData.base_price)"
                    @input="(e) => {
                      formData.base_price = parseNumberID(e.target.value);
                      if (formData.base_price > 0 && !isFixedPriceDisabled) formData.fixed_price = 0;
                    }"
                    type="text"
                    inputmode="numeric"
                    placeholder="0"
                    class="w-full pl-10 pr-4 py-3 text-sm border rounded-xl focus:outline-none transition disabled:bg-slate-50"
                    :class="formData.fixed_price > 0 ? 'border-slate-200 bg-slate-50' : formData.fixed_price > 0 && formData.base_price > 0 ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'"
                    :disabled="formData.fixed_price > 0"
                  />
                </div>
                <p v-if="formData.booking_type === 'konsultasi'" class="mt-1 text-xs text-purple-500">Wajib diisi untuk Konsultasi</p>
              </div>
            </div>

            <!-- Info -->
            <p v-if="formData.booking_type === 'konsultasi'" class="mt-2 text-xs text-purple-600 flex items-center gap-1.5">
              <i class="pi pi-info-circle text-purple-400"></i>
              Konsultasi menggunakan Harga Mulai Dari saja
            </p>
            <p v-else class="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <i class="pi pi-info-circle text-slate-400"></i>
              Pilih salah satu saja
            </p>
          </div>

          <!-- Section 4: Gambar -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                <span class="text-sm font-bold text-purple-600">4</span>
              </div>
              <div class="flex-1">
                <h2 class="text-base font-semibold text-slate-800">Gambar Layanan</h2>
                <p class="text-xs text-slate-400">JPG, PNG, WEBP - Maks 2MB - Maks 10 foto</p>
              </div>
            </div>

            <!-- Upload Area -->
            <div class="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-purple-400 transition cursor-pointer bg-slate-50/50" @click="imageInputRef?.click()">
              <div class="flex flex-col items-center gap-2">
                <div class="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                  <i class="pi pi-cloud-upload text-2xl text-purple-500"></i>
                </div>
                <p class="text-sm font-medium text-slate-700">Klik untuk upload gambar</p>
                <p class="text-xs text-slate-400">atau drag & drop file di sini</p>
              </div>
            </div>
            <input id="images" type="file" ref="imageInputRef" accept="image/jpeg,image/jpg,image/png,image/webp" multiple class="hidden" @change="handleImageChange" />

            <!-- Image Preview Grid -->
            <div v-if="imageFiles.length" class="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
              <div v-for="(file, idx) in imageFiles" :key="idx" class="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-50">
                <img :src="imagePreviews[idx]" alt="preview" class="w-full h-full object-cover" />
                <span v-if="idx === 0" class="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow z-10">Cover</span>
                <button type="button" @click.stop="removeSelectedImage(idx)" class="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow z-10">
                  <i class="pi pi-times text-[10px]"></i>
                </button>
              </div>
            </div>

            <!-- Selected Count -->
            <div class="mt-3 flex items-center justify-between">
              <p v-if="imageFiles.length" class="text-xs text-slate-500">
                <span class="font-medium text-slate-700">{{ imageFiles.length }}</span> gambar dipilih
              </p>
              <p v-else class="text-xs text-slate-400">
                Belum ada gambar
              </p>
              <p class="text-xs text-slate-400">{{ imageFiles.length }}/{{ MAX_IMAGE_COUNT }} foto</p>
            </div>
          </div>

          <!-- Section 5: Lokasi & Jadwal -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                <span class="text-sm font-bold text-orange-600">5</span>
              </div>
              <h2 class="text-base font-semibold text-slate-800">Lokasi & Jadwal</h2>
            </div>

            <div class="space-y-4">
              <!-- Tempat Layanan Radio Cards -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Tempat Layanan</label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label v-for="opt in [
                    { value: 'in-store', icon: 'pi-home', label: 'Di Tempat UMKM' },
                    { value: 'on-site', icon: 'pi-map-marker', label: 'Ke Rumah Pelanggan' },
                    { value: 'online', icon: 'pi-globe', label: 'Online' }
                  ]" :key="opt.value"
                    class="flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition text-center sm:text-left"
                    :class="formData.delivery_type === opt.value ? 'border-merchant-primary bg-merchant-primary/5' : 'border-slate-200 hover:border-slate-300'"
                    @click="formData.delivery_type = opt.value">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      :class="formData.delivery_type === opt.value ? 'bg-merchant-primary text-white' : 'bg-slate-100 text-slate-500'">
                      <i :class="['pi', opt.icon]"></i>
                    </div>
                    <span class="text-sm font-medium" :class="formData.delivery_type === opt.value ? 'text-merchant-primary' : 'text-slate-600'">{{ opt.label }}</span>
                  </label>
                </div>
              </div>

              <!-- Alamat UMKM (auto-filled) -->
              <div v-if="formData.delivery_type === 'in-store'">
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Alamat UMKM</label>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p class="text-sm text-slate-600">{{ merchantProfileAddress || formData.location_address || 'Alamat belum tersedia' }}</p>
                </div>
                <p class="mt-1 text-xs text-slate-400">Otomatis dari profil bisnis Anda</p>
              </div>

              <!-- Online Info -->
              <div v-if="formData.delivery_type === 'online'" class="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p class="text-sm text-blue-700 flex items-center gap-2">
                  <i class="pi pi-info-circle"></i>
                  Layanan dilakukan secara online, alamat tidak diperlukan
                </p>
              </div>

              <!-- Jam Layanan (khusus booking) -->
              <div v-if="formData.booking_type === 'booking'" class="mt-2">
                <label class="block text-sm font-semibold text-slate-700 mb-2">
                  Jam Layanan <span class="text-red-500">*</span>
                </label>

                <div class="border border-slate-200 rounded-xl p-4">
                  <!-- Quick Select -->
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs text-slate-500">Pilih jam operasional</span>
                    <button type="button" @click="toggleSelectAllOperatingTimes()" class="px-3 py-1 text-xs font-medium rounded-full transition" :class="isAllOperatingTimesSelected ? 'bg-merchant-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                      {{ isAllOperatingTimesSelected ? 'Batalkan Semua' : 'Pilih Semua' }}
                    </button>
                  </div>

                  <!-- Time Groups as Simple Rows -->
                  <div class="space-y-2">
                    <div v-for="group in OPERATING_TIME_GROUPS" :key="group.key" class="flex items-center gap-2">
                      <span class="w-12 text-xs font-medium text-slate-500">{{ group.label }}</span>
                      <div class="flex flex-wrap gap-1.5 flex-1">
                        <button v-for="time in group.times" :key="time" type="button" @click="toggleOperatingTime(time)" class="px-2.5 py-1.5 text-xs rounded-lg border transition min-w-[52px]" :class="isOperatingTimeSelected(time) ? 'bg-merchant-primary text-white border-merchant-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'">
                          {{ time }}
                        </button>
                      </div>
                      <button type="button" @click="toggleGroupOperatingTimes(group.times)" class="text-[10px] px-2 py-1 rounded border transition shrink-0" :class="isGroupFullySelected(group.times) ? 'bg-slate-200 text-slate-600' : 'bg-slate-50 text-slate-400'">
                        {{ isGroupFullySelected(group.times) ? 'Uncheck' : 'Check' }}
                      </button>
                    </div>
                  </div>

                  <!-- Selected Times -->
                  <div v-if="selectedOperatingTimes.length" class="mt-3 pt-3 border-t border-slate-200">
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="time in selectedOperatingTimes" :key="time" class="px-2.5 py-1 text-xs font-medium bg-merchant-primary text-white rounded-lg">{{ time }}</span>
                    </div>
                  </div>
                  <p v-else class="mt-2 text-xs text-amber-500 flex items-center gap-1">
                    <i class="pi pi-exclamation-circle"></i>
                    Jam layanan belum dipilih
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 6: Metode Pembayaran -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                <span class="text-sm font-bold text-violet-600">6</span>
              </div>
              <h2 class="text-base font-semibold text-slate-800">Metode Pembayaran</h2>
            </div>

            <div class="space-y-2">
              <label
                class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border transition cursor-pointer"
                :class="isPaymentMethodSelected('cod') ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300'"
                @click.prevent="togglePaymentMethod('cod')"
              >
                <div class="mt-0.5 w-4 h-4 border-2 rounded flex items-center justify-center transition"
                  :class="isPaymentMethodSelected('cod') ? 'bg-violet-600 border-violet-600' : 'border-slate-300'">
                  <svg v-if="isPaymentMethodSelected('cod')" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700">COD (Bayar di Tempat)</p>
                  <p class="text-xs text-slate-400">Customer bayar langsung saat layanan selesai</p>
                </div>
              </label>

              <label
                class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border transition cursor-pointer"
                :class="isPaymentMethodSelected('ONLINE_XENDIT') ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300'"
                @click.prevent="togglePaymentMethod('ONLINE_XENDIT')"
              >
                <div class="mt-0.5 w-4 h-4 border-2 rounded flex items-center justify-center transition"
                  :class="isPaymentMethodSelected('ONLINE_XENDIT') ? 'bg-violet-600 border-violet-600' : 'border-slate-300'">
                  <svg v-if="isPaymentMethodSelected('ONLINE_XENDIT')" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700">Online (Xendit)</p>
                  <p class="text-xs text-slate-400">Pembayaran via QRIS, VA, E-Wallet — otomatis terkonfirmasi</p>
                </div>
              </label>
            </div>
            <p v-if="normalizePaymentMethods(formData.payment_methods).length === 0" class="text-xs text-red-500 mt-2">
              Pilih minimal 1 metode pembayaran.
            </p>
          </div>

          <!-- Info Draft -->
          <div class="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <i class="pi pi-file-edit text-sm"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-amber-800">Layanan disimpan sebagai Draft</p>
                <p class="text-xs text-amber-600 mt-0.5">Setelah disimpan, Anda bisa publish dari halaman Daftar Jasa agar tampil ke customer</p>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <Button type="button" variant="muted-outline" @click="router.back()" class="flex-1 py-3">
              <i class="mr-2 pi pi-arrow-left"></i>Batal
            </Button>
            <Button type="button" variant="primary" :disabled="loading" :loading="loading" class="flex-1 py-3" @click="submitForm()">
              <i class="mr-2 pi pi-check"></i>{{ loading ? "Menyimpan..." : "Simpan Jasa" }}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  </div>
</template>

<style scoped>
textarea { resize: vertical; }
</style>
