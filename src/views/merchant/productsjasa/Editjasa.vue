<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import { Form, Field } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import api from "@/libs/axios";
import { getImageUrl } from "@/libs/getImageUrl.js";

// Format currency helper
const formatCurrency = (value) => {
  if (!value) return "";
  const num = Number(value);
  return `Rp ${num.toLocaleString("id-ID")}`;
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
  if (currentMerchantSlug.value) {
    return authStore.getMerchantBySlug(currentMerchantSlug.value);
  }
  if (currentMerchantId.value) {
    return authStore.getMerchantById(currentMerchantId.value);
  }
  return null;
});

const getAddressPart = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return value.name || value.nama || value.label || value.value || '';
  }
  return '';
};

const formatAddress = (address) => {
  if (!address) return '';

  const parts = [
    getAddressPart(address.detail),
    getAddressPart(address.village),
    getAddressPart(address.district),
    getAddressPart(address.city),
    getAddressPart(address.province),
  ].filter(Boolean);

  return parts.join(', ');
};

const formatMerchantAddress = (merchant) => {
  if (!merchant) return "";

  // Try primary_address (snake_case from API) or primaryAddress (camelCase)
  const primaryAddress = merchant.primary_address || merchant.primaryAddress || merchant.address_primary;
  if (primaryAddress) {
    const formatted = formatAddress(primaryAddress);
    if (formatted) return formatted;
    if (primaryAddress.full_address) return primaryAddress.full_address;
  }

  return merchant.address || merchant.alamat || merchant.full_address || "";
};

const merchantProfileAddress = computed(() => {
  // Try currentMerchantData first (from auth store), then from loaded jasa's merchant
  return formatMerchantAddress(currentMerchantData.value)
    || formatMerchantAddress(currentJasa.value?.merchant);
});

const currentJasaId = computed(() => {
  return route.params.id ? Number(route.params.id) : null;
});

// Store loaded jasa data to access merchant address
const currentJasa = ref(null);

const breadcrumbItems = computed(() => [
  {
    label: "Jasa",
    path: `/merchant-center/${currentMerchantSlug.value}/jasas`,
  },
  { label: "Edit Jasa" },
]);

// State
const loading = ref(false);
const loadingData = ref(true);
const statusActionLoading = ref(false);
const jasaCategories = ref([]);
const jasaSubcategories = ref([]);
const formKey = ref(0);

// LocalStorage key for form draft (unique per jasa ID)
const FORM_DRAFT_KEY = computed(
  () => `jasa-edit-draft-${currentJasaId.value}`
);

// Image management
const existingImages = ref([]);
const imagesToRemove = ref([]);
const newImageFiles = ref([]); // Array<File> untuk gambar baru yang diupload
const newImagePreviews = ref([]); // Array<string> blob URLs untuk preview gambar baru
const imageInputRef = ref(null);
const currentCoverId = ref(null);
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const isAllowedImageFile = (file) => {
  const mime = String(file?.type || "").toLowerCase();
  if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime)) {
    return true;
  }
  return ALLOWED_IMAGE_EXTENSIONS.test(String(file?.name || ""));
};

const validateSelectedImages = (files) => {
  for (const file of files || []) {
    if (!isAllowedImageFile(file)) {
      return `${file.name}: format harus JPG/PNG/WEBP`;
    }
    if (!file.size || file.size <= 0) {
      return `${file.name}: file tidak valid`;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return `${file.name}: ukuran maksimal 2MB`;
    }
  }
  return "";
};

// Helper untuk membuat URL preview satu kali per file
const buildNewImagePreviews = (files) => {
  // Bersihkan URL lama agar tidak bocor memori
  newImagePreviews.value.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
  });

  newImagePreviews.value = files.map((file) => URL.createObjectURL(file));
};

