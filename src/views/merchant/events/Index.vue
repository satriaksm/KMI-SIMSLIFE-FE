<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import Button from "@/components/common/Button.vue";
import MerchantTable from "@/components/common/MerchantTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";

import { useMerchantEvents } from "@/composables/useMerchantEvents";
import { formatDateID } from "@/libs/format";

const emit = defineEmits(["toggle-sidebar"]);

const route = useRoute();
const authStore = useAuthStore();

const currentMerchantSlug = computed(() => {
  return route.params && route.params.merchantSlug
    ? String(route.params.merchantSlug)
    : null;
});

const currentMerchantId = computed(() => {
  const slug = currentMerchantSlug.value;
  if (slug) {
    const merchant = authStore.getMerchantBySlug(slug);
    return merchant?.id ?? authStore.merchantId ?? null;
  }

  return authStore.merchantId ?? null;
});

const currentMerchantName = computed(() => {
  const merchant = currentMerchantSlug.value
    ? authStore.getMerchantBySlug(currentMerchantSlug.value)
    : authStore.getMerchantById(currentMerchantId.value);
  return merchant?.name || "UMKM";
});

const breadcrumbItems = computed(() => [
  {
    label: "Events",
  },
]);

const searchQuery = ref("");
const invitationStatus = ref("");
const currentPage = ref(1);
const perPage = ref(10);

const statusOptions = [
  { label: "Semua", value: "" },
  { label: "Menunggu", value: "pending" },
  { label: "Diterima", value: "accepted" },
  { label: "Ditolak", value: "rejected" },
];

const {
  events,
  loading,
  pagination,
  fetchMerchantEvents,
  respondToInvitation,
} = useMerchantEvents();

const totalPages = computed(() => pagination.value?.last_page ?? 1);
const paginationInfo = computed(() => ({
  current_page: pagination.value?.current_page ?? currentPage.value,
  total: pagination.value?.total ?? 0,
  per_page: pagination.value?.per_page ?? perPage.value,
}));

const loadEvents = async () => {
  if (!currentMerchantId.value) return;

  await fetchMerchantEvents(currentMerchantId.value, {
    page: currentPage.value,
    per_page: perPage.value,
    q: searchQuery.value?.trim() || undefined,
    invitation_status: invitationStatus.value || undefined,
  });
};

const handleSearch = () => {
  currentPage.value = 1;
  loadEvents();
};

const tableColumns = [
  { key: "event_name", label: "Event", sortable: false },
  { key: "period", label: "Periode", sortable: false },
  { key: "vouchers", label: "Voucher", sortable: false },
  { key: "invitation_status", label: "Status", sortable: false },
  { key: "actions", label: "Aksi", sortable: false },
];

const eventVouchers = (event) => {
  const list = event?.vouchers;
  return Array.isArray(list) ? list : [];
};

const normalizedInvitationStatus = (event) => {
  const raw = event?.invitation_status;
  return raw ? String(raw).toLowerCase() : "pending";
};

// Respond modal
const showRespondModal = ref(false);
const selectedEvent = ref(null);
const selectedResponse = ref(null); // accepted|rejected

const openRespondModal = (event, status) => {
  selectedEvent.value = event;
  selectedResponse.value = status;
  showRespondModal.value = true;
};

const closeRespondModal = () => {
  showRespondModal.value = false;
  selectedEvent.value = null;
  selectedResponse.value = null;
};

const confirmRespond = async () => {
  if (!selectedEvent.value?.id || !selectedResponse.value) return;

  await respondToInvitation({
    merchantId: currentMerchantId.value,
    eventId: selectedEvent.value.id,
    status: selectedResponse.value,
  });

  closeRespondModal();
  await loadEvents();
};

const goToPage = (page) => {
  currentPage.value = page;
  loadEvents();
};

// Product settings modal
const showProductSettingsModal = ref(false);
const selectedEventForProducts = ref(null);
const merchantProducts = ref([]);
const loadingProducts = ref(false);
const voucherRestrictions = ref({}); // { voucherId: [productIds] }

