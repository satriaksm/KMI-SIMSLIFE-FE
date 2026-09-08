<template>
  <div class="min-h-screen bg-gray-50 pb-28 sm:pb-10">
    <!-- Mobile Header -->
    <MerchantMobileHeader
      title="Detail Pesanan"
      :backRoute="merchantSlug ? `/merchant-center/${merchantSlug}/orders` : null"
      @back="goBack"
    />

    <!-- Desktop Header -->
    <div class="sticky top-0 left-0 right-0 z-30 hidden py-6 bg-gray-50 sm:block">
      <div class="px-4 mx-auto sm:px-6">
        <Breadcrumb
          :items="breadcrumbItems"
          :merchantId="merchantSlug"
        />
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          Detail informasi dan konfirmasi transaksi pesanan
        </p>
      </div>
    </div>

    <!-- Spacer for mobile fixed header -->
    <div class="h-[72px] sm:h-0"></div>

    <div class="px-4 mx-auto sm:px-6 sm:py-6 space-y-4 pt-4">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div class="p-6 bg-white border border-gray-200 rounded-2xl animate-pulse space-y-4">
          <div class="w-1/3 h-5 bg-gray-200 rounded"></div>
          <div class="w-1/2 h-4 bg-gray-200 rounded"></div>
        </div>
        <div class="p-6 bg-white border border-gray-200 rounded-2xl animate-pulse space-y-4">
          <div class="w-full h-24 bg-gray-200 rounded"></div>
        </div>
      </div>

      <!-- Error / Empty State -->
      <div
        v-else-if="!order"
        class="p-12 text-center bg-white border border-gray-200 shadow-sm rounded-2xl"
      >
        <i class="mb-3 text-5xl pi pi-exclamation-circle text-gray-400"></i>
        <h2 class="text-lg font-semibold text-gray-800">Pesanan Tidak Ditemukan</h2>
        <p class="mt-1 text-sm text-gray-500">
          Data pesanan ini mungkin telah dihapus atau Anda tidak memiliki akses.
        </p>
        <div class="mt-6">
          <Button @click="goBack" variant="merchant">Kembali ke Daftar Pesanan</Button>
        </div>
      </div>

      <!-- Order Detail Content -->
      <div v-else class="space-y-4">
        <!-- Status & Action Banner -->
        <div
          class="p-5 bg-white border shadow-sm rounded-2xl transition"
          :class="[
            order.status === 'waiting_review' || order.status === 'pending'
              ? 'border-amber-200 bg-amber-50/30'
              : order.status === 'completed'
              ? 'border-green-200 bg-green-50/30'
              : order.status === 'cancelled' || order.status === 'rejected'
              ? 'border-red-200 bg-red-50/30'
              : 'border-blue-200 bg-blue-50/30',
          ]"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Transaksi</span>
                <StatusLabel v-bind="statusProps(order.status)" size="sm" />
              </div>
              <p v-if="order.status === 'waiting_review' || order.status === 'pending'" class="text-xs sm:text-sm text-amber-800">
                Pesanan masuk dari pemesanan WhatsApp / COD. Silakan konfirmasi apakah transaksi di luar sistem ini telah <strong>Selesai</strong> atau <strong>Batal</strong> agar tercatat dalam laporan keuangan.
              </p>
              <p v-else-if="order.status === 'completed'" class="text-xs sm:text-sm text-green-800">
                Pesanan telah selesai. Transaksi ini telah tercatat resmi di <strong>Laporan Transaksi</strong> toko Anda.
              </p>
              <p v-else-if="order.status === 'cancelled' || order.status === 'rejected'" class="text-xs sm:text-sm text-red-800">
                Pesanan dibatalkan. Stok produk telah dikembalikan otomatis ke inventaris.
              </p>
              <p v-else class="text-xs sm:text-sm text-gray-700">
                Pesanan sedang dalam proses.
              </p>
            </div>

            <!-- Desktop Action Buttons for Pending / Waiting Review / Processing -->
            <div
              v-if="order.status === 'waiting_review' || order.status === 'pending' || order.status === 'processing'"
              class="hidden sm:flex items-center gap-2 shrink-0"
            >
              <Button
                variant="danger-outline"
                size="sm"
                @click="openCancelModal"
                :disabled="updatingStatus"
              >
                <i class="pi pi-times mr-1.5 text-xs"></i>
                Batalkan
              </Button>
              <Button
                variant="merchant"
                size="sm"
                @click="openCompleteModal"
                :disabled="updatingStatus"
                customClass="bg-green-600 hover:bg-green-700 text-white"
              >
                <i class="pi pi-check mr-1.5 text-xs"></i>
                Konfirmasi Selesai
              </Button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Left Column: Items & Summary (2 cols) -->
          <div class="md:col-span-2 space-y-4">
            <!-- Order Overview Card -->
            <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <i class="pi pi-receipt text-merchant-primary"></i>
                  Informasi Pesanan
                </h3>
                <span class="text-xs font-mono font-semibold text-white bg-merchant-primary px-2.5 py-1 rounded-md">
                  {{ order.invoice }}
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div>
                  <span class="text-gray-400 block text-xs">Waktu Pemesanan</span>
                  <span class="font-medium text-gray-800">
                    {{ formatDate(order.created_at) }} {{ formatTime(order.created_at) }}
                  </span>
                </div>
                <div>
                  <span class="text-gray-400 block text-xs">Metode Pembayaran</span>
                  <span v-if="isCancelledStatus(order.status)" class="font-medium text-gray-800">-</span>
                  <span v-else class="inline-flex items-center gap-1.5 font-medium text-gray-800">
                    <i :class="[getPaymentBadge(order.payment_method).icon, getPaymentBadge(order.payment_method).iconClass, 'text-xs']"></i>
                    <span>{{ getPaymentBadge(order.payment_method).label }}</span>
                  </span>
                </div>
                <div>
                  <span class="text-gray-400 block text-xs">Metode Pengiriman</span>
                  <span class="font-medium text-gray-800">
                    {{ isCancelledStatus(order.status) ? '-' : (order.order_type === 'jasa' ? (order.delivery_type === 'in-store' ? 'Di Tempat' : (order.delivery_type === 'on-site' ? 'Panggilan' : 'Online')) : (order.delivery_type === 'delivery' ? 'Kirim ke Alamat' : (order.delivery_type === 'pickup' ? 'Ambil Sendiri' : (order.delivery_type === 'WhatsApp' ? 'Belum Ditetapkan' : order.delivery_type)))) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Order Items Card -->
            <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl space-y-4">
              <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
                <i class="pi pi-box text-merchant-primary"></i>
                Daftar Produk / Layanan
              </h3>

              <div class="divide-y divide-gray-100">
                <div
                  v-for="item in order.items"
                  :key="item.id"
                  class="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0"
                >
                  <div class="flex items-start gap-3 min-w-0">
                    <div class="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        v-if="item.image"
                        :src="item.image"
                        :alt="item.name"
                        class="w-full h-full object-cover"
                        @error="(e) => (e.target.style.display = 'none')"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                        <i class="pi pi-image"></i>
                      </div>
                    </div>
                    <div class="min-w-0 space-y-1">
                      <h4 class="text-sm font-semibold text-gray-900 truncate">
                        {{ item.name }}
                      </h4>
                      <p v-if="item.variant" class="text-xs text-gray-500">
                        Varian: {{ item.variant }}
                      </p>
                      <p v-if="item.addons && item.addons.length" class="text-xs text-gray-400">
                        Addon: {{ item.addons.map(a => a.name).join(', ') }}
                      </p>
                      <p class="text-xs text-gray-600">
                        {{ item.qty }} x Rp {{ formatIDR(item.price) }}
                      </p>
                    </div>
                  </div>

                  <div class="text-right shrink-0">
                    <span class="text-sm font-bold text-gray-900">
                      Rp {{ formatIDR(item.subtotal) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes Card -->
            <div v-if="order.note || (order.delivery_note && !isCancelledStatus(order.status))" class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl space-y-3">
              <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                <i class="pi pi-comment text-merchant-primary"></i>
                Catatan Pesanan
              </h3>
              <div v-if="order.note" class="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span class="font-semibold block text-gray-500 mb-0.5">Catatan Pembeli:</span>
                {{ order.note }}
              </div>
              <div v-if="order.delivery_note && !isCancelledStatus(order.status)" class="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span class="font-semibold block text-gray-500 mb-0.5">Catatan Pengiriman:</span>
                {{ order.delivery_note }}
              </div>
            </div>
          </div>

          <!-- Right Column: Customer & Payment Summary (1 col) -->
          <div class="space-y-4">
            <!-- Customer Card -->
            <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl space-y-3">
              <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <i class="pi pi-user text-merchant-primary"></i>
                Informasi Pelanggan
              </h3>

              <div class="space-y-2 text-xs">
                <div>
                  <span class="text-gray-400 block text-[11px]">Nama Pembeli</span>
                  <span class="font-semibold text-gray-800 text-sm">{{ order.customer.name }}</span>
                </div>

                <div>
                  <span class="text-gray-400 block text-[11px]">Nomor WhatsApp / Telepon</span>
                  <span class="font-medium text-gray-800">{{ order.customer.phone || '-' }}</span>
                </div>

                <div>
                  <span class="text-gray-400 block text-[11px]">Alamat Pelanggan</span>
                  <span class="font-medium text-gray-700 leading-relaxed block">{{ order.customer_address || '-' }}</span>
                </div>

                <div class="pt-2">
                  <Button
                    v-if="order.customer.phone"
                    @click="openCustomerWhatsApp"
                    variant="merchant-outline"
                    size="sm"
                    block
                    customClass="border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <i class="pi pi-whatsapp mr-1.5 text-sm"></i>
                    Chat Pelanggan di WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            <!-- Payment Summary Card -->
            <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl space-y-3">
              <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <i class="pi pi-wallet text-merchant-primary"></i>
                Rincian Pembayaran
              </h3>

              <div class="space-y-2 text-xs">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal Produk</span>
                  <span>Rp {{ formatIDR(order.amounts.subtotal) }}</span>
                </div>

                <div v-if="order.amounts.discount > 0" class="flex justify-between text-green-600">
                  <span>Diskon Voucher</span>
                  <span>- Rp {{ formatIDR(order.amounts.discount) }}</span>
                </div>

                <div v-if="order.amounts.shipping > 0 && !isCancelledStatus(order.status)" class="flex justify-between text-gray-600">
                  <span>Ongkos Kirim</span>
                  <span>Rp {{ formatIDR(order.amounts.shipping) }}</span>
                </div>

                <div class="pt-2 border-t border-gray-100 flex justify-between items-center text-sm font-bold text-gray-900">
                  <span>Total Pembayaran</span>
                  <span class="text-merchant-primary text-base">
                    Rp {{ formatIDR(order.amounts.total) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Bottom Action Bar -->
    <div
      v-if="order && (order.status === 'waiting_review' || order.status === 'pending' || order.status === 'processing')"
      class="fixed bottom-0 left-0 right-0 z-40 p-3.5 bg-white border-t border-gray-200 shadow-lg sm:hidden flex items-center gap-3"
    >
      <Button
        variant="danger-outline"
        size="md"
        class="flex-1"
        @click="openCancelModal"
        :disabled="updatingStatus"
      >
        <i class="pi pi-times mr-1.5 text-xs"></i>
        Batalkan
      </Button>
      <Button
        variant="merchant"
        size="md"
        class="flex-1"
        @click="openCompleteModal"
        :disabled="updatingStatus"
        customClass="bg-green-600 hover:bg-green-700 text-white font-medium"
      >
        <i class="pi pi-check mr-1.5 text-xs"></i>
        Konfirmasi Selesai
      </Button>
    </div>

    <!-- Confirm Complete Modal -->
    <ResponsiveModal
      v-model:show="showCompleteModal"
      title="Konfirmasi Pesanan Selesai"
      @close="showCompleteModal = false"
    >
      <div class="p-4 space-y-4">
        <div class="p-3.5 rounded-xl bg-green-50 border border-green-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <i class="pi pi-check text-base"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-green-900">Konfirmasi Transaksi Selesai</h4>
            <p class="text-xs text-green-700 mt-0.5">
              Pilih metode pengiriman dan pembayaran yang telah disepakati dengan pembeli.
            </p>
          </div>
        </div>

        <!-- Form Konfirmasi Pengiriman & Pembayaran -->
        <div class="space-y-3.5 text-xs sm:text-sm">
          <!-- Pilihan Metode Pengiriman -->
          <div>
            <label class="block mb-2 font-semibold text-gray-700">
              Metode Pengiriman <span class="text-red-500">*</span>
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <label
                v-for="opt in deliveryOptions"
                :key="opt.value"
                class="cursor-pointer select-none"
              >
                <input
                  type="radio"
                  :value="opt.value"
                  v-model="completionForm.delivery_type"
                  class="sr-only peer"
                />
                <span
                  class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-muted-foreground/30 text-gray-700 transition peer-checked:border-merchant-primary peer-checked:text-merchant-primary peer-checked:bg-merchant-primary/5 peer-focus:ring-1 peer-focus:ring-merchant-primary group"
                >
                  <span
                    class="h-2.5 w-2.5 rounded-full bg-gray-300 transition group-peer-checked:bg-merchant-primary"
                  ></span>
                  <span class="text-xs sm:text-sm font-medium">{{ opt.label }}</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Pilihan Metode Pembayaran -->
          <div>
            <label class="block mb-2 font-semibold text-gray-700">
              Metode Pembayaran <span class="text-red-500">*</span>
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <label
                v-for="opt in paymentOptions"
                :key="opt.value"
                class="cursor-pointer select-none"
              >
                <input
                  type="radio"
                  :value="opt.value"
                  v-model="completionForm.payment_method"
                  class="sr-only peer"
                />
                <span
                  class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-muted-foreground/30 text-gray-700 transition peer-checked:border-merchant-primary peer-checked:text-merchant-primary peer-checked:bg-merchant-primary/5 peer-focus:ring-1 peer-focus:ring-merchant-primary group"
                >
                  <span
                    class="h-2.5 w-2.5 rounded-full bg-gray-300 transition group-peer-checked:bg-merchant-primary"
                  ></span>
                  <span class="text-xs sm:text-sm font-medium">{{ opt.label }}</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Ongkos Kirim Tambahan (Jika Diantar) -->
          <div v-if="completionForm.delivery_type === 'delivery'">
            <label class="block mb-1.5 font-semibold text-gray-700">
              Ongkos Kirim Tambahan (Opsional)
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold">Rp</span>
              <input
                type="number"
                min="0"
                v-model.number="completionForm.shipping_fee"
                placeholder="0"
                class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-merchant-primary"
              />
            </div>
          </div>
        </div>

        <!-- Rincian Total Akhir -->
        <div class="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-600 border border-gray-100">
          <div class="flex justify-between">
            <span>Subtotal Produk</span>
            <span>Rp {{ formatIDR(order?.amounts?.subtotal) }}</span>
          </div>
          <div v-if="order?.amounts?.discount > 0" class="flex justify-between text-green-600">
            <span>Diskon Voucher</span>
            <span>- Rp {{ formatIDR(order?.amounts?.discount) }}</span>
          </div>
          <div v-if="completionForm.delivery_type === 'delivery' && completionForm.shipping_fee > 0" class="flex justify-between text-gray-600">
            <span>Ongkos Kirim</span>
            <span>Rp {{ formatIDR(completionForm.shipping_fee) }}</span>
          </div>
          <div class="pt-1.5 border-t border-gray-200 flex justify-between font-bold text-gray-900 text-sm">
            <span>Total Transaksi Akhir</span>
            <span class="text-merchant-primary">Rp {{ formatIDR(computedModalTotal) }}</span>
          </div>
        </div>

        <div class="flex gap-3 pt-1">
          <Button
            variant="muted-outline"
            @click="showCompleteModal = false"
            customClass="flex-1"
          >
            Batal
          </Button>
          <Button
            variant="merchant"
            @click="submitCompleteOrder"
            :loading="updatingStatus"
            customClass="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            Simpan & Selesaikan
          </Button>
        </div>
      </div>
    </ResponsiveModal>

    <!-- Confirm Cancel Modal -->
    <ResponsiveModal
      v-model:show="showCancelModal"
      title="Batalkan Pesanan"
      @close="showCancelModal = false"
    >
      <div class="p-4 space-y-4">
        <div class="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <i class="pi pi-exclamation-triangle text-lg"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-red-900">Batalkan Pesanan Masuk</h4>
            <p class="text-xs text-red-700 mt-0.5">
              Pesanan akan ditandai sebagai <strong>Dibatalkan</strong> dan stok produk akan dikembalikan secara otomatis.
            </p>
          </div>
        </div>

        <p class="text-xs text-gray-600">
          Apakah Anda yakin ingin membatalkan pesanan <strong>{{ order?.invoice }}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>

        <div class="flex gap-3 pt-2">
          <Button
            variant="muted-outline"
            @click="showCancelModal = false"
            customClass="flex-1"
          >
            Kembali
          </Button>
          <Button
            variant="danger"
            @click="confirmStatusChange('cancelled')"
            :loading="updatingStatus"
            customClass="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Ya, Batalkan Pesanan
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "vue-toastification";
import { getMerchantOrderDetail, updateOrderStatus } from "@/services/api/order";
import { formatDate, formatTime } from "@/libs/format.js";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const merchantSlug = computed(() =>
  route.params?.merchantSlug ? String(route.params.merchantSlug) : authStore.merchantSlug
);
const orderId = computed(() => route.params?.orderId);

const loading = ref(true);
const order = ref(null);
const updatingStatus = ref(false);
const showCompleteModal = ref(false);
const showCancelModal = ref(false);

// Lock body scroll when modal is open
const isAnyModalOpen = computed(() => showCompleteModal.value || showCancelModal.value);
useBodyScrollLock(isAnyModalOpen);

const breadcrumbItems = computed(() => [
  { label: "Pesanan Masuk", path: `/merchant-center/${merchantSlug.value}/orders` },
  { label: `Detail Pesanan` },
]);

const formatIDR = (value) => {
  return Number(value || 0).toLocaleString("id-ID");
};

function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "paid":
      return "waiting_review";
    case "pending":
      if (o.payment_method === "COD" || o.order_type === "jasa" || !o.payment) return "waiting_review";
      return beStatus;
    case "responsed":
    case "accepted":
    case "on-progress":
      return "processing";
    case "delivered":
      return o.delivery_type === "pickup" ? "ready" : "shipped";
    case "completed":
    case "selesai":
      return "completed";
    case "cancelled":
    case "batal":
      return "cancelled";
    case "rejected":
      return "rejected";
    default:
      return beStatus;
  }
}

function isCancelledStatus(status) {
  if (!status) return false;
  return ["cancelled", "rejected", "undelivered", "unpicked", "batal", "gagal"].includes(String(status).toLowerCase());
}

function getPaymentBadge(method) {
  const m = String(method || "").trim();
  const lower = m.toLowerCase();

  if (lower === "qris") {
    return {
      label: "QRIS",
      icon: "pi pi-qrcode",
      iconClass: "text-merchant-primary",
    };
  }

  if (lower.includes("transfer")) {
    return {
      label: m || "Transfer Bank",
      icon: "pi pi-credit-card",
      iconClass: "text-blue-600",
    };
  }

  if (lower === "cod" || lower === "tunai" || lower === "cash") {
    return {
      label: m || "COD",
      icon: "pi pi-wallet",
      iconClass: "text-emerald-600",
    };
  }

  if (lower === "whatsapp" || lower === "belum ditetapkan" || !m) {
    return {
      label: "Belum Ditetapkan",
      icon: "pi pi-clock",
      iconClass: "text-gray-400",
    };
  }

  return {
    label: m,
    icon: "pi pi-wallet",
    iconClass: "text-gray-500",
  };
}

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
  return `${baseUrl}/api/order-snapshots/${orderItemId}?size=thumb`;
}

function transformOrder(o) {
  if (!o) return null;

  const merchantAddr = String(o.merchant?.address || "").trim().toLowerCase();
  
  // Prioritas alamat pelanggan (bukan alamat merchant):
  // 1. o.customer_address (dari accessor BE model Order)
  // 2. o.user?.full_address / o.user?.primary_address?.full_address
  // 3. o.address_detail_snapshot
  // 4. o.alamat jika tidak sama dengan alamat toko penjual
  let resolvedAddress = "";
  if (o.customer_address && typeof o.customer_address === "string" && o.customer_address.trim()) {
    resolvedAddress = o.customer_address.trim();
  } else if (o.user?.full_address && typeof o.user.full_address === "string" && o.user.full_address.trim()) {
    resolvedAddress = o.user.full_address.trim();
  } else if (o.user?.primary_address?.full_address) {
    resolvedAddress = o.user.primary_address.full_address.trim();
  } else if (o.alamat && String(o.alamat).trim().toLowerCase() !== merchantAddr) {
    resolvedAddress = String(o.alamat).trim();
  } else {
    resolvedAddress = [
      o.address_detail_snapshot,
      o.village_name_snapshot,
      o.district_name_snapshot,
      o.city_name_snapshot,
      o.province_name_snapshot,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return {
    id: o.id,
    invoice: o.order_code || `ORD-${o.id}`,
    customer: {
      name: o.nama || o.user_name_snapshot || o.user?.name || "Pelanggan",
      phone: o.tel || o.user_phone_snapshot || o.user?.phone || "",
    },
    status: mapApiStatus(o.status, o),
    payment_method: o.payment_method === 'WhatsApp' ? 'Belum Ditetapkan' : (o.payment_method || o.metode_pembayaran || 'Belum Ditetapkan'),
    order_type: o.order_type || (o.jasa_id ? "jasa" : "product"),
    delivery_type: o.delivery_type === 'WhatsApp' ? 'Belum Ditetapkan' : (o.delivery_type || (o.catatan_alamat ? "delivery" : "Belum Ditetapkan")),
    created_at: o.created_at,
    items: o.order_type === "jasa" || o.jasa_id
      ? (o.jasa_items || []).map((it) => ({
          id: it.id,
          name: it.jasa_title_snapshot || it.jasa?.title || "Layanan Jasa",
          variant: it.order_method === "langsung_pesan" || it.order_method === "keranjang" ? "Langsung Pesan" : (it.order_method === "konsultasi" || it.order_method === "memerlukan_konsultasi" ? "Konsultasi" : "Booking"),
          addons: [],
          qty: it.quantity || 1,
          price: Number(it.price || it.jasa_price_snapshot || 0),
          subtotal: Number(it.subtotal || it.price || 0),
          image: it.jasa?.cover_img?.src_url || getOrderSnapshotUrl(it.id, it.image_snapshot_path || it.jasa_image_snapshot),
        }))
      : (o.items || []).map((it) => ({
          id: it.id,
          name: it.product?.name || it.product_name_snapshot || it.jasa_title_snapshot || "Produk",
          variant: it.variant?.variant_name || it.variant?.sku || it.product_variant_snapshot || "",
          addons: (it.addons || []).map((a) => ({
            name: a.addon_name_snapshot || a.addon?.name || "Addon",
            price: Number(a.addon_price_snapshot || 0),
          })),
          qty: it.quantity,
          price: Number(it.price || it.unit_price_snapshot || 0),
          subtotal: Number(it.subtotal || it.subtotal_snapshot || (it.price * it.quantity) || 0),
          image: it.product?.cover_image?.src_url || getOrderSnapshotUrl(it.id, it.image_snapshot_path || it.jasa_image_snapshot),
        })),
    amounts: {
      subtotal: Number(o.subtotal || o.total || 0),
      discount: Number(o.discount_total || 0),
      shipping: Number(o.shipping_fee || 0),
      total: Number(o.total || 0),
    },
    customer_address: resolvedAddress || "-",
    shipping_address: resolvedAddress || "",
    note: o.catatan || "",
    delivery_note: o.catatan_alamat || "",
    _raw: o,
  };
}

function statusProps(status) {
  const map = {
    waiting_review: {
      variant: "payment",
      status: "pending",
      label: "Perlu Konfirmasi",
      size: "sm",
      showIcon: true,
    },
    processing: {
      variant: "order",
      status: "processing",
      size: "sm",
      showIcon: true,
    },
    ready: {
      variant: "order",
      status: "ready",
      size: "sm",
      showIcon: true,
    },
    shipped: {
      variant: "order",
      status: "shipped",
      size: "sm",
      showIcon: true,
    },
    completed: {
      variant: "order",
      status: "completed",
      size: "sm",
      showIcon: true,
    },
    cancelled: {
      variant: "order",
      status: "cancelled",
      size: "sm",
      showIcon: true,
    },
    rejected: {
      variant: "order",
      status: "cancelled",
      label: "Ditolak Penjual",
      size: "sm",
      showIcon: true,
    },
  };
  return map[status] ?? {
    variant: "order",
    status: "pending",
    size: "sm",
    showIcon: true,
  };
}

const deliveryOptions = computed(() => {
  if (order.value?.order_type === "jasa") {
    return [
      { value: "in-store", label: "Di Tempat" },
      { value: "on-site", label: "Panggilan" },
      { value: "online", label: "Online" },
    ];
  }
  return [
    { value: "pickup", label: "Ambil Sendiri" },
    { value: "delivery", label: "Diantar / Kurir" },
  ];
});

const paymentOptions = [
  { value: "COD", label: "Tunai / COD" },
  { value: "Transfer Bank", label: "Transfer" },
  { value: "QRIS", label: "QRIS" },
];

const completionForm = ref({
  delivery_type: "pickup",
  payment_method: "COD",
  shipping_fee: 0,
});

const computedModalTotal = computed(() => {
  const subtotal = Number(order.value?.amounts?.subtotal || order.value?.amounts?.total || 0);
  const discount = Number(order.value?.amounts?.discount || 0);
  const shipping = completionForm.value.delivery_type === "delivery" ? Number(completionForm.value.shipping_fee || 0) : 0;
  return Math.max(0, subtotal + shipping - discount);
});

async function fetchOrderDetail() {
  if (!merchantSlug.value || !orderId.value) return;
  loading.value = true;
  try {
    const { data: res } = await getMerchantOrderDetail(merchantSlug.value, orderId.value);
    const raw = res?.data ?? res;
    order.value = transformOrder(raw);
  } catch (error) {
    console.error("Gagal memuat detail pesanan:", error);
    toast.error("Gagal memuat detail pesanan");
    order.value = null;
  } finally {
    loading.value = false;
  }
}

function openCompleteModal() {
  completionForm.value = {
    delivery_type: order.value?.delivery_type === "delivery" ? "delivery" : "pickup",
    payment_method: order.value?.payment_method && order.value.payment_method !== "WhatsApp" 
      ? order.value.payment_method 
      : "COD",
    shipping_fee: Number(order.value?.amounts?.shipping || 0),
  };
  showCompleteModal.value = true;
}

function openCancelModal() {
  showCancelModal.value = true;
}

async function submitCompleteOrder() {
  if (!merchantSlug.value || !orderId.value) return;
  updatingStatus.value = true;
  try {
    const payload = {
      status: "completed",
      delivery_type: completionForm.value.delivery_type,
      payment_method: completionForm.value.payment_method,
      shipping_fee: completionForm.value.delivery_type === "delivery" 
        ? Number(completionForm.value.shipping_fee || 0) 
        : 0,
    };
    await updateOrderStatus(merchantSlug.value, order.value.id, payload);
    toast.success("Pesanan berhasil diselesaikan dan dicatat ke laporan transaksi.");
    showCompleteModal.value = false;
    await fetchOrderDetail();
  } catch (error) {
    console.error("Gagal menyelesaikan pesanan:", error);
    toast.error(error?.response?.data?.message || "Gagal menyelesaikan pesanan");
  } finally {
    updatingStatus.value = false;
  }
}

async function confirmStatusChange(newStatus) {
  if (!merchantSlug.value || !orderId.value) return;
  updatingStatus.value = true;
  try {
    const { data: res } = await updateOrderStatus(merchantSlug.value, order.value.id, {
      status: newStatus,
    });
    toast.success("Pesanan berhasil dibatalkan.");
    showCancelModal.value = false;
    await fetchOrderDetail();
  } catch (error) {
    console.error("Gagal memperbarui status pesanan:", error);
    toast.error(error?.response?.data?.message || "Gagal memperbarui status pesanan");
  } finally {
    updatingStatus.value = false;
  }
}

function openCustomerWhatsApp() {
  if (!order.value?.customer?.phone) return;
  let phone = order.value.customer.phone.replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) {
    phone = "62" + phone.slice(1);
  }
  const text = `Halo Kak ${order.value.customer.name}, mengenai pesanan Anda (${order.value.invoice}) di ${authStore.getMerchantBySlug(merchantSlug.value)?.name || 'toko kami'}...`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function goBack() {
  router.push(`/merchant-center/${merchantSlug.value}/orders`);
}

onMounted(() => {
  fetchOrderDetail();
});
</script>
