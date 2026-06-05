<script setup>
import { ref, onMounted, computed } from "vue";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";
import { Form } from "vee-validate";
import TextField from "@/components/forms/TextField.vue";
import Button from "@/components/common/Button.vue";

const emit = defineEmits(["toggle-sidebar"]);
const toast = useToast();

// ========================
// SHIPPING SETTINGS
// ========================
const shippingLoading = ref(true);
const shippingSaving = ref(false);
const shippingForm = ref({
  base_cost: 0,
  cost_per_km: 0,
});

async function fetchShipping() {
  shippingLoading.value = true;
  try {
    const { data: res } = await api.get("/api/admin/settings/shipping");
    const d = res?.data ?? res;
    shippingForm.value.base_cost = d.base_cost ?? 0;
    shippingForm.value.cost_per_km = d.cost_per_km ?? 0;
  } catch (e) {
    console.error("Gagal memuat shipping settings:", e);
  } finally {
    shippingLoading.value = false;
  }
}

async function saveShipping() {
  shippingSaving.value = true;
  try {
    await api.put("/api/admin/settings/shipping", {
      base_cost: Number(shippingForm.value.base_cost),
      cost_per_km: Number(shippingForm.value.cost_per_km),
    });
    toast.success("Pengaturan ongkir berhasil disimpan.");
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal menyimpan pengaturan.");
  } finally {
    shippingSaving.value = false;
  }
}

// ========================
// PAYMENT FEES
// ========================
const feesLoading = ref(true);
const paymentFees = ref([]);
const feeNote = ref("");

async function fetchPaymentFees() {
  feesLoading.value = true;
  try {
    const { data: res } = await api.get("/api/admin/settings/payment-fees");
    const d = res?.data ?? res;
    paymentFees.value = d.fees || [];
    feeNote.value = d.note || "";
  } catch (e) {
    console.error("Gagal memuat payment fees:", e);
  } finally {
    feesLoading.value = false;
  }
}

// Edit Fee State
const showFeeModal = ref(false);
const editingFee = ref(null);
const feeForm = ref({ type: "flat", value: 0 });
const feeSaving = ref(false);

function openFeeModal(fee) {
  editingFee.value = fee;
  feeForm.value.type = fee.type;
  feeForm.value.value = fee.value;
  showFeeModal.value = true;
}

function closeFeeModal() {
  showFeeModal.value = false;
  editingFee.value = null;
}

async function savePaymentFee() {
  if (!editingFee.value) return;
  feeSaving.value = true;
  try {
    await api.put(`/api/admin/settings/payment-fees/${editingFee.value.id}`, {
      type: feeForm.value.type,
      value: Number(feeForm.value.value),
    });
    toast.success("Metode pembayaran berhasil diupdate.");
    closeFeeModal();
    fetchPaymentFees();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal mengupdate fee.");
  } finally {
    feeSaving.value = false;
  }
}

// ========================
// HELPER
// ========================
function formatIDR(val) {
  return new Intl.NumberFormat("id-ID").format(Number(val || 0));
}

// ========================
// LIFECYCLE
// ========================
onMounted(() => {
  fetchShipping();
  fetchPaymentFees();
});
</script>