const openProductSettingsModal = async (event) => {
  selectedEventForProducts.value = event;
  showProductSettingsModal.value = true;
  loadingProducts.value = true;
  
  try {
    // 1. Fetch merchant products
    const productsRes = await api.get(`/api/merchant/${currentMerchantSlug.value}/products`, {
        params: { per_page: 100 }
    });
    merchantProducts.value = productsRes.data.data || [];

    // 2. Fetch current restrictions for each voucher in this event
    for (const voucher of event.vouchers) {
        const res = await api.get(`/api/merchant/vouchers/${voucher.id}/restricted-products`);
        voucherRestrictions.value[voucher.id] = res.data.data.map(p => p.id);
    }
  } catch (error) {
    console.error("Failed to load product settings:", error);
    toast.error("Gagal memuat data produk");
  } finally {
    loadingProducts.value = false;
  }
};

const closeProductSettingsModal = () => {
  showProductSettingsModal.value = false;
  selectedEventForProducts.value = null;
  merchantProducts.value = [];
  voucherRestrictions.value = {};
};

const saveProductSettings = async () => {
  try {
    loadingProducts.value = true;
    for (const voucherId in voucherRestrictions.value) {
        await api.post(`/api/merchant/vouchers/${voucherId}/restricted-products`, {
            product_ids: voucherRestrictions.value[voucherId]
        });
    }
    toast.success("Pengaturan produk berhasil disimpan");
    closeProductSettingsModal();
  } catch (error) {
    console.error("Failed to save product settings:", error);
    toast.error("Gagal menyimpan pengaturan produk");
  } finally {
    loadingProducts.value = false;
  }
};

import api from "@/libs/axios";
import { useToast } from "vue-toastification";
const toast = useToast();
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
    loadEvents();
  }
};
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
    loadEvents();
  }
};

onMounted(() => {
  loadEvents();
});

watch(currentMerchantId, (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return;
  currentPage.value = 1;
  loadEvents();
});

watch(perPage, () => {
  currentPage.value = 1;
  loadEvents();
});

watch(invitationStatus, () => {
  currentPage.value = 1;
  loadEvents();
});
</script>

