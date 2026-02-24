<template>
  <div class="min-h-screen bg-gray-100">
    <MobileHeader title="Rincian Pesananmu" @back="goBack" variant="primary" />

    <div class="px-4 py-2 mx-auto space-y-2 max-w-7xl sm:py-4 sm:space-y-4">
      <!-- Status header -->
      <div class="p-4 bg-white border border-gray-200 rounded-2xl">
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
            class="relative z-10 flex flex-col items-center flex-1 gap-2"
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
                s.done ? 'text-primary font-semibold' : 'text-muted-foreground'
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
          <div class="flex items-start gap-3">
            <div
              class="w-2 h-2 mt-1 rounded-full bg-danger-foreground shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="text-xs text-muted-foreground">Diambil dari</div>
              <div class="text-sm font-extrabold text-black truncate">
                {{ order.pickup.place }}
              </div>
              <div class="text-sm text-muted-foreground">
                {{ order.pickup.address }}
              </div>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="w-2 h-2 mt-1 rounded-full bg-success-foreground shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="text-xs text-muted-foreground">Diantar ke</div>
              <div class="text-sm text-muted-foreground">
                {{ order.dropoff.address }}
              </div>
              <div class="mt-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 text-sm font-bold text-primary"
                >
                  <i class="pi pi-image" />
                  Bukti Pengiriman
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Order items & pricing -->
      <div class="overflow-hidden bg-white border border-gray-200 rounded-2xl">
        <div class="px-4 py-3 border-b border-gray-200">
          <div class="text-base font-extrabold text-black">Rincian Pesanan</div>
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
                loading="lazy"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-bold leading-tight text-black">
                <span :class="it.tag ? '' : ''">{{ it.title }}</span>
              </div>
              <div v-if="it.note" class="mt-1 text-xs text-muted-foreground">
                {{ it.note }}
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

            <div class="flex items-center justify-between text-xs">
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

      <!-- Order info -->
      <div class="overflow-hidden bg-white border border-gray-200 rounded-2xl">
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
        </div>
      </div>

      <div class="py-3 mx-auto max-w-7xl">
        <Button block @click="orderAgain">Pesan lagi</Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import { useToast } from "vue-toastification";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const orderId = computed(() => String(route.params.orderId || ""));

const trackLineStyle = computed(() => {
  const n = order.value.tracking.length;
  const half = 100 / (2 * n);
  return { left: `${half}%`, right: `${half}%` };
});

const progressLineStyle = computed(() => {
  const t = order.value.tracking;
  const n = t.length;
  const half = 100 / (2 * n);
  const trackWidth = 100 - 2 * half;
  const lastDone = t.reduce((acc, s, i) => (s.done ? i : acc), -1);
  const fill = lastDone <= 0 ? 0 : (lastDone / (n - 1)) * trackWidth;
  return { left: `${half}%`, width: `${fill}%` };
});

const order = computed(() => {
  const id = orderId.value || "ORD-0000";

  return {
    id,

    tracking: [
      {
        key: "placed",
        icon: "pi-receipt",
        done: true,
        label: "Pesanan\nDibuat",
      },
      {
        key: "paid",
        icon: "pi-credit-card",
        done: true,
        label: "Pembayaran\nDiterima",
      },
      {
        key: "prepared",
        icon: "pi-box",
        done: true,
        label: "Sedang\nDisiapkan",
      },
      {
        key: "shipped",
        icon: "pi-truck",
        done: true,
        label: "Sedang\nDiantar",
      },
      { key: "home", icon: "pi-home", done: true, label: "Selesai" },
    ],

    driver: {
      name: "GERRY WILYARSO",
      rating: "4.9",
      code: "AD3792AS",
    },

    pickup: {
      place: "Chicktop",
      address:
        "Jalan Untung Suropati, No.42, Kedung Lumbu, PASAR KLIWON, KOTA SURAKARTA (SOLO), JAWA TENGAH",
    },

    dropoff: {
      place: "Vivo Dental Clinic",
      address:
        "Jalan Jend Urip Sumoharjo No. 112, Purwodiningratan, Kota Surakarta (Solo), JEBRES, KOTA SURAKARTA (SOLO), JAWA TENGAH",
    },

    items: [
      {
        tag: "Terlaris",
        title: "Paket Nasi Ayam Dada Celup + Es Teh Manis",
        qty: 1,
        note: "Keju, Langsung celup",
        price: 30000,
        originalPrice: 42857,
        imageUrl: null,
      },
    ],

    amounts: {
      subtotal: 30000,
      discount: 12000,
      delivery_fee: 2000,
      service_fee: 3000,
      total: 23000,
    },

    payment: {
      status: "paid",
      label: "Paid",
    },

    meta: {
      note: null,
      order_code: "2909352122461184034",
      ordered_at: "9 Jan 2026 12:46",
      payment_method: "ShopeePay",
    },
  };
});

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
</script>
