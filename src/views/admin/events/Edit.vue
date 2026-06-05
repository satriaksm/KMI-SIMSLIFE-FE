<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { Form, Field } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import InputDateField from "@/components/forms/InputDateField.vue";
import Button from "@/components/common/Button.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import api from "@/libs/axios";
import { useEvents } from "@/composables/useEvents";
import { getEventBannerUrl } from "@/libs/getImageUrl";

const router = useRouter();
const route = useRoute();
const toast = useToast();
const { fetchEventDetail, updateEvent, loading } = useEvents();

const loadingData = ref(false);
const availableMerchants = ref([]);
const availableVouchers = ref([]);
const selectedMerchantIds = ref([]);
const selectedVoucherIds = ref([]);
const event = ref(null);
const bannerPreview = ref(null);
const bannerFile = ref(null);
const isDataLoaded = ref(false);
const hasNewBanner = ref(false);

// Modal visibility & search
const showMerchantModal = ref(false);
const showVoucherModal = ref(false);
const searchMerchantModal = ref("");
const searchVoucherModal = ref("");

const fetchInitialData = async () => {
  loadingData.value = true;
  try {
    const [merchantsRes, vouchersRes] = await Promise.all([
      api.get("/api/admin/merchants"),
      api.get("/api/admin/vouchers")
    ]);
    availableMerchants.value = merchantsRes.data.data || [];
    availableVouchers.value = vouchersRes.data.data || [];
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    loadingData.value = false;
  }
};

const filteredMerchants = computed(() => {
  if (!searchMerchantModal.value) return availableMerchants.value;
  return availableMerchants.value.filter(m => 
    m.name.toLowerCase().includes(searchMerchantModal.value.toLowerCase())
  );
});

const filteredVouchers = computed(() => {
  if (!searchVoucherModal.value) return availableVouchers.value;
  return availableVouchers.value.filter(v => 
    v.voucher_name.toLowerCase().includes(searchVoucherModal.value.toLowerCase()) ||
    v.voucher_code.toLowerCase().includes(searchVoucherModal.value.toLowerCase())
  );
});

const selectedMerchants = computed(() => {
  return availableMerchants.value.filter(m => selectedMerchantIds.value.includes(m.id));
});

const selectedVouchers = computed(() => {
  return availableVouchers.value.filter(v => selectedVoucherIds.value.includes(v.id));
});

const formValues = ref({
  event_start_date: "",
  event_end_date: "",
  status: "draft",
});

const originalStartDate = ref(null);

const allowedStatus = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!formValues.value.event_start_date || !formValues.value.event_end_date) {
    return { status: "draft", options: statusOptions, message: "", isError: false };
  }

  const startDate = new Date(formValues.value.event_start_date);
  const endDate = new Date(formValues.value.event_end_date);
  const origStart = originalStartDate.value ? new Date(originalStartDate.value) : null;
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  if (origStart) origStart.setHours(0, 0, 0, 0);

  if (origStart && origStart < today) {
    if (startDate.getTime() !== origStart.getTime()) {
      return {
        status: "draft",
        options: [{ value: "draft", label: "Draft" }],
        message: "Event yang sudah dimulai tidak dapat diubah tanggal mulainya.",
        messageColor: "text-red-600",
        isError: true,
        disabled: true,
      };
    }
    return {
      status: formValues.value.status || "published",
      options: [
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
      ],
      message: "Event sudah berjalan. Status Draft tidak tersedia.",
      messageColor: "text-orange-600",
      isError: false,
    };
  }

  if (startDate < today) {
    return {
      status: "draft",
      options: [{ value: "draft", label: "Draft" }],
      message: "Tanggal mulai tidak boleh di masa lalu.",
      messageColor: "text-red-600",
      isError: true,
      disabled: true,
    };
  }

  if (endDate < today) {
    return {
      status: "archived",
      options: [{ value: "archived", label: "Archived" }],
      message: "Event sudah melewati tanggal selesai.",
      messageColor: "text-blue-600",
      isError: false,
    };
  }

  if (startDate > today) {
    return {
      status: "draft",
      options: [{ value: "draft", label: "Draft" }],
      message: "Event belum memasuki tanggal mulai.",
      messageColor: "text-blue-600",
      isError: false,
    };
  }

  if (startDate.getTime() === today.getTime()) {
    return {
      status: formValues.value.status || "published",
      options: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
      ],
      message: "Event dimulai hari ini.",
      messageColor: "text-green-600",
      isError: false,
    };
  }

  return { status: "draft", options: statusOptions, message: "", isError: false };
});

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