// Form data
const formData = ref({
  title: "",
  description: "",
  jasa_category_id: null,
  jasa_subcategory_id: null,
  fixed_price: 0,
  base_price: 0,
  service_type: "di_tempat_umkm", // online | di_tempat_umkm | ke_rumah_pelanggan
  booking_type: "keranjang",  // keranjang / booking / konsultasi (FE format)
  location_address: "",
  special_notes: "",
  operating_times: "",
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
  title: yup.string().required("Nama layanan wajib diisi"),
  description: yup.string().nullable(),
  jasa_category_id: yup.number().required("Kategori layanan wajib dipilih"),
  jasa_subcategory_id: yup
    .number()
    .transform((value, originalValue) => {
      return originalValue === "" || originalValue === null ? null : value;
    })
    .nullable(),
  // Harga: wajib pilih salah satu, tidak boleh keduanya sekaligus > 0
  fixed_price: yup
    .number()
    .min(0)
    .test(
      "fixed-or-base-required",
      "Isi salah satu: harga tetap ATAU harga mulai dari",
      function (value) {
        const { base_price } = this.parent;
        const fixed = Number(value || 0);
        const base = Number(base_price || 0);
        return fixed > 0 || base > 0;
      }
    )
    .test(
      "not-both-fixed-and-base",
      "Pilih salah satu: jangan isi keduanya sekaligus",
      function (value) {
        const { base_price } = this.parent;
        const fixed = Number(value || 0);
        const base = Number(base_price || 0);
        const fixedFilled = fixed > 0;
        const baseFilled = base > 0;
        return !(fixedFilled && baseFilled);
      }
    ),
  base_price: yup
    .number()
    .min(0)
    .test(
      "base-or-fixed-required",
      "Isi salah satu: harga tetap ATAU harga mulai dari",
      function (value) {
        const { fixed_price } = this.parent;
        const base = Number(value || 0);
        const fixed = Number(fixed_price || 0);
        return base > 0 || fixed > 0;
      }
    )
    .test(
      "not-both-base-and-fixed",
      "Pilih salah satu: jangan isi keduanya sekaligus",
      function (value) {
        const { fixed_price } = this.parent;
        const base = Number(value || 0);
        const fixed = Number(fixed_price || 0);
        const baseFilled = base > 0;
        const fixedFilled = fixed > 0;
        return !(baseFilled && fixedFilled);
      }
    ),
  service_type: yup.string().required("Tipe layanan wajib dipilih"),
  booking_type: yup.string().required("Cara pemesanan wajib dipilih").oneOf(['keranjang', 'booking', 'konsultasi'], "Pilih 'Keranjang', 'Booking', atau 'Konsultasi'"),
  operating_times: yup.string().nullable().max(255),
  location_address: yup.string().nullable().max(255),
  special_notes: yup.string().nullable(),
  payment_methods: yup.string().nullable(),
  status: yup.string(),
});

watch(
  [() => formData.value.service_type, merchantProfileAddress],
  ([serviceType, profileAddress]) => {
    if (serviceType === "di_tempat_umkm") {
      formData.value.location_address = profileAddress || "";
    }
    if (serviceType === "online" || serviceType === "ke_rumah_pelanggan") {
      formData.value.location_address = "";
    }
  },
  { immediate: true }
);

const OPERATING_TIME_GROUPS = [
  {
    key: "morning",
    label: "Pagi",
    times: ["07.00", "08.00", "09.00", "10.00", "11.00"],
  },
  { key: "noon", label: "Siang", times: ["12.00", "13.00", "14.00"] },
  { key: "afternoon", label: "Sore", times: ["15.00", "16.00", "17.00"] },
  { key: "night", label: "Malam", times: ["18.00", "19.00", "20.00"] },
];

const allOperatingTimeOptions = OPERATING_TIME_GROUPS.flatMap(
  (group) => group.times
);

const selectedOperatingTimes = computed(() => {
  return String(formData.value.operating_times || "")
    .split(",")
    .map((time) => time.trim())
    .filter(Boolean)
    .sort();
});

const customOperatingTime = ref("");

const setOperatingTimes = (nextTimes, setFieldValue) => {
  const joined = [...new Set(nextTimes)].sort().join(",");
  formData.value.operating_times = joined;
  if (typeof setFieldValue === "function") {
    setFieldValue("operating_times", joined);
  }
};

const toggleOperatingTime = (time, setFieldValue) => {
  const current = [...selectedOperatingTimes.value];
  const index = current.indexOf(time);

  if (index >= 0) {
    current.splice(index, 1);
  } else {
    current.push(time);
  }

  setOperatingTimes(current, setFieldValue);
};

const isOperatingTimeSelected = (time) =>
  selectedOperatingTimes.value.includes(time);

const isAllOperatingTimesSelected = computed(() => {
  if (!allOperatingTimeOptions.length) return false;
  return allOperatingTimeOptions.every((time) =>
    selectedOperatingTimes.value.includes(time)
  );
});

const toggleSelectAllOperatingTimes = (setFieldValue) => {
  if (isAllOperatingTimesSelected.value) {
    setOperatingTimes([], setFieldValue);
    return;
  }

  setOperatingTimes(allOperatingTimeOptions, setFieldValue);
};

const isGroupFullySelected = (groupTimes) =>
  groupTimes.every((time) => selectedOperatingTimes.value.includes(time));

const toggleGroupOperatingTimes = (groupTimes, setFieldValue) => {
  const current = [...selectedOperatingTimes.value];
  const allSelected = groupTimes.every((time) => current.includes(time));

  if (allSelected) {
    setOperatingTimes(
      current.filter((time) => !groupTimes.includes(time)),
      setFieldValue
    );
    return;
  }

  setOperatingTimes([...current, ...groupTimes], setFieldValue);
};

const addCustomOperatingTime = (setFieldValue) => {
  const raw = String(customOperatingTime.value || "").trim();
  if (!raw) return;

  const match = raw.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (!match) {
    toast.error(
      "Format jam tidak valid. Gunakan HH.MM atau HH:MM (contoh: 09.30)"
    );
    return;
  }

  const hh = String(match[1]).padStart(2, "0");
  const mm = match[2];
  const normalized = `${hh}.${mm}`;
  const current = [...selectedOperatingTimes.value];

  if (current.includes(normalized)) {
    toast.info("Jam layanan sudah ada");
    customOperatingTime.value = "";
    return;
  }

  setOperatingTimes([...current, normalized], setFieldValue);
  customOperatingTime.value = "";
};