<template>
  <div>
    <!-- Header -->
    <div
      class="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <!-- Hamburger Button (Mobile) -->
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background sm:hidden"
        >
          <i class="pi pi-bars text-muted-foreground"></i>
        </button>

        <div>
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="currentMerchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              Kelola undangan event {{ currentMerchantName }}
            </p>
          </div>

          <div class="sm:hidden">
            <h1 class="text-base font-semibold text-merchant-primary">
              Undangan Event
            </h1>
            <p class="text-xs text-muted-foreground">
              {{ currentMerchantName }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Spacer for fixed header on mobile -->
    <div class="h-[92px] sm:h-0"></div>

    <!-- Filters -->
    <div class="px-4 sm:px-6">
      <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div class="grid gap-3 sm:grid-cols-3">
          <Form @submit="handleSearch">
            <TextField
              name="q"
              :modelValue="searchQuery"
              @update:modelValue="(v) => (searchQuery = v)"
              placeholder="Cari event…"
              :hideLabel="true"
              variant="muted"
              wrapperClass="sm:col-span-2"
            />
          </Form>

          <SelectField
            name="invitation_status"
            :modelValue="invitationStatus"
            @update:modelValue="(v) => (invitationStatus = v)"
            :options="statusOptions"
            placeholder="Status undangan"
            variant="muted"
          />

          <div class="flex gap-2 sm:col-span-3">
            <Button variant="merchant" @click="handleSearch">
              <i class="pi pi-search"></i>
              <span class="ml-2">Cari</span>
            </Button>
            <Button
              variant="muted-outline"
              @click="
                searchQuery = '';
                invitationStatus = '';
                currentPage = 1;
                loadEvents();
              "
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden px-4 py-4 sm:block sm:px-6">
      <MerchantTable
        :items="events"
        :loading="loading"
        :columns="tableColumns"
        :showCheckbox="false"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :paginationInfo="paginationInfo"
        emptyMessage="Belum ada undangan event"
        @page-change="goToPage"
        @next-page="nextPage"
        @prev-page="prevPage"
      >
        <template #cell-period="{ item }">
          <div class="text-sm text-gray-700">
            <div class="font-medium">
              {{ formatDateID(item.event_start_date) }} -
              {{ formatDateID(item.event_end_date) }}
            </div>
          </div>
        </template>

        <template #cell-vouchers="{ item }">
          <div class="flex flex-wrap items-center gap-1">
            <template v-if="eventVouchers(item).length > 0">
              <span class="text-xs font-medium text-gray-700 mr-1">
                {{ eventVouchers(item).length }} voucher
              </span>
              <span
                v-for="v in eventVouchers(item).slice(0, 3)"
                :key="v.id"
                class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700"
              >
                {{ v.voucher_code || v.voucher_name }}
              </span>
              <span
                v-if="eventVouchers(item).length > 3"
                class="px-2 py-0.5 text-xs rounded-full bg-gray-50 text-muted-foreground"
              >
                +{{ eventVouchers(item).length - 3 }}
              </span>
            </template>
            <template v-else>
              <span class="text-sm text-muted-foreground">-</span>
            </template>
          </div>
        </template>

        <template #cell-invitation_status="{ item }">
          <StatusLabel
            variant="merchant"
            :status="normalizedInvitationStatus(item)"
            :showIcon="false"
          />
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center gap-2">
            <template v-if="normalizedInvitationStatus(item) === 'pending'">
              <Button
                size="sm"
                variant="merchant"
                @click.stop="openRespondModal(item, 'accepted')"
              >
                Terima
              </Button>
              <Button
                size="sm"
                variant="danger-outline"
                @click.stop="openRespondModal(item, 'rejected')"
              >
                Tolak
              </Button>
            </template>

            <template v-else>
              <span class="text-sm text-muted-foreground">
                {{
                  normalizedInvitationStatus(item) === "accepted"
                    ? "Sudah diterima"
                    : "Sudah ditolak"
                }}
              </span>
            </template>
          </div>
        </template>
      </MerchantTable>
    </div>

    <!-- Mobile Cards -->
    <div class="px-4 py-4 sm:hidden">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div
          class="w-10 h-10 border-4 rounded-full border-muted-foreground border-t-merchant-primary animate-spin"
        ></div>
      </div>

      <div
        v-else-if="!events || events.length === 0"
        class="flex flex-col items-center justify-center py-16"
      >
        <i class="mb-4 text-5xl pi pi-inbox text-muted-foreground"></i>
        <p class="text-muted-foreground">Belum ada undangan event</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="ev in events"
          :key="ev.id"
          class="p-4 bg-white border border-gray-200 shadow-sm rounded-xl"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-gray-900 truncate">
                {{ ev.event_name }}
              </h3>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ formatDateID(ev.event_start_date) }} -
                {{ formatDateID(ev.event_end_date) }}
              </p>
            </div>

            <StatusLabel
              variant="merchant"
              :status="normalizedInvitationStatus(ev)"
              :showIcon="false"
              size="xs"
            />
          </div>

          <div class="flex gap-2 mt-3">
            <template v-if="normalizedInvitationStatus(ev) === 'pending'">
              <Button
                class="flex-1"
                size="sm"
                variant="merchant"
                @click="openRespondModal(ev, 'accepted')"
              >
                Terima
              </Button>
              <Button
                class="flex-1"
                size="sm"
                variant="danger-outline"
                @click="openRespondModal(ev, 'rejected')"
              >
                Tolak
              </Button>
            </template>

            <template v-else>
              <div class="w-full text-xs text-center text-muted-foreground">
                {{
                  normalizedInvitationStatus(ev) === "accepted"
                    ? "Anda sudah menerima undangan ini"
                    : "Anda sudah menolak undangan ini"
                }}
              </div>
            </template>
          </div>

          <div
            v-if="normalizedInvitationStatus(ev) === 'accepted'"
            class="mt-3 pt-3 border-t border-gray-100"
          >
            <div class="text-xs font-semibold text-gray-700 mb-2">
              Voucher Event
            </div>
            <div
              v-if="eventVouchers(ev).length === 0"
              class="text-xs text-muted-foreground"
            >
              Belum ada voucher untuk event ini
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <div
                v-for="v in eventVouchers(ev)"
                :key="v.id"
                class="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200"
              >
                <div class="text-xs font-semibold text-gray-900">
                  {{ v.voucher_name || "-" }}
                </div>
                <div class="text-[11px] text-muted-foreground mt-0.5">
                  {{ v.voucher_code }} •
                  {{ formatDateID(v.voucher_start_date) }} -
                  {{ formatDateID(v.voucher_end_date) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <ResponsiveModal
      :show="showRespondModal"
      @close="closeRespondModal"
      title="Konfirmasi"
    >
      <div class="space-y-3">
        <p class="text-sm text-gray-700">
          {{
            selectedResponse === "accepted"
              ? "Terima undangan event ini?"
              : "Tolak undangan event ini?"
          }}
        </p>
        <div class="p-3 text-sm border border-gray-200 rounded-lg bg-gray-50">
          <div class="font-semibold text-gray-900">
            {{ selectedEvent?.event_name || "-" }}
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ formatDateID(selectedEvent?.event_start_date) }} -
            {{ formatDateID(selectedEvent?.event_end_date) }}
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <Button
            class="flex-1"
            variant="muted-outline"
            @click="closeRespondModal"
          >
            Batal
          </Button>
          <Button
            class="flex-1"
            :variant="selectedResponse === 'accepted' ? 'merchant' : 'danger'"
            @click="confirmRespond"
          >
            {{ selectedResponse === "accepted" ? "Terima" : "Tolak" }}
          </Button>
        </div>
      </div>
    </ResponsiveModal>

    <!-- Product Settings Modal -->
    <ResponsiveModal
      v-model="showProductSettingsModal"
      title="Pengaturan Produk Voucher"
      max-width="max-w-2xl"
    >
      <div v-if="loadingProducts" class="flex flex-col items-center justify-center py-12">
        <div class="w-10 h-10 border-4 border-gray-200 border-t-merchant-primary rounded-full animate-spin mb-4"></div>
        <p class="text-sm text-gray-500">Memuat data produk...</p>
      </div>
      <div v-else-if="selectedEventForProducts" class="space-y-6">
        <div class="p-4 bg-merchant-primary/5 rounded-xl border border-merchant-primary/10">
          <h4 class="font-bold text-merchant-primary">{{ selectedEventForProducts.event_name }}</h4>
          <p class="text-xs text-gray-600 mt-1">Pilih produk mana saja yang dapat menggunakan voucher dari event ini. Jika tidak ada produk yang dipilih, voucher berlaku untuk semua produk.</p>
        </div>

        <div v-for="voucher in selectedEventForProducts.vouchers" :key="voucher.id" class="space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b">
            <div class="w-8 h-8 bg-merchant-primary/10 rounded-lg flex items-center justify-center">
              <i class="pi pi-ticket text-merchant-primary"></i>
            </div>
            <div>
              <span class="text-sm font-bold text-gray-900">{{ voucher.voucher_name }}</span>
              <span class="ml-2 text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">{{ voucher.voucher_code }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label 
              v-for="product in merchantProducts" 
              :key="product.id"
              class="flex items-center p-2 rounded-lg border border-gray-100 hover:border-merchant-primary/30 cursor-pointer transition-colors"
              :class="{'bg-merchant-primary/5 border-merchant-primary/30': voucherRestrictions[voucher.id]?.includes(product.id)}"
            >
              <input 
                type="checkbox" 
                :value="product.id" 
                v-model="voucherRestrictions[voucher.id]"
                class="w-4 h-4 text-merchant-primary rounded border-gray-300 focus:ring-merchant-primary"
              />
              <span class="ml-3 text-xs font-medium text-gray-700 truncate">{{ product.name }}</span>
            </label>
          </div>
          <div v-if="merchantProducts.length === 0" class="text-center py-4 text-gray-500 text-xs">
            Belum ada produk yang tersedia
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button variant="secondary" @click="closeProductSettingsModal">Batal</Button>
          <Button variant="merchant" @click="saveProductSettings" :disabled="loadingProducts">
            Simpan Pengaturan
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>
