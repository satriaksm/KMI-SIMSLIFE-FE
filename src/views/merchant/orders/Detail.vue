<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import StatusLabel from "@/components/common/StatusLabel.vue";
import Button from "@/components/common/Button.vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";

const router = useRouter();
const route = useRoute();

const emit = defineEmits(["toggle-sidebar"]);
const breadcrumbItems = computed(() => [
  {
    label: "Pesanan Masuk",
    path: `/merchant-center/${currentMerchantSlug.value}/orders`,
  },
  {
    label: "Detail Pesanan",
  },
]);
const currentMerchantSlug = computed(() =>
  route.params?.merchantSlug ? String(route.params.merchantSlug) : null,
);

// ========================
// DUMMY DATA (same source as Index)
// ========================
const allOrders = [
  {
    id: "ORD-2001",
    invoice: "INV/2026/02/001",
    customer: {
      name: "Budi Santoso",
      phone: "081234567890",
      email: "budi@email.com",
    },
    status: "pending_payment",
    payment_method: "Transfer Bank",
    created_at: "2026-02-24T08:30:00",
    items: [
      {
        name: "Keripik Pisang Original",
        qty: 2,
        price: 15000,
        subtotal: 30000,
        image: null,
      },
      {
        name: "Sambal Bawang Pedas",
        qty: 1,
        price: 18000,
        subtotal: 18000,
        image: null,
      },
    ],
    amounts: { subtotal: 48000, discount: 0, shipping: 10000, total: 58000 },
    shipping_address: "Jl. Merdeka No. 12, Kec. Sukajadi, Bandung, 40161",
    note: "Tolong dikemas rapi",
  },
  {
    id: "ORD-2002",
    invoice: "INV/2026/02/002",
    customer: {
      name: "Siti Rahayu",
      phone: "089876543210",
      email: "siti@email.com",
    },
    status: "processing",
    payment_method: "QRIS",
    created_at: "2026-02-23T14:15:00",
    items: [
      {
        name: "Batik Tulis Motif Parang",
        qty: 1,
        price: 285000,
        subtotal: 285000,
        image: null,
      },
    ],
    amounts: {
      subtotal: 285000,
      discount: 20000,
      shipping: 15000,
      total: 280000,
    },
    shipping_address: "Jl. Raya Darmo No. 45, Surabaya, 60241",
    note: "",
  },
  {
    id: "ORD-2003",
    invoice: "INV/2026/02/003",
    customer: {
      name: "Ahmad Fauzan",
      phone: "082111222333",
      email: "ahmad@email.com",
    },
    status: "processing",
    payment_method: "COD",
    created_at: "2026-02-23T10:00:00",
    items: [
      {
        name: "Kopi Arabika Gayo 250gr",
        qty: 3,
        price: 55000,
        subtotal: 165000,
        image: null,
      },
      {
        name: "Kopi Robusta Toraja 250gr",
        qty: 2,
        price: 45000,
        subtotal: 90000,
        image: null,
      },
    ],
    amounts: { subtotal: 255000, discount: 0, shipping: 12000, total: 267000 },
    shipping_address: "Jl. Gatot Subroto No. 8, Jakarta Selatan, 12930",
    note: "",
  },
  {
    id: "ORD-2004",
    invoice: "INV/2026/02/004",
    customer: {
      name: "Dewi Kusuma",
      phone: "087765432100",
      email: "dewi@email.com",
    },
    status: "completed",
    payment_method: "Transfer Bank",
    created_at: "2026-02-20T16:45:00",
    items: [
      {
        name: "Tempe Mendoan",
        qty: 5,
        price: 8000,
        subtotal: 40000,
        image: null,
      },
    ],
    amounts: { subtotal: 40000, discount: 5000, shipping: 8000, total: 43000 },
    shipping_address: "Jl. Pemuda No. 22, Semarang, 50133",
    note: "Kirim besok pagi",
  },
  {
    id: "ORD-2005",
    invoice: "INV/2026/02/005",
    customer: {
      name: "Rizki Pratama",
      phone: "083344556677",
      email: "rizki@email.com",
    },
    status: "completed",
    payment_method: "QRIS",
    created_at: "2026-02-18T09:20:00",
    items: [
      {
        name: "Rendang Daging Sapi 500gr",
        qty: 2,
        price: 95000,
        subtotal: 190000,
        image: null,
      },
      {
        name: "Dendeng Balado 250gr",
        qty: 1,
        price: 65000,
        subtotal: 65000,
        image: null,
      },
    ],
    amounts: {
      subtotal: 255000,
      discount: 15000,
      shipping: 18000,
      total: 258000,
    },
    shipping_address: "Jl. Nusantara Raya Blok B5, Depok, 16413",
    note: "",
  },
  {
    id: "ORD-2006",
    invoice: "INV/2026/02/006",
    customer: {
      name: "Maya Indah",
      phone: "081122334455",
      email: "maya@email.com",
    },
    status: "cancelled",
    payment_method: "Transfer Bank",
    created_at: "2026-02-15T11:30:00",
    items: [
      {
        name: "Tas Anyaman Rotan",
        qty: 1,
        price: 175000,
        subtotal: 175000,
        image: null,
      },
    ],
    amounts: { subtotal: 175000, discount: 0, shipping: 25000, total: 200000 },
    shipping_address: "Jl. Sudirman No. 100, Yogyakarta, 55233",
    note: "Customer batalkan sebelum proses",
  },
];

