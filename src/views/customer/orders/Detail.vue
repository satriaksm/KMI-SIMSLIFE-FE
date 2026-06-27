<template>
  <div class="min-h-screen bg-gray-100">
    <MobileHeader title="Detail Pesanan" @back="goBack" variant="primary" />

    <div class="px-4 py-4 mx-auto space-y-3 max-w-7xl">
      <!-- Verifying payment banner (Product only) -->
      <div
        v-if="!isJasaOrder && verifying"
        class="flex items-center gap-3 p-4 text-sm font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-2xl"
      >
        <i class="pi pi-spin pi-spinner text-blue-600 text-lg shrink-0"></i>
        <span>Mengkonfirmasi pembayaran Anda... Mohon tunggu sebentar.</span>
      </div>

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
        <!-- ========================================== -->
        <!-- JASA ORDER LAYOUT                          -->
        <!-- ========================================== -->
        <template v-if="isJasaOrder">
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
                  <div class="text-sm font-bold text-black">Status Pesanan</div>
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

            <!-- Service order tracking steps (6-step stepper) -->
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
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs text-orange-700">
                <i class="pi pi-clock shrink-0"></i>
                <span>Menunggu konfirmasi UMKM</span>
              </div>
              <span class="text-sm font-bold text-orange-700 font-mono">{{ merchantDeadlineRemaining }}</span>
            </div>
            <p class="mt-1 text-xs text-orange-500">Merchant wajib merespon dalam 60 menit. Jika terlewati, pesanan akan otomatis dibatalkan.</p>
          </div>

          <!-- SLA Countdown: menunggu_selesai (customer confirmation) -->
          <div
            v-if="order.status === 'menunggu_selesai' || order.status === 'menunggu_konfirmasi_selesai'"
            class="p-3 bg-orange-50 border border-orange-200 rounded-2xl"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs text-orange-700">
                <i class="pi pi-clock shrink-0"></i>
                <span>Menunggu konfirmasi selesai</span>
              </div>
              <span class="text-sm font-bold text-orange-700 font-mono">{{ completionDeadlineRemaining }}</span>
            </div>
            <p class="mt-1 text-xs text-orange-500">Jika tidak dikonfirmasi dalam 24 jam, pesanan akan otomatis selesai.</p>
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

          <!-- Card UMKM (Merchant info matching product style) -->
          <div class="p-4 bg-white border border-gray-200 rounded-2xl">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 overflow-hidden bg-gray-200 rounded-full shrink-0 flex items-center justify-center">
                <img
                  v-if="order.merchant?.logo_url || order.merchant?.logoUrl"
                  :src="resolveImageUrl(order.merchant?.logo_url || order.merchant?.logoUrl)"
                  class="object-cover w-full h-full"
                  alt="Merchant logo"
                />
                <i v-else class="pi pi-building text-gray-400 text-lg"></i>
              </div>
              <div class="flex-1 min-w-0 mt-0.5">
                <div class="text-xs text-muted-foreground">Penyedia Jasa</div>
                <div class="text-sm font-extrabold text-black truncate">{{ order.merchant?.name || order.merchant_name }}</div>
                <div class="text-xs text-muted-foreground mt-0.5">
                  {{ order.merchant?.primary_address?.detail || order.merchant?.address || 'Alamat tidak tersedia' }}
                </div>
                <div class="mt-2" v-if="order.merchant?.phone">
                  <a
                    :href="`https://wa.me/${String(order.merchant.phone).replace(/^0/, '62')}`"
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
          </div>

          <!-- Rincian Layanan & Ringkasan Biaya Card (matching product style) -->
          <div class="overflow-hidden bg-white border border-gray-200 rounded-2xl">
            <div class="px-4 py-3 border-b border-gray-200">
              <div class="text-base font-extrabold text-black">Rincian Layanan</div>
            </div>
            <div class="px-4 py-3 space-y-4">
              <div class="flex gap-3">
                <div class="w-12 h-12 overflow-hidden bg-gray-200 rounded-xl shrink-0 flex items-center justify-center">
                  <img
                    v-if="serviceImageUrl"
                    :src="serviceImageUrl"
                    :alt="order.service_name"
                    class="object-cover w-full h-full"
                  />
                  <i v-else class="pi pi-image text-gray-400 text-lg"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-bold leading-tight text-black">{{ order.service_name }}</div>
                  <div class="mt-1 text-xs text-muted-foreground">Kategori: {{ order.category_name || 'Layanan Jasa' }}</div>
                  <div class="mt-0.5 text-xs text-muted-foreground">Jumlah: 1x</div>
                </div>
                <div class="text-right">
                  <div class="text-xs text-muted-foreground">Rp {{ formatIDR(order.subtotal) }}</div>
                </div>
              </div>

              <div class="pt-3 space-y-2 border-t border-gray-200">
                <div class="flex items-center justify-between text-xs">
                  <div class="text-muted-foreground">Subtotal Layanan</div>
                  <div class="text-muted-foreground">Rp {{ formatIDR(order.subtotal) }}</div>
                </div>
                <div v-if="!order.is_cod && order.payment_fee > 0" class="flex items-center justify-between text-xs">
                  <div class="text-muted-foreground">Biaya Pembayaran</div>
                  <div class="text-muted-foreground">Rp {{ formatIDR(order.payment_fee) }}</div>
                </div>
                <div class="flex items-end justify-between pt-2">
                  <div class="text-xs text-muted-foreground"></div>
                  <div class="text-xl font-extrabold text-black">Rp {{ formatIDR(order.total_payment) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Pemesan Card (matching product style) -->
          <div class="p-4 bg-white border border-gray-200 rounded-2xl">
            <div class="text-sm font-semibold text-gray-700 mb-3">Data Pemesan</div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-xs text-muted-foreground">Nama Pemesan</div>
                <div class="text-sm font-semibold text-black">{{ order.customer_name }}</div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-xs text-muted-foreground">Nomor Telepon</div>
                <div class="text-sm font-semibold text-black">{{ order.customer_phone }}</div>
              </div>
            </div>
          </div>

          <!-- Informasi Pesanan Card (matching product style) -->
          <div class="overflow-hidden bg-white border border-gray-200 rounded-2xl">
            <div class="px-4 py-3 border-b border-gray-200">
              <div class="text-base font-extrabold text-black">Informasi Pesanan</div>
            </div>
            <div class="px-4 py-3 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Catatan</div>
                <div class="text-xs font-semibold text-black">{{ order.booking_note || "-" }}</div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">No. Pesanan</div>
                <div class="flex items-center gap-2">
                  <div class="text-xs font-semibold text-black">{{ order.order_number }}</div>
                  <Button variant="primary-outline" size="sm" class="!p-1.5" @click="copyOrderCode">
                    <i class="pi pi-copy text-xs" />
                  </Button>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Waktu Pemesanan</div>
                <div class="text-xs font-semibold text-black">{{ order.created_at_formatted }}</div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Pembayaran</div>
                <div class="flex items-center gap-2">
                  <div class="text-xs font-semibold text-black">{{ order.payment_method_display }}</div>
                  <span
                    class="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                    :class="order.is_payment_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                  >
                    {{ order.payment_status_display }}
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Tipe Layanan</div>
                <div class="text-xs font-semibold text-black">{{ order.service_type_label }}</div>
              </div>
              <div v-if="order.display_address && order.display_address !== '-'" class="flex items-start justify-between gap-3">
                <div class="text-xs text-muted-foreground shrink-0">{{ order.address_label }}</div>
                <div class="text-xs font-semibold text-black text-right max-w-[60%]">{{ order.display_address }}</div>
              </div>
              <div v-if="order.date_formatted || order.booking_time" class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Jadwal Layanan</div>
                <div class="text-xs font-semibold text-black text-right">
                  {{ order.date_formatted || '' }} {{ order.booking_time || '' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Bukti Penyelesaian Card -->
          <div v-if="['menunggu_konfirmasi_selesai', 'menunggu_selesai', 'selesai', 'completed'].includes(order.status)" class="p-4 bg-white border border-gray-200 rounded-2xl">
            <div class="text-sm font-semibold text-gray-700 mb-3">Bukti Penyelesaian</div>
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
                <img
                  v-if="isImageMedia(ev)"
                  v-show="!failedEvidenceImages.has(idx)"
                  :src="getMediaUrl(ev)"
                  :alt="'Bukti ' + (idx + 1)"
                  class="w-full h-full object-cover cursor-pointer"
                  @error="() => handleEvidenceImageError(idx)"
                  @click="() => openEvidencePreview(ev)"
                />
                <video
                  v-else-if="isVideoMedia(ev)"
                  :src="getMediaUrl(ev)"
                  controls
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <i class="pi pi-file text-gray-400 text-xl"></i>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100">
              Belum ada bukti penyelesaian.
            </div>
          </div>

          <!-- Jasa Actions -->
          <div class="py-3 mx-auto max-w-7xl">
            <!-- Bayar Kembali (Xendit belum dibayar) -->
            <Button
              v-if="needsPayment()"
              block
              @click="retryPayment"
              customClass="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              <i class="pi pi-credit-card mr-1"></i>
              Bayar Sekarang
            </Button>
            <!-- Kembali ke Pesanan Saya -->
            <Button
              block
              @click="$router.push('/orders')"
              customClass="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
            >
              Kembali ke Pesanan Saya
            </Button>
            <!-- Batalkan Pesanan (Jasa) -->
            <Button
              v-if="order.status === 'pending'"
              block
              :loading="cancelling"
              @click="handleCancel"
              customClass="mt-2 border border-red-500 text-red-500 hover:bg-red-50 font-semibold"
            >
              <i class="pi pi-times mr-1"></i>
              Batalkan Pesanan
            </Button>
            <!-- Konfirmasi Selesai -->
            <Button
              v-if="order.status === 'menunggu_konfirmasi_selesai' || order.status === 'menunggu_selesai'"
              block
              :loading="confirmingSelesai"
              @click="handleKonfirmasiSelesai"
              customClass="mt-2 bg-green-500 hover:bg-green-600 text-white font-semibold"
            >
              <i class="pi pi-check-circle mr-1"></i>
              Konfirmasi Selesai
            </Button>
            <!-- Beri Ulasan (belum pernah review) -->
            <Button
              v-if="order.can_review"
              block
              @click="goToReview"
              customClass="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <i class="pi pi-star mr-1"></i>
              Beri Ulasan
            </Button>
            <!-- Perbarui Rating dan Ulasan -->
            <Button
              v-if="order.is_reviewed && order.can_update_review"
              block
              @click="goToReview"
              customClass="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
            >
              <i class="pi pi-pencil mr-1"></i>
              Perbarui Rating dan Ulasan
            </Button>
            <!-- Ulasan sudah diperbarui -->
            <div
              v-if="order.is_reviewed && !order.can_update_review"
              class="mt-2 inline-flex items-center justify-center gap-2 w-full h-12 px-4 py-2 text-sm font-medium rounded-xl bg-green-100 text-green-700 border border-green-300 cursor-default"
            >
              <i class="pi pi-check-circle"></i>
              Ulasan sudah diperbarui
            </div>

            <!-- Review Preview -->
            <div
              v-if="order.is_reviewed && order.review"
              class="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl"
            >
              <div class="text-sm font-semibold text-gray-700 mb-2">Review Anda</div>
              <div class="flex items-center gap-1 mb-2">
                <span v-for="star in 5" :key="star">
                  <i
                    :class="star <= order.review.rating ? 'pi pi-star-fill text-yellow-400' : 'pi pi-star text-gray-300'"
                    class="text-base"
                  ></i>
                </span>
              </div>
              <p v-if="order.review.comment" class="text-sm text-gray-700 mb-2">
                {{ order.review.comment }}
              </p>
              <div v-if="order.review.is_anonymous" class="text-xs text-gray-500 mb-2">
                Ditampilkan sebagai Anonim
              </div>
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
          </div>
        </template>

        <!-- ========================================== -->
        <!-- PRODUCT/KULINER ORDER LAYOUT               -->
        <!-- ========================================== -->
        <template v-else>
          <!-- Cancelled banner -->
          <div
            v-if="['cancelled', 'rejected', 'undelivered'].includes(order.status)"
            class="flex flex-col gap-3 p-4 border bg-red-50 rounded-2xl mb-4"
            :class="order.status === 'undelivered' ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'"
          >
            <div class="flex items-center gap-3">
              <i class="text-xl pi shrink-0" :class="order.status === 'undelivered' ? 'pi-exclamation-triangle text-orange-500' : 'pi-times-circle text-red-500'"></i>
              <div>
                <p class="text-sm font-semibold" :class="order.status === 'undelivered' ? 'text-orange-700' : 'text-red-700'">
                  {{ order.status === 'rejected' ? 'Pesanan Ditolak Penjual' : order.status === 'undelivered' ? (order.meta.delivery_type === 'pickup' ? 'Pesanan Tidak Diambil' : 'Pesanan Gagal Kirim') : 'Pesanan Dibatalkan' }}
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
                    <div class="text-sm font-extrabold text-black truncate">{{ order.pickup.place }}</div>
                    <div class="text-sm text-muted-foreground">{{ order.pickup.address }}</div>
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
                    <div class="text-sm font-extrabold text-black truncate">{{ order.pickup.place }}</div>
                    <div class="text-sm text-muted-foreground">{{ order.pickup.address }}</div>
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
                    <div class="text-sm text-muted-foreground">{{ order.dropoff.address }}</div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Order items & pricing -->
          <div class="overflow-hidden bg-white border border-gray-200 rounded-2xl">
            <div class="px-4 py-3 border-b border-gray-200">
              <div class="text-base font-extrabold text-black">Rincian Pesanan</div>
            </div>

            <div class="px-4 py-3 space-y-4">
              <div v-for="(it, idx) in order.items" :key="idx" class="flex gap-3">
                <div class="w-12 h-12 overflow-hidden bg-gray-200 rounded-xl shrink-0">
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
                  <div v-if="it.variant" class="mt-1 text-xs text-muted-foreground">{{ it.variant }}</div>
                  <div v-if="it.addons && it.addons.length" class="mt-0.5 text-xs text-muted-foreground">
                    <span class="text-primary">+</span> {{ it.addons.map(a => a.name).join(', ') }}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">{{ it.qty }} x</div>
                </div>

                <div class="text-right">
                  <div class="text-xs text-muted-foreground">Rp {{ formatIDR(it.price) }}</div>
                </div>
              </div>

              <div class="pt-3 space-y-2 border-t border-gray-200">
                <div class="flex items-center justify-between text-xs">
                  <div class="text-muted-foreground">Subtotal Pesanan ({{ order.items.length }} menu)</div>
                  <div class="text-muted-foreground">Rp {{ formatIDR(order.amounts.subtotal) }}</div>
                </div>
                <div v-if="order.amounts.discount > 0" class="flex items-center justify-between text-xs">
                  <div class="text-muted-foreground">Voucher Diskon</div>
                  <div class="text-muted-foreground">-Rp {{ formatIDR(order.amounts.discount) }}</div>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <div class="text-muted-foreground">Biaya Pengiriman</div>
                  <div class="text-muted-foreground">Rp {{ formatIDR(order.amounts.delivery_fee) }}</div>
                </div>
                <div v-if="order.amounts.platform_fee > 0" class="flex items-center justify-between text-xs">
                  <div class="text-muted-foreground">Biaya Layanan/Admin</div>
                  <div class="text-muted-foreground">Rp {{ formatIDR(order.amounts.platform_fee) }}</div>
                </div>
                <div class="flex items-end justify-between pt-2">
                  <div class="text-xs text-muted-foreground"></div>
                  <div class="text-xl font-extrabold text-black">Rp {{ formatIDR(order.amounts.total) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Proof of delivery image -->
          <div v-if="order.meta.proof_image_url" class="overflow-hidden bg-white border border-gray-200 rounded-2xl mb-4">
            <div class="px-4 py-3 border-b border-gray-200">
              <div class="text-base font-extrabold text-black">Bukti Foto Pengiriman</div>
            </div>
            <div class="p-4 flex justify-center">
              <img :src="order.meta.proof_image_url" class="w-full max-w-sm rounded-xl border border-gray-200" alt="Bukti Foto" />
            </div>
          </div>

          <!-- Order info -->
          <div class="overflow-hidden bg-white border border-gray-200 rounded-2xl">
            <div class="px-4 py-3 border-b border-gray-200">
              <div class="text-base font-extrabold text-black">Informasi Pesanan</div>
            </div>

            <div class="px-4 py-3 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Catatan Tambahan</div>
                <div class="text-xs font-semibold text-black">{{ order.meta.note || "-" }}</div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">No. Pesanan</div>
                <div class="flex items-center gap-3">
                  <div class="text-xs font-semibold text-black">{{ order.meta.order_code }}</div>
                  <Button variant="primary-outline" size="sm" class="!p-1.5" @click="copyOrderCode">
                    <i class="pi pi-copy" />
                  </Button>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Waktu Pemesanan</div>
                <div class="text-xs font-semibold text-black">{{ order.meta.ordered_at }}</div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Pembayaran</div>
                <div class="text-xs font-semibold text-black">{{ order.meta.payment_method }}</div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs text-muted-foreground">Metode Pengiriman</div>
                <div class="text-xs font-semibold text-black">
                  {{ order.meta.delivery_type === 'pickup' ? 'Ambil Sendiri (Pickup)' : 'Kirim ke Alamat (Delivery)' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Product Actions -->
          <div class="py-3 mx-auto max-w-7xl">
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
              v-if="order?.status === 'pending'"
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
            <template v-if="order?.status === 'completed'">
              <!-- If reviewed and can still update review -->
              <Button
                v-if="order.items[0]?.is_reviewed && order.items[0]?.can_update_review"
                block
                @click="$router.push({ path: `/review/product/${order.id}/${order.items[0]?.productId}`, query: { merchantId: order.merchantId, orderItemId: order.items[0]?.id } })"
                customClass="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
              >
                <i class="pi pi-pencil mr-1"></i>
                Perbarui Rating dan Ulasan
              </Button>
              <!-- If reviewed and can NOT update review anymore -->
              <div
                v-else-if="order.items[0]?.is_reviewed && !order.items[0]?.can_update_review"
                class="mt-2 inline-flex items-center justify-center gap-2 w-full h-12 px-4 py-2 text-sm font-medium rounded-xl bg-green-100 text-green-700 border border-green-300 cursor-default"
              >
                <i class="pi pi-check-circle"></i>
                Ulasan sudah diperbarui
              </div>
              <!-- If not reviewed yet -->
              <Button
                v-else
                block
                @click="$router.push({ path: `/review/product/${order.id}/${order.items[0]?.productId}`, query: { merchantId: order.merchantId, orderItemId: order.items[0]?.id } })"
                customClass="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <i class="pi pi-star mr-1"></i>
                Beri Ulasan
              </Button>
            </template>
            <Button
              block
              @click="$router.push('/orders')"
              customClass="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Kembali ke Pesanan Saya
            </Button>
          </div>
        </template>
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
import { 
  getCustomerOrderDetail, 
  cancelJasaOrder, 
  confirmJasaOrder, 
  cancelOrder, 
  completeOrder 
} from "@/services/api/order";
import { createOrderInvoice, verifyOrderPayment } from "@/services/api/payment";
import echo from "@/libs/echo";
import api from "@/libs/axios";
import { formatPaymentLabel } from "@/utils/payment";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const orderId = computed(() => String(route.params.orderId || ""));
const loading = ref(true);
const rawOrder = ref(null);
const isJasaOrder = ref(false);
const cancelling = ref(false);
const confirmingSelesai = ref(false);
const paying = ref(false);
const completing = ref(false);
const failedEvidenceImages = ref(new Set());

// Countdown timer for payment (Product only)
const countdownText = ref("");
const isPaymentExpired = ref(false);
let timer = null;

// Countdown timer for UMKM confirmation (Product only)
const confirmCountdownText = ref("");
const isConfirmExpired = ref(false);
let confirmTimer = null;

let orderChannel = null;

// ─── Ticking timer for Jasa real-time countdown ─────────────────────────────────
const nowTime = ref(Date.now());
let tickingTimer = null;

// ─── SLA Countdown helpers (Jasa) ─────────────────────────────────────────────
const merchantDeadlineRemaining = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;
  if (o.status !== 'menunggu_konfirmasi' && o.status !== 'menunggu_konfirmasi_merchant') return null;
  const deadline = o.confirm_deadline || o.merchant_response_deadline;
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - nowTime.value;
  if (diff <= 0) return '00:00:00';
  return formatCountdown(deadline);
});

const completionDeadlineRemaining = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;
  if (o.status !== 'menunggu_selesai' && o.status !== 'menunggu_konfirmasi_selesai') return null;
  if (!o.completion_deadline_at) return null;
  const diff = new Date(o.completion_deadline_at).getTime() - nowTime.value;
  if (diff <= 0) return '00:00:00';
  return formatCountdown(o.completion_deadline_at);
});

function formatCountdown(deadline) {
  if (!deadline) return '00:00:00';
  const end = new Date(deadline).getTime();
  const diff = end - nowTime.value;
  if (diff <= 0) return '00:00:00';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return (
    String(hours).padStart(2, '0') + ":" +
    String(minutes).padStart(2, '0') + ":" +
    String(seconds).padStart(2, '0')
  );
}

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

function getMediaUrl(media) {
  if (!media) return null;
  if (media.media_url && media.media_url.trim()) {
    const url = media.media_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }
  if (media.file_url && media.file_url.trim()) {
    const url = media.file_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  }
  if (media.file_path && media.file_path.trim()) {
    const path = media.file_path;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/storage/')) return `${API_BASE}${path}`;
    return `${API_BASE}/storage/${path}`;
  }
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
  const image =
    o.service_image ||
    o.image_url ||
    o.jasa_image ||
    o.cover_image ||
    o.jasa?.cover_image ||
    o.jasa?.image ||
    o.image ||
    null;
  return resolveImageUrl(image);
});

function handleEvidenceImageError(idx) {
  failedEvidenceImages.value.add(idx);
}

// ─── Tracking helpers (Jasa) ──────────────────────────────────────────────────
const TRACKING_STEPS = [
  { key: "menunggu_konfirmasi_merchant", icon: "pi-clock", label: "Menunggu\nKonfirmasi" },
  { key: "diterima", icon: "pi-check", label: "Diterima" },
  { key: "layanan_dikerjakan", icon: "pi-cog", label: "Sedang\nDikerjakan" },
  { key: "menunggu_konfirmasi_selesai", icon: "pi-check-circle", label: "Menunggu\nSelesai" },
  { key: "selesai", icon: "pi-home", label: "Selesai" },
];

const STATUS_MAP = {
  pending: 0, menunggu_konfirmasi_merchant: 0,
  diterima: 1, accepted: 1, responsed: 1,
  layanan_dikerjakan: 2, dikerjakan: 2, processing: 2, in_progress: 2,
  menunggu_konfirmasi_selesai: 3, menunggu_selesai: 3,
  selesai: 4, completed: 4,
  ditolak: -1, rejected: -1, dibatalkan: -1, cancelled: -1, batal: -1,
  expired: -1, kadaluarsa: -1,
};

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

function getChannelLabel(channel) {
  const labels = {
    QRIS: "QRIS", BCA: "BCA VA", BCA_VA: "BCA VA",
    BNI: "BNI VA", BNI_VA: "BNI VA", BRI: "BRI VA", BRI_VA: "BRI VA",
    MANDIRI: "Mandiri VA", MANDIRI_VA: "Mandiri VA",
    OVO: "OVO", DANA: "DANA", SHOPEEPAY: "ShopeePay", ALFAMART: "Alfamart",
  };
  return labels[String(channel || "").toUpperCase()] || channel || "";
}

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

function getPaymentStatusLabel(status) {
  const ps = String(status || "").toUpperCase();
  const map = {
    PAID: "Lunas / Sudah Dibayar",
    SETTLED: "Lunas / Sudah Dibayar",
    SUCCEEDED: "Lunas / Sudah Dibayar",
    SUDAH_BAYAR: "Lunas / Sudah Dibayar",
    LUNAS: "Lunas / Sudah Dibayar",
    WAITING_CONFIRMATION: "Menunggu",
    UNPAID: "Belum Bayar",
    PENDING: "Menunggu",
  };
  return map[ps] || status || "-";
}

// ─── Computed Orders (Jasa & Product) ─────────────────────────────────────────

const jasaOrder = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;

  const rawStatus = String(o.status || o.service_status || o.order_status || "").toLowerCase();
  const isOrderCod = String(o.payment_method || "").toUpperCase() === "COD";
  const paidStatuses = ['PAID', 'SETTLED', 'SUCCEEDED'];
  const isPaid = paidStatuses.includes(String(o.payment_status || "").toUpperCase());

  const paymentMethodDisplay = formatPaymentLabel(o);

  const serviceTypeMap = {
    online: "Online", di_tempat_umkm: "Di Tempat UMKM", at_location: "Di Tempat UMKM",
    ke_rumah_pelanggan: "Ke Rumah Pelanggan", on_site: "Ke Rumah Pelanggan",
  };
  const serviceTypeLabel = serviceTypeMap[o.service_type] || o.service_type || "";

  const bookingTypeMap = {
    booking: "Booking (Pilih Tanggal & Jam)",
    keranjang: "Tanpa Jadwal",
    walk_in: "Walk-in",
    konsultasi: "Konsultasi",
  };
  const bookingTypeLabel = bookingTypeMap[o.mekanisme_pemesanan] || o.mekanisme_pemesanan || "";

  const dateFormatted = o.booking_date
    ? new Date(o.booking_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const createdAtFormatted = o.created_at
    ? new Date(o.created_at).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const statusLabelMap = {
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
    ditolak: "Ditolak Merchant",
    rejected: "Ditolak Merchant",
    dibatalkan: "Dibatalkan",
    cancelled: "Dibatalkan",
    batal: "Dibatalkan",
    expired: "Kadaluarsa",
    kadaluarsa: "Kadaluarsa",
  };
  const isUnpaidOnline = !isPaid && !isOrderCod;

  let statusLabel;
  if (isUnpaidOnline) {
    statusLabel = "Pesanan Dibuat";
  } else if (['pending', 'unpaid', 'waiting_payment', 'menunggu_konfirmasi', 'menunggu_konfirmasi_merchant', 'paid'].includes(rawStatus)) {
    statusLabel = "Menunggu Konfirmasi UMKM";
  } else {
    statusLabel = statusLabelMap[rawStatus] || o.status_label || rawStatus.replace(/_/g, " ");
  }

  // 5-step tracking stepper for Jasa
  const tracking = [
    { key: "placed", icon: "pi-receipt", label: "Pesanan\nDibuat", done: true },
    { key: "confirmed", icon: "pi-clock", label: "Menunggu\nKonfirmasi", done: isPaid || isOrderCod || ['menunggu_konfirmasi', 'menunggu_konfirmasi_merchant', 'diterima', 'accepted', 'responsed', 'layanan_dikerjakan', 'dikerjakan', 'processing', 'menunggu_konfirmasi_selesai', 'menunggu_selesai', 'selesai', 'completed'].includes(rawStatus) },
    { key: "working", icon: "pi-cog", label: "Layanan\nDikerjakan", done: ['layanan_dikerjakan', 'dikerjakan', 'processing', 'menunggu_konfirmasi_selesai', 'menunggu_selesai', 'selesai', 'completed'].includes(rawStatus) },
    { key: "completion_pending", icon: "pi-check-circle", label: "Menunggu\nSelesai", done: ['menunggu_konfirmasi_selesai', 'menunggu_selesai', 'selesai', 'completed'].includes(rawStatus) },
    { key: "completed", icon: "pi-home", label: "Selesai", done: ['selesai', 'completed'].includes(rawStatus) }
  ];

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

  const statusVariant = isOrderStatus ? "order" : (isPaid ? "order" : "payment");
  const statusLabelStatus = (!isOrderStatus && !isPaid) ? "pending" : (isPaid ? "completed" : rawStatus);

  return {
    id: o.id,
    order_number: o.invoice || o.order_number || `ORD-${String(o.id).padStart(6, "0")}`,
    jasa_order_item_id: o.jasa_order_item_id || null,
    is_reviewed: o.is_reviewed || o.jasa_order_item?.is_reviewed || o.jasaOrderItem?.isReviewed || false,
    can_review: o.can_review !== undefined ? o.can_review : (rawStatus === 'selesai' && !(o.is_reviewed || o.jasa_order_item?.is_reviewed)),
    can_update_review: o.can_update_review !== undefined ? o.can_update_review : (o.is_reviewed && (o.review?.update_count ?? 0) < 1),
    service_name: o.service_name || o.jasa?.title || "Layanan",
    service_image: o.service_image || o.jasa?.image || null,
    service_type: o.service_type || "",
    service_type_label: serviceTypeLabel,
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
    subtotal: Number(o.subtotal ?? o.total_price ?? 0),
    platform_fee: Number(o.platform_fee ?? 0),
    payment_fee: Number(o.payment_fee ?? 0),
    is_cod: isOrderCod,
    total_payment: Number(o.total_payment ?? o.total_price ?? 0),
    payment_status_display: isOrderCod
      ? (['selesai', 'ditolak', 'dibatalkan', 'expired'].includes(rawStatus) ? 'Dibayar di Tempat' : 'COD - Menunggu Bayar')
      : getPaymentStatusLabel(o.payment_status),
    is_payment_completed: isPaid || (isOrderCod && ['selesai', 'ditolak', 'dibatalkan', 'expired'].includes(rawStatus)),
    total_price: Number(o.total_price || 0),
    status: rawStatus,
    status_label: statusLabel,
    created_at: o.created_at,
    created_at_formatted: createdAtFormatted,
    review: o.review || o.jasa_order_item?.review || o.jasaOrderItem?.review || null,
    completion_note:
      o.completion_note ||
      o.jasa_order_item?.completion_note ||
      o.jasaOrderItem?.completionNote ||
      (o.jasaItems?.[0]?.completion_note) ||
      null,
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

const productOrder = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;

  const status = o.status;
  const isCOD = o.payment_method === 'COD';

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

  const tracking = [
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
  ];

  return {
    id: o.id,
    merchantId: o.merchant_id,
    status,
    tracking,

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
      is_reviewed: it.is_reviewed || false,
      can_review: it.can_review || false,
      can_update_review: it.can_update_review || false,
      review: it.review || null,
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

const order = computed(() => {
  return isJasaOrder.value ? jasaOrder.value : productOrder.value;
});

const statusVariant = computed(() => order.value?.statusVariant || "order");
const statusLabelStatus = computed(() => order.value?.statusLabelStatus || "pending");

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  router.push('/orders');
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
  const id = orderId.value;
  if (!id || id === 'undefined') {
    toast.error('ID pesanan tidak valid');
    return;
  }
  if (!confirm("Yakin ingin membatalkan pesanan ini?")) return;
  cancelling.value = true;
  try {
    if (isJasaOrder.value) {
      await cancelJasaOrder(id);
      if (rawOrder.value) {
        rawOrder.value.status = 'dibatalkan';
        rawOrder.value.order_status = 'dibatalkan';
        rawOrder.value.status_label = 'Dibatalkan';
      }
      toast.success("Pesanan berhasil dibatalkan");
      router.push({ name: 'Pesanan Saya' });
    } else {
      await cancelOrder(id);
      toast.success("Pesanan berhasil dibatalkan");
      await fetchOrder();
    }
  } catch (e) {
    console.error("Gagal membatalkan:", e);
    toast.error(e?.response?.data?.message || "Gagal membatalkan pesanan");
  } finally {
    cancelling.value = false;
  }
}

async function handleComplete() {
  const id = orderId.value;
  if (!id || id === 'undefined') {
    toast.error('ID pesanan tidak valid');
    return;
  }
  if (completing.value) return;
  completing.value = true;
  try {
    await completeOrder(id);
    toast.success("Pesanan berhasil diselesaikan");
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal menyelesaikan pesanan");
  } finally {
    completing.value = false;
  }
}

async function handlePayNow() {
  const id = orderId.value;
  if (!id || id === 'undefined') {
    toast.error('ID pesanan tidak valid');
    return;
  }
  if (paying.value) return;
  paying.value = true;
  try {
    const { data } = await createOrderInvoice(id);
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

async function copyOrderCode() {
  try {
    const orderCode = order.value?.meta?.order_code || order.value?.order_number || "";
    await navigator.clipboard.writeText(String(orderCode));
    toast.success("Nomor pesanan berhasil disalin", { timeout: 1500 });
  } catch {
    toast.warning("Gagal menyalin", { timeout: 1500 });
  }
}

async function handleKonfirmasiSelesai() {
  const id = orderId.value;
  if (!id || id === 'undefined') {
    toast.error('ID pesanan tidak valid');
    return;
  }
  if (!confirm("Yakin ingin mengkonfirmasi pesanan ini sebagai selesai?")) return;
  confirmingSelesai.value = true;
  try {
    await confirmJasaOrder(id);
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

function needsPayment() {
  const o = order.value;
  if (!o) return false;

  // payment_status check (PAID / paid / sudah_bayar / lunas / dll)
  const ps = String(o.payment_status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED', 'SUDAH_BAYAR', 'LUNAS'].includes(ps)) return false;

  // payment_method check (COD)
  const method = String(o.payment_method || '').toUpperCase();
  if (method === 'COD') return false;

  const rawStatus = String(o.status || '').toLowerCase();
  const terminalStatuses = ['cancelled', 'dibatalkan', 'ditolak', 'expired', 'selesai', 'completed', 'kadaluarsa'];
  if (terminalStatuses.includes(rawStatus)) return false;

  return true;
}

async function retryPayment() {
  const o = order.value;
  if (!o) return;
  const orderId = o.id;
  if (!orderId) {
    toast.error('ID pesanan tidak ditemukan');
    return;
  }

  try {
    const existingInvoiceUrl = o.invoice_url || o.payment?.invoice_url || o.xendit_invoice_url;
    if (existingInvoiceUrl) {
      const expiredAt = o.payment?.expired_at || o.expired_at;
      const isExpired = expiredAt && new Date(expiredAt) < new Date();
      if (!isExpired) {
        window.location.href = existingInvoiceUrl;
        return;
      }
    }

    const { data } = await api.post(`/api/payments/${orderId}/invoice`);
    const invoiceUrl = data?.data?.invoice_url || data?.invoice_url;
    if (invoiceUrl) {
      window.location.href = invoiceUrl;
    } else {
      toast.error('Invoice tidak tersedia. Silakan coba lagi.');
    }
  } catch (err) {
    console.error('[retryPayment] Error:', err);
    toast.error(err.response?.data?.message || 'Gagal membuat invoice pembayaran.');
  }
}

// ─── Fetch & Timers ──────────────────────────────────────────────────────────

function startCountdown() {
  if (timer) clearInterval(timer);
  const payment = rawOrder.value?.payment;
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

function startConfirmCountdown() {
  if (confirmTimer) clearInterval(confirmTimer);
  const deadline = rawOrder.value?.confirm_deadline;
  const status = rawOrder.value?.status;

  if (!deadline || !['pending', 'paid'].includes(status)) {
    confirmCountdownText.value = "";
    isConfirmExpired.value = false;
    return;
  }

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

async function fetchOrder() {
  const id = orderId.value;
  if (!id || id === 'undefined' || id === 'null') {
    loading.value = false;
    toast.error('ID pesanan tidak valid');
    router.replace('/orders');
    return;
  }
  loading.value = true;
  failedEvidenceImages.value = new Set();
  
  if (timer) clearInterval(timer);
  if (confirmTimer) clearInterval(confirmTimer);

  try {
    // 1. Try Jasa Order
    const { data: res } = await getCustomerOrderDetail(id);
    rawOrder.value = res?.data ?? res ?? null;
    console.log('[Detail] Jasa order raw response:', rawOrder.value);
    console.log('[Detail] Jasa order review data:', rawOrder.value?.review || rawOrder.value?.jasa_order_item?.review || rawOrder.value?.jasaOrderItem?.review);
    isJasaOrder.value = true;
  } catch (e) {
    console.log('[Detail] Jasa order fetch failed/not found, falling back to product order:', e);
    try {
      // 2. Fallback to Product Order
      const { data: res } = await api.get(`/api/orders/${id}`);
      rawOrder.value = res?.data ?? res ?? null;
      isJasaOrder.value = false;
      
      startCountdown();
      startConfirmCountdown();
    } catch (err) {
      console.error("Gagal memuat detail pesanan product/jasa:", err);
      toast.error("Gagal memuat detail pesanan");
      rawOrder.value = null;
    }
  } finally {
    loading.value = false;
  }
}

// ─── Pusher Channel ───────────────────────────────────────────────────────────
const verifying = ref(false);
const isVerifyingPayment = ref(false);

async function verifyPaymentFromXendit(retryCount = 0) {
  const MAX_RETRY = 5;
  const RETRY_DELAY_MS = 3000;
  if (verifying.value) return;
  verifying.value = true;
  try {
    const { data: res } = await verifyOrderPayment(orderId.value);
    const result = res?.data ?? res;
    
    // Support paid/PAID and Jasa order status waiting confirmation
    if (
      result?.already_paid || 
      result?.order_status === "paid" || 
      result?.order_status === "menunggu_konfirmasi_merchant" ||
      result?.order_status === "menunggu_konfirmasi"
    ) {
      toast.success("Pembayaran berhasil! Menunggu konfirmasi dari penjual.");
      
      // Remove query parameters from URL to avoid loop on refresh
      router.replace({ path: route.path, query: {} });
      
      await fetchOrder();
      return;
    }
    
    if (retryCount < MAX_RETRY) {
      toast.info(`Mengkonfirmasi pembayaran... (${retryCount + 1}/${MAX_RETRY})`);
      setTimeout(() => {
        verifying.value = false;
        verifyPaymentFromXendit(retryCount + 1);
      }, RETRY_DELAY_MS);
    } else {
      toast.warning("Pembayaran belum terkonfirmasi. Mohon tunggu beberapa saat atau cek kembali di halaman pesanan.");
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

onMounted(() => {
  fetchOrder();
  subscribeOrderChannel();

  // Start Jasa ticking clock
  tickingTimer = setInterval(() => {
    nowTime.value = Date.now();
  }, 1000);

  // Detect xendit redirect back
  const paymentStatus = route.query?.payment;
  const qOrderId = route.query?.order_id;
  const qExternalId = route.query?.external_id;
  
  if (paymentStatus === "success" || qOrderId || qExternalId) {
    if (!isVerifyingPayment.value) {
      isVerifyingPayment.value = true;
      verifyPaymentFromXendit();
    }
  } else if (paymentStatus === "failed") {
    toast.error("Pembayaran gagal. Silakan coba lagi.");
  }
});

onUnmounted(() => {
  leaveOrderChannel(orderId.value);
  if (timer) clearInterval(timer);
  if (confirmTimer) clearInterval(confirmTimer);
  if (tickingTimer) clearInterval(tickingTimer);
});

watch(orderId, (next, prev) => {
  if (prev) {
    leaveOrderChannel(prev);
  }
  if (next) {
    subscribeOrderChannel();
    fetchOrder();
  }
});
</script>