const JASA_ROOT_CATEGORY_NAME = "Jasa & Layanan";
const jasaRootCategoryId = ref(null);

const findJasaRootCategory = () => {
  const list = Array.isArray(jasaCategories.value) ? jasaCategories.value : [];

  return list.find((category) => {
    const name = String(category?.name || category?.label || "")
      .trim()
      .toLowerCase();

    return name === JASA_ROOT_CATEGORY_NAME.toLowerCase();
  });
};

const loadCategories = async () => {
  try {
    const { data } = await api.get("/api/public/categories/level-1");
    jasaCategories.value = data.data ?? data;

    const jasaRootCategory = findJasaRootCategory();
    jasaRootCategoryId.value = jasaRootCategory?.value ?? jasaRootCategory?.id ?? null;

    if (jasaRootCategoryId.value) {
      formData.value.jasa_category_id = jasaRootCategoryId.value;
    }
  } catch (error) {
    console.error("Error loading categories:", error);
  }
};

const loadSubcategories = async (categoryId) => {
  if (!categoryId) {
    jasaSubcategories.value = [];
    return;
  }

  try {
    const { data } = await api.get(
      `/api/public/categories/${categoryId}/sub-categories`
    );

    jasaSubcategories.value = data.data ?? data;
  } catch (error) {
    console.error("Error loading subcategories:", error);
    jasaSubcategories.value = [];
  }
};

const ensureJasaRootCategorySelected = async (resetSubcategory = false) => {
  if (!Array.isArray(jasaCategories.value) || jasaCategories.value.length === 0) {
    await loadCategories();
  }

  const categoryId = jasaRootCategoryId.value || (findJasaRootCategory()?.value ?? findJasaRootCategory()?.id ?? null);

  if (!categoryId) {
    toast.error("Kategori Jasa & Layanan tidak ditemukan");
    return false;
  }

  formData.value.jasa_category_id = categoryId;

  if (resetSubcategory) {
    formData.value.jasa_subcategory_id = null;
  }

  await loadSubcategories(categoryId);

  return true;
};

// Tidak dipakai di template lagi, tapi aman jika masih ada referensi lama
const handleCategoryChange = async () => {
  await ensureJasaRootCategorySelected(true);
};

// Auto-save form data to localStorage (debounced)
let saveTimeout = null;

const sanitizeDraftData = (data) => {
  if (!data || typeof data !== "object") return {};

  const {
    status,
    ...safeData
  } = data;

  return safeData;
};

watch(
  formData,
  (newData) => {
    if (!currentJasaId.value) return;
    
    // Debounce to avoid excessive writes
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(
          FORM_DRAFT_KEY.value,
          JSON.stringify(sanitizeDraftData(newData))
        );
      } catch (error) {
        console.error("Failed to save form draft:", error);
      }
    }, 500);
  },
  { deep: true }
);

// Restore form data from localStorage
const restoreFormDraft = () => {
  if (!currentJasaId.value) return;
  
  try {
    const saved = localStorage.getItem(FORM_DRAFT_KEY.value);
    if (saved) {
      const parsed = JSON.parse(saved);
      const safeDraft = sanitizeDraftData(parsed);
      
      // Only restore if draft is newer than last load
      // This prevents overwriting with old data
      Object.assign(formData.value, safeDraft);
      
      // Load subcategories if category is selected
      if (safeDraft.jasa_category_id) {
        loadSubcategories(safeDraft.jasa_category_id);
      }

      formKey.value += 1;
      
      toast.info("Perubahan yang belum disimpan berhasil dipulihkan");
    }
  } catch (error) {
    console.error("Failed to restore form draft:", error);
  }
};

// Clear form draft from localStorage
const clearFormDraft = () => {
  if (!currentJasaId.value) return;
  
  try {
    localStorage.removeItem(FORM_DRAFT_KEY.value);
  } catch (error) {
    console.error("Failed to clear form draft:", error);
  }
};

// Handle new image file selection (bisa tambah berkali-kali dan hapus sebelum simpan)
const handleNewImageChange = (e) => {
  const files = e.target.files;
  if (files && files.length) {
    const picked = Array.from(files);
    const merged = [...newImageFiles.value];
    const rejected = [];

    picked.forEach((file) => {
      if (!isAllowedImageFile(file)) {
        rejected.push(`${file.name}: format harus JPG/PNG/WEBP`);
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejected.push(`${file.name}: ukuran maksimal 2MB`);
        return;
      }

      const exists = merged.some(
        (f) =>
          f.name === file.name &&
          f.size === file.size &&
          f.lastModified === file.lastModified
      );
      if (!exists) {
        merged.push(file);
      }
    });

    if (rejected.length > 0) {
      toast.error(rejected[0]);
    }

    newImageFiles.value = merged;
    buildNewImagePreviews(newImageFiles.value);
    console.log(
      "New images selected (total):",
      newImageFiles.value.length,
      newImageFiles.value.map((f) => f.name)
    );

    // reset input supaya bisa pilih file yang sama lagi jika perlu
    e.target.value = "";
  }
};

