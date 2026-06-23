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
              {{ order.status === 'ditolak' ? 'Pesanan Ditolak Merchant' : 'Pesanan Dibatalkan' }}
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

        <!-- SLA Countdown: menunggu_konfirmasi -->
        <div
          v-if="order.status === 'menunggu_konfirmasi' || order.status === 'menunggu_konfirmasi_merchant'"
          class="p-3 bg-orange-50 border border-orange-200 rounded-2xl"
        >
          <div class="flex items-center gap-2 text-sm text-orange-700">
            <i class="pi pi-clock shrink-0"></i>
            <div>
              <span class="font-semibold">Sisa waktu respon merchant: {{ merchantDeadlineRemaining }}</span>
            </div>
          </div>
          <p class="mt-1 text-xs text-orange-500">Merchant wajib merespon dalam 1x24 jam.</p>
        </div>

        <!-- SLA Countdown: menunggu_selesai (customer confirmation) -->
        <div
          v-if="order.status === 'menunggu_selesai' || order.status === 'menunggu_konfirmasi_selesai'"
          class="p-3 bg-orange-50 border border-orange-200 rounded-2xl"
        >
          <div class="flex items-center gap-2 text-sm text-orange-700">
            <i class="pi pi-clock shrink-0"></i>
            <div>
              <span class="font-semibold">Sisa waktu konfirmasi selesai: {{ completionDeadlineRemaining }}</span>
            </div>
          </div>
          <p class="mt-1 text-xs text-orange-500">Jika tidak dikonfirmasi dalam 1x24 jam, pesanan akan otomatis selesai.</p>
        </div>

        <!-- Expired banner -->
        <div
          v-if="order.status === 'expired' || order.status === 'kadaluarsa'"
          class="flex items-center gap-3 p-4 border bg-red-50 rounded-2xl"
        >
          <i class="pi pi-clock text-red-500 text-xl shrink-0"></i>
          <div>
            <p class="text-sm font-semibold text-red-700">Pesanan Kadaluarsa</p>
            <p class="text-xs text-red-500">Batas waktu respon merchant telah berakhir.</p>
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

            <!-- Non-COD: selalu tampilkan fee breakdown (fee=0 tetap tampil untuk debugging) -->
            <template v-if="!order.is_cod">
              <div class="pt-2 border-t border-gray-100 space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="text-xs text-muted-foreground">Subtotal Layanan</div>
                  <div class="text-sm font-medium text-black">Rp {{ formatIDR(order.subtotal) }}</div>
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-xs text-muted-foreground">Biaya Pembayaran</div>
                  <div class="text-sm font-medium text-black">Rp {{ formatIDR(order.payment_fee) }}</div>
                </div>
                <div class="flex items-center justify-between pt-1.5 border-t border-gray-100">
                  <div class="text-sm font-semibold text-black">Total Pembayaran</div>
                  <div class="text-lg font-extrabold text-black">Rp {{ formatIDR(order.total_payment) }}</div>
                </div>
              </div>
            </template>

            <!-- COD: hanya total -->
            <div v-else class="flex items-center justify-between pt-2 border-t border-gray-100">
              <div class="text-sm font-semibold text-black">Total Pembayaran</div>
              <div class="text-lg font-extrabold text-black">Rp {{ formatIDR(order.total_payment) }}</div>
            </div>
          </div>
        </div>

        <!-- Bukti Penyelesaian -->
        <div v-if="['menunggu_konfirmasi_selesai', 'menunggu_selesai', 'selesai', 'completed'].includes(order.status)" class="p-4 bg-white border border-gray-200 rounded-2xl">
          <div class="text-sm font-semibold text-gray-700 mb-3">Bukti Penyelesaian</div>
          <!-- Completion note -->
          <div v-if="order.completion_note || order.jasa_order_item?.completion_note" class="mb-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <p class="text-xs text-purple-600">
              <i class="pi pi-file mr-1"></i>
              {{ order.completion_note || order.jasa_order_item?.completion_note }}
            </p>
          </div>
          <div v-if="order.completion_evidences && order.completion_evidences.length > 0" class="grid grid-cols-3 gap-2">
            <div
              v-for="(ev, idx) in order.completion_evidences"
              :key="idx"
              class="overflow-hidden bg-gray-100 rounded-xl aspect-square"
            >
              {{ console.log('[Customer Evidence render]', idx, ev) || '' }}
              <!-- Image evidence -->
              <img
                v-if="isImageMedia(ev)"
                v-show="!failedEvidenceImages.has(idx)"
                :src="getMediaUrl(ev)"
                :alt="'Bukti ' + (idx + 1)"
                class="w-full h-full object-cover cursor-pointer"
                @error="() => { console.error('[Customer Evidence image failed]', getMediaUrl(ev), ev); failedEvidenceImages.add(idx); }"
                @click="() => openEvidencePreview(ev)"
              />
              <!-- Video evidence -->
              <video
                v-else-if="isVideoMedia(ev)"
                :src="getMediaUrl(ev)"
                controls
                class="w-full h-full object-cover"
              />
              <!-- Fallback icon -->
              <div v-else class="w-full h-full flex items-center justify-center">
                <i class="pi pi-file text-gray-400 text-xl"></i>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100">
            Belum ada bukti penyelesaian.
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
          <!-- Bayar Kembali (Xendit belum dibayar) -->
          <Button
            v-if="needsPayment()"
            block
            @click="retryPayment"
            customClass="mt-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <i class="pi pi-credit-card mr-1"></i>
            Bayar Kembali
          </Button>
          <!-- Konfirmasi Selesai (merchant sudah kirim bukti pengerjaan) -->
          <Button
            v-if="order.status === 'menunggu_konfirmasi_selesai'"
            block
            :loading="confirmingSelesai"
            @click="handleKonfirmasiSelesai"
            customClass="mt-2 bg-green-500 hover:bg-green-600 text-white"
          >
            <i class="pi pi-check-circle mr-1"></i>
            Konfirmasi Selesai
          </Button>
          <!-- Beri Ulasan (belum pernah review) -->
          <Button
            v-if="order.can_review"
            block
            @click="goToReview"
            customClass="mt-2 bg-merchant-primary hover:bg-merchant-primary/90 text-white"
          >
            <i class="pi pi-star mr-1"></i>
            Beri Rating dan Ulasan
          </Button>
          <!-- Perbarui Rating dan Ulasan (sudah review, masih boleh update) -->
          <Button
            v-if="order.is_reviewed && order.can_update_review"
            block
            @click="goToReview"
            customClass="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
          >
            <i class="pi pi-pencil mr-1"></i>
            Perbarui Rating dan Ulasan
          </Button>
          <!-- Ulasan sudah diperbarui (sudah review, tidak boleh update lagi) -->
          <div
            v-if="order.is_reviewed && !order.can_update_review"
            class="mt-2 inline-flex items-center justify-center gap-2 w-full h-12 px-4 py-2 text-sm font-medium rounded-xl bg-green-100 text-green-700 border border-green-300 cursor-default"
          >
            <i class="pi pi-check-circle"></i>
            Ulasan sudah diperbarui
          </div>
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

          <!-- Merchant Reply Section -->
          <div
            v-if="order.review && order.review.merchant_reply"
            class="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl"
          >
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <i class="pi pi-building text-white text-xs"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-green-800">Tanggapan Merchant</p>
                <p class="text-xs text-green-600">
                  {{ order.merchant?.name || order.merchant_name }}
                </p>
              </div>
            </div>
            <p class="text-sm text-gray-700 whitespace-pre-wrap pl-10">
              {{ order.review.merchant_reply }}
            </p>
            <p v-if="order.review.merchant_reply_at" class="text-xs text-gray-400 mt-2 pl-10">
              {{ formatDate(order.review.merchant_reply_at) }} {{ formatTime(order.review.merchant_reply_at) }}
            </p>
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
import { getCustomerOrderDetail, cancelJasaOrder, confirmJasaOrder } from "@/services/api/order";
import api from "@/libs/axios";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const orderId = computed(() => String(route.params.orderId || ""));
const loading = ref(true);
const rawOrder = ref(null);
const cancelling = ref(false);
const confirmingSelesai = ref(false);
const failedEvidenceImages = ref(new Set());