watch(
  () => [formValues.value.event_start_date, formValues.value.event_end_date],
  () => { formValues.value.status = allowedStatus.value.status; }
);

const schema = yup.object({
  event_name: yup.string().required("Nama event wajib diisi").min(3).max(255),
  event_description: yup.string().required("Deskripsi event wajib diisi").min(10),
  event_start_date: yup.date().required("Tanggal mulai wajib diisi"),
  event_end_date: yup.date().required("Tanggal selesai wajib diisi").min(yup.ref("event_start_date")),
});

const formatDateForInput = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const loadEvent = async () => {
  try {
    const data = await fetchEventDetail(route.params.id);
    event.value = data;
    const startDate = formatDateForInput(data.event_start_date);
    originalStartDate.value = startDate;
    formValues.value = {
      event_start_date: startDate,
      event_end_date: formatDateForInput(data.event_end_date),
      status: data.status,
    };
    if (data.banner_img_path) {
      bannerPreview.value = getEventBannerUrl(data);
      hasNewBanner.value = false;
    }
    selectedMerchantIds.value = (data.merchants || []).map(m => m.id);
    selectedVoucherIds.value = (data.vouchers || []).map(v => v.id);
    isDataLoaded.value = true;
  } catch (error) {
    console.error("Failed to load event:", error);
    toast.error("Gagal memuat data event");
    router.push({ name: "Admin - Events" });
  }
};

const handleBannerChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  bannerFile.value = file;
  hasNewBanner.value = true;
  const reader = new FileReader();
  reader.onload = (e) => { bannerPreview.value = e.target?.result; };
  reader.readAsDataURL(file);
};

const removeBanner = () => {
  bannerFile.value = null;
  hasNewBanner.value = false;
  bannerPreview.value = event.value?.banner_img_path ? getEventBannerUrl(event.value) : null;
};

const toggleSelection = (list, id) => {
  const index = list.value.indexOf(id);
  if (index > -1) list.value.splice(index, 1);
  else list.value.push(id);
};

const handleSubmit = async (values) => {
  try {
    if (allowedStatus.value.isError) {
      toast.error("Data tidak valid");
      return;
    }
    const formData = new FormData();
    formData.append("event_name", values.event_name);
    formData.append("event_description", values.event_description);
    formData.append("event_start_date", formValues.value.event_start_date);
    formData.append("event_end_date", formValues.value.event_end_date);
    formData.append("status", allowedStatus.value.status);
    formData.append("_method", "PUT");

    if (hasNewBanner.value && bannerFile.value) {
      formData.append("banner_img", bannerFile.value);
    }

    selectedMerchantIds.value.forEach(id => formData.append("merchant_ids[]", id));
    selectedVoucherIds.value.forEach(id => formData.append("voucher_ids[]", id));

    await updateEvent(route.params.id, formData);
    toast.success("Event berhasil diupdate");
    router.push({ name: "Admin - Event Detail", params: { id: route.params.id } });
  } catch (error) {
    console.error("[Edit] Update failed:", error);
    toast.error(error.response?.data?.message || "Gagal update event");
  }
};

const goBack = () => router.push({ name: "Admin - Event Detail", params: { id: route.params.id } });

onMounted(() => {
  loadEvent();
  fetchInitialData();
});
</script>