const removeNewImage = (index) => {
  if (index < 0 || index >= newImageFiles.value.length) return;
  newImageFiles.value.splice(index, 1);
  buildNewImagePreviews(newImageFiles.value);
};

const setAsCover = (image) => {
  if (!image || !image.id) return;
  currentCoverId.value = image.id;
  existingImages.value = existingImages.value.map((img) => ({
    ...img,
    is_cover: img.id === image.id,
  }));
};

const removeExistingImage = (image) => {
  if (!image || !image.id) return;
  if (!imagesToRemove.value.includes(image.id)) {
    imagesToRemove.value.push(image.id);
  }
  if (currentCoverId.value === image.id) {
    currentCoverId.value = null;
  }
};

const loadJasa = async () => {
  if (!currentJasaId.value) {
    toast.error("Jasa ID tidak ditemukan");
    return;
  }

  loadingData.value = true;
  try {
    const { data } = await api.get(`/api/jasa/${currentJasaId.value}`);

    // Handle both wrapped and direct responses
    const jasaData = data.data || data;

    // Store for merchant address lookup
    currentJasa.value = jasaData;

    console.log("[Editjasa] Raw API response:", data);
    console.log("[Editjasa] Extracted jasaData:", jasaData);
    console.log("[Editjasa] Title value:", jasaData.title);
    console.log("[Editjasa] Price values:", {
      fixed_price: jasaData.fixed_price,
      base_price: jasaData.base_price,
      price: jasaData.price,
    });

    // Store existing images (relasi baru)
    existingImages.value = jasaData.images || [];

    // Fallback: jika belum ada relasi images tapi ada field legacy `image`, jadikan sebagai satu gambar awal
    if (
      (!existingImages.value || existingImages.value.length === 0) &&
      jasaData.image
    ) {
      existingImages.value = [
        {
          id: null,
          path: jasaData.image,
          is_cover: true,
        },
      ];
    }
    imagesToRemove.value = [];
    newImageFiles.value = [];

    const cover = existingImages.value.find((img) => img.is_cover && img.id);
    currentCoverId.value = cover ? cover.id : null;

    // Map FE booking type from API response (order_method or cara_pemesanan)
    // API returns: order_method (keranjang|booking|konsultasi) or cara_pemesanan (langsung_pesan|booking|memerlukan_konsultasi)
    const rawBookingType = jasaData.order_method || jasaData.cara_pemesanan || 'keranjang';
    const mappedBookingType = (() => {
      const t = String(rawBookingType).toLowerCase();
      if (t === 'keranjang' || t === 'cart' || t === 'langsung_pesan') return 'keranjang';
      if (t === 'booking') return 'booking';
      if (t === 'konsultasi' || t === 'consultation' || t === 'memerlukan_konsultasi') return 'konsultasi';
      return 'keranjang';
    })();

    // Initialize form with loaded data
    // Normalize service_type to new standard format
    const normalizeServiceType = (type) => {
      if (type === 'at_location' || type === 'ditempat_saya') return 'di_tempat_umkm';
      if (type === 'on_site' || type === 'kerumah_pelanggan') return 'ke_rumah_pelanggan';
      return type || 'di_tempat_umkm';
    };

    formData.value = {
      title: jasaData.title || "",
      description: jasaData.description || "",
      jasa_category_id: jasaRootCategoryId.value || jasaData.jasa_category_id || null,
      jasa_subcategory_id: jasaData.jasa_subcategory_id || null,
      fixed_price: Number(jasaData.fixed_price ?? 0) || Number(jasaData.price ?? 0) || 0,
      base_price: Number(jasaData.base_price ?? 0) || 0,
      service_type: normalizeServiceType(jasaData.service_type),
      booking_type: mappedBookingType,
      location_address: jasaData.location_address || "",
      special_notes: jasaData.special_notes || "",
      operating_times: Array.isArray(jasaData.operating_times)
        ? jasaData.operating_times.join(',')
        : (jasaData.operating_times || ""),
      payment_methods: normalizePaymentMethods(jasaData.payment_methods),
      status: jasaData.status || "draft",
    };

    // Load subcategories if category is selected
    // if (formData.value.jasa_category_id) {
    //  await loadSubcategories(formData.value.jasa_category_id);
    // }
    await ensureJasaRootCategorySelected(false);

    // Force form re-render
    formKey.value += 1;
  } catch (error) {
    console.error("Error loading jasa:", error);
    toast.error("Gagal memuat data jasa");
  } finally {
    loadingData.value = false;
  }
};

// Catatan: Di halaman edit jasa, alamat layanan selalu mengacu pada lokasi UMKM
// dan/atau area layanan yang diinput merchant. Kita tidak lagi mengambil
// lokasi perangkat customer di sini; lokasi customer hanya diminta saat booking.