// ─── SLA Countdown helpers ──────────────────────────────────────────────────

function formatCountdown(deadline) {
  if (!deadline) return '00:00';
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  if (diff <= 0) return '00:00';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  return `${minutes}m`;
}

const merchantDeadlineRemaining = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;
  if (o.status !== 'menunggu_konfirmasi' && o.status !== 'menunggu_konfirmasi_merchant') return null;
  if (!o.merchant_response_deadline) return null;
  // Jika deadline sudah lewat, tampilkan null (tidak menampilkan countdown 00:00)
  // Status akan otomatis berubah menjadi expired oleh backend/API
  const deadline = new Date(o.merchant_response_deadline);
  if (deadline <= new Date()) return null;
  return formatCountdown(o.merchant_response_deadline);
});

const completionDeadlineRemaining = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;
  if (o.status !== 'menunggu_selesai' && o.status !== 'menunggu_konfirmasi_selesai') return null;
  if (!o.completion_deadline_at) return null;
  return formatCountdown(o.completion_deadline_at);
});



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
  return !order.value?.can_update_review;
}

function canUpdateReview() {
  return order.value?.is_reviewed && order.value?.can_update_review;
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

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
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

// TRACKING_STEPS - keys must match backend orders.status values
const TRACKING_STEPS = [
  { key: "menunggu_konfirmasi_merchant", icon: "pi-clock", label: "Menunggu\nKonfirmasi" },
  { key: "diterima", icon: "pi-check", label: "Diterima" },
  { key: "layanan_dikerjakan", icon: "pi-cog", label: "Sedang\nDikerjakan" },
  { key: "menunggu_konfirmasi_selesai", icon: "pi-check-circle", label: "Menunggu\nSelesai" },
  { key: "selesai", icon: "pi-home", label: "Selesai" },
];

// STATUS_MAP - maps status values to step index (0-based)
const STATUS_MAP = {
  // Step 0: Menunggu Konfirmasi
  pending: 0, menunggu_konfirmasi_merchant: 0,

  // Step 1: Diterima
  diterima: 1, accepted: 1, responsed: 1,

  // Step 2: Sedang Dikerjakan
  layanan_dikerjakan: 2, dikerjakan: 2, processing: 2, in_progress: 2,

  // Step 3: Menunggu Konfirmasi Selesai
  menunggu_konfirmasi_selesai: 3, menunggu_selesai: 3,

  // Step 4: Selesai
  selesai: 4, completed: 4,

  // Rejected/Cancelled/Expired — no progress bar fill, shown as terminal state
  ditolak: -1, rejected: -1, dibatalkan: -1, cancelled: -1, batal: -1,
  expired: -1, kadaluarsa: -1,
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

// ========================
// PAYMENT STATUS HELPER
// ========================

/**
 * Format payment status to user-friendly label (case-insensitive)
 */
function formatPaymentStatus(status) {
  const value = String(status || '').toLowerCase().trim();

  if (['paid', 'lunas', 'settled', 'success'].includes(value)) {
    return 'Sudah Bayar';
  }
  if (['unpaid', 'pending', 'waiting', 'menunggu_pembayaran', 'menunggu'].includes(value)) {
    return 'Menunggu Pembayaran';
  }
  if (['expired', 'kadaluarsa'].includes(value)) {
    return 'Kadaluarsa';
  }
  if (['failed', 'gagal'].includes(value)) {
    return 'Gagal';
  }
  if (['waiting_confirmation', 'menunggu_konfirmasi'].includes(value)) {
    return 'Menunggu Konfirmasi';
  }

  return 'Menunggu Pembayaran';
}

/**
 * @deprecated Use formatPaymentStatus() instead
 */
function getPaymentStatusLabel(status) {
  return formatPaymentStatus(status);
}

// ─── Computed order ─────────────────────────────────────────────────────────────

const order = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;

  // Priority: status (from orders.status - PRIMARY) > service_status (backward compat) > order_status
  // Backend now uses orders.status as source of truth
  const rawStatus = String(o.status || o.service_status || o.order_status || "").toLowerCase();
  const stepIdx = STATUS_MAP[rawStatus] ?? 0;
  const isCod = String(o.payment_method || "").toUpperCase() === "COD";
  const paidStatuses = ['PAID', 'SETTLED', 'SUCCEEDED'];
  const isPaid = paidStatuses.includes(String(o.payment_status || "").toUpperCase());

  // Debug logging for status synchronization
  console.log('[Detail] CUSTOMER ORDER STATUS:', {
    order_id: o.id,
    status: o.status, // PRIMARY: from orders.status
    service_status: o.service_status, // backward compat
    order_status: o.order_status,
    rawStatus,
    stepIdx,
  });

  // Debug logging for payment
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
    paymentMethodDisplay = "COD - Bayar di Tempat";
  } else if (o.payment_channel) {
    paymentMethodDisplay = `Xendit - ${getChannelLabel(o.payment_channel)}`;
  } else {
    paymentMethodDisplay = `Xendit - ${formatPaymentStatus(o.payment_status)}`;
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

  // Status label - MUST match the backend getServiceStatusLabel() output
  const statusLabelMap = {
    // Service order statuses
    menunggu_konfirmasi_merchant: "Menunggu Konfirmasi",
    pending: "Menunggu Konfirmasi",
    diterima: "Diterima",
    accepted: "Diterima",
    responsed: "Diterima",
    layanan_dikerjakan: "Sedang Dikerjakan",
    dikerjakan: "Sedang Dikerjakan",
    processing: "Sedang Dikerjakan",
    menunggu_konfirmasi_selesai: "Menunggu Konfirmasi Selesai",
    menunggu_selesai: "Menunggu Konfirmasi Selesai",
    selesai: "Selesai",
    completed: "Selesai",
    // Customer context: merchant rejected → label shows who did it
    ditolak: "Ditolak Merchant",
    rejected: "Ditolak Merchant",
    dibatalkan: "Dibatalkan",
    cancelled: "Dibatalkan",
    batal: "Dibatalkan",
    expired: "Kadaluarsa",
    kadaluarsa: "Kadaluarsa",
  };
  const statusLabel = statusLabelMap[rawStatus] || o.status_label || rawStatus.replace(/_/g, " ");

  // Tracking steps with done state
  const tracking = TRACKING_STEPS.map((step, idx) => ({
    ...step,
    done: idx <= stepIdx,
  }));

  // StatusLabel props - determine variant and status for the badge
  // For order statuses (not payment), always show as order variant
  const orderStatusKeys = [
    'diterima', 'accepted', 'responsed',
    'layanan_dikerjakan', 'dikerjakan', 'processing',
    'menunggu_konfirmasi_selesai', 'menunggu_selesai',
    'selesai', 'completed',
    'ditolak', 'rejected',
    'dibatalkan', 'cancelled',
    'expired', 'kadaluarsa',
  ];
  const isOrderStatus = orderStatusKeys.includes(rawStatus) || rawStatus.startsWith('diterima') || rawStatus.startsWith('selesai');

  // StatusLabel variant: order for completed/rejected orders, payment for pending payments
  const statusVariant = isOrderStatus ? "order" : (isPaid ? "order" : "payment");

  // StatusLabel status: for pending payment, show "pending"; otherwise show the raw status
  const statusLabelStatus = (!isOrderStatus && !isPaid) ? "pending" : (isPaid ? "completed" : rawStatus);

  return {
    id: o.id,
    order_number: o.order_number || `SO-${String(o.id).padStart(6, "0")}`,
    jasa_order_item_id: o.jasa_order_item_id || null,
    is_reviewed: o.is_reviewed || false,
    can_review: o.can_review || false,
    can_update_review: o.can_update_review || false,
    service_name: o.service_name || o.jasa?.title || "Layanan",
    service_image: o.service_image || o.jasa?.image || null,
    service_type: o.service_type || "",
    service_type_label: o.service_type_label || serviceTypeLabel,
    service_location_address: o.service_location_address || null,
    category_name: o.category_name || null,
    merchant: o.merchant || { name: o.merchant_name || "UMKM" },
    customer_name: o.customer_name || o.nama || "-",
    customer_phone: o.customer_phone || o.tel || "-",
    display_address: o.display_address || o.customer_address || null,
    address_label: o.address_label || "Alamat",
    booking_date: o.booking_date || null,
    date_formatted: dateFormatted,
    booking_time: o.booking_time ? o.booking_time.slice(0, 5) : null,
    mekanisme_pemesanan: o.mekanisme_pemesanan || o.cara_pemesanan || null,
    cara_pemesanan_label: o.cara_pemesanan_label || bookingTypeLabel,
    booking_type_label: bookingTypeLabel,
    booking_note: o.booking_note || "-",
    payment_method: o.payment_method,
    payment_method_display: paymentMethodDisplay,
    payment_channel: o.payment_channel || o.paid_channel || null,
    payment_status: o.payment_status,
    // Fee breakdown
    subtotal: Number(o.subtotal ?? o.total_price ?? 0),
    platform_fee: Number(o.platform_fee ?? 0),
    payment_fee: Number(o.payment_fee ?? 0),
    is_cod: isCod,
    total_payment: Number(o.total_payment ?? o.total_price ?? 0),
    payment_channel: o.payment_channel || null,
    // COD: payment is complete when the order status is not pending/unpaid
    // Xendit: payment is complete when payment_status is paid/settled
    payment_status_display: isCod
      ? (['selesai', 'ditolak', 'dibatalkan', 'expired'].includes(rawStatus) ? 'Dibayar di Tempat' : 'COD - Menunggu Bayar')
      : getPaymentStatusLabel(o.payment_status),
    is_payment_completed: isPaid || (isCod && ['selesai', 'ditolak', 'dibatalkan', 'expired'].includes(rawStatus)),
    total_price: Number(o.total_price || 0),
    status: rawStatus,
    status_label: statusLabel,
    created_at: o.created_at,
    created_at_formatted: createdAtFormatted,
    review: o.review || null,
    completion_evidences:
      o.completion_evidences ||
      o.completionEvidences ||
      o.jasa_order_item?.completion_evidences ||
      o.jasaOrderItem?.completionEvidences ||
      (o.jasaItems?.[0]?.completion_evidences) ||
      (o.jasa_items?.[0]?.completion_evidences) ||
      [],
    tracking,
    statusVariant,
    statusLabelStatus,
  };
});