const order = computed(() => {
  const id = route.params?.orderId;
  return allOrders.find((o) => o.id === id) ?? null;
});

// ========================
// STATUS CONFIG
// ========================
const statusConfig = {
  pending_payment: {
    props: {
      variant: "payment",
      status: "pending",
      label: "Menunggu Bayar",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  processing: {
    props: {
      variant: "order",
      status: "processing",
      size: "sm",
      showIcon: true,
    },
    nextAction: {
      label: "Tandai Selesai",
      icon: "pi-check-circle",
      color: "bg-merchant-primary",
    },
  },
  completed: {
    props: {
      variant: "order",
      status: "completed",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  cancelled: {
    props: {
      variant: "order",
      status: "cancelled",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
};

const currentStatusConfig = computed(
  () => statusConfig[order.value?.status] ?? statusConfig.pending_payment,
);

// ========================
// ORDER TIMELINE
// ========================
const timeline = computed(() => {
  if (!order.value) return [];
  const status = order.value.status;
  const steps = [
    {
      key: "pending_payment",
      label: "Pesanan Diterima",
      desc: "Menunggu pembayaran customer",
      icon: "pi-shopping-bag",
    },
    {
      key: "processing",
      label: "Sedang Diproses",
      desc: "Pesanan sedang disiapkan",
      icon: "pi-sync",
    },
    {
      key: "completed",
      label: "Pesanan Selesai",
      desc: "Pesanan telah diterima",
      icon: "pi-check-circle",
    },
  ];
  const order_idx = ["pending_payment", "processing", "completed"].indexOf(
    status,
  );
  return steps.map((s, i) => ({
    ...s,
    done: i <= order_idx && status !== "cancelled",
    active:
      ["pending_payment", "processing", "completed"].indexOf(s.key) ===
      order_idx,
  }));
});

// ========================
// CONFIRM STATUS MODAL
// ========================
const showConfirmModal = ref(false);

function confirmAction() {
  // TODO: connect to API
  showConfirmModal.value = false;
}

// ========================
// HELPERS
// ========================
function formatIDR(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function goBack() {
  router.push(`/merchant-center/${currentMerchantSlug.value}/orders`);
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <MerchantMobileHeader title="Detail Pesanan" />

    <div
      class="top-0 left-0 right-0 z-10 items-center justify-between hidden px-4 py-4 bg-white border-b border-gray-100 sm:flex sm:fixed sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-gray-100 sm:hidden"
        >
          <i class="text-gray-500 pi pi-bars"></i>
        </button>
        <div>
          <Breadcrumb
            :items="breadcrumbItems"
            :merchantId="currentMerchantSlug"
          />
          <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
            Lihat detail dan kelola pesanan masuk.
          </p>
        </div>
      </div>
    </div>

    <div class="h-20 sm:h-0"></div>

    <!-- Not found -->
    <div
      v-if="!order"
      class="flex flex-col items-center justify-center px-4 py-24"
    >
      <i class="mb-4 text-5xl text-gray-300 pi pi-inbox"></i>
      <p class="text-lg font-semibold text-gray-500">Pesanan tidak ditemukan</p>
      <button
        @click="goBack"
        class="mt-4 text-sm underline text-merchant-primary"
      >
        Kembali ke daftar
      </button>
    </div>

    <div v-else class="max-w-3xl px-4 py-2 mx-auto space-y-4 sm:px-6 sm:py-6">
      <!-- ======================== -->
      <!-- TIMELINE                 -->
      <!-- ======================== -->
      <div
        v-if="order.status !== 'cancelled'"
        class="p-4 bg-white shadow-sm rounded-2xl"
      >
        <h2 class="mb-4 text-sm font-semibold text-gray-700">Status Pesanan</h2>
        <div class="flex items-start gap-0">
          <template v-for="(step, idx) in timeline" :key="step.key">
            <div class="flex flex-col items-center flex-1">
              <!-- Circle -->
              <div
                :class="[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 border-2 transition',
                  step.done
                    ? 'bg-merchant-primary border-merchant-primary text-white'
                    : 'bg-white border-gray-300 text-gray-400',
                ]"
              >
                <i :class="['pi text-xs', step.icon]"></i>
              </div>
              <!-- Label -->
              <div class="px-1 mt-2 text-center">
                <p
                  :class="[
                    'text-xs font-semibold',
                    step.done ? 'text-merchant-primary' : 'text-gray-400',
                  ]"
                >
                  {{ step.label }}
                </p>
                <p class="text-[10px] text-gray-400 mt-0.5 hidden sm:block">
                  {{ step.desc }}
                </p>
              </div>
            </div>
            <!-- Connector line -->
            <div
              v-if="idx < timeline.length - 1"
              :class="[
                'flex-1 h-0.5 mt-4 transition',
                timeline[idx + 1]?.done ? 'bg-merchant-primary' : 'bg-gray-200',
              ]"
            ></div>
          </template>
        </div>
      </div>

      <!-- Cancelled banner -->
      <div
        v-if="order.status === 'cancelled'"
        class="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-2xl"
      >
        <i class="text-xl text-red-500 pi pi-times-circle shrink-0"></i>
        <div>
          <p class="text-sm font-semibold text-red-700">Pesanan Dibatalkan</p>
          <p v-if="order.note" class="text-xs text-red-500 mt-0.5">
            {{ order.note }}
          </p>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ORDER INFO               -->
      <!-- ======================== -->
      <div class="p-4 space-y-3 bg-white shadow-sm rounded-2xl">
        <h2
          class="pb-2 text-sm font-semibold text-gray-700 border-b border-gray-100"
        >
          Informasi Pesanan
        </h2>
        <div class="grid grid-cols-2 text-sm gap-y-3 gap-x-4">
          <div>
            <p class="text-xs text-gray-400">No. Pesanan</p>
            <p class="font-medium text-gray-800">{{ order.invoice }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">ID Pesanan</p>
            <p class="font-medium text-gray-800">{{ order.id }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Tanggal</p>
            <p class="font-medium text-gray-800">
              {{ formatDate(order.created_at) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Jam</p>
            <p class="font-medium text-gray-800">
              {{ formatTime(order.created_at) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Metode Pembayaran</p>
            <p class="font-medium text-gray-800">{{ order.payment_method }}</p>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- CUSTOMER INFO            -->
      <!-- ======================== -->
      <div class="p-4 space-y-3 bg-white shadow-sm rounded-2xl">
        <h2
          class="pb-2 text-sm font-semibold text-gray-700 border-b border-gray-100"
        >
          Data Pelanggan
        </h2>
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full bg-merchant-primary/10 shrink-0"
          >
            <span class="text-sm font-bold text-merchant-primary">
              {{ order.customer.name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">
              {{ order.customer.name }}
            </p>
            <p class="text-xs text-gray-500">{{ order.customer.phone }}</p>
            <p v-if="order.customer.email" class="text-xs text-gray-500">
              {{ order.customer.email }}
            </p>
          </div>
        </div>

        <div v-if="order.shipping_address" class="pt-1">
          <p class="mb-1 text-xs text-gray-400">Alamat Pengiriman</p>
          <div class="flex items-start gap-2">
            <i
              class="pi pi-map-marker text-xs text-gray-400 mt-0.5 shrink-0"
            ></i>
            <p class="text-sm text-gray-700">{{ order.shipping_address }}</p>
          </div>
        </div>

        <div v-if="order.note" class="pt-1">
          <p class="mb-1 text-xs text-gray-400">Catatan</p>
          <div class="flex items-start gap-2">
            <i class="pi pi-comment text-xs text-gray-400 mt-0.5 shrink-0"></i>
            <p class="text-sm italic text-gray-700">{{ order.note }}</p>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ITEMS                    -->
      <!-- ======================== -->
      <div class="p-4 bg-white shadow-sm rounded-2xl">
        <h2
          class="pb-2 mb-3 text-sm font-semibold text-gray-700 border-b border-gray-100"
        >
          Produk ({{ order.items.length }} item)
        </h2>
        <div class="space-y-3">
          <div
            v-for="(item, idx) in order.items"
            :key="idx"
            class="flex items-center gap-3"
          >
            <!-- Image placeholder -->
            <div
              class="flex items-center justify-center overflow-hidden bg-gray-100 w-14 h-14 rounded-xl shrink-0"
            >
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.name"
                class="object-cover w-full h-full"
              />
              <i v-else class="text-xl text-gray-300 pi pi-box"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">
                {{ item.name }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ item.qty }}x × Rp {{ formatIDR(item.price) }}
              </p>
            </div>
            <p class="text-sm font-semibold text-gray-800 shrink-0">
              Rp {{ formatIDR(item.subtotal) }}
            </p>
          </div>
        </div>

        <!-- Amount breakdown -->
        <div class="pt-4 mt-4 space-y-2 border-t border-gray-100">
          <div class="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>Rp {{ formatIDR(order.amounts.subtotal) }}</span>
          </div>
          <div
            v-if="order.amounts.discount > 0"
            class="flex justify-between text-sm text-green-600"
          >
            <span>Diskon</span>
            <span>-Rp {{ formatIDR(order.amounts.discount) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-600">
            <span>Ongkos Kirim</span>
            <span>Rp {{ formatIDR(order.amounts.shipping) }}</span>
          </div>
          <div
            class="flex justify-between pt-2 text-base font-bold text-gray-800 border-t border-gray-100"
          >
            <span>Total</span>
            <span>Rp {{ formatIDR(order.amounts.total) }}</span>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ACTION BUTTON            -->
      <!-- ======================== -->
      <div v-if="currentStatusConfig.nextAction" class="pb-6">
        <button
          type="button"
          @click="showConfirmModal = true"
          :class="[
            'w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition active:scale-[0.98]',
            currentStatusConfig.nextAction.color,
          ]"
        >
          <i :class="['pi', currentStatusConfig.nextAction.icon]"></i>
          {{ currentStatusConfig.nextAction.label }}
        </button>
      </div>
    </div>

    <!-- ======================== -->
    <!-- CONFIRM MODAL            -->
    <!-- ======================== -->
    <transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showConfirmModal"
        class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/50"
        @click.self="showConfirmModal = false"
      >
        <div class="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-merchant-primary/10"
            >
              <i class="pi pi-check-circle text-merchant-primary"></i>
            </div>
            <h3 class="text-base font-semibold text-gray-800">
              Konfirmasi Tindakan
            </h3>
          </div>
          <p class="mb-6 text-sm text-gray-600">
            Apakah Anda yakin ingin menandai pesanan ini sebagai selesai?
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              @click="showConfirmModal = false"
              class="flex-1 py-2.5 text-sm font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="button"
              @click="confirmAction"
              class="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl bg-merchant-primary hover:bg-merchant-primary/90 transition"
            >
              Ya, Konfirmasi
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped></style>