const updateJasaStatusOnly = async (nextStatus) => {
  if (!currentJasaId.value || statusActionLoading.value) return;

  const confirmMessage =
    nextStatus === "archived"
      ? "Yakin ingin mengarsipkan layanan ini? Layanan tidak akan tampil ke pelanggan."
      : "Yakin ingin mempublikasikan kembali layanan ini? Layanan akan tampil ke pelanggan.";

  if (!window.confirm(confirmMessage)) return;

  statusActionLoading.value = true;

  try {
    const fd = new FormData();
    fd.append("_method", "PUT");
    fd.append("status", nextStatus);

    await api.post(`/api/jasa/${currentJasaId.value}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    formData.value.status = nextStatus;

    toast.success(
      nextStatus === "archived"
        ? "Layanan berhasil diarsipkan."
        : "Layanan berhasil dipublikasikan kembali."
    );
  } catch (error) {
    console.error("[Editjasa] Gagal update status jasa:", error);
    toast.error(
      error.response?.data?.message ||
        "Gagal mengubah status layanan. Silakan coba lagi."
    );
  } finally {
    statusActionLoading.value = false;
  }
};

const submitForm = async (values = null) => {
  if (!currentJasaId.value) {
    toast.error("Jasa ID tidak ditemukan");
    return;
  }

  // Check authentication
  if (!authStore.isAuthenticated) {
    toast.error("Anda belum login. Silakan login terlebih dahulu.");
    router.push("/login");
    return;
  }

  loading.value = true;
  try {
    const categoryReady = await ensureJasaRootCategorySelected(false);
    if (!categoryReady) return;

    // Build FormData for multipart submission
    const fd = new FormData();

    // Laravel doesn't parse multipart PUT requests correctly, use POST with _method
    fd.append("_method", "PUT");

    // Build FormData explicitly from formData.value (no vee-validate values dependency)
    fd.set("title", formData.value.title || "");
    fd.set("description", formData.value.description || "");
    fd.set("jasa_category_id", formData.value.jasa_category_id || "");
    fd.set("jasa_subcategory_id", formData.value.jasa_subcategory_id || "");
    fd.set("fixed_price", String(Number(formData.value.fixed_price || 0)));
    fd.set("base_price", String(Number(formData.value.base_price || 0)));
    fd.set("price", String(
      Number(formData.value.fixed_price || 0) > 0
        ? Number(formData.value.fixed_price || 0)
        : Number(formData.value.base_price || 0)
    ));
    fd.set("service_type", formData.value.service_type || "di_tempat_umkm");
    fd.set("booking_type", formData.value.booking_type || "keranjang");
    fd.set("location_address", formData.value.location_address || "");
    fd.set("special_notes", formData.value.special_notes || "");
    fd.set("payment_methods", normalizePaymentMethods(formData.value.payment_methods).join(","));
    fd.set("status", formData.value.status || "draft");

    // operating_times: only for booking type
    if (formData.value.booking_type === "booking") {
      fd.set("operating_times", JSON.stringify(selectedOperatingTimes.value));
    } else {
      fd.set("operating_times", "");
    }

    console.log("[Editjasa] Submitting:", {
      title: formData.value.title,
      description: formData.value.description,
      fixed_price: formData.value.fixed_price,
      base_price: formData.value.base_price,
      booking_type: formData.value.booking_type,
      service_type: formData.value.service_type,
      payment_methods: formData.value.payment_methods,
    });

    // === UPLOAD GAMBAR: hanya images[] berisi File object (maks 10) ===
    const filesToUpload = (newImageFiles.value || [])
      .filter((file) => file instanceof File)
      .slice(0, 10);

    console.log('existingImages:', existingImages.value);
    console.log('selectedImages (newImageFiles):', newImageFiles.value);

    filesToUpload.forEach((file) => {
      fd.append('images[]', file);
    });

    // Add images to remove (ID array, bukan images[])
    if (imagesToRemove.value.length) {
      fd.append('remove_images', JSON.stringify(imagesToRemove.value));
    }

    // Set cover image id if selected
    if (currentCoverId.value) {
      fd.append('cover_image_id', String(currentCoverId.value));
    }

    // Debug: log all FormData entries
    console.log("[Editjasa] FormData entries:");
    for (const pair of fd.entries()) {
      console.log("  FORMDEBUG " + pair[0] + ":", typeof pair[1] === "object" ? "File(" + pair[1].name + ")" : pair[1]);
    }

    console.log("Submitting jasa with FormData", {
      status: formData.value.status,
      new_images_count: filesToUpload.length,
      existing_images_count: existingImages.value.length,
      images_to_remove: imagesToRemove.value.length,
    });

    // Use POST with _method spoofing for multipart compatibility
    // Biarkan axios yang set header multipart/form-data + boundary secara otomatis
    const { data } = await api.post(`/api/jasa/${currentJasaId.value}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).catch((err) => {
      console.error("[Editjasa] API Error:", err.response?.status, err.response?.data);
      throw err;
    });

    toast.success("Jasa berhasil diperbarui!");

    // Verify: re-fetch data and check title + price were saved
    try {
      const verifyRes = await api.get(`/api/jasa/${currentJasaId.value}`);
      const savedData = verifyRes.data.data || verifyRes.data;
      console.log("[Editjasa] Verified saved data:", {
        title: savedData.title,
        description: savedData.description,
        fixed_price: savedData.fixed_price,
        base_price: savedData.base_price,
        price: savedData.price,
      });
      const titleOk = savedData.title === formData.value.title;
      const priceOk = Number(savedData.fixed_price) === Number(formData.value.fixed_price)
        && Number(savedData.base_price) === Number(formData.value.base_price);
      if (!titleOk) {
        console.warn("[Editjasa] Title mismatch! Sent:", formData.value.title, "Got:", savedData.title);
      }
      if (!priceOk) {
        console.warn("[Editjasa] Price mismatch! Sent fixed:", formData.value.fixed_price, "Got:", savedData.fixed_price, "| Sent base:", formData.value.base_price, "Got:", savedData.base_price);
        toast.warning("Data tersimpan, namun ada perbedaan harga.");
      }
    } catch (verifyErr) {
      console.warn("[Editjasa] Verification fetch failed:", verifyErr);
    }

    // Warn if status is still draft
    if (formData.value.status === 'draft') {
      setTimeout(() => {
        toast.info(
          "\ud83d\udca1 Jasa Anda masih dalam status DRAFT. Silakan publikasikan agar dapat dilihat pelanggan.",
          {
            timeout: 8000,
          }
        );
      }, 1500);
    }

    // Clear form draft after successful submission
    clearFormDraft();

    // Force reload the list page
    router.push(
      `/merchant-center/${currentMerchantSlug.value}/jasas?t=${Date.now()}`
    );
  } catch (error) {
    // Detailed error logging
    console.error("Error updating jasa:", error);
    console.error("Error status:", error.response?.status);
    console.error("Error data:", error.response?.data);
    console.error("Error headers:", error.response?.headers);
    const errors = error.response?.data?.errors;
    if (errors) {
      console.error("Validation errors:", errors);
      Object.entries(errors).forEach(([field, messages]) => {
        messages.forEach((msg) => {
          toast.error(`${field}: ${msg}`);
        });
      });
    }
    const msg = error.response?.data?.message || error.response?.data?.error || "Gagal memperbarui jasa";
    if (!errors) toast.error(msg);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadCategories();
  await loadJasa();
  restoreFormDraft();

  const shouldResetSubcategory =
    String(formData.value.jasa_category_id || "") !== String(jasaRootCategoryId.value || "");

  await ensureJasaRootCategorySelected(shouldResetSubcategory);
});

