<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
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

// File uploads
const imageFiles = ref([]);
const imagePreviews = ref([]);
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

const buildImagePreviews = (files) => {
  imagePreviews.value.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
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

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : authStore.merchantSlug ?? null;
});

// Needed for API endpoints that still require merchantId
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

const merchantProfileFromApi = ref(null);

const normalizeAddressPart = (part) => {
  if (!part) return "";
  if (typeof part === "string") return part.trim();
  if (typeof part === "object") {
    return String(part.name || part.label || part.value || "").trim();
  }
  return "";
};

const formatMerchantAddress = (merchant) => {
  if (!merchant) return "";

  const primaryAddress =
    merchant.primary_address ||
    merchant.primaryAddress ||
    merchant.address_primary ||
    (Array.isArray(merchant.addresses)
      ? merchant.addresses.find((addr) => addr?.is_primary) || merchant.addresses[0]
      : null);

  if (primaryAddress) {
    const parts = [
      normalizeAddressPart(primaryAddress.detail || primaryAddress.address),
      normalizeAddressPart(primaryAddress.village),
      normalizeAddressPart(primaryAddress.district),
      normalizeAddressPart(primaryAddress.city),
      normalizeAddressPart(primaryAddress.province),
    ].filter((item) => item && item.length > 0);

    if (parts.length) return parts.join(", ");

    if (typeof primaryAddress.full_address === "string") {
      return primaryAddress.full_address.trim();
    }
  }

  return (
    merchant.full_address ||
    merchant.address ||
    merchant.alamat ||
    ""
  );
};

const merchantProfileAddress = computed(() => {
  return (
    formatMerchantAddress(currentMerchantData.value) ||
    formatMerchantAddress(merchantProfileFromApi.value)
  );
});

const loadMerchantProfileAddress = async () => {
  if (!currentMerchantSlug.value) return;
  if (merchantProfileAddress.value) return;

  try {
    const { data } = await api.get(
      `/api/merchant/${currentMerchantSlug.value}/profile`
    );
    merchantProfileFromApi.value = data?.data ?? data ?? null;
  } catch (error) {
    console.error("[Createjasa] Gagal memuat profil merchant", error);
  }
};

const breadcrumbItems = computed(() => [
  {
    label: "Jasa",
    path: `/merchant-center/${currentMerchantSlug.value}/jasas`,
  },
  { label: "Tambah Jasa" },
]);

// State
const loading = ref(false);
const jasaCategories = ref([]);
const jasaSubcategories = ref([]);
const formKey = ref(0);

// LocalStorage key for form draft
const FORM_DRAFT_KEY = computed(
  () => `jasa-create-draft-${currentMerchantSlug.value || "default"}`
);

// Form data
const formData = ref({
  title: "",
  description: "",
  jasa_category_id: null,
  jasa_subcategory_id: null,
  fixed_price: 0,
  base_price: 0,
  operating_times: "",
  service_type: "at_location",
  location_address: "",
  service_area: "",
  special_notes: "",
  payment_methods: "cod",
  status: "draft",
});