// Debug: log evidence data when it changes
const debugEvidences = computed(() => {
  const ev = order.value?.completion_evidences;
  console.log('[Detail] Customer evidences:', ev);
  console.log('[Detail] Evidence source rawOrder keys:', rawOrder.value ? Object.keys(rawOrder.value) : null);
  console.log('[Detail] jasaItems keys:', rawOrder.value?.jasaItems ? Object.keys(rawOrder.value.jasaItems[0] || {}) : null);
  return ev;
});

const statusVariant = computed(() => order.value?.statusVariant || "order");
const statusLabelStatus = computed(() => order.value?.statusLabelStatus || "pending");

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function evidencePreviewUrl(ev) {
  return getMediaUrl(ev);
}

function openEvidencePreview(ev) {
  const url = evidencePreviewUrl(ev);
  if (!url) return;
  window.open(url, '_blank');
}

function goBack() {
  router.push('/');
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
  const id = route.params.orderId;
  if (!id || id === 'undefined') {
    toast.error('ID pesanan tidak valid');
    return;
  }
  if (!confirm("Yakin ingin membatalkan pesanan ini?")) return;
  cancelling.value = true;
  try {
    const { data } = await cancelJasaOrder(id);

    // Update local state with cancelled status
    if (rawOrder.value) {
      rawOrder.value.status = 'dibatalkan';
      rawOrder.value.order_status = 'dibatalkan';
      rawOrder.value.status_label = 'Dibatalkan';
    }

    toast.success("Pesanan berhasil dibatalkan");
    router.push({ name: 'Pesanan Saya' });
  } catch (e) {
    console.error("Gagal membatalkan:", e);
    toast.error(e?.response?.data?.message || "Gagal membatalkan pesanan");
  } finally {
    cancelling.value = false;
  }
}