</script>
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <div class="max-w-3xl mx-auto px-4 py-6">
      <!-- Header Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div class="bg-gradient-to-r from-merchant-primary to-merchant-primary/80 px-6 py-5">
          <Breadcrumb :items="breadcrumbItems" textClass="text-white/80" />
          <h1 class="mt-3 text-2xl font-bold text-white">Edit Layanan Jasa</h1>
          <p class="mt-1 text-sm text-white/80">Perbarui informasi layanan Anda</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingData" class="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
        <div class="w-12 h-12 mx-auto mb-4 border-4 border-t-merchant-primary border-slate-200 rounded-full animate-spin"></div>
        <p class="text-slate-500">Memuat data layanan...</p>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="submitForm()" class="space-y-5">

        <!-- Section 1: Info Dasar -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <span class="text-sm font-bold text-blue-600">1</span>
            </div>
            <h2 class="text-base font-semibold text-slate-800">Informasi Dasar</h2>
          </div>
          <div class="space-y-4">
            <!-- Nama Layanan -->
            <div>
              <label for="title" class="block text-sm font-semibold text-slate-700 mb-1.5">
                Nama Layanan <span class="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                v-model="formData.title"
                type="text"
                placeholder="Contoh: Jasa Kebersihan Rumah"
                class="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <div class="flex justify-end mt-1">
                <span
                  :class="formData.title?.length > 70 ? 'text-red-500' : formData.title?.length >= 5 ? 'text-emerald-500' : 'text-slate-400'"
                  class="text-xs font-medium"
                >
                  {{ formData.title?.length || 0 }} / 70 karakter
                </span>
              </div>
            </div>

            <!-- Jenis Layanan saja, kategori utama otomatis Jasa & Layanan -->
            <div>
              <SelectField
                name="jasa_subcategory_id"
                label="Jenis Layanan"
                :placeholder="jasaSubcategories.length ? 'Pilih jenis layanan...' : 'Tidak tersedia'"
                :options="jasaSubcategories.map(s => ({
                  value: s.value ?? s.id,
                  label: s.label ?? s.name
                }))"
                v-model="formData.jasa_subcategory_id"
                :disabled="!jasaSubcategories.length"
              />
            </div>

            <!-- Deskripsi -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi Layanan</label>
              <textarea
                v-model="formData.description"
                placeholder="Jelaskan detail layanan Anda secara lengkap..."
                rows="4"
                class="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"
              ></textarea>
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
              <span><strong>Konsultasi:</strong> Customer chat untuk negosiasi harga &amp; jadwal</span>
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
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">
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
                  class="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none transition"
                  :class="formData.booking_type === 'konsultasi' ? 'bg-slate-50 cursor-not-allowed' : formData.base_price > 0 ? 'bg-slate-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-emerald-500'"
                  :disabled="formData.booking_type === 'konsultasi' || formData.base_price > 0"
                />
              </div>
              <p v-if="formData.booking_type === 'konsultasi'" class="mt-1 text-xs text-purple-500">Tidak berlaku untuk Konsultasi</p>
            </div>

            <!-- Base Price -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">
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
                    if (formData.base_price > 0 && formData.booking_type !== 'konsultasi') formData.fixed_price = 0;
                  }"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none transition"
                  :class="formData.fixed_price > 0 ? 'bg-slate-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-emerald-500'"
                  :disabled="formData.fixed_price > 0"
                />
              </div>
              <p v-if="formData.booking_type === 'konsultasi'" class="mt-1 text-xs text-purple-500">Wajib diisi untuk Konsultasi</p>
            </div>
          </div>
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

          <!-- Existing Images -->
          <div v-if="existingImages.length" class="mb-4">
            <p class="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <i class="text-slate-400 pi pi-images"></i>
              <span>Gambar Saat Ini ({{ existingImages.length }})</span>
            </p>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
              <div v-for="image in existingImages" :key="image.id ?? idx" class="relative group">
                <div v-if="!imagesToRemove.includes(image.id)" class="relative">
                  <img
                    :src="getImageUrl(image.url || image.src_url || image.id || image.path)"
                    alt="preview"
                    class="w-full aspect-square object-cover rounded-xl border border-slate-200 bg-slate-50"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                  <span v-if="image.is_cover" class="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow z-10">Cover</span>
                  <div class="absolute top-1.5 right-1.5 flex gap-1">
                    <button type="button" @click="setAsCover(image)" v-if="image.id && !image.is_cover"
                      class="w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow z-10 text-[10px]">
                      <i class="pi pi-star"></i>
                    </button>
                    <button type="button" @click="removeExistingImage(image)"
                      class="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow z-10">
                      <i class="pi pi-times text-[10px]"></i>
                    </button>
                  </div>
                </div>
                <div v-else class="w-full aspect-square bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                  <i class="text-slate-400 pi pi-times"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Upload Area -->
          <div class="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-purple-400 transition cursor-pointer bg-slate-50/50" @click="imageInputRef?.click()">
            <div class="flex flex-col items-center gap-2">
              <div class="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                <i class="pi pi-cloud-upload text-2xl text-purple-500"></i>
              </div>
              <p class="text-sm font-medium text-slate-700">Klik untuk upload gambar baru</p>
              <p class="text-xs text-slate-400">atau drag &amp; drop file di sini</p>
            </div>
          </div>
          <input id="images" type="file" ref="imageInputRef" accept="image/jpeg,image/jpg,image/png,image/webp" multiple class="hidden" @change="handleNewImageChange" />

          <!-- New Image Preview Grid -->
          <div v-if="newImageFiles.length" class="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
            <div v-for="(file, idx) in newImageFiles" :key="idx" class="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-50">
              <img :src="newImagePreviews[idx] || ''" alt="preview" class="w-full h-full object-cover" />
              <span class="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow z-10">Baru</span>
              <button type="button" @click.stop="removeNewImage(idx)" class="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow z-10">
                <i class="pi pi-times text-[10px]"></i>
              </button>
            </div>
          </div>

          <!-- Selected Count -->
          <div class="mt-3 flex items-center justify-between">
            <p v-if="newImageFiles.length" class="text-xs text-slate-500">
              <span class="font-medium text-slate-700">{{ newImageFiles.length }}</span> gambar baru dipilih
            </p>
            <p v-else class="text-xs text-slate-400">Belum ada gambar baru</p>
            <p class="text-xs text-slate-400">{{ newImageFiles.length }}/10 foto</p>
          </div>
        </div>

        <!-- Section 5: Lokasi & Jadwal -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
              <span class="text-sm font-bold text-orange-600">5</span>
            </div>
            <h2 class="text-base font-semibold text-slate-800">Lokasi &amp; Jadwal</h2>
          </div>
          <div class="space-y-4">
            <!-- Tempat Layanan Radio Cards -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Tempat Layanan</label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label v-for="opt in [
                  { value: 'di_tempat_umkm', icon: 'pi-home', label: 'Di Tempat UMKM' },
                  { value: 'ke_rumah_pelanggan', icon: 'pi-map-marker', label: 'Ke Rumah Pelanggan' },
                  { value: 'online', icon: 'pi-globe', label: 'Online' }
                ]" :key="opt.value"
                  class="flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition text-center sm:text-left"
                  :class="formData.service_type === opt.value ? 'border-merchant-primary bg-merchant-primary/5' : 'border-slate-200 hover:border-slate-300'"
                  @click="formData.service_type = opt.value">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    :class="formData.service_type === opt.value ? 'bg-merchant-primary text-white' : 'bg-slate-100 text-slate-500'">
                    <i :class="['pi', opt.icon]"></i>
                  </div>
                  <span class="text-sm font-medium" :class="formData.service_type === opt.value ? 'text-merchant-primary' : 'text-slate-600'">{{ opt.label }}</span>
                </label>
              </div>
            </div>

            <!-- Alamat UMKM (auto-filled) -->
            <div v-if="formData.service_type === 'di_tempat_umkm'">
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Alamat UMKM</label>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p class="text-sm text-slate-600">{{ merchantProfileAddress || formData.location_address || 'Alamat belum tersedia' }}</p>
              </div>
              <p class="mt-1 text-xs text-slate-400">Otomatis dari profil bisnis Anda</p>
            </div>

            <!-- Online Info -->
            <div v-if="formData.service_type === 'online'" class="p-3 bg-blue-50 rounded-xl border border-blue-200">
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
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs text-slate-500">Pilih jam operasional</span>
                  <button type="button" @click="toggleSelectAllOperatingTimes()" class="px-3 py-1 text-xs font-medium rounded-full transition"
                    :class="isAllOperatingTimesSelected ? 'bg-merchant-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                    {{ isAllOperatingTimesSelected ? 'Batalkan Semua' : 'Pilih Semua' }}
                  </button>
                </div>
                <div class="space-y-2">
                  <div v-for="group in OPERATING_TIME_GROUPS" :key="group.key" class="flex items-center gap-2">
                    <span class="w-12 text-xs font-medium text-slate-500">{{ group.label }}</span>
                    <div class="flex flex-wrap gap-1.5 flex-1">
                      <button v-for="time in group.times" :key="time" type="button" @click="toggleOperatingTime(time)" class="px-2.5 py-1.5 text-xs rounded-lg border transition min-w-[52px]"
                        :class="isOperatingTimeSelected(time) ? 'bg-merchant-primary text-white border-merchant-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'">
                        {{ time }}
                      </button>
                    </div>
                    <button type="button" @click="toggleGroupOperatingTimes(group.times)" class="text-[10px] px-2 py-1 rounded border transition shrink-0"
                      :class="isGroupFullySelected(group.times) ? 'bg-slate-200 text-slate-600' : 'bg-slate-50 text-slate-400'">
                      {{ isGroupFullySelected(group.times) ? 'Uncheck' : 'Check' }}
                    </button>
                  </div>
                </div>
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
            <label class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border transition cursor-pointer"
              :class="isPaymentMethodSelected('cod') ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300'"
              @click.prevent="togglePaymentMethod('cod')">
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
            <label class="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border transition cursor-pointer"
              :class="isPaymentMethodSelected('ONLINE_XENDIT') ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300'"
              @click.prevent="togglePaymentMethod('ONLINE_XENDIT')">
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

        <!-- Info Status -->
        <div
          class="rounded-2xl p-4 border"
          :class="
            formData.status === 'archived'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          "
        >
          <div class="flex items-start gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              :class="
                formData.status === 'archived'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
              "
            >
              <i
                class="pi text-sm"
                :class="formData.status === 'archived' ? 'pi-box' : 'pi-file-edit'"
              ></i>
            </div>

            <div class="flex-1">
              <p
                class="text-sm font-semibold"
                :class="formData.status === 'archived' ? 'text-red-800' : 'text-amber-800'"
              >
                Status saat ini:
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                  :class="
                    formData.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : formData.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                  "
                >
                  {{
                    formData.status === 'draft'
                      ? '📝 Draft'
                      : formData.status === 'published'
                        ? '✅ Dipublish'
                        : '🔒 Diarsipkan'
                  }}
                </span>
              </p>

              <p
                class="text-xs mt-0.5"
                :class="formData.status === 'archived' ? 'text-red-600' : 'text-amber-600'"
              >
                Draft: belum tampil ke customer. Dipublish: bisa dipesan customer. Diarsipkan:
                disembunyikan dari pelanggan.
              </p>

              <button
                v-if="formData.status !== 'archived'"
                type="button"
                class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="statusActionLoading"
                @click="updateJasaStatusOnly('archived')"
              >
                <i
                  class="pi"
                  :class="statusActionLoading ? 'pi-spin pi-spinner' : 'pi-box'"
                ></i>
                {{ statusActionLoading ? 'Mengarsipkan...' : 'Arsipkan Layanan' }}
              </button>

              <button
                v-else
                type="button"
                class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="statusActionLoading"
                @click="updateJasaStatusOnly('published')"
              >
                <i
                  class="pi"
                  :class="statusActionLoading ? 'pi-spin pi-spinner' : 'pi-check'"
                ></i>
                {{ statusActionLoading ? 'Memproses...' : 'Publikasikan Kembali' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-2">
          <Button type="button" variant="muted-outline" @click="router.back()" class="flex-1 py-3">
            <i class="mr-2 pi pi-arrow-left"></i>Batal
          </Button>
          <Button type="button" variant="primary" :disabled="loading" :loading="loading" class="flex-1 py-3" @click="submitForm()">
            <i class="mr-2 pi pi-check"></i>{{ loading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
textarea { resize: vertical; }
</style>