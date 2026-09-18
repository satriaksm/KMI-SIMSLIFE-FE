<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { Form, Field } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import InputDateField from "@/components/forms/InputDateField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import { useVouchers } from "@/composables/useVouchers";
import { useEvents } from "@/composables/useEvents";
import api from "@/libs/axios";

const router = useRouter();
const toast = useToast();
const { loading } = useVouchers();
const { events, fetchEvents } = useEvents();

// Form state
const selectedEventId = ref("");
const loadingEvents = ref(false);
const merchants = ref([]);
const loadingMerchants = ref(false);
const selectedMerchantIds = ref([]);

// Validation schema
const schema = yup.object({
  voucher_name: yup
    .string()
    .required("Nama voucher wajib diisi")
    .min(3, "Minimal 3 karakter")
    .max(100, "Maksimal 100 karakter"),
  voucher_description: yup
    .string()
    .required("Deskripsi voucher wajib diisi")
    .min(10, "Minimal 10 karakter"),
  voucher_type: yup
    .string()
    .required("Tipe voucher wajib dipilih")
    .oneOf(["percent", "fixed"], "Tipe tidak valid"),
  value: yup
    .number()
    .required("Nilai voucher wajib diisi")
    .positive("Nilai harus lebih dari 0")
    .when("voucher_type", {
      is: "percent",
      then: (schema) => schema.max(100, "Persentase maksimal 100%"),
    }),
  min_purchase_amount: yup
    .number()
    .required("Minimal pembelian wajib diisi")
    .min(0, "Minimal 0"),
  max_discount_amount: yup
    .number()
    .nullable()
    .min(0, "Minimal 0"),
  usage_limit: yup
    .number()
    .required("Batas penggunaan wajib diisi")
    .positive("Harus lebih dari 0")
    .integer("Harus bilangan bulat"),
  voucher_start_date: yup
    .date()
    .required("Tanggal mulai wajib diisi")
    .typeError("Format tanggal tidak valid"),
  voucher_end_date: yup
    .date()
    .required("Tanggal selesai wajib diisi")
    .min(yup.ref("voucher_start_date"), "Tanggal selesai harus setelah tanggal mulai")
    .typeError("Format tanggal tidak valid"),
  voucher_status: yup
    .string()
    .required("Status wajib dipilih")
    .oneOf(["active", "inactive"], "Status tidak valid"),
});

// Options
const voucherTypeOptions = [
  { value: "percent", label: "Persentase (%)" },
  { value: "fixed", label: "Nominal (Rp)" },
];

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak Aktif" },
];

const eventOptions = computed(() => {
  return [
    { value: "", label: "Tanpa Event" },
    ...events.value.map((e) => ({
      value: e.id,
      label: e.event_name,
    })),
  ];
});

// Load events
const loadEvents = async () => {
  loadingEvents.value = true;
  try {
    await fetchEvents({ status: "published", per_page: 100 }, true);
  } catch (error) {
    console.error("Failed to load events:", error);
    toast.error("Gagal memuat data event");
  } finally {
    loadingEvents.value = false;
  }
};

// Load merchants when event is selected
const loadMerchantsByEvent = async (eventId) => {
  if (!eventId) {
    merchants.value = [];
    selectedMerchantIds.value = [];
    return;
  }

  loadingMerchants.value = true;
  try {
    const response = await api.get(`/api/admin/events/${eventId}`);
    merchants.value = response.data.merchants || [];
  } catch (error) {
    console.error("Failed to load merchants:", error);
    toast.error("Gagal memuat merchant event");
    merchants.value = [];
  } finally {
    loadingMerchants.value = false;
  }
};

// Toggle merchant selection
const toggleMerchant = (merchantId) => {
  const index = selectedMerchantIds.value.indexOf(merchantId);
  if (index > -1) {
    selectedMerchantIds.value.splice(index, 1);
  } else {
    selectedMerchantIds.value.push(merchantId);
  }
};

// Select all merchants
const selectAllMerchants = () => {
  if (selectedMerchantIds.value.length === merchants.value.length) {
    selectedMerchantIds.value = [];
  } else {
    selectedMerchantIds.value = merchants.value.map((m) => m.id);
  }
};

