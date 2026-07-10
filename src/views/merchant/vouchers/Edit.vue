<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth"; // ✅ ADD: Import auth store
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import { Form, Field, useForm } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import CheckboxField from "@/components/forms/CheckboxField.vue";
import InputDateField from "@/components/forms/InputDateField.vue";
import Button from "@/components/common/Button.vue";
import { useVouchers } from "@/composables/useVouchers";

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
const authStore = useAuthStore(); // ✅ ADD: Get auth store

const voucher_name = ref("");
const voucher_code = ref("");
const voucher_description = ref("");
const is_secret = ref(false);

const value = ref(0);
const min_purchase_amount = ref(0);
const max_discount_amount = ref(0);
const usage_limit_per_user = ref(1);
const usage_limit = ref(0);

const voucher_start_date = ref("");
const voucher_end_date = ref("");

const voucher_type = ref("percent");

// ✅ Merchant slug from route params
const currentMerchantSlug = computed(() => {
  return route?.params?.merchantSlug ? String(route.params.merchantSlug) : null;
});
const voucherId = computed(() => {
  return route?.params?.id ? Number(route.params.id) : null;
});

// ✅ ADD: Validate merchant ownership
const isValidMerchant = computed(() => {
  if (!currentMerchantSlug.value) return false;

  // Check if user owns this merchant
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
// STATE MANAGEMENT
// ============================================================

// ✅ REMOVED: Hardcoded merchantId
// const merchantId = ref(1); // ❌ DELETE THIS

// ============================================================
// VALIDATION SCHEMA
// ============================================================
const schema = yup.object({
  voucher_name: yup.string().required("Nama voucher wajib diisi"),
  voucher_code: yup
    .string()
    .required("Kode voucher wajib diisi")
    .matches(/^\S+$/, "Kode voucher tidak boleh mengandung spasi"),
  voucher_description: yup.string().required("Deskripsi wajib diisi"),
  voucher_type: yup.string().required(),
  value: yup.number().required().min(1).when("voucher_type", ([type], schema) => {
    return type === "percent" ? schema.max(100, "Nilai persentase tidak boleh lebih dari 100%") : schema;
  }),
  voucher_start_date: yup.string().required("Tanggal mulai wajib diisi"),
  voucher_end_date: yup.string().required("Tanggal akhir wajib diisi").test(
    "is-after",
    "Tanggal akhir tidak boleh mendahului tanggal mulai",
    function (value) {
      const { voucher_start_date } = this.parent;
      if (!voucher_start_date || !value) return true;
      return new Date(value) >= new Date(voucher_start_date);
    }
  ),
  usage_limit_per_user: yup.number().required().min(1),
  max_discount_amount: yup
    .number()
    .nullable()
    .when("voucher_type", {
      is: "percent",
      then: (s) => s.required(),
      otherwise: (s) => s.default(0),
    }),
  is_secret: yup.boolean(),
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
} = useForm({
  validationSchema: schema,
  initialValues: {
    voucher_name: "",
    voucher_code: "",
    voucher_description: "",
    voucher_type: "percent",
    value: 0,
    voucher_start_date: "",
    voucher_end_date: "",
    usage_limit_per_user: 1,
    usage_limit: 0,
    min_purchase_amount: 0,
    max_discount_amount: 0,
    is_secret: false,
  },
});

// ============================================================
// LIFECYCLE HOOKS
// ============================================================
onMounted(async () => {
  if (!currentMerchantSlug.value || !voucherId.value) {
    toast.error("ID merchant / voucher tidak valid");
    router.push("/merchant-center");
    return;
  }

  try {
    const res = await fetchMerchantVoucherDetail(
      currentMerchantSlug.value,
      voucherId.value,
    );

    // API kamu return { data: {...} }
    const v = res.data ?? res;

    // =========================
    // 🔁 MAP KE REF (UI)
    // =========================
    voucher_name.value = v.voucher_name ?? "";
    voucher_code.value = v.voucher_code ?? "";
    voucher_description.value = v.voucher_description ?? "";
    voucher_type.value = v.voucher_type ?? "percent";
    is_secret.value = !!v.is_secret;

    value.value = Number(v.value ?? 0);
    min_purchase_amount.value = Number(v.min_purchase_amount ?? 0);
    usage_limit_per_user.value = Number(v.usage_limit_per_user ?? 1);
    usage_limit.value = Number(v.usage_limit ?? 0);
    max_discount_amount.value = Number(v.max_discount_amount ?? 0);

    // =========================
    // 🗓️ FORMAT DATE (YYYY-MM-DD)
    // =========================
    voucher_start_date.value = v.voucher_start_date
      ? v.voucher_start_date.slice(0, 10)
      : "";
    voucher_end_date.value = v.voucher_end_date
      ? v.voucher_end_date.slice(0, 10)
      : "";

    // =========================
    // 🔗 SYNC KE vee-validate
    // =========================
    setFieldValue("voucher_name", voucher_name.value);
    setFieldValue("voucher_code", voucher_code.value);
    setFieldValue("voucher_description", voucher_description.value);
    setFieldValue("voucher_type", voucher_type.value);
    setFieldValue("value", value.value);
    setFieldValue("voucher_start_date", voucher_start_date.value);
    setFieldValue("voucher_end_date", voucher_end_date.value);
    setFieldValue("usage_limit_per_user", usage_limit_per_user.value);
    setFieldValue("is_secret", is_secret.value);

    setFieldValue("max_discount_amount", max_discount_amount.value);

    if (isDev) {
      console.log(values.max_discount_amount);
    }
  } catch (e) {
    toast.error("Gagal memuat detail voucher");
    router.push(`/merchant-center/${currentMerchantSlug.value}/vouchers`);
  }
});

// ============================================================
// WATCHERS
// ============================================================
// ===============================
// 🔗 BRIDGE v-model → vee-validate
// ===============================
watch(voucher_name, (v) => setFieldValue("voucher_name", v));
watch(voucher_code, (v) => setFieldValue("voucher_code", v));
watch(voucher_description, (v) => setFieldValue("voucher_description", v));
watch(is_secret, (v) => setFieldValue("is_secret", v));

watch(voucher_type, (v) => {
  setFieldValue("voucher_type", v);

  if (v === "fixed") {
    setFieldValue("max_discount_amount", 0);
  }
});

watch(value, (v) => setFieldValue("value", v));
watch(max_discount_amount, (v) => setFieldValue("max_discount_amount", v));
watch(voucher_start_date, (v) => setFieldValue("voucher_start_date", v));
watch(voucher_end_date, (v) => setFieldValue("voucher_end_date", v));

watch(usage_limit_per_user, (v) => setFieldValue("usage_limit_per_user", v));

// ============================================================
// COMPUTED PROPERTIES
// ============================================================

// ============================================================
// SUBMIT HANDLER
// ============================================================
const onSubmit = veeHandleSubmit(
  async () => {
    if (isDev) {
      console.log("SUBMIT EDIT TERPANGGIL");
    }
    if (!isValidMerchant.value) {
      toast.error("Merchant tidak valid");
      return;
    }

    const payload = {
      voucher_name: voucher_name.value,
      voucher_code: voucher_code.value,
      voucher_description: voucher_description.value,
      voucher_type: voucher_type.value,
      value: value.value,
      voucher_start_date: voucher_start_date.value,
      voucher_end_date: voucher_end_date.value,
      min_purchase_amount: min_purchase_amount.value,
      usage_limit_per_user: usage_limit_per_user.value,
      usage_limit: usage_limit.value,
      max_discount_amount: voucher_type.value === "percent"
          ? Number(max_discount_amount.value ?? 0)
          : 0,
      is_secret: is_secret.value,
    };

    try {
      await editMerchantVoucher(
        currentMerchantSlug.value,
        voucherId.value,
        payload,
      );

      router.push(`/merchant-center/${currentMerchantSlug.value}/vouchers`);
    } catch (err) {
      // toast sudah ditangani di composable
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.error(firstError);
    }
  }
);
</script>

<!-- Template unchanged, just ensure mobile header back button uses dynamic route -->
<template>
  <div class="min-h-screen pb-20 bg-gray-50 sm:pb-0">
    <!-- Mobile Header -->
    <MerchantMobileHeader
      title="Edit Voucher"
      :backRoute="`/merchant-center/${currentMerchantSlug}/vouchers`"
    />

    <!-- Desktop Header -->
    <div class="sticky top-0 left-0 right-0 z-50 hidden py-6 bg-gray-50 sm:block">
      <div
        class="flex flex-wrap items-center justify-between px-4 mx-auto sm:px-8 gap-y-2 gap-x-4"
      >
        <div>
          <!-- ✅ Use Breadcrumb Component -->
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="text-xs text-muted-foreground sm:text-sm">
            {{
              loadingDetail
                ? "Memuat data voucher..."
                : voucher_name || "Edit Voucher"
            }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <Button
            @click="onSubmit"
            variant="merchant"
            size="md"
            :disabled="loading"
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
      <p class="text-sm text-muted-foreground">Memuat data produk...</p>
    </div>

    <!-- Container Responsive -->
    <div v-else class="px-4 pt-4 mx-auto sm:px-6 sm:py-6 sm:pt-0">
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
                Kode voucher tidak boleh sama dengan voucher lain di UMKM Anda.
              </li>
                            <li>Secret Voucher: Voucher disembunyikan agar tidak muncul di daftar voucher (Pengguna harus memasukkan kode voucher secara manual)</li>

              <li>Pilih tipe voucher: Persentase (%) atau Nilai Tetap (Rp).</li>
              <li>
                Jika tipe Persentase (%), wajib mengisi nilai maksimal diskon
                (Rp).
              </li>
              <li>
                Minimal pembelian harus diisi dan tidak boleh kurang dari 0.
              </li>
              <li>Voucher hanya berlaku pada periode yang ditentukan.</li>
            </ul>
          </div>
        </div>
      </div>
      <form @submit.prevent="onSubmit">
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

          <CheckboxField
            name="is_secret"
            v-model="is_secret"
            label="Tersembunyi (Secret Voucher)"
            variant="primary"
          />

          <!-- ✅ UPDATED: Kategori Section dengan Loading State -->
          <div class="grid grid-cols-1 gap-3">
            <!-- Level 1 Category -->
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

        <!-- Harga & Stok (tanpa variasi) - PERBAIKAN dengan v-model.number -->
        <div
          class="p-4 mb-2 space-y-4 bg-white sm:mb-4 sm:p-6 sm:rounded-xl sm:shadow-sm"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-black">
            <i class="pi pi-tag text-merchant-primary"></i>
            Nilai & Stok Voucher
          </h3>

          <div class="space-y-4">
            <!-- ✅ NEW: SKU Input -->
            <TextField
              v-show="voucher_type === 'percent'"
              name="value"
              label="Nilai"
              type="number"
              placeholder="0"
              max="100"
              suffix="%"
              v-model.number="value"
              required
            />

            <TextField
              v-show="voucher_type === 'fixed'"
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

        <!-- Min Purchase -->
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

        <!-- ✅ FIXED: Desktop Submit Button -->
        <div class="justify-end hidden sm:flex">
          <Button
            @click="onSubmit"
            variant="merchant"
            size="md"
            :disabled="loading"
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan Perubahan" }}</span>
          </Button>
        </div>

        <!-- ✅ FIXED: Mobile Submit Button -->
        <div
          class="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 sm:hidden"
        >
          <Button type="submit" :loading="loading" variant="merchant" block>
            {{ loading ? "Menyimpan..." : "Simpan Perubahan" }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar untuk opsi list */
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

/* Smooth accordion animation */
/* .transition-all {
  transition-property: max-height, opacity;
} */
</style>