<template>
  <div class="p-4 sm:p-6 bg-gray-50/50 min-h-screen">
    <div class="max-w-4xl mx-auto" v-if="isDataLoaded && event">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-6 sm:p-8">
          <Form
            @submit="handleSubmit"
            :validation-schema="schema"
            :initial-values="{
              event_name: event.event_name,
              event_description: event.event_description,
              event_start_date: formValues.event_start_date,
              event_end_date: formValues.event_end_date,
            }"
            v-slot="{ errors, setFieldValue }"
          >
            <!-- Basic Info -->
            <div class="space-y-6">
              <TextField
                name="event_name"
                variant="merchant"
                label="Nama Event"
                placeholder="Contoh: Promo Ramadan 2025"
                required
              />

              <TextField
                name="event_description"
                variant="merchant"
                label="Deskripsi Event"
                placeholder="Deskripsi lengkap tentang event..."
                required
                as="textarea"
                rows="4"
              />

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field name="event_start_date" v-slot="{ field }">
                  <InputDateField
                    v-bind="field"
                    v-model="formValues.event_start_date"
                    @update:modelValue="(v) => { formValues.event_start_date = v; setFieldValue('event_start_date', v); }"
                    variant="merchant"
                    label="Tanggal Mulai"
                    :error="errors.event_start_date"
                    required
                  />
                </Field>

                <Field name="event_end_date" v-slot="{ field }">
                  <InputDateField
                    v-bind="field"
                    v-model="formValues.event_end_date"
                    @update:modelValue="(v) => { formValues.event_end_date = v; setFieldValue('event_end_date', v); }"
                    variant="merchant"
                    label="Tanggal Selesai"
                    :error="errors.event_end_date"
                    required
                  />
                </Field>
              </div>

              <!-- Status Display -->
              <div class="p-4 rounded-xl border border-gray-100" :class="allowedStatus.isError ? 'bg-red-50 border-red-100' : 'bg-gray-50'">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-bold text-gray-700">Status Event</span>
                  <select
                    v-model="formValues.status"
                    :disabled="allowedStatus.options.length === 1"
                    class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-gray-200 focus:ring-2 focus:ring-merchant-primary outline-none"
                  >
                    <option v-for="opt in allowedStatus.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <p v-if="allowedStatus.message" class="text-xs italic" :class="allowedStatus.messageColor">
                  <i class="pi pi-info-circle mr-1"></i> {{ allowedStatus.message }}
                </p>
              </div>

              <!-- Banner -->
              <div class="space-y-3">
                <label class="block text-sm font-bold text-gray-700">Banner Event <span class="text-red-500">*</span></label>
                <div class="relative group rounded-2xl overflow-hidden border border-gray-200">
                  <img :src="bannerPreview" class="w-full aspect-[4/1] object-cover transition-transform group-hover:scale-105 duration-700" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <input type="file" @change="handleBannerChange" class="hidden" id="banner-input-edit" accept="image/*" />
                    <label for="banner-input-edit" class="w-12 h-12 bg-merchant-primary text-white rounded-full flex items-center justify-center hover:bg-merchant-primary/90 transition-all cursor-pointer">
                      <i class="pi pi-upload text-xl"></i>
                    </label>
                    <button v-if="hasNewBanner" type="button" @click="removeBanner" class="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                      <i class="pi pi-refresh text-xl"></i>
                    </button>
                  </div>
                  <span v-if="hasNewBanner" class="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Baru</span>
                </div>
              </div>

              <!-- Selections (Merchants & Vouchers) -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                <!-- Merchants -->
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2">
                      <i class="pi pi-shop text-merchant-primary"></i> Merchant
                    </h3>
                    <button type="button" @click="showMerchantModal = true" class="text-xs font-bold text-merchant-primary hover:underline">
                      + Pilih Merchant
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                    <div v-if="selectedMerchants.length === 0" class="text-xs text-gray-400 italic">Belum ada merchant dipilih</div>
                    <div v-for="m in selectedMerchants" :key="m.id" class="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                      <img v-if="m.logo_path" :src="api.defaults.baseURL + '/api/merchant-logo/' + m.id" class="w-4 h-4 rounded-full object-cover" />
                      <span class="truncate max-w-[100px]">{{ m.name }}</span>
                      <button @click="toggleSelection(selectedMerchantIds, m.id)" class="text-gray-400 hover:text-red-500 transition-colors">
                        <i class="pi pi-times text-[8px]"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Vouchers -->
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2">
                      <i class="pi pi-ticket text-merchant-primary"></i> Voucher
                    </h3>
                    <button type="button" @click="showVoucherModal = true" class="text-xs font-bold text-merchant-primary hover:underline">
                      + Pilih Voucher
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                    <div v-if="selectedVouchers.length === 0" class="text-xs text-gray-400 italic">Belum ada voucher dipilih</div>
                    <div v-for="v in selectedVouchers" :key="v.id" class="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                      <span class="truncate max-w-[100px]">{{ v.voucher_code }}</span>
                      <button @click="toggleSelection(selectedVoucherIds, v.id)" class="text-gray-400 hover:text-red-500 transition-colors">
                        <i class="pi pi-times text-[8px]"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-end gap-3 mt-10 pt-8 border-t border-gray-100">
              <Button @click="goBack" variant="ghost" type="button" size="md">Batal</Button>
              <Button type="submit" variant="merchant" size="md" :loading="loading" :disabled="loading || allowedStatus.isError">
                {{ loading ? 'Menyimpan...' : 'Update Event' }}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>

    <!-- Merchant Modal -->
    <ResponsiveModal :show="showMerchantModal" @close="showMerchantModal = false" title="Pilih Merchant" size="lg">
      <div class="space-y-4 p-1">
        <TextField name="modal_search_m" v-model="searchMerchantModal" placeholder="Cari nama merchant..." icon="pi pi-search" hide-label />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          <label v-for="m in filteredMerchants" :key="m.id" 
            class="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all"
            :class="selectedMerchantIds.includes(m.id) ? 'border-merchant-primary bg-merchant-primary/5' : ''">
            <input type="checkbox" :value="m.id" v-model="selectedMerchantIds" class="hidden" />
            <div class="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
              <img v-if="m.logo_path" :src="api.defaults.baseURL + '/api/merchant-logo/' + m.id" class="w-full h-full object-cover" />
              <i v-else class="pi pi-shop text-gray-400"></i>
            </div>
            <div class="ml-3 min-w-0 flex-1">
              <p class="text-sm font-bold text-gray-900 truncate">{{ m.name }}</p>
              <p class="text-[10px] text-gray-500 truncate">@{{ m.slug }}</p>
            </div>
            <i v-if="selectedMerchantIds.includes(m.id)" class="pi pi-check-circle text-merchant-primary ml-2"></i>
          </label>
        </div>
      </div>
      <template #footer>
        <Button @click="showMerchantModal = false" variant="merchant" block>Selesai</Button>
      </template>
    </ResponsiveModal>

    <!-- Voucher Modal -->
    <ResponsiveModal :show="showVoucherModal" @close="showVoucherModal = false" title="Pilih Voucher" size="lg">
      <div class="space-y-4 p-1">
        <TextField name="modal_search_v" v-model="searchVoucherModal" placeholder="Cari kode atau nama voucher..." icon="pi pi-search" hide-label />
        <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          <label v-for="v in filteredVouchers" :key="v.id" 
            class="flex items-center p-4 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all"
            :class="selectedVoucherIds.includes(v.id) ? 'border-merchant-primary bg-merchant-primary/5' : ''">
            <input type="checkbox" :value="v.id" v-model="selectedVoucherIds" class="hidden" />
            <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <i class="pi pi-ticket text-orange-500"></i>
            </div>
            <div class="ml-4 min-w-0 flex-1">
              <p class="text-sm font-bold text-gray-900 truncate">{{ v.voucher_code }}</p>
              <p class="text-xs text-gray-500 truncate">{{ v.voucher_name }}</p>
            </div>
            <div class="text-right ml-4">
              <p class="text-xs font-black text-merchant-primary">
                {{ v.voucher_type === 'percent' ? v.value + '%' : 'Rp ' + Number(v.value).toLocaleString('id-ID') }}
              </p>
            </div>
            <i v-if="selectedVoucherIds.includes(v.id)" class="pi pi-check-circle text-merchant-primary ml-4"></i>
          </label>
        </div>
      </div>
      <template #footer>
        <Button @click="showVoucherModal = false" variant="merchant" block>Selesai</Button>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
