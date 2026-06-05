<template>
  <div class="min-h-screen bg-gray-100">
    <MobileHeader title="Rincian Pesananmu" @back="goBack" variant="primary" />

    <div class="px-4 py-2 mx-auto space-y-2 max-w-7xl sm:py-4 sm:space-y-4">
      <!-- Verifying payment banner -->
      <div
        v-if="verifying"
        class="flex items-center gap-3 p-4 text-sm font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-2xl"
      >
        <i class="pi pi-spin pi-spinner text-blue-600 text-lg shrink-0"></i>
        <span>Mengkonfirmasi pembayaran Anda... Mohon tunggu sebentar.</span>
      </div>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="space-y-3">
          <!-- Status card skeleton -->
          <div class="p-4 bg-white border border-gray-200 rounded-2xl animate-pulse">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div class="flex-1 space-y-2">
                <div class="w-1/2 h-4 bg-gray-200 rounded"></div>
                <div class="w-1/3 h-3 bg-gray-200 rounded"></div>
              </div>
              <div class="w-20 h-6 bg-gray-200 rounded-full"></div>
            </div>
            <!-- Timeline skeleton -->
            <div class="flex items-center gap-2">
              <div v-for="n in 4" :key="'tl-'+n" class="flex items-center flex-1">
                <div class="w-6 h-6 bg-gray-200 rounded-full shrink-0"></div>
                <div v-if="n < 4" class="flex-1 h-0.5 bg-gray-200 mx-1"></div>
              </div>
            </div>
          </div>
          <!-- Items skeleton -->
          <div class="p-4 bg-white border border-gray-200 rounded-2xl animate-pulse">
            <div class="w-24 h-4 mb-4 bg-gray-200 rounded"></div>
            <div v-for="n in 2" :key="'item-'+n" class="flex items-start gap-3 mb-3">
              <div class="w-14 h-14 bg-gray-200 rounded-xl shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="w-3/4 h-4 bg-gray-200 rounded"></div>
                <div class="w-1/2 h-3 bg-gray-200 rounded"></div>
                <div class="w-1/4 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          <!-- Payment summary skeleton -->
          <div class="p-4 bg-white border border-gray-200 rounded-2xl animate-pulse">
            <div class="w-32 h-4 mb-4 bg-gray-200 rounded"></div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <div class="w-20 h-3 bg-gray-200 rounded"></div>
                <div class="w-16 h-3 bg-gray-200 rounded"></div>
              </div>
              <div class="flex justify-between">
                <div class="w-24 h-3 bg-gray-200 rounded"></div>
                <div class="w-16 h-3 bg-gray-200 rounded"></div>
              </div>
              <div class="flex justify-between pt-2 border-t border-gray-100">
                <div class="w-16 h-4 bg-gray-200 rounded"></div>
                <div class="w-24 h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Not found -->
      <div v-else-if="!order" class="py-16 text-center">
        <p class="text-lg font-bold text-black">Pesanan tidak ditemukan</p>
        <button
          @click="goBack"
          class="mt-3 text-sm font-semibold underline text-primary"
        >
          Kembali
        </button>
      </div>

      <template v-else>
        
        <!-- Cancelled banner -->
        <div v-if="['cancelled', 'rejected', 'undelivered'].includes(order.status)" class="flex flex-col gap-3 p-4 border bg-red-50 rounded-2xl mb-4" :class="order.status === 'undelivered' ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'">
          <div class="flex items-center gap-3">
            <i class="text-xl pi shrink-0" :class="order.status === 'undelivered' ? 'pi-exclamation-triangle text-orange-500' : 'pi-times-circle text-red-500'"></i>
            <div>
              <p class="text-sm font-semibold" :class="order.status === 'undelivered' ? 'text-orange-700' : 'text-red-700'">
                {{ order.status === 'rejected' ? 'Pesanan Ditolak Penjual' : order.status === 'undelivered' ? 'Pesanan Gagal Kirim' : 'Pesanan Dibatalkan' }}
              </p>
              <p v-if="order.meta.note || order.meta.failed_reason" class="text-xs mt-0.5" :class="order.status === 'undelivered' ? 'text-orange-600' : 'text-red-500'">
                {{ order.meta.failed_reason || order.meta.note }}
              </p>
            </div>
          </div>
        </div>

        <!-- Status header -->
        <div v-if="order.status !== 'cancelled'" class="p-4 bg-white border border-gray-200 rounded-2xl">
                  <h2 class="mb-4 text-sm font-semibold text-gray-700">Status Pesanan</h2>

          <!-- Countdown konfirmasi UMKM -->
          <div
            v-if="confirmCountdownText && (order.status === 'paid' || (order.status === 'pending' && order.meta.payment_method === 'COD'))"
            class="mb-4 p-3 rounded-xl"
            :class="isConfirmExpired ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'"
          >
            <div v-if="isConfirmExpired" class="flex items-center gap-2">
              <i class="pi pi-clock text-red-500"></i>
              <span class="text-sm font-semibold text-red-700">Batas waktu konfirmasi UMKM habis. Pesanan akan dibatalkan.</span>
            </div>
            <div v-else class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi pi-clock text-amber-600"></i>
                <span class="text-xs text-amber-700">Menunggu konfirmasi UMKM</span>
              </div>
              <span class="text-sm font-bold text-amber-700 font-mono">{{ confirmCountdownText }}</span>
            </div>
          </div>
          <!-- Tracking row -->
          <div class="relative flex items-start">
            <!-- Background track -->
            <div
              class="absolute h-0.5 top-[18px] -translate-y-1/2 bg-gray-200"
              :style="trackLineStyle"
            />
            <!-- Progress fill -->
            <div
              class="absolute h-0.5 top-[18px] -translate-y-1/2 bg-primary transition-all"
              :style="progressLineStyle"
            />

            <div
              v-for="s in order.tracking"
              :key="s.key"
              class="relative z-0 flex flex-col items-center flex-1 gap-2"
            >
              <div
                class="flex items-center justify-center text-sm border rounded-full w-9 h-9"
                :class="
                  s.done
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white border-gray-200 text-muted-foreground'
                "
              >
                <i :class="['pi', s.icon]" />
              </div>
              <div
                class="text-center leading-tight px-0.5"
                style="font-size: 9.5px"
                :class="
                  s.done
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground'
                "
              >
                {{ s.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- Pickup & delivery -->
        <div class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="space-y-4">
            <template v-if="order.meta.delivery_type === 'pickup'">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 mt-1 overflow-hidden bg-gray-200 rounded-full shrink-0 flex items-center justify-center">
                  <img v-if="order.pickup.logoUrl" :src="order.pickup.logoUrl" class="object-cover w-full h-full" alt="Store logo" crossorigin="use-credentials" />
                  <svg v-else class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0 mt-1">
                  <div class="text-xs text-muted-foreground">Ambil langsung dari</div>
                  <div class="text-sm font-extrabold text-black truncate">
                    {{ order.pickup.place }}
                  </div>
                  <div class="text-sm text-muted-foreground">
                    {{ order.pickup.address }}
                  </div>
                  <div class="mt-2" v-if="order.pickup.phone">
                    <a
                      :href="`https://wa.me/${order.pickup.phone.replace(/^0/, '62')}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700"
                    >
                      <i class="pi pi-whatsapp" />
                      Hubungi UMKM
                    </a>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 mt-1 overflow-hidden bg-gray-200 rounded-full shrink-0 flex items-center justify-center">
                  <img v-if="order.pickup.logoUrl" :src="order.pickup.logoUrl" class="object-cover w-full h-full" alt="Store logo" crossorigin="use-credentials" />
                  <svg v-else class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0 mt-1">
                  <div class="text-xs text-muted-foreground">Diambil dari</div>
                  <div class="text-sm font-extrabold text-black truncate">
                    {{ order.pickup.place }}
                  </div>
                  <div class="text-sm text-muted-foreground">
                    {{ order.pickup.address }}
                  </div>
                  <div class="mt-2" v-if="order.pickup.phone">
                    <a
                      :href="`https://wa.me/${order.pickup.phone.replace(/^0/, '62')}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700"
                    >
                      <i class="pi pi-whatsapp" />
                      Hubungi UMKM
                    </a>
                  </div>
                </div>
              </div>

              <div class="flex items-start gap-3 mt-4">
                <div class="w-2 h-2 mt-1 rounded-full bg-success-foreground shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-muted-foreground">Diantar ke</div>
                  <div class="text-sm text-muted-foreground">
                    {{ order.dropoff.address }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Order items & pricing -->
        <div
          class="overflow-hidden bg-white border border-gray-200 rounded-2xl"
        >
          <div class="px-4 py-3 border-b border-gray-200">
            <div class="text-base font-extrabold text-black">
              Rincian Pesanan
            </div>
          </div>

          <div class="px-4 py-3 space-y-4">
            <div v-for="(it, idx) in order.items" :key="idx" class="flex gap-3">
              <div
                class="w-12 h-12 overflow-hidden bg-gray-200 rounded-xl shrink-0"
              >
                <img
                  v-if="it.imageUrl"
                  :src="it.imageUrl"
                  :alt="it.title"
                  class="object-cover w-full h-full"
                  crossorigin="use-credentials"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold leading-tight text-black">
                  <span>{{ it.title }}</span>
                </div>
                <div v-if="it.variant" class="mt-1 text-xs text-muted-foreground">
                  {{ it.variant }}
                </div>
                <div v-if="it.addons && it.addons.length" class="mt-0.5 text-xs text-muted-foreground">
                  <span class="text-primary">+</span> {{ it.addons.map(a => a.name).join(', ') }}
                </div>
                <div class="mt-1 text-xs text-muted-foreground">
                  {{ it.qty }} x
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs text-muted-foreground">
                  Rp {{ formatIDR(it.price) }}
                </div>
                <div
                  v-if="it.originalPrice && it.originalPrice > it.priStatusce"
                  class="text-xs line-through text-muted-foreground"
                >
                  Rp {{ formatIDR(it.originalPrice) }}
                </div>
              </div>
            </div>

            <div class="pt-3 space-y-2 border-t border-gray-200">
              <div class="flex items-center justify-between text-xs">
                <div class="text-muted-foreground">
                  Subtotal Pesanan ({{ order.items.length }} menu)
                </div>
                <div class="text-muted-foreground">
                  Rp {{ formatIDR(order.amounts.subtotal) }}
                </div>
              </div>

              <div v-if="order.amounts.discount > 0" class="flex items-center justify-between text-xs">
                <div class="text-muted-foreground">Voucher Diskon</div>
                <div class="text-muted-foreground">
                  -Rp {{ formatIDR(order.amounts.discount) }}
                </div>
              </div>

              <div class="flex items-center justify-between text-xs">
                <div class="text-muted-foreground">Biaya Pengiriman</div>
                <div class="text-muted-foreground">
                  Rp {{ formatIDR(order.amounts.delivery_fee) }}
                </div>
              </div>

              <div v-if="order.amounts.platform_fee > 0" class="flex items-center justify-between text-xs">
                <div class="text-muted-foreground">Biaya Layanan/Admin</div>
                <div class="text-muted-foreground">
                  Rp {{ formatIDR(order.amounts.platform_fee) }}
                </div>
              </div>

              <div class="flex items-end justify-between pt-2">
                <div class="text-xs text-muted-foreground">
                  <!-- <div class="">Total</div> -->
                </div>
                <div class="text-xl font-extrabold text-black">
                  Rp {{ formatIDR(order.amounts.total) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================== -->
        <!-- PROOF OF DELIVERY        -->
        <!-- ======================== -->
        <div v-if="order.meta.proof_image_url" class="overflow-hidden bg-white border border-gray-200 rounded-2xl mb-4">
          <div class="px-4 py-3 border-b border-gray-200">
            <div class="text-base font-extrabold text-black">
              Bukti Foto Pengiriman
            </div>
          </div>
          <div class="p-4 flex justify-center">
            <img :src="order.meta.proof_image_url" class="w-full max-w-sm rounded-xl border border-gray-200" alt="Bukti Foto" />
          </div>
        </div>

        <!-- Order info -->
        <div
          class="overflow-hidden bg-white border border-gray-200 rounded-2xl"
        >
          <div class="px-4 py-3 border-b border-gray-200">
            <div class="text-base font-extrabold text-black">
              Informasi Pesanan
            </div>
          </div>

          <div class="px-4 py-3 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div class="text-xs text-muted-foreground">Catatan Tambahan</div>
              <div class="text-xs font-semibold text-black">
                {{ order.meta.note || "-" }}
              </div>
            </div>

            <div class="flex items-center justify-between gap-3">
              <div class="text-xs text-muted-foreground">No. Pesanan</div>
              <div class="flex items-center gap-3">
                <div class="text-xs font-semibold text-black">
                  {{ order.meta.order_code }}
                </div>
                <Button
                  variant="primary-outline"
                  size="sm"
                  class="!p-1.5"
                  @click="copyOrderCode"
                >
                  <i class="pi pi-copy" />
                </Button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3">
              <div class="text-xs text-muted-foreground">Waktu Pemesanan</div>
              <div class="text-xs font-semibold text-black">
                {{ order.meta.ordered_at }}
              </div>
            </div>

            <div class="flex items-center justify-between gap-3">
              <div class="text-xs text-muted-foreground">Pembayaran</div>
              <div class="text-xs font-semibold text-black">
                {{ order.meta.payment_method }}
              </div>
            </div>

            <div class="flex items-center justify-between gap-3">
              <div class="text-xs text-muted-foreground">Metode Pengiriman</div>
              <div class="text-xs font-semibold text-black">
                {{ order.meta.delivery_type === 'pickup' ? 'Ambil Sendiri (Pickup)' : 'Kirim ke Alamat (Delivery)' }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="order.status !== 'cancelled'" class="py-3 mx-auto max-w-7xl">
          <div v-if="order?.status === 'pending' && isPaymentExpired" class="mb-3 text-center text-sm font-semibold text-red-600 bg-red-50 py-2 rounded-xl">
            Waktu pembayaran telah habis.
          </div>
          <div v-else-if="order?.status === 'pending' && countdownText" class="mb-3 text-center text-sm font-medium text-amber-700 bg-amber-50 py-2 rounded-xl">
            Sisa waktu pembayaran: <span class="font-bold">{{ countdownText }}</span>
          </div>
          <Button
            v-if="order?.status === 'pending' && order?.meta?.payment_method !== 'COD'"
            variant="primary"
            block
            :loading="paying"
            :disabled="isPaymentExpired"
            @click="handlePayNow"
          >
            Bayar Sekarang
          </Button>
          <Button
            v-if="order?.status === 'pending' && order?.payment_method?.toUpperCase() === 'COD'"
            variant="danger-outline"
            block
            :loading="cancelling"
            @click="handleCancel"
            customClass="mt-2"
          >
            Batalkan Pesanan
          </Button>
          <Button
            v-if="order?.status === 'delivered' && order?.meta?.payment_method?.toUpperCase() !== 'COD'"
            block
            :loading="completing"
            @click="handleComplete"
            customClass="mt-2 bg-green-600 hover:bg-green-700 text-white"
          >
            Pesanan Diterima (Selesai)
          </Button>
          <Button
            v-if="order?.status === 'completed'"
            block
            @click="$router.push({ path: `/review/product/${order.id}/${order.items[0]?.productId}`, query: { merchantId: order.merchantId } })"
            customClass="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Beri Ulasan
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import { useToast } from "vue-toastification";
import { getCustomerOrderDetail, cancelOrder, completeOrder } from "@/services/api/order";
import { createOrderInvoice, verifyOrderPayment } from "@/services/api/payment";
import echo from "@/libs/echo";

// Countdown timer for payment
const countdownText = ref("");
const isPaymentExpired = ref(false);
let timer = null;

// Countdown timer for UMKM confirmation
const confirmCountdownText = ref("");
const isConfirmExpired = ref(false);
let confirmTimer = null;

const route = useRoute();
const router = useRouter();
const toast = useToast();

const orderId = computed(() => String(route.params.orderId || ""));
const loading = ref(true);
const rawOrder = ref(null);
const cancelling = ref(false);
const paying = ref(false);
const completing = ref(false);
let orderChannel = null;

const trackLineStyle = computed(() => {
  if (!order.value?.tracking) return {};
  const n = order.value.tracking.length;
  const half = 100 / (2 * n);
  return { left: `${half}%`, right: `${half}%` };
});

const progressLineStyle = computed(() => {
  if (!order.value?.tracking) return {};
  const t = order.value.tracking;
  const n = t.length;
  const half = 100 / (2 * n);
  const trackWidth = 100 - 2 * half;
  const lastDone = t.reduce((acc, s, i) => (s.done ? i : acc), -1);
  const fill = lastDone <= 0 ? 0 : (lastDone / (n - 1)) * trackWidth;
  return { left: `${half}%`, width: `${fill}%` };
});

const order = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;

  const status = o.status;
  const isCOD = o.payment_method === 'COD';

  // Untuk COD, skip step "Pembayaran Diterima" (langsung done)
  const trackingMap = {
    pending: isCOD ? [true, true, false, false, false] : [true, false, false, false, false],
    paid: [true, true, false, false, false],
    responsed: [true, true, true, false, false],
    accepted: [true, true, true, false, false],
    delivered: [true, true, true, true, false],
    completed: [true, true, true, true, true],
    cancelled: [false, false, false, false, false],
    rejected: [false, false, false, false, false],
    undelivered: [false, false, false, false, false],
  };
  const dones = trackingMap[status] || [false, false, false, false, false];
  const merchantAddressObj = o.merchant?.primary_address || o.merchant?.primaryAddress;

  return {
    id: o.id,
    merchantId: o.merchant_id,
    status,

    tracking: [
      {
        key: "placed",
        icon: "pi-receipt",
        done: dones[0],
        label: "Pesanan\nDibuat",
      },
      {
        key: "paid",
        icon: isCOD ? "pi-clock" : "pi-credit-card",
        done: dones[1],
        label: isCOD ? "Menunggu\nKonfirmasi" : "Pembayaran\nDiterima",
      },
      {
        key: "prepared",
        icon: "pi-box",
        done: dones[2],
        label: "Sedang\nDisiapkan",
      },
      {
        key: "shipped",
        icon: o.delivery_type === "pickup" ? "pi-map-marker" : "pi-truck",
        done: dones[3],
        label: o.delivery_type === "pickup" ? "Siap\nDiambil" : "Sedang\nDiantar",
      },
      { key: "home", icon: "pi-home", done: dones[4], label: "Selesai" },
    ],

    pickup: {
      place: o.merchant?.name || "Toko",
      address: merchantAddressObj 
        ? [
            merchantAddressObj.detail,
            merchantAddressObj.village?.name,
            merchantAddressObj.district?.name,
            merchantAddressObj.city?.name,
            merchantAddressObj.province?.name
          ].filter(Boolean).join(", ")
        : "Alamat toko belum diatur",
      phone: o.merchant?.phone || null,
      logoUrl: o.merchant?.logo_url || o.merchant?.logoUrl || null,
    },

    dropoff: {
      place: "Alamat Pengiriman",
      address:
        [
          o.address_detail_snapshot,
          o.village_name_snapshot,
          o.district_name_snapshot,
          o.city_name_snapshot,
          o.province_name_snapshot,
        ]
          .filter(Boolean)
          .join(", ") || "-",
    },

    items: (o.items || []).map((it) => ({
      id: it.id,
      productId: it.product_id,
      title: it.product_name_snapshot || "Produk",
      qty: it.quantity,
      variant: it.product_variant_snapshot || "",
      addons: (it.addons || []).map((a) => ({
        name: a.addon_name_snapshot || a.addon?.name || "Addon",
        price: Number(a.addon_price_snapshot || 0),
      })),
      price: it.subtotal_snapshot || it.unit_price_snapshot * it.quantity,
      originalPrice: null,
      imageUrl: getOrderSnapshotUrl(it.id, it.image_snapshot_path),
    })),

    amounts: {
      subtotal: Number(o.subtotal || 0),
      discount: Number(o.discount_total || 0),
      delivery_fee: Number(o.delivery_fee_snapshot || 0),
      platform_fee: Number(o.platform_fee || 0),
      total: Number(o.gross_amount || 0),
    },

    meta: {
      note: o.notes || null,
      order_code: o.order_code || "-",
      ordered_at: formatDateTime(o.created_at),
      payment_method: o.payment_method || (o.payment?.payment_method || (o.delivery_type === 'pickup' && !o.payment ? "COD" : "Transfer")),
      delivery_type: o.delivery_type || 'delivery',
      proof_image_url: o.proof_image_url || null,
      failed_reason: o.failed_reason || null,
    },
  };
});

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return (
    d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/order-snapshots/${orderItemId}`;
}

async function fetchOrder() {
  loading.value = true;
  try {
    const { data: res } = await getCustomerOrderDetail(orderId.value);
    rawOrder.value = res?.data ?? res ?? null;
    startCountdown();
    startConfirmCountdown();
  } catch (e) {
    console.error("Gagal memuat detail pesanan:", e);
    toast.error("Gagal memuat detail pesanan");
    rawOrder.value = null;
  } finally {
    loading.value = false;
  }
}

function startCountdown() {
  if (timer) clearInterval(timer);
  const payment = rawOrder.value?.payment;
  // If no payment object or already paid or expired_at is missing, stop
  if (!payment || payment.status === 'PAID' || !payment.expired_at) {
    isPaymentExpired.value = false;
    countdownText.value = "";
    return;
  }

  const expireTime = new Date(payment.expired_at).getTime();

  timer = setInterval(() => {
    const now = new Date().getTime();
    const distance = expireTime - now;

    if (distance < 0) {
      clearInterval(timer);
      isPaymentExpired.value = true;
      countdownText.value = "00:00:00";
    } else {
      isPaymentExpired.value = false;
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      countdownText.value = 
        String(hours).padStart(2, '0') + ":" + 
        String(minutes).padStart(2, '0') + ":" + 
        String(seconds).padStart(2, '0');
    }
  }, 1000);
}

/**
 * Countdown: batas waktu UMKM konfirmasi pesanan.
 */
function startConfirmCountdown() {
  if (confirmTimer) clearInterval(confirmTimer);

  const deadline = rawOrder.value?.confirm_deadline;
  const status = rawOrder.value?.status;

  // Hanya tampilkan jika menunggu konfirmasi UMKM
  if (!deadline || !['pending', 'paid'].includes(status)) {
    confirmCountdownText.value = "";
    isConfirmExpired.value = false;
    return;
  }

  // Transfer pending (belum bayar) — jangan tampilkan
  if (status === 'pending' && rawOrder.value?.payment_method !== 'COD') {
    confirmCountdownText.value = "";
    isConfirmExpired.value = false;
    return;
  }

  const expireTime = new Date(deadline).getTime();

  const tick = () => {
    const now = new Date().getTime();
    const distance = expireTime - now;

    if (distance < 0) {
      clearInterval(confirmTimer);
      isConfirmExpired.value = true;
      confirmCountdownText.value = "00:00:00";
    } else {
      isConfirmExpired.value = false;
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      confirmCountdownText.value =
        String(hours).padStart(2, '0') + ":" +
        String(minutes).padStart(2, '0') + ":" +
        String(seconds).padStart(2, '0');
    }
  };

  tick();
  confirmTimer = setInterval(tick, 1000);
}

async function handleCancel() {
  if (cancelling.value) return;
  cancelling.value = true;
  try {
    await cancelOrder(orderId.value);
    toast.success("Pesanan berhasil dibatalkan");
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal membatalkan pesanan");
  } finally {
    cancelling.value = false;
  }
}

async function handleComplete() {
  if (completing.value) return;
  completing.value = true;
  try {
    await completeOrder(orderId.value);
    toast.success("Pesanan berhasil diselesaikan");
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal menyelesaikan pesanan");
  } finally {
    completing.value = false;
  }
}

async function handlePayNow() {
  if (paying.value) return;
  paying.value = true;
  try {
    const { data } = await createOrderInvoice(orderId.value);
    const payload = data?.data ?? data;
    const invoiceUrl = payload?.invoice_url;

    if (!invoiceUrl) {
      toast.warning("Invoice belum tersedia. Coba lagi sebentar.");
      return;
    }

    window.location.href = invoiceUrl;
  } catch (e) {
    toast.error(
      e?.response?.data?.message ||
        "Gagal membuka pembayaran. Silakan coba lagi.",
    );
  } finally {
    paying.value = false;
  }
}

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

async function copyOrderCode() {
  try {
    await navigator.clipboard.writeText(
      String(order.value?.meta?.order_code || ""),
    );
    toast.success("No. pesanan tersalin", { timeout: 1500 });
  } catch {
    toast.warning("Gagal menyalin", { timeout: 1500 });
  }
}

function orderAgain() {
  router.push({ path: "/explore" }).catch(() => router.push("/"));
}

function goBack() {
  router.back();
}

onMounted(() => {
  fetchOrder();
  subscribeOrderChannel();

  // Deteksi redirect balik dari Xendit
  const paymentStatus = route.query?.payment;
  if (paymentStatus === "success") {
    verifyPaymentFromXendit();
  } else if (paymentStatus === "failed") {
    toast.error("Pembayaran gagal. Silakan coba lagi.");
  }
});

/**
 * Panggil BE untuk verifikasi pembayaran langsung ke Xendit API.
 * Retry sampai maksimal 5x dengan jeda 3 detik.
 */
const verifying = ref(false);
async function verifyPaymentFromXendit(retryCount = 0) {
  const MAX_RETRY = 5;
  const RETRY_DELAY_MS = 3000;

  if (verifying.value) return;
  verifying.value = true;

  try {
    const { data: res } = await verifyOrderPayment(orderId.value);
    const result = res?.data ?? res;

    if (result?.already_paid || result?.order_status === "paid") {
      toast.success("Pembayaran berhasil! Menunggu konfirmasi dari penjual.");
      await fetchOrder();
      return;
    }

    // Belum paid — retry jika masih ada kesempatan
    if (retryCount < MAX_RETRY) {
      toast.info(`Mengkonfirmasi pembayaran... (${retryCount + 1}/${MAX_RETRY})`);
      setTimeout(() => {
        verifying.value = false;
        verifyPaymentFromXendit(retryCount + 1);
      }, RETRY_DELAY_MS);
    } else {
      toast.warning(
        "Pembayaran belum terkonfirmasi. Mohon tunggu beberapa saat atau cek kembali di halaman pesanan."
      );
    }
  } catch (e) {
    if (retryCount < MAX_RETRY) {
      setTimeout(() => {
        verifying.value = false;
        verifyPaymentFromXendit(retryCount + 1);
      }, RETRY_DELAY_MS);
    } else {
      toast.error("Gagal memverifikasi pembayaran. Hubungi penjual jika sudah bayar.");
    }
  } finally {
    if (retryCount >= MAX_RETRY || verifying.value) {
      verifying.value = false;
    }
  }
}

onUnmounted(() => {
  leaveOrderChannel(orderId.value);
  if (timer) clearInterval(timer);
  if (confirmTimer) clearInterval(confirmTimer);
});

watch(orderId, (next, prev) => {
  if (prev) {
    leaveOrderChannel(prev);
  }
  if (next) {
    subscribeOrderChannel();
  }
});

function subscribeOrderChannel() {
  if (!orderId.value) return;

  orderChannel = echo.private(`orders.${orderId.value}`);
  orderChannel
    .listen(".order.status.updated", () => {
      fetchOrder();
    })
    .listen(".payment.status.updated", () => {
      fetchOrder();
    });
}

function leaveOrderChannel(id) {
  if (!id) return;
  echo.leave(`orders.${id}`);
  orderChannel = null;
}
</script>
