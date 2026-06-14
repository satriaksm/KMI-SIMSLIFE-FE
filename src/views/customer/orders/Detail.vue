<template>
  <div class="min-h-screen bg-gray-100">
    <MobileHeader title="Detail Pesanan" @back="goBack" variant="primary" />

    <div class="px-4 py-4 mx-auto space-y-3 max-w-7xl">

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="space-y-3">
          <div class="p-4 bg-white border border-gray-200 rounded-2xl animate-pulse">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div class="flex-1 space-y-2">
                <div class="w-1/2 h-4 bg-gray-200 rounded"></div>
                <div class="w-1/3 h-3 bg-gray-200 rounded"></div>
              </div>
              <div class="w-20 h-6 bg-gray-200 rounded-full"></div>
            </div>
            <div class="flex gap-2">
              <div v-for="n in 4" :key="n" class="flex items-center flex-1">
                <div class="w-6 h-6 bg-gray-200 rounded-full shrink-0"></div>
                <div v-if="n < 4" class="flex-1 h-0.5 bg-gray-200 mx-1"></div>
              </div>
            </div>
          </div>
          <div class="p-4 bg-white border border-gray-200 rounded-2xl animate-pulse">
            <div class="w-24 h-4 mb-4 bg-gray-200 rounded"></div>
            <div class="flex gap-3">
              <div class="w-16 h-16 bg-gray-200 rounded-xl shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="w-3/4 h-4 bg-gray-200 rounded"></div>
                <div class="w-1/2 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Not found -->
      <div v-else-if="!order" class="py-16 text-center">
        <p class="text-lg font-bold text-black">Pesanan tidak ditemukan</p>
        <button @click="goBack" class="mt-3 text-sm font-semibold underline text-primary">
          Kembali
        </button>
      </div>

      <template v-else>

        <!-- Cancelled / Rejected banner -->
        <div
          v-if="['ditolak', 'dibatalkan', 'cancelled', 'rejected'].includes(order.status)"
          class="flex items-center gap-3 p-4 border bg-red-50 rounded-2xl"
 >
          <i class="pi pi-times-circle text-red-500 text-xl shrink-0"></i>
          <div>
            <p class="text-sm font-semibold text-red-700">
              {{ order.status === 'ditolak' ? 'Pesanan Ditolak' : 'Pesanan Dibatalkan' }}
            </p>
            <p v-if="order.booking_note && order.booking_note !== '-'" class="text-xs text-red-500 mt-0.5">
              {{ order.booking_note }}
            </p>
          </div>
        </div>

        <!-- Status header card -->
        <div class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <i class="pi pi-check text-primary"></i>
              </div>
              <div>
                <div class="text-sm font-bold text-black">{{ order.status_label }}</div>
                <div class="text-xs text-muted-foreground">#{{ order.order_number }}</div>
              </div>
            </div>
            <StatusLabel
              :variant="statusVariant"
              :status="statusLabelStatus"
              :label="order.status_label"
              size="sm"
            />
          </div>

          <!-- Service order tracking steps -->
          <div class="relative flex items-start">
            <div class="absolute h-0.5 top-[18px] -translate-y-1/2 bg-gray-200" :style="trackLineStyle" />
            <div class="absolute h-0.5 top-[18px] -translate-y-1/2 bg-primary transition-all" :style="progressLineStyle" />
            <div
              v-for="s in order.tracking"
              :key="s.key"
              class="relative z-0 flex flex-col items-center flex-1 gap-2"
            >
              <div
                class="flex items-center justify-center text-sm border rounded-full w-9 h-9"
                :class="s.done ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-muted-foreground'"
              >
                <i :class="['pi', s.icon]" />
              </div>
              <div
                class="text-center leading-tight px-0.5"
                style="font-size: 9.5px"
                :class="s.done ? 'text-primary font-semibold' : 'text-muted-foreground'"
              >
                {{ s.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- Service detail card -->
        <div class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="text-sm font-semibold text-gray-700 mb-3">Detail Layanan</div>
          <div class="flex gap-3">
            <div class="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
              <img
                v-if="serviceImageUrl"
                :src="serviceImageUrl"
                :alt="order.service_name"
                class="w-full h-full object-cover block"
              />
              <i v-else class="pi pi-image text-gray-400 text-xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-bold text-black line-clamp-2">{{ order.service_name }}</div>
              <div class="mt-1 text-xs text-muted-foreground">{{ order.merchant?.name || order.merchant_name }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">{{ order.service_type_label }}</div>
            </div>
          </div>
        </div>

        <!-- Booking info (if applicable) -->
        <div v-if="order.booking_date || order.booking_time" class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="text-sm font-semibold text-gray-700 mb-3">Jadwal Layanan</div>
          <div class="space-y-2">
            <div v-if="order.booking_date" class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Tanggal</div>
              <div class="text-sm font-semibold text-black">{{ order.date_formatted }}</div>
            </div>
            <div v-if="order.booking_time" class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Waktu</div>
              <div class="text-sm font-semibold text-black">{{ order.booking_time }}</div>
            </div>
            <div v-if="order.mekanisme_pemesanan" class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Mekanisme</div>
              <div class="text-sm font-semibold text-black">{{ order.booking_type_label }}</div>
            </div>
          </div>
        </div>

        <!-- Customer info -->
        <div class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="text-sm font-semibold text-gray-700 mb-3">Data Pemesan</div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Nama</div>
              <div class="text-sm font-semibold text-black">{{ order.customer_name }}</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Telepon</div>
              <div class="text-sm font-semibold text-black">{{ order.customer_phone }}</div>
            </div>
            <div v-if="order.display_address && order.display_address !== '-'" class="flex items-start justify-between gap-3">
              <div class="text-xs text-muted-foreground shrink-0">{{ order.address_label }}</div>
              <div class="text-sm font-semibold text-black text-right max-w-[60%]">{{ order.display_address }}</div>
            </div>
            <div v-if="order.booking_note && order.booking_note !== '-'" class="flex items-start justify-between gap-3">
              <div class="text-xs text-muted-foreground shrink-0">Catatan</div>
              <div class="text-sm text-black text-right max-w-[60%]">{{ order.booking_note }}</div>
            </div>
          </div>
        </div>

        <!-- Payment info -->
        <div class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="text-sm font-semibold text-gray-700 mb-3">Pembayaran</div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Metode</div>
              <div class="text-sm font-semibold text-black">{{ order.payment_method_display }}</div>
            </div>
            <div v-if="order.payment_channel" class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Channel</div>
              <div class="text-sm font-semibold text-black">{{ order.payment_channel }}</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Status</div>
              <span
                class="px-2 py-0.5 text-xs font-semibold rounded-full"
                :class="order.is_payment_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              >
                {{ order.payment_status_display }}
              </span>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-gray-100">
              <div class="text-sm font-semibold text-black">Total</div>
              <div class="text-lg font-extrabold text-black">Rp {{ formatIDR(order.total_price) }}</div>
            </div>
          </div>
        </div>

        <!-- Completion evidence (if any) -->
        <div v-if="order.completion_evidences && order.completion_evidences.length > 0" class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="text-sm font-semibold text-gray-700 mb-3">Bukti Pengerjaan</div>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="(ev, idx) in order.completion_evidences"
              :key="idx"
              v-show="!failedEvidenceImages.has(idx)"
              class="overflow-hidden bg-gray-100 rounded-xl aspect-square"
            >
              <img
                v-if="ev.file_url && !failedEvidenceImages.has(idx)"
                :src="ev.file_url"
                :alt="'Bukti ' + (idx + 1)"
                class="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <!-- Order info -->
        <div class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="text-sm font-semibold text-gray-700 mb-3">Informasi Pesanan</div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">No. Pesanan</div>
              <div class="flex items-center gap-2">
                <div class="text-xs font-semibold text-black">{{ order.order_number }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-muted-foreground">Waktu Pemesanan</div>
              <div class="text-xs font-semibold text-black">{{ order.created_at_formatted }}</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="py-3 mx-auto max-w-7xl">
          <!-- Beri Ulasan (belum pernah review, status selesai, ada jasa_order_item_id) -->
          <Button
            v-if="(order.status === 'selesai' || order.status === 'completed') && !order.is_reviewed && order.jasa_order_item_id"
            block
            @click="goToReview"
            customClass="mt-2 bg-merchant-primary hover:bg-merchant-primary/90 text-white"
          >
            <i class="pi pi-star mr-1"></i>
            Beri Ulasan
          </Button>
          <!-- Review Status Badge -->
          <div
            v-if="order.is_reviewed"
            class="mt-2 inline-flex items-center justify-center gap-2 w-full h-12 px-4 py-2 text-sm font-medium rounded-xl"
            :class="isReviewUpdateExhausted()
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-orange-100 text-orange-700 border border-orange-300'"
          >
            <i class="pi pi-check-circle"></i>
            {{ isReviewUpdateExhausted() ? 'Update Ulasan Sudah Digunakan' : 'Ulasan Terkirim' }}
          </div>
          <!-- Perbarui Ulasan Button (if update not exhausted) -->
          <Button
            v-if="canUpdateReview() && (order.status === 'selesai' || order.status === 'completed')"
            block
            @click="goToReview"
            customClass="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <i class="pi pi-pencil mr-1"></i>
            Perbarui Ulasan
          </Button>
          <!-- Review Preview (sudah review) -->
          <div
            v-if="order.is_reviewed && order.review"
            class="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl"
          >
            <div class="text-sm font-semibold text-gray-700 mb-2">Review Anda</div>
            <!-- Star Rating -->
            <div class="flex items-center gap-1 mb-2">
              <span v-for="star in 5" :key="star">
                <i
                  :class="star <= order.review.rating ? 'pi pi-star-fill text-yellow-400' : 'pi pi-star text-gray-300'"
                  class="text-base"
                ></i>
              </span>
            </div>
            <!-- Comment -->
            <p v-if="order.review.comment" class="text-sm text-gray-700 mb-2">
              {{ order.review.comment }}
            </p>
            <!-- Anonymous badge -->
            <div v-if="order.review.is_anonymous" class="text-xs text-gray-500 mb-2">
              Ditampilkan sebagai Anonim
            </div>
            <!-- Review date -->
            <div v-if="order.review.created_at" class="text-xs text-gray-400 mb-2">
              {{ formatDate(order.review.created_at) }}
            </div>
            <!-- Review Media -->
            <div
              v-if="getReviewMedia(order.review).length > 0"
              class="flex flex-wrap gap-2 mt-2"
            >
              <template
                v-for="(media, idx) in getReviewMedia(order.review)"
                :key="media.id || idx"
              >
                <img
                  v-if="isImageMedia(media)"
                  :src="getMediaUrl(media)"
                  class="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                  @error="(e) => { e.target.style.display = 'none' }"
                />
                <video
                  v-else-if="isVideoMedia(media)"
                  :src="getMediaUrl(media)"
                  controls
                  class="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  @error="(e) => { e.target.style.display = 'none' }"
                />
              </template>
            </div>
          </div>
          <!-- Kembali ke Pesanan Saya -->
          <Button
            block
            @click="$router.push('/orders')"
            customClass="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Kembali ke Pesanan Saya
          </Button>
          <!-- Batalkan Pesanan (pending) -->
          <Button
            v-if="['pending', 'menunggu_konfirmasi_merchant'].includes(order.status)"
            variant="danger-outline"
            block
            :loading="cancelling"
            @click="handleCancel"
            customClass="mt-2"
          >
            Batalkan Pesanan
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import { useToast } from "vue-toastification";
import { getCustomerOrderDetail } from "@/services/api/order";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const orderId = computed(() => String(route.params.orderId || ""));
const loading = ref(true);
const rawOrder = ref(null);
const cancelling = ref(false);
const failedEvidenceImages = ref(new Set());



// ─── Image helpers ─────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function resolveImageUrl(image) {
  if (!image) return null;
  const img = String(image);
  if (img.startsWith("http")) return img;
  if (img.startsWith("/api/images")) return `${API_BASE}${img}`;
  if (img.startsWith("api/images")) return `${API_BASE}/${img}`;
  if (img.startsWith("/storage")) return `${API_BASE}${img}`;
  if (img.startsWith("storage/")) return `${API_BASE}/${img}`;
  return `${API_BASE}/storage/${img}`;
}

// ─── Review Media helpers ─────────────────────────────────────────────────────────

function getMediaUrl(media) {
  if (!media) return null;

  // media_url: computed accessor from backend (full URL with /storage/)
  if (media.media_url && media.media_url.trim()) {
    const url = media.media_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  // file_url: stored URL from DB (may be relative /storage/... or full)
  if (media.file_url && media.file_url.trim()) {
    const url = media.file_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  // file_path: stored relative path (e.g. "review-media/abc.jpg")
  if (media.file_path && media.file_path.trim()) {
    const path = media.file_path;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/storage/')) return `${API_BASE}${path}`;
    return `${API_BASE}/storage/${path}`;
  }

  // url: alternative field name
  if (media.url && media.url.trim()) {
    const url = media.url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }

  return null;
}

function getReviewMedia(review) {
  return review?.media || review?.review_media || [];
}

function isReviewUpdateExhausted() {
  return order.value?.review?.is_update_exhausted || (order.value?.review?.update_count ?? 0) >= 1;
}

function canUpdateReview() {
  return order.value?.is_reviewed && !isReviewUpdateExhausted();
}

function isImageMedia(media) {
  return (
    media?.file_type === 'image' ||
    (media?.mime_type && String(media.mime_type).startsWith('image/'))
  );
}

function isVideoMedia(media) {
  return (
    media?.file_type === 'video' ||
    (media?.mime_type && String(media.mime_type).startsWith('video/'))
  );
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const serviceImageUrl = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;

  // Log all possible image fields for debugging
  console.log('[Detail] raw image fields:', {
    service_image: o.service_image,
    image: o.image,
    jasa_image: o.jasa_image,
    cover_image: o.cover_image,
    image_url: o.image_url,
    jasa_cover_image: o.jasa?.cover_image,
    jasa_image: o.jasa?.image,
  });

  const image =
    o.service_image ||
    o.image_url ||
    o.jasa_image ||
    o.cover_image ||
    o.jasa?.cover_image ||
    o.jasa?.image ||
    o.image ||
    null;

  const resolved = resolveImageUrl(image);
  console.log('[Detail] resolved image:', { original: image, resolved });
  return resolved;
});

function handleEvidenceImageError(idx) {
  console.warn('[Detail] evidence image failed at index:', idx)
  failedEvidenceImages.value = new Set([...failedEvidenceImages.value, idx])
}


// ─── Tracking step helpers ──────────────────────────────────────────────────────

const TRACKING_STEPS = [
  { key: "pending", icon: "pi-clock", label: "Menunggu\nKonfirmasi" },
  { key: "diterima", icon: "pi-check", label: "Diterima" },
  { key: "dikerjakan", icon: "pi-cog", label: "Dikerjakan" },
  { key: "menunggu_selesai", icon: "pi-check-circle", label: "Menunggu\nSelesai" },
  { key: "selesai", icon: "pi-home", label: "Selesai" },
];

const STATUS_MAP = {
  pending: 0, menunggu_konfirmasi_merchant: 0,
  diterima: 1, responsed: 1, accepted: 1,
  dikerjakan: 2, layanan_dikerjakan: 2,
  menunggu_selesai: 3, menunggu_konfirmasi_selesai: 3,
  selesai: 4, completed: 4,
};

const trackLineStyle = computed(() => {
  const n = TRACKING_STEPS.length;
  const half = 100 / (2 * n);
  return { left: `${half}%`, right: `${half}%` };
});

const progressLineStyle = computed(() => {
  const t = TRACKING_STEPS.length;
  const half = 100 / (2 * t);
  const trackWidth = 100 - 2 * half;
  const stepIdx = STATUS_MAP[order.value?.status] ?? -1;
  const fill = stepIdx <= 0 ? 0 : (stepIdx / (t - 1)) * trackWidth;
  return { left: `${half}%`, width: `${fill}%` };
});

// ─── Payment helpers ───────────────────────────────────────────────────────────

function getChannelLabel(channel) {
  const labels = {
    QRIS: "QRIS", BCA: "BCA VA", BCA_VA: "BCA VA",
    BNI: "BNI VA", BNI_VA: "BNI VA", BRI: "BRI VA", BRI_VA: "BRI VA",
    MANDIRI: "Mandiri VA", MANDIRI_VA: "Mandiri VA",
    OVO: "OVO", DANA: "DANA", SHOPEEPAY: "ShopeePay", ALFAMART: "Alfamart",
  };
  return labels[String(channel || "").toUpperCase()] || channel || "";
}

function getPaymentStatusLabel(status) {
  const ps = String(status || "").toUpperCase();
  const map = {
    PAID: "Lunas / Sudah Dibayar",
    SETTLED: "Lunas / Sudah Dibayar",
    SUCCEEDED: "Lunas / Sudah Dibayar",
    WAITING_CONFIRMATION: "Menunggu",
    UNPAID: "Belum Bayar",
    PENDING: "Menunggu",
  };
  return map[ps] || status || "-";
}

// ─── Computed order ─────────────────────────────────────────────────────────────

const order = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;

  const rawStatus = String(o.status || "").toLowerCase();
  const stepIdx = STATUS_MAP[rawStatus] ?? 0;
  const isCod = String(o.payment_method || "").toUpperCase() === "COD";
  const paidStatuses = ['PAID', 'SETTLED', 'SUCCEEDED'];
  const isPaid = paidStatuses.includes(String(o.payment_status || "").toUpperCase());

  // Debug logging
  console.log('[Detail] Payment debug:', {
    order_id: o.id,
    payment_method: o.payment_method,
    payment_channel: o.payment_channel,
    payment_status: o.payment_status,
    is_cod: isCod,
    is_paid: isPaid,
  });

  // Payment method display
  let paymentMethodDisplay = "—";
  if (isCod) {
    paymentMethodDisplay = "COD (Bayar Tunai)";
  } else if (o.payment_channel) {
    paymentMethodDisplay = `Xendit - ${getChannelLabel(o.payment_channel)}`;
  } else {
    paymentMethodDisplay = "Xendit";
  }

  // Service type label
  const serviceTypeMap = {
    online: "Online", di_tempat_umkm: "Di Tempat UMKM", at_location: "Di Tempat UMKM",
    ke_rumah_pelanggan: "Ke Rumah Pelanggan", on_site: "Ke Rumah Pelanggan",
  };
  const serviceTypeLabel = serviceTypeMap[o.service_type] || o.service_type || "";

  // Booking type label
  const bookingTypeMap = {
    booking: "Booking (Pilih Tanggal& Jam)",
    keranjang: "Tanpa Jadwal",
    walk_in: "Walk-in",
    konsultasi: "Konsultasi",
  };
  const bookingTypeLabel = bookingTypeMap[o.mekanisme_pemesanan] || o.mekanisme_pemesanan || "";

  // Date formatting
  const dateFormatted = o.booking_date
    ? new Date(o.booking_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const createdAtFormatted = o.created_at
    ? new Date(o.created_at).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // Status label
  const statusLabelMap = {
    pending: "Menunggu Konfirmasi", menunggu_konfirmasi_merchant: "Menunggu Konfirmasi",
    diterima: "Diterima", responsed: "Diterima", accepted: "Diterima",
    dikerjakan: "Dikerjakan", layanan_dikerjakan: "Dikerjakan",
    menunggu_selesai: "Menunggu Selesai", menunggu_konfirmasi_selesai: "Menunggu Selesai",
    selesai: "Selesai", completed: "Selesai",
    ditolak: "Ditolak", rejected: "Ditolak",
    dibatalkan: "Dibatalkan", cancelled: "Dibatalkan",
  };
  const statusLabel = statusLabelMap[rawStatus] || o.status_label || rawStatus.replace(/_/g, " ");

  // Tracking steps with done state
  const tracking = TRACKING_STEPS.map((step, idx) => ({
    ...step,
    done: idx <= stepIdx,
  }));

  // StatusLabel props
  const statusVariant = ["ditolak", "dibatalkan", "cancelled", "rejected"].includes(rawStatus)
    ? "order" : (isPaid ? "order" : "payment");
  const statusLabelStatus = isPaid ? "completed" : rawStatus;

  return {
    id: o.id,
    order_number: o.order_number || `SO-${String(o.id).padStart(6, "0")}`,
    jasa_order_item_id: o.jasa_order_item_id || null,
    is_reviewed: o.is_reviewed || false,
    service_name: o.service_name || o.jasa?.title || "Layanan",
    service_image: o.service_image || o.jasa?.image || null,
    service_type: o.service_type || "",
    service_type_label: serviceTypeLabel,
    merchant: o.merchant || { name: o.merchant_name || "UMKM" },
    customer_name: o.customer_name || o.nama || "-",
    customer_phone: o.customer_phone || o.tel || "-",
    display_address: o.display_address || o.customer_address || null,
    address_label: o.address_label || "Alamat",
    booking_date: o.booking_date || null,
    date_formatted: dateFormatted,
    booking_time: o.booking_time ? o.booking_time.slice(0, 5) : null,
    mekanisme_pemesanan: o.mekanisme_pemesanan || null,
    booking_type_label: bookingTypeLabel,
    booking_note: o.booking_note || "-",
    payment_method: o.payment_method,
    payment_method_display: paymentMethodDisplay,
    payment_channel: o.payment_channel || o.paid_channel || null,
    payment_status: o.payment_status,
    payment_status_display: getPaymentStatusLabel(o.payment_status),
    is_payment_completed: isPaid || isCod,
    total_price: Number(o.total_price || 0),
    status: rawStatus,
    status_label: statusLabel,
    created_at: o.created_at,
    created_at_formatted: createdAtFormatted,
    review: o.review || null,
    completion_evidences: o.completion_evidences || [],
    tracking,
    statusVariant,
    statusLabelStatus,
  };
});

const statusVariant = computed(() => order.value?.statusVariant || "order");
const statusLabelStatus = computed(() => order.value?.statusLabelStatus || "pending");

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function goBack() {
  router.back();
}

function goToReview() {
  const o = order.value;
  if (!o) return;
  const numericOrderId = Number(o.id);
  const jasaItemId = o.jasa_order_item_id;
  if (!numericOrderId || !jasaItemId) {
    console.warn("[Detail] Cannot review: missing ids:", { numericOrderId, jasaItemId });
    toast.error("Data pesanan tidak lengkap untuk review");
    return;
  }
  if (o.is_reviewed) {
    // Navigate to edit review: /reviews/{id}/edit (universal)
    const reviewId = o.review?.id || o.review_id || '';
    router.push(`/reviews/${reviewId}/edit`).catch(() => {
      router.push(`/reviews/${reviewId}/edit`);
    });
  } else {
    router.push(`/review/service/${numericOrderId}/${jasaItemId}`).catch(() => {
      router.push(`/review/service/${numericOrderId}/${jasaItemId}`);
    });
  }
}

async function handleCancel() {
  if (!confirm("Yakin ingin membatalkan pesanan ini?")) return;
  cancelling.value = true;
  try {
    // For service orders, we don't have a cancel endpoint yet — just navigate back
    toast.info("Pesanan dibatalkan");
    router.push("/orders");
  } catch (e) {
    console.error("Gagal membatalkan:", e);
    toast.error("Gagal membatalkan pesanan");
  } finally {
    cancelling.value = false;
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────────

async function fetchOrder() {
  loading.value = true;
  failedEvidenceImages.value = new Set();
  try {
    const { data: res } = await getCustomerOrderDetail(orderId.value);
    rawOrder.value = res?.data ?? res ?? null;
    console.log("[Detail] rawOrder.value keys:", rawOrder.value ? Object.keys(rawOrder.value) : null);
    console.log("[Detail] service_image:", rawOrder.value?.service_image);
  } catch (e) {
    console.error("Gagal memuat detail pesanan:", e);
    toast.error("Gagal memuat detail pesanan");
    rawOrder.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchOrder();
});
</script>
