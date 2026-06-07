<template>
  <button
    type="button"
    class="w-full overflow-hidden text-left bg-white border border-gray-200 cursor-pointer rounded-2xl"
    @click="$emit('click', order)"
  >
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
      <div class="min-w-0">
        <div class="text-sm font-bold text-black truncate">
          {{ order.merchant?.name || order.merchant_name || 'UMKM' }}
        </div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{{ orderDateLabel }}</span>
          <span v-if="bookingDateLabel" class="inline-block w-1 h-1 rounded-full bg-gray-300"></span>
          <span v-if="bookingDateLabel" class="font-medium text-primary">{{ bookingDateLabel }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <StatusLabel v-bind="resolvedStatusProps" />
      </div>
    </div>

    <!-- Body -->
    <div class="px-4 py-3">
      <div class="flex gap-3">
        <div class="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
          <img
            v-if="serviceImage"
            :src="serviceImage"
            :alt="serviceTitle"
            class="w-full h-full object-cover block"
          />
          <i v-else class="pi pi-image text-gray-400 text-xl"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold text-black truncate">
            {{ serviceTitle }}
          </div>
          <div class="mt-0.5 text-xs text-muted-foreground">
            {{ serviceTypeLabel }}
          </div>
          <div class="mt-0.5 text-xs text-muted-foreground">
            {{ bookingTypeLabel }}
          </div>
        </div>
      </div>

      <!-- Payment info -->
      <div class="flex items-end justify-between gap-3 mt-3">
        <div>
          <div class="text-xs text-muted-foreground">Pembayaran</div>
          <div class="text-sm font-semibold text-black">
            {{ paymentMethodDisplay }}
          </div>
          <div v-if="paymentStatusDisplay" class="mt-0.5">
            <span
              class="px-2 py-0.5 text-[10px] font-semibold rounded-full"
              :class="isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
            >
              {{ paymentStatusDisplay }}
            </span>
          </div>
        </div>

        <div class="text-right">
          <div class="text-xs text-muted-foreground">Total</div>
          <div class="text-sm font-extrabold text-black">
            Rp {{ formatIDR(order.total_price) }}
          </div>
        </div>
      </div>

      <!-- Action slot -->
      <div v-if="$slots.action" class="mt-3">
<slot name="action" :order="order" />
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed } from "vue";
import StatusLabel from "@/components/common/StatusLabel.vue";

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
 statusProps: {
    type: Object,
    default: null,
  },
});

defineEmits(["click"]);

// ─── Image helpers ────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function resolveImageUrl(image) {
  if (!image) return null;
  const img = String(image);
  if (img.startsWith('http')) return img;
  if (img.startsWith('/api/images')) return `${API_BASE}${img}`;
  if (img.startsWith('api/images')) return `${API_BASE}/${img}`;
  if (img.startsWith('/storage')) return `${API_BASE}${img}`;
  if (img.startsWith('storage/')) return `${API_BASE}/${img}`;
  return `${API_BASE}/storage/${img}`;
}

// ─── Derived data ────────────────────────────────────────────────────────────

const serviceTitle = computed(() =>
  props.order.service_name || props.order.jasa?.title || props.order.service_title || "Layanan"
);

const serviceImage = computed(() => {
  // Try multiple image sources
  const img =
    props.order.service_image ||
    props.order.image_url ||
    props.order.cover_image ||
    props.order.jasa?.cover_image ||
    props.order.jasa?.image ||
    props.order.jasa_image ||
    null;

  const resolved = resolveImageUrl(img);
  console.log('[ServiceOrderCard] image debug:', {
    raw: img,
    resolved,
    service_image: props.order.service_image,
    image_url: props.order.image_url,
    jasa_image: props.order.jasa?.image,
  });
  return resolved;
});

const serviceTypeLabel = computed(() => {
  const map = {
    online: "Online",
    di_tempat_umkm: "Di Tempat UMKM",
    at_location: "Di Tempat UMKM",
    ke_rumah_pelanggan: "Ke Rumah Pelanggan",
    on_site: "Ke Rumah Pelanggan",
  };
  return map[props.order.service_type] || props.order.service_type || "";
});

const bookingTypeLabel = computed(() => {
  const map = {
    booking: "Booking (Pilih Tanggal & Jam)",
    keranjang: "Tanpa Jadwal",
    walk_in: "Walk-in",
    konsultasi: "Konsultasi",
  };
  return map[props.order.booking_type] || props.order.booking_type || "";
});

const orderDateLabel = computed(() => {
  const d = props.order.created_at
    ? new Date(props.order.created_at)
    : null;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
});

