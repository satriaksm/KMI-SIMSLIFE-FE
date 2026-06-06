<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "@/libs/axios.js";

const router = useRouter();
const route = useRoute();

const bookingData = ref(null);
const loading = ref(true);
const isPending = ref(false);
const isConfirmed = ref(false);
const error = ref(null);

// Payment method display mapping
const paymentMethodLabels = {
  cod: "Bayar di Tempat (COD)",
  COD: "Bayar di Tempat (COD)",
  ONLINE_XENDIT: "Online (Xendit)",
  QRIS: "QRIS",
  qris: "QRIS",
  BCA_VA: "BCA Virtual Account",
  bca_va: "BCA Virtual Account",
  BCA: "BCA Virtual Account",
  BNI_VA: "BNI Virtual Account",
  bni_va: "BNI Virtual Account",
  BNI: "BNI Virtual Account",
  BRI_VA: "BRI Virtual Account",
  bri_va: "BRI Virtual Account",
  BRI: "BRI Virtual Account",
  MANDIRI_VA: "Mandiri Virtual Account",
  mandiri_va: "Mandiri Virtual Account",
  MANDIRI: "Mandiri Virtual Account",
  OVO: "OVO",
  ovo: "OVO",
  DANA: "DANA",
  dana: "DANA",
  SHOPEEPAY: "ShopeePay",
  shopeepay: "ShopeePay",
  ALFAMART: "Alfamart / Alfamidi",
  alfamart: "Alfamart / Alfamidi",
};

// Payment status display mapping
const paymentStatusLabels = {
  UNPAID: "Belum Bayar",
  PAID: "Lunas / Sudah Dibayar",
  WAITING_CONFIRMATION: "Menunggu Konfirmasi",
  PENDING: "Menunggu Pembayaran",
};

// Get human-readable payment method
function getPaymentMethodDisplay(method) {
  if (!method) return "-";
  const normalized = String(method).toUpperCase();
  return paymentMethodLabels[normalized] || paymentMethodLabels[method] || method;
}

// Get human-readable payment status
function getPaymentStatusDisplay(status) {
  if (!status) return "-";
  return paymentStatusLabels[status] || status;
}

// Check if payment is completed (PAID or COD)
function isPaymentCompleted(paymentMethod, paymentStatus) {
  const method = String(paymentMethod || "").toUpperCase();
  const status = String(paymentStatus || "").toUpperCase();

  // COD is considered paid upon order creation
  if (method === "COD") return true;

  // For other methods, check payment_status
  return status === "PAID";
}

// Format date to "DD MMMM YYYY" in Indonesian
function formatDateID(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Format booking date if it's just a date string
function formatBookingDate(date) {
  if (!date) return "Belum dipilih";
  // If it's a date only (YYYY-MM-DD), format it
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return formatDateID(date);
  }
  return formatDateID(date);
}

// Get service type label
function getServiceTypeLabel(type) {
  const labels = {
    online: "Online",
    di_tempat_umkm: "Di Tempat UMKM",
    at_location: "Di Tempat UMKM",
    ke_rumah_pelanggan: "Ke Rumah Pelanggan",
    on_site: "Ke Rumah Pelanggan",
  };
  return labels[type] || type || "-";
}

