<script setup>
// filepath: /var/www/html/KMI-SIMSLIFE-FE/src/views/merchant/products/Create.vue
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
import InputDateField from "@/components/forms/InputDateField.vue";
import Button from "@/components/common/Button.vue";
import { useVouchers } from "@/composables/useVouchers";

const { createMerchantVoucher, loading } = useVouchers();

const isDev = import.meta.env.DEV; // ✅ ADD: Development mode check
const toast = useToast();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore(); // ✅ ADD: Get auth store

const voucher_name = ref("");
const voucher_code = ref("");
const voucher_description = ref("");

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
    label: "Tambah Voucher",
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
  },
});

// ============================================================
// LIFECYCLE HOOKS
// ============================================================
onMounted(async () => {});

// ============================================================
// WATCHERS
// ============================================================
// ===============================
// 🔗 BRIDGE v-model → vee-validate
// ===============================
watch(voucher_name, (v) => setFieldValue("voucher_name", v));
watch(voucher_code, (v) => setFieldValue("voucher_code", v));
watch(voucher_description, (v) => setFieldValue("voucher_description", v));

watch(voucher_type, (v) => setFieldValue("voucher_type", v));
watch(value, (v) => setFieldValue("value", v));

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
      console.log("SUBMIT TERPANGGIL");
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
    };

    // hanya kirim max_discount kalau percent
    if (voucher_type.value === "percent") {
      payload.max_discount_amount = max_discount_amount.value;
    }

    try {
      await createMerchantVoucher(currentMerchantSlug.value, payload);
      router.push(`/merchant-center/${currentMerchantSlug.value}/vouchers`);
    } catch (err) {}
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
      title="Tambah Voucher"
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
            Lengkapi informasi voucher Anda.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <Button
            @click="onSubmit"
            variant="merchant"
            size="md"
            :disabled="loading"
          >
            <span>{{ loading ? "Menyimpan..." : "Simpan" }}</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Spacer for Mobile Only -->
    <div class="h-[72px] sm:h-0"></div>

    <!-- Container Responsive -->
    <div class="px-4 pt-4 mx-auto sm:px-6 sm:py-6 sm:pt-0">
      <!-- ✅ UPDATED: Info Banner -->
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
              v-if="voucher_type === 'percent'"
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
                v-if="voucher_type === 'percent'"
                name="max_discount_amount"
                label="Maksimal Besaran Diskon"
                type="number"
                placeholder="0"
                prefix="Rp"
                v-model.number="max_discount_amount"
                min="0"
                required
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
            <span>{{ loading ? "Menyimpan..." : "Simpan" }}</span>
          </Button>
        </div>

        <!-- ✅ FIXED: Mobile Submit Button -->
        <div
          class="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 sm:hidden"
        >
          <Button type="submit" :loading="loading" variant="merchant" block>
            Simpan
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