// Submit handler
const handleSubmit = async (values) => {
  try {
    const payload = {
      ...values,
      event_id: selectedEventId.value || null,
      merchant_ids: selectedEventId.value ? selectedMerchantIds.value : [],
    };

    await api.post("/api/admin/vouchers", payload);
    toast.success("Voucher berhasil dibuat");
    
    // ✅ Redirect ke list vouchers
    router.push({ name: "Admin - Vouchers" });
  } catch (error) {
    console.error("Create voucher failed:", error);
    
    // ✅ Handle unique validation error
    if (error.response?.data?.errors?.voucher_name) {
      toast.error(error.response.data.errors.voucher_name[0] || "Nama voucher sudah digunakan");
    } else {
      const message = error.response?.data?.message || "Gagal membuat voucher";
      toast.error(message);
    }
  }
};

const goBack = () => router.push({ name: "Admin - Vouchers" });

// Load events on mount
loadEvents();
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <Form
        @submit="handleSubmit"
        :validation-schema="schema"
        v-slot="{ errors, values }"
      >
        <!-- ✅ Voucher Name with unique hint -->
        <div class="mb-6">
          <Field name="voucher_name" v-slot="{ field }">
            <TextField
              variant="merchant"
              v-bind="field"
              label="Nama Voucher"
              placeholder="Contoh: Promo Ramadan 2025"
              :error="errors.voucher_name"
              required
            >
              <template #hint>
                <p class="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <i class="pi pi-info-circle"></i>
                  <span>Nama voucher tidak boleh sama dengan voucher lain. Kode voucher akan digenerate otomatis (Format: SUMILIR-XXXXXXXX)</span>
                </p>
              </template>
            </TextField>
          </Field>
        </div>

        <!-- Voucher Description -->
        <div class="mb-6">
          <label class="block text-sm font-bold text-black mb-2">
            Deskripsi Voucher <span class="text-danger-foreground">*</span>
          </label>
          <Field name="voucher_description" v-slot="{ field }">
            <textarea
              v-bind="field"
              rows="4"
              class="w-full px-4 py-2.5 text-sm border rounded-xl bg-white text-black transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-merchant-primary border-merchant-primary"
              :class="{ 'border-danger-foreground focus:ring-danger-foreground': errors.voucher_description }"
              placeholder="Deskripsi lengkap tentang voucher..."
            />
          </Field>
          <p v-if="errors.voucher_description" class="text-danger-foreground text-xs mt-1">
            {{ errors.voucher_description }}
          </p>
        </div>

        <!-- Voucher Type & Value -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <SelectField
            name="voucher_type"
            :options="voucherTypeOptions"
            label="Tipe Voucher"
            variant="merchant"
            required
            :error="errors.voucher_type"
            placeholder="Pilih Tipe"
          />

          <Field name="value" v-slot="{ field }">
            <TextField
              variant="merchant"
              v-bind="field"
              type="number"
              label="Nilai"
              :placeholder="values.voucher_type === 'percent' ? 'Contoh: 10' : 'Contoh: 50000'"
              :error="errors.value"
              required
            >
              <template #suffix>
                <span class="text-sm text-gray-500">
                  {{ values.voucher_type === 'percent' ? '%' : 'Rp' }}
                </span>
              </template>
            </TextField>
          </Field>
        </div>

        <!-- Min Purchase & Max Discount -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <Field name="min_purchase_amount" v-slot="{ field }">
            <TextField
              variant="merchant"
              v-bind="field"
              type="number"
              label="Minimal Pembelian"
              placeholder="Contoh: 100000"
              :error="errors.min_purchase_amount"
              required
            >
              <template #prefix>
                <span class="text-sm text-gray-500">Rp</span>
              </template>
            </TextField>
          </Field>

          <Field name="max_discount_amount" v-slot="{ field }">
            <TextField
              variant="merchant"
              v-bind="field"
              type="number"
              label="Maksimal Diskon"
              placeholder="Contoh: 50000"
              :error="errors.max_discount_amount"
              required
            >
              <template #prefix>
                <span class="text-sm text-gray-500">Rp</span>
              </template>
              <template #hint>
                <p class="text-xs text-gray-500 mt-1">Opsional, kosongkan jika tidak ada batasan</p>
              </template>
            </TextField>
          </Field>
        </div>

        <!-- Usage Limit -->
        <div class="mb-6">
          <Field name="usage_limit" v-slot="{ field }">
            <TextField
              variant="merchant"
              v-bind="field"
              type="number"
              label="Batas Penggunaan"
              placeholder="Contoh: 100"
              :error="errors.usage_limit"
              required
            >
              <template #hint>
                <p class="text-xs text-gray-500 mt-1">Total maksimal penggunaan voucher</p>
              </template>
            </TextField>
          </Field>
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <Field name="voucher_start_date" v-slot="{ field }">
            <InputDateField
              v-model="field.value"
              variant="merchant"
              label="Tanggal Mulai"
              v-bind="field"
              :error="errors.voucher_start_date"
              required
            />
          </Field>

          <Field name="voucher_end_date" v-slot="{ field }">
            <InputDateField
              v-model="field.value"
              variant="merchant"
              label="Tanggal Selesai"
              v-bind="field"
              :error="errors.voucher_end_date"
              required
            />
          </Field>
        </div>

        <!-- Status -->
        <div class="mb-6">
          <SelectField
            name="voucher_status"
            :options="statusOptions"
            label="Status"
            variant="merchant"
            required
            :error="errors.voucher_status"
            placeholder="Pilih Status"
          />
        </div>

        <!-- Event Selection (Optional) -->
        <div class="mb-6">
          <SelectField
            name="event_id"
            v-model="selectedEventId"
            @change="loadMerchantsByEvent(selectedEventId)"
            :options="eventOptions"
            label="Event (Opsional)"
            variant="merchant"
            placeholder="Pilih Event"
            :loading="loadingEvents"
          >
            <template #hint>
              <p class="text-xs text-gray-500 mt-1">Hubungkan voucher dengan event tertentu</p>
            </template>
          </SelectField>
        </div>

        <!-- Merchant Selection (if event selected) -->
        <div v-if="selectedEventId && merchants.length > 0" class="mb-6">
          <label class="block text-sm font-bold text-black mb-3">
            Pilih Merchant <span class="text-gray-500 font-normal">(Opsional)</span>
          </label>

          <div class="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <!-- Select All -->
            <label class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 mb-3 cursor-pointer hover:border-merchant-primary transition">
              <input
                type="checkbox"
                :checked="selectedMerchantIds.length === merchants.length"
                @change="selectAllMerchants"
                class="w-4 h-4 rounded border-gray-300 text-merchant-primary focus:ring-merchant-primary"
              />
              <span class="font-medium text-gray-900">Pilih Semua Merchant ({{ merchants.length }})</span>
            </label>

            <!-- Loading State -->
            <div v-if="loadingMerchants" class="text-center py-8">
              <i class="pi pi-spin pi-spinner text-2xl text-merchant-primary mb-2"></i>
              <p class="text-sm text-gray-600">Memuat merchant...</p>
            </div>

            <!-- Merchant List -->
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <label
                v-for="merchant in merchants"
                :key="merchant.id"
                class="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:border-merchant-primary transition"
                :class="[
                  selectedMerchantIds.includes(merchant.id)
                    ? 'border-merchant-primary bg-merchant-primary/5'
                    : 'border-gray-200'
                ]"
              >
                <input
                  type="checkbox"
                  :checked="selectedMerchantIds.includes(merchant.id)"
                  @change="toggleMerchant(merchant.id)"
                  class="w-4 h-4 rounded border-gray-300 text-merchant-primary focus:ring-merchant-primary"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 truncate">{{ merchant.name }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ merchant.slug }}</p>
                </div>
              </label>
            </div>

            <p class="text-xs text-gray-500 mt-3">
              {{ selectedMerchantIds.length }} dari {{ merchants.length }} merchant dipilih
            </p>
          </div>
        </div>

        <!-- ✅ UPDATED: Info Banner -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div class="flex gap-3">
            <i class="pi pi-info-circle text-blue-600 text-lg shrink-0 mt-0.5"></i>
            <div class="flex-1">
              <h4 class="text-sm font-semibold text-blue-900 mb-1">Informasi Penting</h4>
              <ul class="text-xs text-blue-700 space-y-1">
                <li>• Nama voucher tidak boleh sama dengan voucher lain</li>
                <li>• Kode voucher akan digenerate otomatis dengan format SUMILIR-XXXXXXXX</li>
                <li>• Kode voucher dijamin unik oleh sistem</li>
                <li>• Voucher dengan status "Tidak Aktif" tidak dapat digunakan</li>
                <li>• Jika dihubungkan dengan event, voucher hanya berlaku untuk merchant dalam event tersebut</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-end pt-4 border-t">
          <Button @click="goBack" variant="secondary" type="button">
            Batal
          </Button>
          <Button type="submit" variant="merchant" :disabled="loading">
            <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
            <i v-else class="pi pi-check mr-2"></i>
            {{ loading ? "Menyimpan..." : "Simpan Voucher" }}
          </Button>
        </div>
      </Form>
    </div>
  </div>
</template>