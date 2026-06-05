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

const formatMerchantAddress = (merchant) => {
  if (!merchant) return "";

  const primaryAddress = merchant.primary_address;
  if (primaryAddress) {
    const parts = [
      primaryAddress.detail,
      primaryAddress.village,
      primaryAddress.district,
      primaryAddress.city,
      primaryAddress.province,
    ].filter(Boolean);

    if (parts.length) return parts.join(", ");
  }

  return merchant.address || merchant.alamat || "";
};

const merchantProfileAddress = computed(() => {
  return formatMerchantAddress(currentMerchantData.value);
});

const currentJasaId = computed(() => {
  return route.params.id ? Number(route.params.id) : null;
});

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
  service_type: "at_location",
  location_address: "",
  service_area: "",
  special_notes: "",
  operating_times: "",
  payment_methods: "cod",
  status: "draft",
});

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
  operating_times: yup.string().nullable().max(255),
  location_address: yup.string().nullable().max(255),
  service_area: yup.string().nullable(),
  special_notes: yup.string().nullable(),
  payment_methods: yup.string().nullable(),
  status: yup.string(),
});

watch(
  [() => formData.value.service_type, merchantProfileAddress],
  ([serviceType, profileAddress]) => {
    if (serviceType === "at_location") {
      formData.value.location_address = profileAddress || "";
    }
    if (serviceType === "online" || serviceType === "on_site") {
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

const loadCategories = async () => {
  try {
    const { data } = await api.get("/api/public/categories/level-1");
    // Backend mengembalikan { success, message, data: [...] }
    jasaCategories.value = data.data ?? data;
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
    console.log("Loading subcategories for category:", categoryId);
    const { data } = await api.get(
      `/api/public/categories/${categoryId}/sub-categories`
    );
    console.log("Subcategories loaded:", data);
    jasaSubcategories.value = data.data ?? data;
  } catch (error) {
    console.error("Error loading subcategories:", error);
    jasaSubcategories.value = [];
  }
};

const handleCategoryChange = async (value) => {
  console.log("Category changed to:", value);
  formData.value.jasa_category_id = value;
  formData.value.jasa_subcategory_id = null;
  await loadSubcategories(value);
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

    console.log("[Editjasa] Raw API response:", data);
    console.log("[Editjasa] Extracted jasaData:", jasaData);
    console.log("[Editjasa] Title value:", jasaData.title);

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

    // Initialize form with loaded data
    formData.value = {
      title: jasaData.title || "",
      description: jasaData.description || "",
      jasa_category_id: jasaData.jasa_category_id || null,
      jasa_subcategory_id: jasaData.jasa_subcategory_id || null,
      fixed_price: parseInt(jasaData.fixed_price) || 0,
      base_price: parseInt(jasaData.base_price) || 0,
      service_type: jasaData.service_type || "at_location",
      location_address: jasaData.location_address || "",
      service_area: jasaData.service_area || "",
      special_notes: jasaData.special_notes || "",
      operating_times: jasaData.operating_times || "",
      payment_methods: jasaData.payment_methods || "cod",
      status: jasaData.status || "draft",
    };

    // Load subcategories if category is selected
    if (formData.value.jasa_category_id) {
      await loadSubcategories(formData.value.jasa_category_id);
    }

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

const submitForm = async (values) => {
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
    // Build FormData for multipart submission
    const fd = new FormData();

    // Laravel doesn't parse multipart PUT requests correctly, use POST with _method
    fd.append("_method", "PUT");

    // Add all form fields
    Object.entries(values).forEach(([key, value]) => {
      fd.append(key, value ?? "");
    });

    // Explicitly add fields that use v-model on formData
    fd.set("status", formData.value.status);
    fd.set("service_type", formData.value.service_type);
    fd.set("location_address", formData.value.location_address || "");
    fd.set("operating_times", formData.value.operating_times || "");

    // Ensure integer prices
    fd.set("fixed_price", parseInt(values.fixed_price) || 0);
    fd.set("base_price", parseInt(values.base_price) || 0);

    // Add new images if any
    if (newImageFiles.value && newImageFiles.value.length) {
      const fileError = validateSelectedImages(newImageFiles.value);
      if (fileError) {
        toast.error(fileError);
        return;
      }

      newImageFiles.value.forEach((file) => fd.append("images[]", file));
    }

    // Add images to remove (if backend supports it)
    if (imagesToRemove.value.length) {
      fd.append("remove_images", JSON.stringify(imagesToRemove.value));
    }

    // Set cover image id if selected
    if (currentCoverId.value) {
      fd.append("cover_image_id", currentCoverId.value);
    }

    console.log("Submitting jasa with FormData", {
      status: formData.value.status,
      new_images_count: newImageFiles.value.length,
      images_to_remove: imagesToRemove.value.length,
    });

    // Use POST with _method spoofing for multipart compatibility
    // Biarkan axios yang set header multipart/form-data + boundary secara otomatis
    const { data } = await api.post(`/api/jasa/${currentJasaId.value}`, fd);

    toast.success("Jasa berhasil diperbarui!");

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
    console.error("Error updating jasa:", error);
    const msg = error.response?.data?.message || "Gagal memperbarui jasa";
    toast.error(msg);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  loadCategories();
  await loadJasa();
  restoreFormDraft();
});
</script>

<template>
  <div class="min-h-screen p-4 bg-linear-to-br from-gray-50 to-gray-100 sm:p-6">
    <Breadcrumb :items="breadcrumbItems" />

    <div class="max-w-4xl mx-auto mt-6">
      <!-- Header Card -->
      <div class="mb-6 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div
          class="px-6 py-8 bg-linear-to-r from-merchant-primary to-merchant-primary/80 rounded-t-xl"
        >
          <div class="flex items-start justify-between">
            <div>
              <h1 class="mb-2 text-3xl font-bold text-white">
                Edit Layanan Jasa
              </h1>
              <p class="text-sm text-white/80">
                Perbarui informasi layanan jasa Anda di formulir dibawah
              </p>
            </div>
            <i class="text-4xl text-white pi pi-pencil opacity-20"></i>
          </div>
        </div>

        <!-- Loading State -->
        <div
          v-if="loadingData"
          class="flex items-center justify-center px-6 py-20"
        >
          <div class="text-center">
            <div
              class="w-12 h-12 mx-auto mb-4 border-b-2 rounded-full animate-spin border-merchant-primary"
            ></div>
            <p class="text-gray-500">Memuat data layanan...</p>
          </div>
        </div>

        <Form
          v-else
          :key="formKey"
          :validationSchema="validationSchema"
          :initialValues="formData"
          @submit="submitForm"
          v-slot="{ handleSubmit, values, setFieldValue }"
        >
          <form
            @submit.prevent="handleSubmit(submitForm)"
            class="p-6 space-y-6"
          >
            <!-- 1. KLASIFIKASI LAYANAN -->
            <div
              class="p-5 border border-blue-100 bg-linear-to-r from-blue-50 to-transparent rounded-xl"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-blue-500 rounded-full"
                >
                  1
                </div>
                <h2 class="text-lg font-bold text-gray-800">
                  Identitas Layanan
                </h2>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field name="title" v-slot="{ field, errors }">
                  <div>
                    <label
                      class="block mb-2 text-sm font-semibold text-gray-700"
                      >Nama Layanan</label
                    >
                    <input
                      :name="field.name"
                      :value="field.value"
                      @input="(e) => { field.onChange(e.target.value); formData.title = e.target.value; }"
                      @blur="field.onBlur"
                      type="text"
                      placeholder="Contoh: Jasa Kebersihan Rumah"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p v-if="errors[0]" class="mt-1 text-sm text-red-500">
                      {{ errors[0] }}
                    </p>
                  </div>
                </Field>

                <SelectField
                  name="jasa_category_id"
                  label="Kategori Utama"
                  placeholder="Pilih kategori..."
                  :options="
                    jasaCategories.map((c) => ({
                      value: c.value ?? c.id,
                      label: c.label ?? c.name,
                    }))
                  "
                  v-model="formData.jasa_category_id"
                  @update:modelValue="handleCategoryChange"
                  required
                />

                <SelectField
                  name="jasa_subcategory_id"
                  label="Jenis Layanan Spesifik"
                  :placeholder="
                    jasaSubcategories.length
                      ? 'Pilih sub kategori...'
                      : 'Tidak ada subkategori untuk kategori ini'
                  "
                  :options="
                    jasaSubcategories.map((s) => ({
                      value: s.value ?? s.id,
                      label: s.label ?? s.name,
                    }))
                  "
                  v-model="formData.jasa_subcategory_id"
                  :disabled="!jasaSubcategories.length"
                />

                <Field name="description" v-slot="{ field }">
                  <div class="sm:col-span-2">
                    <label
                      class="block mb-2 text-sm font-semibold text-gray-700"
                      >Deskripsi Layanan</label
                    >
                    <textarea
                      :name="field.name"
                      :value="field.value"
                      @input="(e) => { field.onChange(e.target.value); formData.description = e.target.value; }"
                      @blur="field.onBlur"
                      placeholder="Jelaskan detail tentang layanan Anda secara lengkap..."
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                    />
                  </div>
                </Field>
              </div>
            </div>

            <!-- 2. HARGA -->
            <div
              class="p-5 border bg-linear-to-r from-emerald-50 to-transparent rounded-xl border-emerald-100"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white rounded-full bg-emerald-500"
                >
                  2
                </div>
                <h2 class="text-lg font-bold text-gray-800">
                  Pengaturan Harga
                </h2>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field name="fixed_price" v-slot="{ field, errors }">
                  <div>
                    <label
                      class="block mb-2 text-sm font-semibold text-gray-700"
                      >Harga Tetap</label
                    >
                    <div class="relative">
                      <span
                        class="absolute font-medium text-gray-500 transform -translate-y-1/2 left-4 top-1/2"
                        >Rp</span
                      >
                      <input
                        :value="formatCurrency(field.value || 0)"
                        @input="
                          (e) => {
                            const newValue = parseCurrency(e.target.value);
                            field.onChange(newValue);
                            formData.fixed_price = newValue;
                            // Auto-clear base_price jika fixed_price diisi
                            if (newValue > 0 && values?.base_price > 0) {
                              setFieldValue('base_price', 0);
                              formData.base_price = 0;
                            }
                          }
                        "
                        @blur="field.onBlur"
                        type="text"
                        placeholder="0"
                        class="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        :disabled="Number(values?.base_price || 0) > 0"
                      />
                    </div>
                    <p v-if="errors[0]" class="mt-1 text-sm text-red-500">
                      {{ errors[0] }}
                    </p>
                    <p
                      v-else
                      class="mt-1 text-sm"
                      :class="
                        Number(values?.base_price || 0) > 0
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      "
                    >
                      Pilih salah satu: jangan isi keduanya sekaligus
                    </p>
                  </div>
                </Field>

                <Field name="base_price" v-slot="{ field, errors }">
                  <div>
                    <label
                      class="block mb-2 text-sm font-semibold text-gray-700"
                      >Harga Mulai Dari</label
                    >
                    <div class="relative">
                      <span
                        class="absolute font-medium text-gray-500 transform -translate-y-1/2 left-4 top-1/2"
                        >Rp</span
                      >
                      <input
                        :value="formatCurrency(field.value || 0)"
                        @input="
                          (e) => {
                            const newValue = parseCurrency(e.target.value);
                            field.onChange(newValue);
                            formData.base_price = newValue;
                            // Auto-clear fixed_price jika base_price diisi
                            if (newValue > 0 && values?.fixed_price > 0) {
                              setFieldValue('fixed_price', 0);
                              formData.fixed_price = 0;
                            }
                          }
                        "
                        @blur="field.onBlur"
                        type="text"
                        placeholder="0"
                        class="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        :disabled="Number(values?.fixed_price || 0) > 0"
                      />
                    </div>
                    <p v-if="errors[0]" class="mt-1 text-sm text-red-500">
                      {{ errors[0] }}
                    </p>
                    <p
                      v-else
                      class="mt-1 text-sm"
                      :class="
                        Number(values?.fixed_price || 0) > 0
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      "
                    >
                      Pilih salah satu: jangan isi keduanya sekaligus
                    </p>
                  </div>
                </Field>
              </div>
            </div>

            <!-- 3. GAMBAR -->
            <div
              class="p-5 border border-purple-100 bg-linear-to-r from-purple-50 to-transparent rounded-xl"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-purple-500 rounded-full"
                >
                  3
                </div>
                <h2 class="text-lg font-bold text-gray-800">Gambar Layanan</h2>
              </div>

              <!-- Existing Images -->
              <div v-if="existingImages.length" class="mb-4">
                <label
                  class="inline-flex items-center gap-2 mb-2 text-sm font-medium text-gray-700"
                >
                  <i class="text-sm text-gray-400 pi pi-images"></i>
                  <span>Gambar Saat Ini</span>
                </label>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div
                    v-for="(image, idx) in existingImages"
                    :key="image.id ?? idx"
                    class="relative group"
                  >
                    <div
                      v-if="!imagesToRemove.includes(image.id)"
                      class="relative"
                    >
                      <img
                        :src="getImageUrl(image.url || image.src_url || image.id)"
                        alt="preview"
                        class="object-cover w-full border border-gray-200 rounded h-28 bg-gray-50"
                        @error="(e) => (e.target.style.display = 'none')"
                      />
                      <span
                        v-if="image.is_cover"
                        class="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow"
                      >
                        Cover
                      </span>
                      <div
                        class="absolute bottom-1 right-1 bg-white/90 text-gray-500 rounded-full p-1 shadow-sm flex items-center justify-center text-[10px] group-hover:bg-merchant-primary/90 group-hover:text-white transition"
                      >
                        <i class="pi pi-image"></i>
                      </div>
                      <button
                        type="button"
                        @click="removeExistingImage(image)"
                        class="absolute p-1 text-white transition bg-red-500 rounded-full opacity-0 top-1 right-1 group-hover:opacity-100"
                        title="Hapus gambar"
                      >
                        <i class="text-xs pi pi-times"></i>
                      </button>
                      <button
                        v-if="image.id && !image.is_cover"
                        type="button"
                        @click="setAsCover(image)"
                        class="absolute bottom-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition"
                        title="Jadikan cover"
                      >
                        Jadikan Cover
                      </button>
                    </div>
                    <div
                      v-else
                      class="flex items-center justify-center w-full bg-gray-100 border rounded h-28"
                    >
                      <div class="text-center">
                        <i class="mb-1 text-xl text-gray-400 pi pi-trash"></i>
                        <p class="text-xs text-gray-500">Akan dihapus</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Upload New Images -->
              <div class="space-y-3">
                <div>
                  <label
                    for="edit_jasa_new_images"
                    class="inline-flex items-center gap-2 mb-1 text-sm font-medium text-gray-700"
                  >
                    <i class="text-sm text-gray-400 pi pi-image"></i>
                    <span>Unggah Gambar Baru (opsional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="edit_jasa_new_images"
                    name="new_images"
                    @change="handleNewImageChange"
                    class="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-merchant-primary/10 file:text-merchant-primary hover:file:bg-merchant-primary/20"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Gambar baru akan ditambahkan ke gambar yang ada.
                  </p>
                </div>

                <div
                  v-if="newImageFiles.length"
                  class="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  <div
                    v-for="(file, idx) in newImageFiles"
                    :key="idx"
                    class="relative overflow-hidden border border-gray-200 rounded-lg group bg-gray-50"
                  >
                    <img
                      :src="newImagePreviews[idx] || ''"
                      alt="preview"
                      class="object-cover w-full h-28"
                    />
                    <span
                      class="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow"
                    >
                      Baru
                    </span>
                    <button
                      type="button"
                      @click="removeNewImage(idx)"
                      class="absolute p-1 text-white transition bg-red-500 rounded-full opacity-0 top-1 right-1 group-hover:opacity-100"
                      title="Hapus gambar baru ini"
                    >
                      <i class="text-xs pi pi-times"></i>
                    </button>
                    <div
                      class="absolute bottom-1 right-1 bg-white/90 text-gray-500 rounded-full p-1 shadow-sm flex items-center justify-center text-[10px] group-hover:bg-merchant-primary/90 group-hover:text-white transition"
                    >
                      <i class="pi pi-image"></i>
                    </div>
                  </div>
                </div>
                <p v-if="newImageFiles.length" class="text-xs text-gray-500">
                  {{ newImageFiles.length }} gambar baru dipilih.
                </p>
              </div>
            </div>

            <!-- 4. LOKASI -->
            <div
              class="p-5 border border-orange-100 bg-linear-to-r from-orange-50 to-transparent rounded-xl"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-orange-500 rounded-full"
                >
                  4
                </div>
                <h2 class="text-lg font-bold text-gray-800">
                  Lokasi & Area Layanan
                </h2>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  name="service_type"
                  label="Tipe Layanan"
                  :options="[
                    { value: 'at_location', label: '📍 Di Tempat Saya' },
                    { value: 'on_site', label: '🏠 Ke Rumah Pelanggan' },
                    { value: 'online', label: '💻 Online' },
                  ]"
                  v-model="formData.service_type"
                  required
                />

                <Field
                  v-if="formData.service_type === 'at_location'"
                  name="location_address"
                  v-slot="{ errors }"
                >
                  <div class="sm:col-span-2">
                    <label class="block mb-2 text-sm font-semibold text-gray-700"
                      >Alamat UMKM (dari profil)</label
                    >
                    <textarea
                      :value="merchantProfileAddress || formData.location_address"
                      readonly
                      rows="3"
                      class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-500">
                      Alamat ini otomatis mengikuti data profil UMKM.
                    </p>
                    <p v-if="errors[0]" class="mt-1 text-sm text-red-500">
                      {{ errors[0] }}
                    </p>
                  </div>
                </Field>

                <Field
                  v-if="formData.service_type === 'on_site'"
                  name="service_area"
                  v-slot="{ field, errors }"
                >
                  <div class="sm:col-span-2">
                    <label class="block mb-2 text-sm font-semibold text-gray-700"
                      >Area Layanan (opsional)</label
                    >
                    <textarea
                      :name="field.name"
                      :value="field.value"
                      @input="(e) => { field.onChange(e.target.value); formData.service_area = e.target.value; }"
                      @blur="field.onBlur"
                      rows="2"
                      placeholder="Contoh: Kota Semarang, radius 10 km dari toko"
                      class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-500">
                      Saat checkout, customer akan diminta izin lokasi device untuk menentukan alamat layanan.
                    </p>
                    <p v-if="errors[0]" class="mt-1 text-sm text-red-500">
                      {{ errors[0] }}
                    </p>
                  </div>
                </Field>

                <div
                  v-if="formData.service_type === 'online'"
                  class="sm:col-span-2 p-3 text-xs border border-blue-200 rounded-lg bg-blue-50 text-blue-700"
                >
                  Layanan online tidak membutuhkan alamat lokasi.
                </div>

                <Field name="operating_times" v-slot="{ errors }">
                  <div class="sm:col-span-2">
                    <label class="block mb-2 text-sm font-semibold text-gray-700"
                      >Jam Layanan <span class="text-xs font-normal text-gray-500">(opsional)</span></label
                    >

                    <div class="p-3 bg-white border border-orange-100 rounded-lg">
                      <p class="mb-2 text-xs text-gray-500">
                        Pilih satu atau beberapa jam layanan yang bisa dipilih customer.
                      </p>

                      <div class="flex flex-wrap items-center gap-2 mb-3">
                        <button
                          type="button"
                          @click="toggleSelectAllOperatingTimes(setFieldValue)"
                          class="px-3 py-1.5 text-xs font-medium rounded-full border transition"
                          :class="
                            isAllOperatingTimesSelected
                              ? 'bg-merchant-primary text-white border-merchant-primary'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-merchant-primary/60'
                          "
                        >
                          {{ isAllOperatingTimesSelected ? 'Batalkan Semua' : 'Pilih Semua' }}
                        </button>
                      </div>

                      <div class="space-y-3">
                        <div
                          v-for="group in OPERATING_TIME_GROUPS"
                          :key="group.key"
                          class="p-3 border border-gray-200 rounded-lg"
                        >
                          <div class="flex items-center justify-between mb-2">
                            <p class="text-xs font-semibold text-gray-700 uppercase">
                              {{ group.label }}
                            </p>
                            <button
                              type="button"
                              @click="toggleGroupOperatingTimes(group.times, setFieldValue)"
                              class="text-[11px] font-medium px-2 py-1 rounded-full border transition"
                              :class="
                                isGroupFullySelected(group.times)
                                  ? 'bg-merchant-primary text-white border-merchant-primary'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-merchant-primary/60'
                              "
                            >
                              {{ isGroupFullySelected(group.times) ? 'Batalkan' : 'Pilih semua' }}
                            </button>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <button
                              v-for="time in group.times"
                              :key="`${group.key}-${time}`"
                              type="button"
                              @click="toggleOperatingTime(time, setFieldValue)"
                              class="px-3 py-1.5 text-xs rounded-full border transition"
                              :class="
                                isOperatingTimeSelected(time)
                                  ? 'bg-merchant-primary text-white border-merchant-primary'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-merchant-primary/60'
                              "
                            >
                              {{ time }}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 mt-3">
                        <input
                          v-model="customOperatingTime"
                          type="text"
                          placeholder="Tambahkan manual (contoh: 09.30)"
                          @keyup.enter="addCustomOperatingTime(setFieldValue)"
                          class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-merchant-primary/60"
                        />
                        <button
                          type="button"
                          @click="addCustomOperatingTime(setFieldValue)"
                          class="px-3 py-2 text-sm font-medium text-white rounded-lg bg-merchant-primary hover:bg-merchant-primary/90"
                        >
                          Tambah
                        </button>
                      </div>

                      <div v-if="selectedOperatingTimes.length" class="mt-3">
                        <p class="mb-1 text-xs text-gray-600">Jam terpilih:</p>
                        <div class="flex flex-wrap gap-2">
                          <span
                            v-for="time in selectedOperatingTimes"
                            :key="`selected-${time}`"
                            class="inline-flex items-center px-3 py-1 text-xs font-medium text-white rounded-full bg-merchant-primary"
                          >
                            {{ time }}
                          </span>
                        </div>
                      </div>
                      <p v-else class="mt-2 text-xs text-gray-500">
                        Belum diatur. Customer tetap bisa isi jam secara manual.
                      </p>
                    </div>

                    <p v-if="errors[0]" class="mt-1 text-sm text-red-500">
                      {{ errors[0] }}
                    </p>
                  </div>
                </Field>
              </div>
            </div>

            <!-- 7. PEMBAYARAN -->
            <div
              class="p-5 border bg-linear-to-r from-violet-50 to-transparent rounded-xl border-violet-100"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white rounded-full bg-violet-500"
                >
                  7
                </div>
                <h2 class="text-lg font-bold text-gray-800">
                  Metode Pembayaran
                </h2>
              </div>
              <div class="space-y-3">
                <div
                  class="flex items-center gap-3 p-4 bg-white border border-violet-100 rounded-xl"
                >
                  <div
                    class="flex items-center justify-center rounded-full w-9 h-9 bg-violet-100 text-violet-600"
                  >
                    <i class="pi pi-credit-card"></i>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-800">
                      COD (Bayar di Tempat)
                    </p>
                    <p class="text-xs text-gray-500">
                      Untuk saat ini, pembayaran jasa dilakukan langsung di
                      lokasi (cash on delivery).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 8. STATUS -->
            <div
              class="p-5 border border-red-100 bg-linear-to-r from-red-50 to-transparent rounded-xl"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-red-500 rounded-full"
                >
                  8
                </div>
                <h2 class="text-lg font-bold text-gray-800">Status Layanan</h2>
              </div>
              <div>
                <p
                  class="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-800"
                >
                  Status saat ini:
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                    :class="[
                      formData.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : formData.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-200 text-gray-700',
                    ]"
                  >
                    <span v-if="formData.status === 'draft'">📝 Draft</span>
                    <span v-else-if="formData.status === 'published'"
                      >✅ Dipublish</span
                    >
                    <span v-else>🔒 Diarsipkan</span>
                  </span>
                </p>
                <p class="mt-1 text-xs text-gray-600">
                  Draft: belum tampil ke pelanggan. Dipublish: bisa dipesan
                  pelanggan. Diarsipkan: disembunyikan dari pelanggan.
                </p>

                <div class="flex flex-wrap gap-3 mt-4">
                  <!-- Dari draft bisa langsung publish -->
                  <Button
                    v-if="formData.status === 'draft'"
                    type="button"
                    variant="primary"
                    @click="
                      formData.status = 'published';
                      handleSubmit(submitForm)();
                    "
                    class="flex items-center gap-2"
                  >
                    <i class="pi pi-check"></i>
                    Publish Sekarang
                  </Button>

                  <!-- Dari published bisa diarsipkan -->
                  <Button
                    v-if="formData.status === 'published'"
                    type="button"
                    variant="muted-outline"
                    @click="
                      formData.status = 'archived';
                      handleSubmit(submitForm)();
                    "
                    class="flex items-center gap-2 text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
                  >
                    <i class="pi pi-box"></i>
                    Arsipkan Layanan
                  </Button>

                  <!-- Dari archived bisa dipublish lagi -->
                  <Button
                    v-if="formData.status === 'archived'"
                    type="button"
                    variant="primary"
                    @click="
                      formData.status = 'published';
                      handleSubmit(submitForm)();
                    "
                    class="flex items-center gap-2"
                  >
                    <i class="pi pi-upload"></i>
                    Publikasikan Lagi
                  </Button>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="muted-outline"
                @click="router.back()"
                class="flex-1"
              >
                <i class="mr-2 pi pi-arrow-left"></i>
                Kembali
              </Button>
              <Button
                type="submit"
                variant="primary"
                :disabled="loading"
                :loading="loading"
                class="flex-1"
              >
                <i class="mr-2 pi pi-check"></i>
                {{ loading ? "Menyimpan..." : "Simpan Perubahan" }}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  </div>
</template>

<style scoped>
textarea {
  resize: vertical;
}
</style>