// Validation schema
const validationSchema = yup.object({
  title: yup.string().required("Nama layanan wajib diisi"),
  description: yup.string().required("Deskripsi layanan wajib diisi").min(20, "Deskripsi minimal 20 karakter"),
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
        // minimal salah satu > 0
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
        // valid jika hanya salah satu yang > 0
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
  operating_times: yup.string().nullable().max(255),
  service_type: yup.string().required("Tipe layanan wajib dipilih"),
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
  { key: "morning", label: "Pagi", times: ["07.00", "08.00", "09.00", "10.00", "11.00"] },
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
    toast.error("Format jam tidak valid. Gunakan HH.MM atau HH:MM (contoh: 09.30)");
    return;
  }

  const hh = String(match[1]).padStart(2, "0");
  const mm = match[2];
  const normalized = `${hh}.${mm}`;
  const current = [...selectedOperatingTimes.value];

  if (!current.includes(normalized)) {
    current.push(normalized);
    setOperatingTimes(current, setFieldValue);
    toast.success("Berhasil ditambahkan");
  } else {
    toast.info("Jam layanan sudah ada");
  }

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

// Auto-save form data to localStorage
watch(
  formData,
  (newData) => {
    try {
      localStorage.setItem(FORM_DRAFT_KEY.value, JSON.stringify(newData));
    } catch (error) {
      console.error("Failed to save form draft:", error);
    }
  },
  { deep: true }
);

// Restore form data from localStorage
const restoreFormDraft = () => {
  try {
    const saved = localStorage.getItem(FORM_DRAFT_KEY.value);
    if (saved) {
      const parsed = JSON.parse(saved);
      formData.value = { ...formData.value, ...parsed };
      
      // Load subcategories if category is selected
      if (parsed.jasa_category_id) {
        loadSubcategories(parsed.jasa_category_id);
      }

      formKey.value += 1;
      
      toast.info("Data form sebelumnya berhasil dipulihkan");
    }
  } catch (error) {
    console.error("Failed to restore form draft:", error);
  }
};

// Clear form draft from localStorage
const clearFormDraft = () => {
  try {
    localStorage.removeItem(FORM_DRAFT_KEY.value);
  } catch (error) {
    console.error("Failed to clear form draft:", error);
  }
};

// Handle image file selection (bisa tambah berkali-kali)
const handleImageChange = (e) => {
  const files = e.target.files;
  if (files && files.length) {
    const picked = Array.from(files);
    const merged = [...imageFiles.value];
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

    imageFiles.value = merged;
    buildImagePreviews(imageFiles.value);
    console.log(
      "Images selected (total):",
      imageFiles.value.length,
      imageFiles.value.map((f) => f.name)
    );

    // reset input supaya bisa pilih file yang sama lagi jika perlu
    e.target.value = "";
  }
};

const removeSelectedImage = (index) => {
  if (index < 0 || index >= imageFiles.value.length) return;
  imageFiles.value.splice(index, 1);
  buildImagePreviews(imageFiles.value);
};

const addPackage = () => {
  packages.value.push({
    name: "",
    description: "",
    price: 0,
  });
};

const removePackage = (index) => {
  packages.value.splice(index, 1);
};

const submitForm = async (values) => {
  if (!currentMerchantSlug.value) {
    toast.error("Merchant slug tidak ditemukan");
    return;
  }

  if (!currentMerchantId.value) {
    toast.error("Merchant ID tidak ditemukan");
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
    // Build multipart form data
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      fd.append(k, v ?? "");
    });

    fd.set("location_address", formData.value.location_address || "");
    fd.set("operating_times", formData.value.operating_times || "");
      // Default create sebagai draft — pelaku UMKM harus publish manual
      fd.set("status", "draft");

    // Append images[] if any
    if (imageFiles.value && imageFiles.value.length) {
      const fileError = validateSelectedImages(imageFiles.value);
      if (fileError) {
        toast.error(fileError);
        return;
      }

      imageFiles.value.forEach((file) => fd.append("images[]", file));
    }

    console.log("Submitting jasa with FormData:", {
      ...values,
      images_count: imageFiles.value.length,
    });

    // Biarkan axios yang set header multipart/form-data + boundary secara otomatis
    const { data } = await api.post(
      `/api/merchants/${currentMerchantSlug.value}/jasas`,
      fd
    );

    toast.success("Jasa berhasil dibuat sebagai Draft. Silakan publish agar tampil ke customer.");
    
    // Clear form draft after successful submission
    clearFormDraft();
    
    router.push(`/merchant-center/${currentMerchantSlug.value}/jasas`);
  } catch (error) {
    console.error("Error creating jasa:", error);
    const msg = error.response?.data?.message || "Gagal membuat jasa";
    toast.error(msg);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadCategories();
  loadMerchantProfileAddress();
  
  // Restore form draft from localStorage
  restoreFormDraft();
});

onBeforeUnmount(() => {
  imagePreviews.value.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
  });
});
</script>