<template>
  <div class="">
    <!-- Header -->
    <div
      class="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="$emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-gray-100 sm:hidden"
        >
          <i class="pi pi-bars text-gray-500"></i>
        </button>
        <div>
          <h1 class="text-lg font-bold text-merchant-primary sm:text-xl">
            Platform Settings
          </h1>
          <p class="text-xs text-gray-500 sm:text-sm">
            Kelola pengaturan pengiriman & biaya pembayaran
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="px-4 pt-24 pb-8 space-y-6 sm:pt-2 sm:px-6">
      <!-- ======================== -->
      <!-- SHIPPING SETTINGS        -->
      <!-- ======================== -->
      <div class="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-6">
        <div class="flex items-center gap-3 mb-5">
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
            <i class="pi pi-truck text-blue-600"></i>
          </div>
          <div>
            <h2 class="text-base font-bold text-gray-900 sm:text-lg">Pengaturan Ongkir</h2>
            <p class="text-xs text-gray-500">Biaya dasar dan per kilometer untuk pengiriman</p>
          </div>
        </div>

        <div v-if="shippingLoading" class="space-y-4">
          <div class="w-full h-12 bg-gray-100 rounded-xl animate-pulse"></div>
          <div class="w-full h-12 bg-gray-100 rounded-xl animate-pulse"></div>
        </div>

        <Form v-else class="space-y-4" @submit="saveShipping">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <TextField
                name="base_cost"
                label="Biaya Dasar (Rp)"
                type="number"
                v-model="shippingForm.base_cost"
                placeholder="cth: 5000"
              />
              <p class="mt-1 text-xs text-gray-400">Biaya tetap setiap pengiriman</p>
            </div>
            <div>
              <TextField
                name="cost_per_km"
                label="Biaya per KM (Rp)"
                type="number"
                v-model="shippingForm.cost_per_km"
                placeholder="cth: 2000"
              />
              <p class="mt-1 text-xs text-gray-400">Biaya dihitung × jarak km</p>
            </div>
          </div>

          <div class="p-3 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl">
            <strong>Formula:</strong> Ongkir = Biaya Dasar + (Biaya/KM × Jarak KM), dibulatkan ke Rp 500 terdekat.
          </div>

          <div class="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              :loading="shippingSaving"
              customClass="bg-merchant-primary hover:bg-merchant-primary/90"
            >
              <i class="pi pi-save mr-1.5"></i>
              Simpan Ongkir
            </Button>
          </div>
        </Form>
      </div>

      <!-- ======================== -->
      <!-- PAYMENT FEES              -->
      <!-- ======================== -->
      <div class="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-6">
        <div class="flex items-center gap-3 mb-5">
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50">
            <i class="pi pi-credit-card text-amber-600"></i>
          </div>
          <div>
            <h2 class="text-base font-bold text-gray-900 sm:text-lg">Biaya Metode Pembayaran</h2>
            <p class="text-xs text-gray-500">Fee yang dibebankan ke pembeli saat checkout</p>
          </div>
        </div>

        <div v-if="feesLoading" class="space-y-3">
          <div class="w-full h-12 bg-gray-100 rounded-xl animate-pulse" v-for="i in 5" :key="i"></div>
        </div>

        <div v-else>
          <div class="overflow-hidden border border-gray-200 rounded-xl">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-left">
                  <th class="px-4 py-3 font-semibold text-gray-700">Metode</th>
                  <th class="px-4 py-3 font-semibold text-gray-700">Tipe</th>
                  <th class="px-4 py-3 font-semibold text-gray-700 text-right">Biaya</th>
                  <th class="px-4 py-3 font-semibold text-gray-700 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="fee in paymentFees" :key="fee.method" class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-800">{{ fee.method }}</div>
                    <div class="text-xs text-gray-400 mt-0.5">{{ fee.description }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="px-2 py-0.5 text-xs font-medium rounded-full"
                      :class="fee.type === 'percentage'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'"
                    >
                      {{ fee.type === 'percentage' ? 'Persentase' : 'Flat' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">
                    {{ fee.display }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <button 
                      @click="openFeeModal(fee)"
                      class="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Edit Fee"
                    >
                      <i class="pi pi-pencil text-sm"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="feeNote" class="mt-4 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl">
            <div class="flex items-start gap-2">
              <i class="pi pi-info-circle mt-0.5 shrink-0"></i>
              <div>
                <p class="font-medium">Catatan Penting</p>
                <p class="mt-1 opacity-90">{{ feeNote }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Edit Fee -->
    <div v-if="showFeeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900">Edit Fee: {{ editingFee?.method }}</h3>
          <button @click="closeFeeModal" class="text-gray-400 hover:text-gray-600 transition">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="p-6">
          <Form @submit="savePaymentFee" class="space-y-4">
            <div>
              <label class="block mb-1.5 text-sm font-medium text-gray-700">Tipe Fee</label>
              <select v-model="feeForm.type" class="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-merchant-primary/30 focus:border-merchant-primary transition bg-white">
                <option value="percentage">Persentase (%)</option>
                <option value="flat">Flat (Rp)</option>
              </select>
            </div>
            
            <div>
              <label class="block mb-1.5 text-sm font-medium text-gray-700">Nominal/Nilai</label>
              <div class="relative">
                <span v-if="feeForm.type === 'flat'" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                <input 
                  type="number" 
                  v-model.number="feeForm.value" 
                  step="0.01"
                  min="0"
                  class="w-full py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-merchant-primary/30 focus:border-merchant-primary transition"
                  :class="feeForm.type === 'flat' ? 'pl-10 pr-4' : 'pl-4 pr-10'"
                />
                <span v-if="feeForm.type === 'percentage'" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 mt-6">
              <Button type="button" variant="outline" @click="closeFeeModal">Batal</Button>
              <Button type="submit" variant="primary" :loading="feeSaving">Simpan</Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  </div>
</template>