// Get booking mechanism label
function getBookingTypeLabel(type) {
  const labels = {
    booking: "Booking (Pilih Tanggal & Jam)",
    keranjang: "Keranjang (Tanpa Jadwal)",
    walk_in: "Walk-in (Tanpa Jadwal)",
    tanpa_jadwal: "Tanpa Jadwal",
    konsultasi: "Konsultasi",
  };
  return labels[type] || (type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Booking (Pilih Tanggal & Jam)");
}

// Safe address display
function getAddressDisplay(address, serviceType) {
  if (serviceType === "online") return "Online";
  if (!address || address === "undefined" || address === "null" || address === "-") return "—";
  return address;
}

// Get address label
function getAddressLabel(serviceType) {
  if (serviceType === "online") return "Lokasi";
  if (serviceType === "di_tempat_umkm" || serviceType === "at_location") return "Lokasi UMKM";
  if (serviceType === "ke_rumah_pelanggan" || serviceType === "on_site") return "Alamat";
  return "Lokasi";
}

// Check if service uses booking (has schedule)
const usesBooking = computed(() => {
  if (!bookingData.value) return false;
  const type = bookingData.value.mekanisme_pemesanan || bookingData.value.booking_type || "";
  return ["booking", "jadwal", "scheduled"].some(kw => type.toLowerCase().includes(kw));
});

// Fetch order from backend
async function fetchOrderFromBackend(orderId) {
  try {
    const response = await api.get(`/api/service-orders/${orderId}`);
    return response.data?.data || response.data;
  } catch (err) {
    console.error("[BookingConfirmation] Failed to fetch order:", err);
    return null;
  }
}

// Build bookingData from backend response
function buildFromBackendOrder(order) {
  if (!order) return null;

  const serviceType = order.service_type || "on_site";
  const bookingType = order.mekanisme_pemesanan || order.service_type_booking || "booking";
  const paymentMethod = getPaymentMethodDisplay(order.payment_method);
  const paymentStatus = getPaymentStatusDisplay(order.payment_status);
  const isPaid = isPaymentCompleted(order.payment_method, order.payment_status);

  // Get merchant name
  const merchantName = order.merchant?.name || order.merchant_name || "UMKM";

  // Get service title
  const serviceTitle = order.service_name || order.jasa?.title || "Layanan";

  // Get service image - handle nested jasa.image object
  let serviceImage = order.service_image || "";
  if (!serviceImage && order.jasa?.image) {
    if (typeof order.jasa.image === 'string') {
      serviceImage = order.jasa.image;
    } else if (order.jasa.image?.image_path) {
      serviceImage = order.jasa.image.image_path;
    }
  }

  // Use display_address from backend if available, otherwise compute
  const displayAddress = order.display_address || getAddressDisplay(order.customer_address, serviceType);
  const addressLabel = order.address_label || getAddressLabel(serviceType);

  // Check order status
  const isPendingOrder = order.status === "menunggu_konfirmasi_merchant" || order.status === "pending";
  const isConfirmedOrder = !isPendingOrder;

  return {
    id: order.id,
    merchant_name: merchantName,
    merchant_address: order.merchant?.address || "",
    service_title: serviceTitle,
    service_image: serviceImage,
    price: parseFloat(order.total_price || 0),
    date: formatBookingDate(order.booking_date),
    booking_date: order.booking_date,
    time: order.booking_time || "—",
    booking_time: order.booking_time,
    customer_name: order.customer_name || "-",
    customer_phone: order.customer_phone || "-",
    customer_address: displayAddress,
    address_label: addressLabel,
    service_type: serviceType,
    service_type_label: getServiceTypeLabel(serviceType),
    booking_type: bookingType,
    booking_type_label: getBookingTypeLabel(bookingType),
    payment_method: paymentMethod,
    payment_method_raw: order.payment_method,
    payment_status: paymentStatus,
    payment_status_raw: order.payment_status,
    is_paid: isPaid,
    catatan: order.booking_note || "-",
    status: order.status,
    status_label: order.status_label || order.status,
    created_at: order.created_at,
  };
}

// Build bookingData from query parameters (fallback)
function buildFromQuery(q) {
  const serviceType = q.service_type || q.serviceType || "on_site";
  const bookingType = q.mekanisme_pemesanan || q.booking_type || "booking";
  const paymentMethod = getPaymentMethodDisplay(q.payment_method);

  return {
    id: q.order_id,
    merchant_name: q.merchant_name || q.merchant || q.merchant_slug || "Merchant",
    merchant_address: q.merchant_address || "",
    service_title: q.jasa_title || q.service || "Layanan",
    service_image: q.service_image || "",
    price: parseFloat(q.total) || parseFloat(q.price) || 0,
    date: formatBookingDate(q.tanggal),
    booking_date: q.tanggal,
    time: q.waktu && q.waktu !== "undefined" ? q.waktu : "—",
    booking_time: q.waktu,
    customer_name: q.nama || "-",
    customer_phone: q.tel || "-",
    customer_address: getAddressDisplay(q.alamat, serviceType),
    service_type: serviceType,
    service_type_label: getServiceTypeLabel(serviceType),
    booking_type: bookingType,
    booking_type_label: getBookingTypeLabel(bookingType),
    payment_method: paymentMethod,
    payment_method_raw: q.payment_method,
    payment_status: q.payment_status || "-",
    payment_status_raw: q.payment_status,
    is_paid: q.payment_status === "PAID",
    catatan: q.catatan || "-",
    status: q.status || "confirmed",
    status_label: q.status_label || "Confirmed",
    created_at: q.created_at,
  };
}

onMounted(async () => {
  const q = route.query;
  const orderId = q.order_id;

  // Special case: pending order (redirected from payment page)
  if (orderId === "pending") {
    isPending.value = true;
    isConfirmed.value = false;
    bookingData.value = buildFromQuery(q);
    loading.value = false;
    return;
  }

  // Try to fetch from backend first
  if (orderId && orderId !== "pending") {
    const backendOrder = await fetchOrderFromBackend(orderId);

    if (backendOrder) {
      // Successfully fetched from backend
      bookingData.value = buildFromBackendOrder(backendOrder);
      isPending.value = bookingData.value.status === "menunggu_konfirmasi_merchant";
      isConfirmed.value = !isPending.value;
    } else {
      // Fallback to query parameters
      bookingData.value = buildFromQuery(q);
      isPending.value = q.status === "pending" || q.status === "pending_confirmation";
      isConfirmed.value = !isPending.value;
    }
  } else {
    // No order_id, try session storage
    const stored = sessionStorage.getItem("pending_booking");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        bookingData.value = buildFromQuery({
          order_id: parsed.id,
          merchant_name: parsed.merchant_name,
          merchant_address: parsed.merchant_address,
          jasa_title: parsed.service_name,
          service_image: parsed.service_image,
          total: parsed.total_price,
          tanggal: parsed.booking_date,
          waktu: parsed.booking_time,
          nama: parsed.customer_name,
          tel: parsed.customer_phone,
          alamat: parsed.customer_address,
          service_type: parsed.service_type,
          payment_method: parsed.payment_method,
          catatan: parsed.booking_note,
          status: parsed.status,
        });
        isPending.value = parsed.status === "pending_confirmation";
        isConfirmed.value = parsed.status === "confirmed";
      } catch (e) {
        console.error("[BookingConfirmation] Failed to parse stored booking:", e);
      }
    }
  }

  loading.value = false;
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
};