const bookingDateLabel = computed(() => {
  const d = props.order.booking_date
    ? new Date(props.order.booking_date)
    : null;
  if (!d || isNaN(d.getTime())) return null;
  const dateStr = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
  const timeStr = props.order.booking_time ? props.order.booking_time.slice(0, 5) : null;
  return timeStr ? `${dateStr} • ${timeStr}` : dateStr;
});

// ─── Payment ────────────────────────────────────────────────────────────────

const isPaid = computed(() => {
  const ps = String(props.order.payment_status || "").toUpperCase();
  const paidStatuses = ['PAID', 'SETTLED', 'SUCCEEDED'];
  return paidStatuses.includes(ps);
});

const isCod = computed(() => {
  return String(props.order.payment_method || "").toUpperCase() === "COD";
});

const paymentMethodDisplay = computed(() => {
  if (isCod.value) return "COD (Bayar Tunai)";
  const channel = props.order.payment_channel || props.order.paid_channel;
  if (channel) return `Xendit - ${getChannelLabel(channel)}`;
  return "Xendit";
});

const paymentStatusDisplay = computed(() => {
  // Debug logging
  console.log('[ServiceOrderCard] Payment debug:', {
    order_id: props.order.order_id || props.order.id,
    payment_method: props.order.payment_method,
    payment_channel: props.order.payment_channel,
    payment_status: props.order.payment_status,
    is_cod: isCod.value,
    is_paid: isPaid.value,
  });

  if (isCod.value) return null; // COD doesn't show payment status badge
  const ps = String(props.order.payment_status || "").toUpperCase();
  const map = {
    PAID: "Lunas / Sudah Dibayar",
    SETTLED: "Lunas / Sudah Dibayar",
    SUCCEEDED: "Lunas / Sudah Dibayar",
    WAITING_CONFIRMATION: "Menunggu",
    UNPAID: "Belum Bayar",
    PENDING: "Menunggu",
  };
  return map[ps] || null;
});

function getChannelLabel(channel) {
  const labels = {
    QRIS: "QRIS",
    BCA: "BCA Virtual Account",
    BCA_VA: "BCA Virtual Account",
    BNI: "BNI Virtual Account",
    BNI_VA: "BNI Virtual Account",
    BRI: "BRI Virtual Account",
    BRI_VA: "BRI Virtual Account",
    MANDIRI: "Mandiri Virtual Account",
    MANDIRI_VA: "Mandiri Virtual Account",
    OVO: "OVO",
    DANA: "DANA",
    SHOPEEPAY: "ShopeePay",
    ALFAMART: "Alfamart",
 };
  return labels[String(channel).toUpperCase()] || channel;
}

// ─── Status ────────────────────────────────────────────────────────────────────

const resolvedStatusProps = computed(() => {
  if (props.statusProps) return props.statusProps;

  const raw = String(props.order.status || props.order.order_status || "").toLowerCase();
  const ps = String(props.order.payment_status || "").toUpperCase();

  // Payment-related statuses
  if (raw === "pending" && !isCod.value && ps !== "PAID") {
    return { variant: "payment", status: "pending", label: "Menunggu Pembayaran", size: "sm", showIcon: true };
  }
  if (raw === "pending" || raw === "menunggu_konfirmasi_merchant") {
    return { variant: "order", status: "pending", label: "Menunggu Konfirmasi", size: "sm", showIcon: true };
  }
  if (raw === "diterima" || raw === "accepted" || raw === "responsed") {
    return { variant: "order", status: "processing", label: "Diterima", size: "sm", showIcon: true };
  }
  if (raw === "layanan_dikerjakan" || raw === "dikerjakan" || raw === "processing") {
    return { variant: "order", status: "processing", label: "Dikerjakan", size: "sm", showIcon: true };
  }
  if (raw === "menunggu_konfirmasi_selesai" || raw === "menunggu_selesai") {
    return { variant: "order", status: "processing", label: "Menunggu Selesai", size: "sm", showIcon: true };
  }
  if (raw === "selesai" || raw === "completed") {
    return { variant: "order", status: "completed", size: "sm", showIcon: true };
  }
  if (raw === "ditolak" || raw === "rejected") {
    return { variant: "order", status: "cancelled", label: "Ditolak", size: "sm", showIcon: true };
  }
  if (raw === "dibatalkan" || raw === "cancelled") {
    return { variant: "order", status: "cancelled", label: "Dibatalkan", size: "sm", showIcon: true };
  }
  return { variant: "order", status: "pending", label: raw.replace(/_/g, " "), size: "sm", showIcon: true };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}
</script>