async function handleKonfirmasiSelesai() {
  const id = route.params.orderId;
  if (!id || id === 'undefined') {
    toast.error('ID pesanan tidak valid');
    return;
  }
  if (!confirm("Yakin ingin mengkonfirmasi pesanan ini sebagai selesai?")) return;
  confirmingSelesai.value = true;
  try {
    await confirmJasaOrder(id);

    // Update local state with completed status
    if (rawOrder.value) {
      rawOrder.value.status = 'selesai';
      rawOrder.value.order_status = 'selesai';
      rawOrder.value.status_label = 'Selesai';
    }

    toast.success("Pesanan berhasil dikonfirmasi selesai");
    await fetchOrder();
  } catch (e) {
    console.error("Gagal mengkonfirmasi selesai:", e);
    toast.error(e?.response?.data?.message || "Gagal mengkonfirmasi pesanan");
  } finally {
    confirmingSelesai.value = false;
  }
}

// ─── Bayar Kembali ─────────────────────────────────────────────────────

/**
 * Check if order needs payment (Xendit, unpaid)
 */
function needsPayment() {
  const o = order.value;
  if (!o) return false;

  // COD doesn't need online payment
  const method = String(o.payment_method || '').toUpperCase();
  if (method === 'COD') return false;

  // Already paid
  const ps = String(o.payment_status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED'].includes(ps)) return false;

  // Terminal statuses where payment is no longer possible
  const rawStatus = String(o.status || '').toLowerCase();
  const terminalStatuses = ['cancelled', 'dibatalkan', 'ditolak', 'expired', 'selesai', 'completed'];
  if (terminalStatuses.includes(rawStatus)) return false;

  return true;
}

/**
 * Retry payment for unpaid Xendit orders
 */
async function retryPayment() {
  const o = order.value;
  if (!o) return;

  const orderId = o.id;
  if (!orderId) {
    toast.error('ID pesanan tidak ditemukan');
    return;
  }

  console.log('[retryPayment] Starting payment retry:', {
    orderId,
    order_id: o.id,
    order_number: o.order_number || o.id,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    payment: o.payment,
    invoice_url: o.invoice_url,
    xendit_invoice_url: o.xendit_invoice_url,
  });

  try {
    // Check if we already have a valid invoice URL
    const existingInvoiceUrl = o.invoice_url || o.payment?.invoice_url || o.xendit_invoice_url;
    if (existingInvoiceUrl) {
      // Check if invoice is expired
      const expiredAt = o.payment?.expired_at || o.expired_at;
      const isExpired = expiredAt && new Date(expiredAt) < new Date();

      console.log('[retryPayment] Existing invoice check:', {
        existingInvoiceUrl,
        expiredAt,
        isExpired,
      });

      if (!isExpired) {
        // Use existing invoice URL - redirect directly
        console.log('[retryPayment] Redirecting to existing invoice:', existingInvoiceUrl);
        window.location.href = existingInvoiceUrl;
        return;
      }
    }

    // Create new invoice
    console.log('[retryPayment] Creating new invoice for order:', orderId);
    const { data } = await api.post(`/api/payments/${orderId}/invoice`);

    console.log('[retryPayment] API Response:', {
      status: data?.status,
      message: data?.message,
      invoice_url: data?.data?.invoice_url || data?.invoice_url,
      fullData: data,
    });

    const invoiceUrl = data?.data?.invoice_url || data?.invoice_url;
    if (invoiceUrl) {
      console.log('[retryPayment] Redirecting to new invoice:', invoiceUrl);
      window.location.href = invoiceUrl;
    } else {
      console.warn('[retryPayment] No invoice URL in response:', data);
      toast.error('Invoice tidak tersedia. Silakan coba lagi.');
    }
  } catch (err) {
    console.error('[retryPayment] Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal membuat invoice pembayaran.');
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────────

async function fetchOrder() {
  const id = route.params.orderId;
  if (!id || id === 'undefined' || id === 'null') {
    console.error('[Detail] Order ID tidak valid dari route.params:', route.params);
    loading.value = false;
    toast.error('ID pesanan tidak valid');
    router.replace({ name: 'Pesanan Saya' });
    return;
  }
  loading.value = true;
  failedEvidenceImages.value = new Set();
  try {
    const { data: res } = await getCustomerOrderDetail(id);
    rawOrder.value = res?.data ?? res ?? null;

    // Temporary logs (Log target 9)
    console.log('[LOG SEMENTARA - CUSTOMER DETAIL] Selected Order ID:', id);
    console.log('[LOG SEMENTARA - CUSTOMER DETAIL] Completion evidences from API:', rawOrder.value?.completion_evidences || rawOrder.value?.jasa_order_item?.completion_evidences || rawOrder.value?.jasa_items?.[0]?.completion_evidences);
    console.log('[LOG SEMENTARA - CUSTOMER DETAIL] Mapped completion evidences:', order.value?.completion_evidences);

    // Debug logging for API response
    console.log("[Detail] API Response:", rawOrder.value);
    console.log("[Detail] rawOrder.value keys:", rawOrder.value ? Object.keys(rawOrder.value) : null);
    console.log("[Detail] Status fields:", {
      status: rawOrder.value?.status,
      service_status: rawOrder.value?.service_status,
      order_status: rawOrder.value?.order_status,
      status_label: rawOrder.value?.status_label,
    });
    console.log("[Detail] service_image:", rawOrder.value?.service_image);
  } catch (e) {
    console.error("Gagal memuat detail pesanan:", e);
    console.error("Error response:", e.response?.data);
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