const goToHome = () => router.push("/");
const viewBooking = () => router.push("/service-history");
</script>

<template>
  <!-- ===================== MOBILE LAYOUT (≤768px) ===================== -->
  <!-- min-h-dvh = dynamic viewport height (accounts for mobile browser chrome) -->
  <div class="min-h-dvh bg-gray-50 flex flex-col lg:hidden" style="padding-bottom: env(safe-area-inset-bottom, 0px);">

    <!-- Header Banner -->
    <div class="bg-gradient-to-r from-green-500 to-emerald-500 px-4 pt-3 pb-2.5 text-center flex-shrink-0">
      <div class="w-11 h-11 bg-white rounded-full flex items-center justify-center mx-auto mb-1.5">
        <i class="pi pi-check text-2xl text-green-500"></i>
      </div>
      <h1 class="text-xl font-bold text-white leading-tight">
        {{ isPending ? 'Pengajuan Booking Berhasil' : 'Booking Berhasil!' }}
      </h1>
      <p class="text-green-100 text-[13px] mt-0.5">
        {{ isPending ? 'Menunggu persetujuan UMKM' : 'Pesanan telah dikonfirmasi' }}
      </p>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto px-3 pt-3 pb-[130px]">
      <div v-if="loading" class="flex items-center justify-center py-6">
        <i class="pi pi-spin pi-spinner text-xl text-gray-400"></i>
      </div>

      <template v-else-if="bookingData">
        <!-- Status Badge -->
        <div class="flex justify-center mb-2.5">
          <span
            class="px-3 py-0.5 text-xs font-medium rounded-full"
            :class="isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'"
          >
            <i :class="isPending ? 'pi pi-clock' : 'pi pi-check-circle'" class="mr-1"></i>
            {{ isPending ? 'Menunggu Konfirmasi' : 'Dikonfirmasi' }}
          </span>
        </div>

        <!-- Booking Details Card -->
        <div class="bg-white rounded-xl shadow-sm px-4 py-3 mb-2">
          <div class="space-y-1">
            <div class="flex justify-between items-start text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Layanan</span>
              <span class="font-medium text-gray-800 text-right max-w-[60%] line-clamp-2">{{ bookingData.service_title }}</span>
            </div>
            <div class="flex justify-between items-center text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Tipe</span>
              <span class="font-medium text-gray-800">{{ bookingData.service_type_label || bookingData.service_type || '-' }}</span>
            </div>
            <div class="flex justify-between items-center text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Mekanisme</span>
              <span class="font-medium text-gray-800">{{ bookingData.booking_type_label || '-' }}</span>
            </div>
            <div class="flex justify-between items-start text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Nama</span>
              <span class="font-medium text-gray-800 text-right max-w-[60%] line-clamp-1">{{ bookingData.customer_name }}</span>
            </div>
            <div class="flex justify-between items-start text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Telepon</span>
              <span class="font-medium text-gray-800">{{ bookingData.customer_phone }}</span>
            </div>
            <div class="flex justify-between items-start text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">{{ bookingData.address_label || getAddressLabel(bookingData.service_type) }}</span>
              <span class="font-medium text-gray-800 text-right max-w-[60%] line-clamp-2">{{ bookingData.customer_address || '-' }}</span>
            </div>
            <!-- Tanggal - only show for booking services -->
            <div v-if="usesBooking" class="flex justify-between items-center text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Tanggal</span>
              <span class="font-medium text-gray-800">{{ bookingData.date }}</span>
            </div>
            <!-- Jam - only show for booking services -->
            <div v-if="usesBooking" class="flex justify-between items-center text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Jam</span>
              <span class="font-medium text-gray-800">{{ bookingData.time }}</span>
            </div>
            <!-- Pembayaran -->
            <div class="flex justify-between items-center text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Pembayaran</span>
              <span class="font-medium text-gray-800">{{ bookingData.payment_method }}</span>
            </div>
            <!-- Status Pembayaran - only show for non-COD -->
            <div v-if="bookingData.payment_method_raw && bookingData.payment_method_raw.toUpperCase() !== 'COD'" class="flex justify-between items-center text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Status Bayar</span>
              <span
                class="font-medium px-2 py-0.5 rounded-full text-xs"
                :class="bookingData.is_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              >
                {{ bookingData.payment_status }}
              </span>
            </div>
            <div v-if="bookingData.catatan && bookingData.catatan !== '-'" class="flex justify-between items-start text-sm py-0.5">
              <span class="text-gray-500 flex-shrink-0 w-24">Catatan</span>
              <span class="font-medium text-gray-800 text-right max-w-[60%] line-clamp-2">{{ bookingData.catatan }}</span>
            </div>
            <div class="flex justify-between items-center text-sm py-1 mt-1.5 border-t border-gray-100">
              <span class="text-gray-700 font-semibold">Total</span>
              <span class="font-bold text-gray-800">{{ formatCurrency(bookingData.price) }}</span>
            </div>
          </div>
        </div>

        <!-- Pending Info Alert -->
        <div v-if="isPending" class="bg-yellow-50 rounded-xl px-3 py-2 mb-2 border border-yellow-100">
          <p class="text-[13px] text-yellow-700 leading-snug">
            <i class="pi pi-info-circle mr-1 align-middle"></i>
            Pengajuan Anda menunggu persetujuan dari UMKM.
          </p>
        </div>
      </template>

      <div v-else class="text-center py-8 text-gray-500">
        <i class="pi pi-inbox text-3xl mb-2"></i>
        <p class="text-sm">Tidak ada data booking ditemukan</p>
      </div>
    </div>

    <!-- Sticky Footer — sticky bottom, white bg, thin shadow -->
    <div class="flex-shrink-0 bg-white border-t border-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-4 py-3" style="padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));">
      <div class="flex gap-2.5">
        <button
          @click="goToHome"
          class="flex-1 h-11 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition flex items-center justify-center gap-1.5"
        >
          <i class="pi pi-home text-sm"></i>
          Kembali
        </button>
        <button
          @click="viewBooking"
          class="flex-1 h-11 bg-merchant-primary text-white rounded-xl font-medium text-sm hover:bg-merchant-primary/90 transition flex items-center justify-center gap-1.5"
        >
          <i class="pi pi-calendar text-sm"></i>
          Lihat Booking
        </button>
      </div>
    </div>
  </div>

  <!-- ===================== DESKTOP LAYOUT (≥1024px) ===================== -->
  <div class="min-h-screen bg-gray-50 p-4 hidden lg:block">

    <!-- Outer container constrained to viewport height -->
    <div class="max-w-5xl mx-auto" style="height: calc(100vh - 32px);">

      <!-- Grid: 70% detail + 30% summary -->
      <div class="grid grid-cols-5 gap-4 h-full" style="grid-template-columns: 1fr 320px;">

        <!-- ===== LEFT: Detail Column (70%) ===== -->
        <div class="flex flex-col gap-3 min-h-0">

          <!-- Success Banner -->
          <div class="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl px-6 py-3 text-center flex-shrink-0">
            <div class="flex items-center justify-center gap-3">
              <div class="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <i class="pi pi-check text-lg text-green-500"></i>
              </div>
              <div class="text-left">
                <h1 class="text-lg font-bold text-white leading-tight">
                  {{ isPending ? 'Pengajuan Booking Berhasil' : 'Booking Berhasil!' }}
                </h1>
                <p class="text-green-100 text-xs">
                  {{ isPending ? 'Pengajuan telah dikirim ke UMKM, menunggu persetujuan.' : 'Pesanan Anda telah dikonfirmasi.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Detail Booking Card -->
          <div class="bg-white rounded-xl shadow-sm px-5 py-3 flex-shrink-0">
            <!-- Status Row -->
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail Booking</span>
              <span
                class="px-2.5 py-0.5 text-xs font-medium rounded-full"
                :class="isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'"
              >
                <i :class="isPending ? 'pi pi-clock' : 'pi pi-check-circle'" class="mr-0.5"></i>
                {{ isPending ? 'Menunggu Konfirmasi' : 'Dikonfirmasi' }}
              </span>
            </div>

            <!-- Detail Grid -->
            <div v-if="bookingData" class="space-y-1.5">
              <div class="flex justify-between items-start text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Merchant</span>
                <span class="font-medium text-gray-800 text-right max-w-[55%] line-clamp-1">{{ bookingData.merchant_name }}</span>
              </div>
              <div class="flex justify-between items-start text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Layanan</span>
                <span class="font-medium text-gray-800 text-right max-w-[55%] line-clamp-2">{{ bookingData.service_title }}</span>
              </div>
              <div class="flex justify-between items-center text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Tipe</span>
                <span class="font-medium text-gray-800">{{ bookingData.service_type_label || bookingData.service_type || '-' }}</span>
              </div>
              <div class="flex justify-between items-center text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Mekanisme</span>
                <span class="font-medium text-gray-800">{{ bookingData.booking_type_label || '-' }}</span>
              </div>
              <div class="flex justify-between items-start text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Nama</span>
                <span class="font-medium text-gray-800 text-right max-w-[55%] line-clamp-1">{{ bookingData.customer_name }}</span>
              </div>
              <div class="flex justify-between items-center text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Telepon</span>
                <span class="font-medium text-gray-800">{{ bookingData.customer_phone }}</span>
              </div>
              <div class="flex justify-between items-start text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">{{ bookingData.address_label || getAddressLabel(bookingData.service_type) }}</span>
                <span class="font-medium text-gray-800 text-right max-w-[55%] line-clamp-2">{{ bookingData.customer_address || '-' }}</span>
              </div>
              <!-- Tanggal - only show for booking services -->
              <div v-if="usesBooking" class="flex justify-between items-center text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Tanggal</span>
                <span class="font-medium text-gray-800">{{ bookingData.date }}</span>
              </div>
              <!-- Jam - only show for booking services -->
              <div v-if="usesBooking" class="flex justify-between items-center text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Jam</span>
                <span class="font-medium text-gray-800">{{ bookingData.time }}</span>
              </div>
              <div class="flex justify-between items-center text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Pembayaran</span>
                <span class="font-medium text-gray-800">{{ bookingData.payment_method }}</span>
              </div>
              <!-- Status Pembayaran - only show for non-COD -->
              <div v-if="bookingData.payment_method_raw && bookingData.payment_method_raw.toUpperCase() !== 'COD'" class="flex justify-between items-center text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Status Bayar</span>
                <span
                  class="font-medium px-2 py-0.5 rounded-full text-xs"
                  :class="bookingData.is_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                >
                  {{ bookingData.payment_status }}
                </span>
              </div>
              <div v-if="bookingData.catatan && bookingData.catatan !== '-'" class="flex justify-between items-start text-sm py-1">
                <span class="text-gray-500 flex-shrink-0 w-32">Catatan</span>
                <span class="font-medium text-gray-800 text-right max-w-[55%] line-clamp-2">{{ bookingData.catatan }}</span>
              </div>
              <div class="flex justify-between items-center text-sm py-2 mt-1.5 border-t border-gray-100">
                <span class="text-gray-700 font-semibold text-sm">Total Pembayaran</span>
                <span class="font-bold text-base text-gray-800">{{ formatCurrency(bookingData.price) }}</span>
              </div>
            </div>

            <div v-else class="text-center py-4 text-gray-400 text-sm">
              <i class="pi pi-inbox text-2xl mb-1 block"></i>
              Tidak ada data booking ditemukan
            </div>
          </div>

          <!-- Pending Alert -->
          <div v-if="isPending" class="bg-yellow-50 rounded-xl px-4 py-2 border border-yellow-100 flex-shrink-0">
            <p class="text-xs text-yellow-700 flex items-center gap-1.5">
              <i class="pi pi-info-circle text-yellow-600 flex-shrink-0"></i>
              Pengajuan Anda sedang menunggu persetujuan dari UMKM. Anda akan mendapat notifikasi setelah diproses.
            </p>
          </div>

        </div>

        <!-- ===== RIGHT: Summary Column (30%) ===== -->
        <div class="flex flex-col gap-3 min-h-0">

          <!-- Summary Card -->
          <div class="bg-white rounded-xl shadow-sm p-4 flex-shrink-0 sticky top-0">
            <h3 class="font-semibold text-gray-800 text-sm pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Ringkasan Booking</span>
              <i class="pi pi-receipt text-gray-400 text-xs"></i>
            </h3>

            <div v-if="bookingData" class="mt-2">
              <!-- Success Badge -->
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="pi pi-check text-white text-xs"></i>
                </div>
                <div>
                  <p v-if="isPending" class="text-yellow-700 font-semibold text-xs">Menunggu Konfirmasi</p>
                  <p v-else class="text-green-700 font-semibold text-xs">Berhasil</p>
                  <p class="text-gray-400 text-xs">{{ bookingData.id === 'pending' ? 'Pending' : `#${bookingData.id}` }}</p>
                </div>
              </div>

              <!-- Summary Rows -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">Layanan</span>
                  <span class="font-medium text-gray-800 text-right max-w-[55%] line-clamp-1">{{ bookingData.service_title }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">Nama</span>
                  <span class="text-gray-700 text-right max-w-[55%] line-clamp-1">{{ bookingData.customer_name }}</span>
                </div>
                <!-- Tanggal & Jam - only show for booking services -->
                <template v-if="usesBooking">
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-500">Tanggal</span>
                    <span class="text-gray-700">{{ bookingData.date }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-500">Waktu</span>
                    <span class="text-gray-700">{{ bookingData.time }}</span>
                  </div>
                </template>
                <div v-if="bookingData.payment_method" class="flex justify-between text-xs">
                  <span class="text-gray-500">Pembayaran</span>
                  <span class="text-gray-700">{{ bookingData.payment_method }}</span>
                </div>
                <!-- Status Bayar - only show for non-COD -->
                <div v-if="bookingData.payment_method_raw && bookingData.payment_method_raw.toUpperCase() !== 'COD'" class="flex justify-between text-xs">
                  <span class="text-gray-500">Status Bayar</span>
                  <span
                    class="px-1.5 py-0.5 rounded-full text-[10px]"
                    :class="bookingData.is_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                  >
                    {{ bookingData.payment_status }}
                  </span>
                </div>
                <div class="flex justify-between items-center text-xs pt-1.5 mt-1 border-t border-gray-100">
                  <span class="text-gray-700 font-semibold">Total</span>
                  <span class="font-bold text-gray-800">{{ formatCurrency(bookingData.price) }}</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="mt-3 space-y-1.5">
                <button
                  @click="viewBooking"
                  class="w-full px-3 py-2 bg-merchant-primary text-white rounded-lg font-medium text-xs hover:bg-merchant-primary/90 transition flex items-center justify-center gap-1.5"
                >
                  <i class="pi pi-calendar text-xs"></i>
                  Lihat Detail Booking
                </button>
                <button
                  @click="goToHome"
                  class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-xs hover:bg-gray-200 transition flex items-center justify-center gap-1.5"
                >
                  <i class="pi pi-home text-xs"></i>
                  Kembali ke Home
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>