<template>
  <div class="min-h-screen p-4 bg-linear-to-br from-gray-50 to-gray-100 sm:p-6">
    <Breadcrumb :items="breadcrumbItems" />

    <div class="max-w-4xl mx-auto mt-6">
      <div class="mb-6 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div
          class="px-6 py-8 bg-linear-to-r from-merchant-primary to-merchant-primary/80 rounded-t-xl"
        >
          <div class="flex items-start justify-between">
            <div>
              <h1 class="mb-2 text-3xl font-bold text-white">
                Buat Layanan Jasa Baru
              </h1>
              <p class="text-sm text-white/80">
                Isi formulir dibawah untuk menambahkan layanan jasa baru Anda
              </p>
            </div>
            <i class="text-4xl text-white pi pi-plus-circle opacity-20"></i>
          </div>
        </div>

        <Form
          :key="formKey"
          :validationSchema="validationSchema"
          @submit="submitForm"
          :initialValues="formData"
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
                    <TextField
                      :name="field.name"
                      :modelValue="field.value"
                      @update:modelValue="(val) => { field.onChange(val); formData.title = val; }"
                      @blur="field.onBlur"
                      label="Nama Layanan"
                      placeholder="Contoh: Jasa Kebersihan Rumah"
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

                <Field name="description" v-slot="{ field, errors }">
                  <div class="sm:col-span-2">
                    <label
                      class="block mb-2 text-sm font-semibold text-gray-700"
                      >Deskripsi Layanan <span class="text-red-500">*</span></label
                    >
                    <textarea
                      :name="field.name"
                      :value="field.value"
                      @input="(e) => { field.onChange(e.target.value); formData.description = e.target.value; }"
                      @blur="field.onBlur"
                      placeholder="Jelaskan detail tentang layanan Anda secara lengkap (minimal 20 karakter)..."
                      class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :class="errors.length ? 'border-red-500' : 'border-gray-300'"
                      rows="4"
                    />
                    <span v-if="errors.length" class="mt-1 text-xs text-red-500">{{ errors[0] }}</span>
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
              <div class="space-y-3">
                <div>
                  <label
                    for="create_jasa_images"
                    class="block mb-1 text-sm font-medium text-gray-700"
                    >Unggah Gambar (satu atau lebih)</label
                  >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="create_jasa_images"
                    name="images"
                    @change="handleImageChange"
                    class="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-merchant-primary/10 file:text-merchant-primary hover:file:bg-merchant-primary/20"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    <span class="inline-flex items-center gap-1">
                      <i class="text-xs text-gray-400 pi pi-image"></i>
                      <span>Gambar pertama akan dijadikan cover.</span>
                    </span>
                  </p>
                </div>

                <div
                  v-if="imageFiles.length"
                  class="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  <div
                    v-for="(file, idx) in imageFiles"
                    :key="idx"
                    class="relative overflow-hidden border border-gray-200 rounded-lg group bg-gray-50"
                  >
                    <img
                      :src="imagePreviews[idx]"
                      alt="preview"
                      class="object-cover w-full h-28"
                    />
                    <span
                      v-if="idx === 0"
                      class="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow"
                    >
                      Cover
                    </span>
                    <button
                      type="button"
                      @click="removeSelectedImage(idx)"
                      class="absolute p-1 text-white transition bg-red-500 rounded-full opacity-0 top-1 right-1 group-hover:opacity-100"
                      title="Hapus gambar ini"
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

                <p v-if="imageFiles.length" class="text-xs text-gray-500">
                  {{ imageFiles.length }} gambar dipilih.
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
                  label="Tempat Layanan?"
                  :options="[
                    { value: 'at_location', label: 'Di Tempat Saya' },
                    { value: 'on_site', label: 'Ke Rumah/Lokasi Pelanggan' },
                    { value: 'online', label: 'Online' },
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
                      Alamat ini otomatis diambil dari profil UMKM.
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

            <!-- 5. PEMBAYARAN -->
            <div
              class="p-5 border bg-linear-to-r from-violet-50 to-transparent rounded-xl border-violet-100"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white rounded-full bg-violet-500"
                >
                  5
                </div>
                <h2 class="text-lg font-bold text-gray-800">
                  Metode Pembayaran
                </h2>
              </div>
              <div class="space-y-4">
                <!-- Metode Pembayaran (hanya COD) -->
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

            <!-- 6. STATUS -->
            <div
              class="p-5 border border-red-100 bg-linear-to-r from-red-50 to-transparent rounded-xl"
            >
              <div class="flex items-center gap-3 mb-5">
                <div
                  class="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-red-500 rounded-full"
                >
                  6
                </div>
                <h2 class="text-lg font-bold text-gray-800">Status Layanan</h2>
              </div>
              <div>
                <p class="mb-2 text-sm text-gray-700">
                  Layanan baru akan disimpan sebagai
                  <span class="font-semibold text-amber-600">Draft</span>.
                </p>
                <p class="text-xs text-gray-500">
                  Setelah tersimpan, layanan belum tampil di customer. Publish
                  terlebih dahulu dari halaman Daftar Jasa/Edit agar layanan
                  muncul.
                </p>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-4">
              <Button
                type="button"
                variant="muted-outline"
                @click="router.back()"
                class="flex-1"
              >
                <i class="mr-2 pi pi-arrow-left"></i>Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                :disabled="loading"
                :loading="loading"
                class="flex-1"
              >
                <i class="mr-2 pi pi-check"></i
                >{{ loading ? "Menyimpan..." : "Simpan Jasa" }}
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
