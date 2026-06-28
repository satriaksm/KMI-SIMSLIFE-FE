<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import StatusLabel from "@/components/common/StatusLabel.vue";
import Button from "@/components/common/Button.vue";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import {
  getMerchantOrderDetail,
  updateOrderStatus,
} from "@/services/api/order";
import { useToast } from "vue-toastification";
import echo from "@/libs/echo";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import api from "@/libs/axios";
import { formatPaymentLabel } from "@/utils/payment";
import { getImageUrl } from "@/libs/getImageUrl.js";

const router = useRouter();
const route = useRoute();
const toast = useToast();

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
// DATA (from API)
// ========================
const rawOrder = ref(null);
const loading = ref(true);
const actionLoading = ref(false);
let orderChannel = null;

// Countdown untuk deadline konfirmasi UMKM
const confirmCountdownText = ref("");
const isConfirmExpired = ref(false);
let confirmTimer = null;

// ========================
// JASA SPECIFIC STATE
// ========================
const showJasaRejectModal = ref(false);
const rejectReason = ref("");

const showJasaEvidenceModal = ref(false);
const showJasaEvidenceViewModal = ref(false);
const completionNote = ref("");
const evidenceFiles = ref([]);
const evidenceInputRef = ref(null);

const showJasaReviewReplyModal = ref(false);
const merchantReplyText = ref("");

// Lightbox state
const showLightboxModal = ref(false);
const lightboxEvidence = ref(null);

function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "paid":
      return "waiting_review"; // sudah bayar, menunggu konfirmasi UMKM
    case "pending":
      if (o.payment_method === 'COD') return "waiting_review";
      return beStatus;
    case "responsed":
    case "accepted":
      return "processing";
    case "delivered":
      return o.delivery_type === "pickup" ? "ready" : "shipped";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "rejected":
      return "rejected";
    case "undelivered":
      return "undelivered";
    default:
      return beStatus;
  }
}

const order = computed(() => {
  const o = rawOrder.value;
  if (!o) return null;

  // Adapt for Jasa Order robustly
  const isJasa = o.order_type === 'jasa' || !!o.jasa_order_item_id || !!o.service_name || !!o.service_type || (o.items && o.items.length === 1 && o.items[0].jasa) || (o.jasa_items && o.jasa_items.length > 0) || (o.jasaItems && o.jasaItems.length > 0);
  if (isJasa) {
    const firstJasaItem = o.jasa_items?.[0] || o.jasaItems?.[0] || null;
    const imageRaw = o.service_image_snapshot
      || o.service_image
      || firstJasaItem?.jasa_image_snapshot
      || firstJasaItem?.jasa?.image
      || firstJasaItem?.jasa?.image_url
      || o.service?.image_url
      || o.service?.image
      || o.jasa?.image_url
      || o.jasa?.image
      || (o.items?.[0]?.image_url)
      || (o.items?.[0]?.service_image_snapshot)
      || (o.items?.[0]?.jasa?.image_url)
      || (o.items?.[0]?.jasa?.image)
      || (o.items?.[0]?.image);
    
    const resolvedImage = imageRaw ? getImageUrl(imageRaw) : "/images/placeholder-service.png";

    // Customer mapping with fallbacks
    const customerName = o.customer_name 
      || o.customer?.name 
      || o.user?.name 
      || o.nama_pemesan 
      || "Pelanggan";

    const customerPhone = o.customer_phone 
      || o.customer?.phone 
      || o.user?.phone 
      || o.no_hp 
      || "-";

    const customerEmail = o.customer_email 
      || o.customer?.email 
      || o.user?.email 
      || "";

    const customerPic = o.customer?.profile_picture 
      || o.user?.profile_picture 
      || null;

    // Invoice mapping with fallbacks
    const resolvedInvoice = o.invoice 
      || o.order_number 
      || o.order_code 
      || o.invoice_code 
      || (o.id ? `SO-${String(o.id).padStart(6, '0')}` : "-");

    // Service Type mapping with fallbacks
    const rawType = o.service_type || o.tipe_layanan || (o.items?.[0]?.service_type);
    let resolvedServiceTypeLabel = o.service_type_label 
      || o.tipe_layanan 
      || o.tipe_layanan_label 
      || (o.items?.[0]?.service_type_label);

    if (!resolvedServiceTypeLabel && rawType) {
      const typeVal = String(rawType).toLowerCase().trim();
      if (typeVal === 'online') resolvedServiceTypeLabel = 'Online';
      else if (['di_tempat_umkm', 'ditempat_umkm', 'at_location'].includes(typeVal)) resolvedServiceTypeLabel = 'Di Tempat UMKM';
      else if (['ke_rumah_pelanggan', 'on_site'].includes(typeVal)) resolvedServiceTypeLabel = 'Ke Tempat Pelanggan';
      else resolvedServiceTypeLabel = rawType;
    }
    resolvedServiceTypeLabel = resolvedServiceTypeLabel || "-";

    // Cara Pemesanan mapping with fallbacks
    const rawMethod = o.cara_pemesanan || o.order_method || (o.items?.[0]?.order_method);
    let resolvedCaraPemesananLabel = o.cara_pemesanan_label 
      || o.order_method_label 
      || (o.items?.[0]?.order_method_label);

    if (!resolvedCaraPemesananLabel && rawMethod) {
      const methodVal = String(rawMethod).toLowerCase().trim();
      if (['checkout', 'cart', 'keranjang'].includes(methodVal)) resolvedCaraPemesananLabel = 'Checkout Tanpa Jadwal';
      else if (methodVal === 'booking') resolvedCaraPemesananLabel = 'Booking Jadwal';
      else if (['consultation', 'konsultasi'].includes(methodVal)) resolvedCaraPemesananLabel = 'Hasil Konsultasi';
      else resolvedCaraPemesananLabel = rawMethod;
    }
    resolvedCaraPemesananLabel = resolvedCaraPemesananLabel || "-";

    // Price mapping with fallbacks
    const resolvedTotal = Number(o.total || o.total_price || o.grand_total || o.final_amount || (o.items?.[0]?.price || 0));
    const resolvedSubtotal = Number(o.subtotal || o.amounts?.subtotal || resolvedTotal);
    const resolvedPlatformFee = Number(o.platform_fee || o.admin_fee || o.amounts?.platform_fee || 0);

    // Items mapping
    const itemJasaId = o.jasa_order_item_id || firstJasaItem?.id || (o.items?.[0]?.id);
    const itemJasaName = o.service_name 
      || o.service_name_snapshot 
      || firstJasaItem?.jasa_title_snapshot
      || firstJasaItem?.jasa?.title
      || firstJasaItem?.jasa?.name
      || o.jasa?.name 
      || o.jasa?.title
      || (o.items?.[0]?.name)
      || (o.items?.[0]?.service_name)
      || (o.items?.[0]?.service_name_snapshot)
      || (o.items?.[0]?.jasa?.name)
      || "Layanan Jasa";

    const itemJasaCategory = o.category_name 
      || o.category_name_snapshot 
      || firstJasaItem?.jasa?.category?.name
      || o.jasa?.category?.name 
      || (o.items?.[0]?.category)
      || (o.items?.[0]?.category_name)
      || (o.items?.[0]?.category_name_snapshot)
      || (o.items?.[0]?.jasa?.category?.name)
      || "";

    return {
      id: o.id,
      order_type: 'jasa',
      invoice: resolvedInvoice,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        profile_picture: customerPic,
      },
      status: o.status,
      _rawStatus: o.status,
      payment_method: formatPaymentLabel(o),
      created_at: o.created_at,
      booking_date: o.booking_date || (o.items?.[0]?.booking_date),
      booking_time: o.booking_time || (o.items?.[0]?.booking_time),
      booking_note: o.booking_note || (o.items?.[0]?.booking_note),
      service_type: rawType,
      service_type_label: resolvedServiceTypeLabel,
      cara_pemesanan: rawMethod,
      cara_pemesanan_label: resolvedCaraPemesananLabel,
      service_location_address: o.service_location_address || (o.items?.[0]?.service_location_address),
      completion_evidences: o.completion_evidences || [],
      review: o.review || null,
      merchant_reply: o.merchant_reply || null,
      is_paid: o.is_paid,
      is_cod: o.is_cod,
      can_merchant_confirm: o.can_merchant_confirm,
      show_merchant_countdown: o.show_merchant_countdown,
      status_label: o.status_label,
      items: [
        {
          id: itemJasaId,
          name: itemJasaName,
          image: resolvedImage,
          price: resolvedTotal,
          qty: 1,
          category: itemJasaCategory,
          subtotal: resolvedTotal,
        }
      ],
      amounts: {
        subtotal: resolvedSubtotal,
        discount: 0,
        shipping: 0,
        platform_fee: resolvedPlatformFee,
        total: resolvedTotal,
      },
      buyer_lat: o.customer_latitude,
      buyer_lng: o.customer_longitude,
      merchant_lat: o.merchant?.primary_address?.latitude,
      merchant_lng: o.merchant?.primary_address?.longitude,
      note: o.booking_note || "",
      proof_image_url: o.completion_evidence?.file_url ? getImageUrl(o.completion_evidence.file_url) : null,
      failed_reason: o.rejection_reason || null,
    };
  }

  // Standard Product Order
  return {
    id: o.id,
    invoice: o.order_code || "-",
    customer: {
      name: o.user_name_snapshot || "Pelanggan",
      phone: o.user_phone_snapshot || "-",
      email: o.user?.email || "",
      profile_picture: o.user?.profile_picture || null,
    },
    status: mapApiStatus(o.status, o),
    _rawStatus: o.status,
    payment_method: o.payment_method || (o.payment?.payment_method || (o.delivery_type === 'pickup' && !o.payment ? "COD" : "Transfer")),
    created_at: o.created_at,
    items: (o.order_items || o.orderItems || o.items || []).map((it) => {
      console.log('[merchant/Detail] product data:', it.product);
      return {
        id: it.id,
        product: it.product ? {
          name: it.product.name,
          image: it.product.image
        } : null,
        variant: it.product_variant_snapshot || "",
        addons: (it.addons || []).map((a) => ({
          name: a.addon_name_snapshot || a.addon?.name || "Addon",
          price: Number(a.addon_price_snapshot || 0),
        })),
        qty: it.quantity,
        price: it.price !== undefined && it.price !== null ? it.price : 0,
        subtotal: it.subtotal_snapshot || it.unit_price_snapshot * it.quantity,
      };
    }),
    amounts: {
      subtotal: Number(o.subtotal || 0),
      discount: Number(o.discount_total || 0),
      shipping: Number(o.delivery_fee_snapshot || 0),
      platform_fee: Number(o.platform_fee || 0),
      total: Number(o.gross_amount || 0),
    },
    shipping_address: [
      o.address_detail_snapshot,
      o.village_name_snapshot,
      o.district_name_snapshot,
      o.city_name_snapshot,
      o.province_name_snapshot,
    ]
      .filter(Boolean)
      .join(", "),
    buyer_lat: o.latitude_snapshot,
    buyer_lng: o.longitude_snapshot,
    merchant_lat: o.merchant?.primary_address?.latitude,
    merchant_lng: o.merchant?.primary_address?.longitude,
    delivery_type: o.delivery_type,
    note: o.notes || "",
    proof_image_url: o.proof_image_url,
    failed_reason: o.failed_reason,
  };
});

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/order-snapshots/${orderItemId}`;
}

async function fetchOrder() {
  if (!currentMerchantSlug.value || !route.params?.orderId) return;
  loading.value = true;
  try {
    const { data: res } = await getMerchantOrderDetail(
      currentMerchantSlug.value,
      route.params.orderId,
    );
    rawOrder.value = res?.data ?? res ?? null;

    // Preload images
    const imageUrls = [];
    if (order.value?.items) {
      order.value.items.forEach((item) => {
        if (item.image) imageUrls.push(item.image);
      });
    }
    if (order.value?.customer?.profile_picture) {
      imageUrls.push(order.value.customer.profile_picture);
    }
    if (order.value?.proof_image_url) {
      imageUrls.push(order.value.proof_image_url);
    }

    if (imageUrls.length > 0) {
      await Promise.all(
        imageUrls.map(
          (url) =>
            new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "use-credentials";
              img.onload = resolve;
              img.onerror = resolve;
              img.src = url;
            })
        )
      );
    }

    startConfirmCountdown();
  } catch (e) {
    console.error("Gagal memuat detail pesanan:", e);
    toast.error("Gagal memuat detail pesanan");
    rawOrder.value = null;
  } finally {
    loading.value = false;
  }
}

// ========================
// STATUS CONFIG
// ========================
const statusConfig = {
  waiting_review: {
    props: {
      variant: "payment",
      status: "pending",
      label: "Perlu Konfirmasi",
      size: "sm",
      showIcon: true,
    },
    nextAction: {
      label: "Terima Pesanan",
      icon: "pi-check-circle",
      color: "bg-merchant-primary",
    },
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
  ditolak: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Ditolak Merchant",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  dibatalkan: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Dibatalkan Customer",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  cancelled: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Dibatalkan Customer",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  rejected: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Ditolak Merchant",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
  undelivered: {
    props: {
      variant: "order",
      status: "cancelled",
      label: "Gagal Kirim",
      size: "sm",
      showIcon: true,
    },
    nextAction: null,
  },
};

const currentStatusConfig = computed(() => {
  const s = order.value?.status;
  if (!s) return statusConfig.waiting_review;

  // Jasa status map
  if (order.value?.order_type === 'jasa') {
    const map = {
      menunggu_konfirmasi_merchant: {
        props: {
          variant: "payment",
          status: "pending",
          label: "Perlu Konfirmasi",
          size: "sm",
          showIcon: true,
        }
      },
      diterima: {
        props: {
          variant: "order",
          status: "processing",
          label: "Diterima",
          size: "sm",
          showIcon: true,
        }
      },
      layanan_dikerjakan: {
        props: {
          variant: "order",
          status: "processing",
          label: "Layanan Dikerjakan",
          size: "sm",
          showIcon: true,
        }
      },
      menunggu_konfirmasi_selesai: {
        props: {
          variant: "order",
          status: "processing",
          label: "Menunggu Konfirmasi Selesai",
          size: "sm",
          showIcon: true,
        }
      },
      selesai: {
        props: {
          variant: "order",
          status: "completed",
          label: "Selesai",
          size: "sm",
          showIcon: true,
        }
      },
      ditolak: {
        props: {
          variant: "order",
          status: "cancelled",
          label: "Ditolak Merchant",
          size: "sm",
          showIcon: true,
        }
      },
      dibatalkan: {
        props: {
          variant: "order",
          status: "cancelled",
          label: "Dibatalkan Customer",
          size: "sm",
          showIcon: true,
        }
      },
      expired: {
        props: {
          variant: "order",
          status: "cancelled",
          label: "Kadaluarsa",
          size: "sm",
          showIcon: true,
        }
      },
      kadaluarsa: {
        props: {
          variant: "order",
          status: "cancelled",
          label: "Kadaluarsa",
          size: "sm",
          showIcon: true,
        }
      }
    };
    return map[s] ?? {
      props: {
        variant: "order",
        status: "pending",
        label: rawOrder.value?.status_label || s,
        size: "sm",
        showIcon: true,
      }
    };
  }

  return statusConfig[s] ?? statusConfig.waiting_review;
});

// ========================
// ORDER TIMELINE
// ========================
const isJasaUnpaidOnline = (order) => {
  if (!order) return false;
  if (order.order_type !== 'jasa') return false;

  const isCod = order.is_cod === true;
  const isPaid = order.is_paid === true;

  const isCancelledOrExpired = [
    'batal',
    'cancelled',
    'canceled',
    'expired',
    'kadaluarsa',
    'ditolak',
    'dibatalkan',
    'rejected'
  ].includes(String(order.status || '').toLowerCase());

  return !isCod && !isPaid && !isCancelledOrExpired;
};

const timeline = computed(() => {
  if (!order.value) return [];
  let status = order.value.status;

  // Jasa Stepper Map
  if (order.value.order_type === 'jasa') {
    const isUnpaid = isJasaUnpaidOnline(order.value);
    const isCod = order.value.is_cod === true;
    const isPaid = order.value.is_paid === true;

    if (status === 'pending') {
      status = isUnpaid ? 'menunggu_pembayaran' : 'menunggu_konfirmasi_merchant';
    } else if (status === 'menunggu_konfirmasi' || status === 'menunggu_konfirmasi_merchant') {
      status = 'menunggu_konfirmasi_merchant';
    } else if (['diterima', 'accepted', 'responsed'].includes(status)) {
      status = 'diterima';
    } else if (['proses', 'processing', 'layanan_dikerjakan', 'dikerjakan'].includes(status)) {
      status = 'layanan_dikerjakan';
    } else if (['menunggu_selesai', 'menunggu_konfirmasi_selesai'].includes(status)) {
      status = 'menunggu_konfirmasi_selesai';
    } else if (['completed', 'selesai'].includes(status)) {
      status = 'selesai';
    }

    const steps = [
      {
        key: "menunggu_pembayaran",
        label: isCod ? "Pesanan Dibuat" : "Menunggu Pembayaran",
        desc: isCod ? "Pesanan dibuat (COD)" : (isPaid ? "Pembayaran diterima" : "Menunggu pembayaran customer"),
        icon: "pi-wallet",
      },
      {
        key: "menunggu_konfirmasi_merchant",
        label: "Menunggu Konfirmasi",
        desc: "Menunggu respon merchant",
        icon: "pi-clock",
      },
      {
        key: "diterima",
        label: "Diterima",
        desc: "Pesanan diterima",
        icon: "pi-check-circle",
      },
      {
        key: "layanan_dikerjakan",
        label: "Layanan Dikerjakan",
        desc: "Sedang dikerjakan",
        icon: "pi-sync",
      },
      {
        key: "menunggu_konfirmasi_selesai",
        label: "Konfirmasi Selesai",
        desc: "Menunggu respon pelanggan",
        icon: "pi-info-circle",
      },
      {
        key: "selesai",
        label: "Selesai",
        desc: "Layanan selesai",
        icon: "pi-flag",
      },
    ];

    const statusOrder = [
      "menunggu_pembayaran",
      "menunggu_konfirmasi_merchant",
      "diterima",
      "layanan_dikerjakan",
      "menunggu_konfirmasi_selesai",
      "selesai",
    ];

    const order_idx = statusOrder.indexOf(status);
    return steps.map((s, i) => ({
      ...s,
      done: i <= order_idx && !['ditolak', 'dibatalkan', 'expired', 'kadaluarsa', 'cancelled', 'rejected'].includes(status),
      active: statusOrder.indexOf(s.key) === order_idx,
    }));
  }

  // Standard Product Stepper Map
  const isPickup = order.value.delivery_type === "pickup";
  const steps = [
    {
      key: "waiting_review",
      label: "Menunggu Konfirmasi",
      desc: "Pembayaran diterima",
      icon: "pi-credit-card",
    },
    {
      key: "processing",
      label: "Sedang Diproses",
      desc: "Pesanan disiapkan",
      icon: "pi-sync",
    },
    {
      key: isPickup ? "ready" : "shipped",
      label: isPickup ? "Siap Diambil" : "Sedang Diantar",
      desc: isPickup ? "Siap diambil di toko" : "Pesanan dikirim",
      icon: isPickup ? "pi-map-marker" : "pi-truck",
    },
    {
      key: "completed",
      label: "Pesanan Selesai",
      desc: isPickup ? "Pesanan diambil" : "Pesanan diterima",
      icon: "pi-check-circle",
    },
  ];

  const statusOrder = [
    "waiting_review",
    "processing",
    isPickup ? "ready" : "shipped",
    "completed",
  ];
  const order_idx = statusOrder.indexOf(status);
  return steps.map((s, i) => ({
    ...s,
    done: i <= order_idx && status !== "cancelled",
    active: statusOrder.indexOf(s.key) === order_idx,
  }));
});

// ========================
// DISTANCE & ROUTE
// ========================
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
const distanceKm = computed(() => {
  if (!order.value?.buyer_lat || !order.value?.buyer_lng || !order.value?.merchant_lat || !order.value?.merchant_lng) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(order.value.buyer_lat - order.value.merchant_lat);
  const dLon = deg2rad(order.value.buyer_lng - order.value.merchant_lng);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(order.value.merchant_lat)) * Math.cos(deg2rad(order.value.buyer_lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d.toFixed(1);
});

const gmapsRouteUrl = computed(() => {
  if (!order.value?.buyer_lat || !order.value?.buyer_lng || !order.value?.merchant_lat || !order.value?.merchant_lng) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${order.value.merchant_lat},${order.value.merchant_lng}&destination=${order.value.buyer_lat},${order.value.buyer_lng}`;
});

const waLink = computed(() => {
  if (!order.value?.customer?.phone) return "#";
  let phone = order.value.customer.phone.replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  return `https://wa.me/${phone}`;
});

// ========================
// CONFIRM STATUS MODAL (PRODUCT)
// ========================
const showConfirmModal = ref(false);
const actionType = ref("next");
const proofImage = ref(null);
const failedReason = ref("");

function getNextStatus() {
  const rawStatus = rawOrder.value?.status;
  switch (rawStatus) {
    case "paid":
      return "accepted"; // UMKM terima pesanan yang sudah dibayar
    case "pending":
      // COD order — UMKM bisa langsung terima
      if (rawOrder.value?.payment_method === 'COD') return "accepted";
      return null; // Transfer pending = belum bayar
    case "responsed":
    case "accepted":
      return "delivered";
    case "delivered":
      // UMKM (penjual) bisa menekan "completed" (Pesanan Tiba) untuk semua jenis pesanan
      return "completed";
    default:
      return null;
  }
}

const nextActionLabel = computed(() => {
  const next = getNextStatus();
  const isPickup = order.value?.delivery_type === "pickup";
  switch (next) {
    case "accepted":
      return "Terima & Proses Pesanan";
    case "delivered":
      return isPickup ? "Tandai Siap Diambil" : "Tandai Dikirim";
    case "completed":
      return isPickup ? "Tandai Selesai / Sudah Diambil" : "Pesanan Tiba & Selesai";
    default:
      return null;
  }
});

// Apakah bisa dibatalkan oleh UMKM
const canCancel = computed(() => {
  const s = rawOrder.value?.status;
  return s === "paid" || s === "responsed" || s === "accepted" || (s === "pending" && rawOrder.value?.payment_method === 'COD');
});

// Apakah bisa ditandai gagal kirim (undelivered) / tidak diambil
const canUndelivered = computed(() => {
  const s = rawOrder.value?.status;
  return s === "delivered";
});

function onFileChange(e) {
  if (e.target.files && e.target.files[0]) {
    proofImage.value = e.target.files[0];
  }
}

// ========================
// JASA HELPERS & ACTIONS
// ========================
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8000";

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

function getEvidenceUrl(evidence) {
  const raw =
    evidence?.file_url ||
    evidence?.url ||
    evidence?.media_url ||
    evidence?.evidence_url ||
    evidence?.file_path ||
    evidence?.path;

  if (!raw) return null;
  if (String(raw).startsWith('http')) return raw;
  if (String(raw).startsWith('/storage')) return `${API_URL}${raw}`;
  return `${API_URL}/storage/${String(raw).replace(/^\/+/, '').replace(/^public\//, '')}`;
}

function isImageEvidence(evidence) {
  const type = evidence?.file_type || evidence?.media_type || evidence?.mime_type || '';
  const url = getEvidenceUrl(evidence) || '';
  return String(type).includes('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
}

function isVideoEvidence(evidence) {
  const type = evidence?.file_type || evidence?.media_type || evidence?.mime_type || '';
  const url = getEvidenceUrl(evidence) || '';
  return String(type).includes('video') || /\.(mp4|mov|webm)$/i.test(url);
}

function openLightbox(ev) {
  lightboxEvidence.value = ev;
  showLightboxModal.value = true;
}

function openJasaRejectModal() {
  rejectReason.value = "";
  showJasaRejectModal.value = true;
}

async function submitJasaRejection() {
  if (!rejectReason.value.trim()) {
    toast.error("Alasan penolakan wajib diisi");
    return;
  }
  actionLoading.value = true;
  const payload = {
    status: 'ditolak',
    rejection_reason: rejectReason.value,
  };
  console.log('[submitJasaRejection] Payload:', payload);
  try {
    await updateOrderStatus(currentMerchantSlug.value, order.value.id, payload);
    toast.success("Pesanan berhasil ditolak");
    showJasaRejectModal.value = false;
    await fetchOrder();
  } catch (e) {
    console.error('[submitJasaRejection] Error response:', e.response?.data || e);
    toast.error(e.response?.data?.message || "Gagal menolak pesanan");
  } finally {
    actionLoading.value = false;
  }
}

async function updateJasaStatusAction(status) {
  actionLoading.value = true;
  const payload = { status: status };
  console.log('[updateJasaStatusAction] Payload:', payload);
  try {
    await updateOrderStatus(currentMerchantSlug.value, order.value.id, payload);
    toast.success(
      status === 'layanan_dikerjakan'
        ? "Pesanan mulai dikerjakan"
        : "Status pesanan berhasil diperbarui"
    );
    await fetchOrder();
  } catch (e) {
    console.error('[updateJasaStatusAction] Error response:', e.response?.data || e);
    toast.error(e.response?.data?.message || "Gagal memperbarui status");
  } finally {
    actionLoading.value = false;
  }
}

function openJasaEvidenceUploadModal() {
  completionNote.value = "";
  evidenceFiles.value = [];
  showJasaEvidenceModal.value = true;
}

function handleEvidenceFileSelect(event) {
  const files = Array.from(event.target.files || []);
  const maxImageSize = 5 * 1024 * 1024;
  const maxVideoSize = 50 * 1024 * 1024;
  const validImages = ['image/jpeg', 'image/png', 'image/webp'];
  const validVideos = ['video/mp4', 'video/quicktime', 'video/webm'];

  for (const file of files) {
    const isImage = validImages.includes(file.type);
    const isVideo = validVideos.includes(file.type);
    if (!isImage && !isVideo) {
      toast.error(`File ${file.name} tidak valid. Gunakan gambar atau video.`);
      continue;
    }
    const maxAllowed = isImage ? maxImageSize : maxVideoSize;
    const maxMB = isImage ? 5 : 50;
    if (file.size > maxAllowed) {
      toast.error(`File ${file.name} terlalu besar. Maksimal ${maxMB}MB.`);
      continue;
    }
    evidenceFiles.value.push(file);
  }
  event.target.value = '';
}

function removeEvidenceFile(index) {
  evidenceFiles.value.splice(index, 1);
}

async function submitJasaEvidence() {
  if (evidenceFiles.value.length === 0) {
    toast.error("Minimal 1 bukti pengerjaan wajib diunggah");
    return;
  }
  actionLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('status', 'menunggu_konfirmasi_selesai');
    formData.append('completion_note', completionNote.value || '');
    evidenceFiles.value.forEach((file) => {
      formData.append('evidences[]', file);
    });

    await updateOrderStatus(currentMerchantSlug.value, order.value.id, formData);
    toast.success("Bukti pengerjaan berhasil dikirim");
    showJasaEvidenceModal.value = false;
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal mengirim bukti pengerjaan");
  } finally {
    actionLoading.value = false;
  }
}

function openJasaEvidenceViewModal() {
  showJasaEvidenceViewModal.value = true;
}

function openJasaReviewReplyModal() {
  merchantReplyText.value = order.value.review?.merchant_reply || order.value.merchant_reply || "";
  showJasaReviewReplyModal.value = true;
}

async function submitMerchantReply() {
  if (!merchantReplyText.value.trim()) {
    toast.error("Tanggapan tidak boleh kosong");
    return;
  }
  if (merchantReplyText.value.length > 1000) {
    toast.error("Tanggapan maksimal 1000 karakter");
    return;
  }

  actionLoading.value = true;
  try {
    const reviewId = order.value.review?.id;
    if (!reviewId) {
      toast.error("Review tidak ditemukan");
      return;
    }
    await api.post(
      `/api/merchant/${currentMerchantSlug.value}/reviews/${reviewId}/reply`,
      { merchant_reply: merchantReplyText.value }
    );
    toast.success("Tanggapan berhasil dikirim");
    showJasaReviewReplyModal.value = false;
    merchantReplyText.value = "";
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal mengirim tanggapan");
  } finally {
    actionLoading.value = false;
  }
}

function copyInvoice(text) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  toast.success("Nomor pesanan berhasil disalin");
}

// ========================
// COUNTDOWN TIMER KONFIRMASI
// ========================
function startConfirmCountdown() {
  if (confirmTimer) clearInterval(confirmTimer);

  const isJasa = rawOrder.value?.order_type === 'jasa';
  const deadline = isJasa ? rawOrder.value?.merchant_response_deadline : rawOrder.value?.confirm_deadline;
  const status = rawOrder.value?.status;

  // Hanya tampilkan countdown jika status masih menunggu konfirmasi
  const isWaiting = isJasa
    ? status === 'menunggu_konfirmasi_merchant'
    : ['pending', 'paid'].includes(status);

  if (!deadline || !isWaiting) {
    confirmCountdownText.value = "";
    isConfirmExpired.value = false;
    return;
  }

  // COD pending: tampilkan
  // Transfer paid: tampilkan
  // Transfer pending (belum bayar): jangan tampilkan
  if (!isJasa && status === 'pending' && rawOrder.value?.payment_method !== 'COD') {
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

async function confirmAction() {
  let targetStatus;
  if (actionType.value === 'reject') targetStatus = 'rejected';
  else if (actionType.value === 'undelivered') targetStatus = 'undelivered';
  else targetStatus = getNextStatus();
  
  if (!targetStatus || !currentMerchantSlug.value || !rawOrder.value?.id) return;

  actionLoading.value = true;
  try {
    let payload = targetStatus;
    if ((targetStatus === 'completed' || targetStatus === 'undelivered') && proofImage.value) {
      payload = new FormData();
      payload.append('status', targetStatus);
      payload.append('proof_image', proofImage.value);
      if (targetStatus === 'undelivered' && failedReason.value) {
        payload.append('failed_reason', failedReason.value);
      }
    } else if (targetStatus === 'undelivered' && !proofImage.value) {
        toast.error("Bukti foto wajib diunggah untuk pesanan gagal kirim.");
        actionLoading.value = false;
        return;
    } else if (targetStatus === 'completed' && !proofImage.value && rawOrder.value?.delivery_type !== 'pickup') {
        toast.error("Bukti foto wajib diunggah saat barang telah tiba.");
        actionLoading.value = false;
        return;
    }

    await updateOrderStatus(
      currentMerchantSlug.value,
      rawOrder.value.id,
      payload,
    );
    toast.success("Status pesanan berhasil diperbarui");
    showConfirmModal.value = false;
    proofImage.value = null;
    failedReason.value = "";
    await fetchOrder();
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal memperbarui status");
  } finally {
    actionLoading.value = false;
  }
}

function handleCancel() {
  actionType.value = 'reject';
  showConfirmModal.value = true;
}

function handleUndelivered() {
  actionType.value = 'undelivered';
  showConfirmModal.value = true;
}

function handleNextAction() {
  actionType.value = 'next';
  showConfirmModal.value = true;
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

onMounted(() => {
  fetchOrder();
  subscribeOrderChannel();
});

onUnmounted(() => {
  leaveOrderChannel(route.params?.orderId);
  if (confirmTimer) clearInterval(confirmTimer);
});

watch(
  () => route.params?.orderId,
  (next, prev) => {
    if (prev) {
      leaveOrderChannel(prev);
    }
    if (next) {
      subscribeOrderChannel();
    }
  },
);

function subscribeOrderChannel() {
  const id = route.params?.orderId;
  if (!id) return;

  orderChannel = echo.private(`orders.${id}`);
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

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <MerchantMobileHeader title="Detail Pesanan" :backRoute="`/merchant-center/${currentMerchantSlug}/orders`" />

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

    <!-- Loading Skeleton -->
    <div
      v-if="loading"
      class=" px-4 py-2 mx-auto space-y-4 sm:px-6 sm:py-6"
    >
      <!-- Timeline skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
        <div class="w-28 h-4 mb-4 bg-gray-200 rounded"></div>
        <div class="flex items-center gap-2">
          <div v-for="n in 4" :key="'tl-'+n" class="flex items-center flex-1">
            <div class="w-8 h-8 bg-gray-200 rounded-full shrink-0"></div>
            <div v-if="n < 4" class="flex-1 h-0.5 bg-gray-200 mx-1"></div>
          </div>
        </div>
        <div class="flex items-center justify-between mt-4">
          <div class="space-y-1">
            <div class="w-20 h-3 bg-gray-200 rounded"></div>
            <div class="w-32 h-3 bg-gray-200 rounded"></div>
          </div>
          <div class="w-20 h-6 bg-gray-200 rounded-full"></div>
        </div>
      </div>
      <!-- Countdown skeleton -->
      <div class="p-3 bg-white border border-gray-200 rounded-xl animate-pulse">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 bg-amber-100 rounded-full"></div>
          <div class="w-48 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
      <!-- Customer info skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
        <div class="w-28 h-4 mb-3 bg-gray-200 rounded"></div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div class="flex-1 space-y-2">
            <div class="w-1/3 h-4 bg-gray-200 rounded"></div>
            <div class="w-1/4 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      <!-- Items skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
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
      <!-- Summary skeleton -->
      <div class="p-4 bg-white shadow-sm rounded-2xl animate-pulse">
        <div class="w-32 h-4 mb-4 bg-gray-200 rounded"></div>
        <div class="space-y-2">
          <div class="flex justify-between"><div class="w-20 h-3 bg-gray-200 rounded"></div><div class="w-16 h-3 bg-gray-200 rounded"></div></div>
          <div class="flex justify-between"><div class="w-24 h-3 bg-gray-200 rounded"></div><div class="w-16 h-3 bg-gray-200 rounded"></div></div>
          <div class="flex justify-between pt-2 border-t border-gray-100"><div class="w-16 h-4 bg-gray-200 rounded"></div><div class="w-24 h-4 bg-gray-200 rounded"></div></div>
        </div>
      </div>
      <!-- Action buttons skeleton -->
      <div class="flex gap-3 animate-pulse">
        <div class="flex-1 h-11 bg-gray-200 rounded-xl"></div>
        <div class="flex-1 h-11 bg-gray-200 rounded-xl"></div>
      </div>
    </div>

    <div
      v-else-if="!order"
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

    <div v-else class=" px-4 py-2 mx-auto space-y-4 sm:px-6 sm:py-6">
      <!-- ======================== -->
      <!-- TIMELINE                 -->
      <!-- ======================== -->
      <div
        v-if="order && !['cancelled', 'rejected', 'ditolak', 'dibatalkan', 'expired', 'kadaluarsa'].includes(order.status)"
        class="p-4 bg-white shadow-sm rounded-2xl"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-700">Status Pesanan</h2>
          <div class="sm:hidden">
            <StatusLabel v-bind="currentStatusConfig.props" />
          </div>
        </div>
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
        v-if="order && ['cancelled', 'rejected', 'undelivered', 'ditolak', 'dibatalkan', 'expired', 'kadaluarsa'].includes(order.status)"
        class="flex flex-col gap-3 p-4 border rounded-2xl"
        :class="order.status === 'undelivered' ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'"
      >
        <div class="flex items-center gap-3">
          <i class="text-xl pi shrink-0" :class="order.status === 'undelivered' ? 'pi-exclamation-triangle text-orange-500' : 'pi-times-circle text-red-500'"></i>
          <div>
            <p class="text-sm font-semibold" :class="order.status === 'undelivered' ? 'text-orange-700' : 'text-red-700'">
              {{ ['rejected', 'ditolak'].includes(order.status) ? 'Pesanan Ditolak Penjual' : ['expired', 'kadaluarsa'].includes(order.status) ? 'Pesanan Kadaluarsa' : order.status === 'undelivered' ? (rawOrder?.delivery_type === 'pickup' ? 'Pesanan Tidak Diambil' : 'Pesanan Gagal Kirim') : 'Pesanan Dibatalkan' }}
            </p>
            <p v-if="order.note || order.failed_reason" class="text-xs mt-0.5" :class="order.status === 'undelivered' ? 'text-orange-600' : 'text-red-500'">
              {{ order.failed_reason || order.note }}
            </p>
          </div>
        </div>
      </div>

      <!-- Countdown konfirmasi UMKM -->
      <div
        v-if="order && confirmCountdownText && (order.status === 'waiting_review' || order.status === 'menunggu_konfirmasi_merchant')"
        class="p-4 bg-white shadow-sm rounded-2xl"
      >
        <div v-if="isConfirmExpired" class="flex items-center gap-3">
          <i class="text-xl text-red-500 pi pi-clock shrink-0"></i>
          <div>
            <p class="text-sm font-semibold text-red-700">Batas waktu konfirmasi habis</p>
            <p class="text-xs text-red-500 mt-0.5">Pesanan akan otomatis dibatalkan.</p>
          </div>
        </div>
        <div v-else class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 shrink-0">
            <i class="text-lg pi pi-clock text-amber-600"></i>
          </div>
          <div class="flex-1">
            <p class="text-xs text-gray-500">Batas waktu konfirmasi pesanan</p>
            <p class="text-lg font-bold text-amber-700 font-mono">{{ confirmCountdownText }}</p>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ORDER INFO               -->
      <!-- ======================== -->
      <div class="p-4 space-y-3 bg-white shadow-sm rounded-2xl">
        <div class="flex items-center justify-between pb-2 border-b border-gray-100">
          <h2 class="text-sm font-semibold text-gray-700">
            Informasi Pesanan
          </h2>
          <div>
            <StatusLabel v-bind="currentStatusConfig.props" />
          </div>
        </div>
        <div class="grid grid-cols-2 text-sm gap-y-3 gap-x-4">
          <div>
            <p class="text-xs text-gray-400">No. Pesanan</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <p class="font-medium text-gray-800">{{ order.invoice }}</p>
              <button @click="copyInvoice(order.invoice)" class="text-gray-400 hover:text-merchant-primary transition p-0.5" title="Salin nomor pesanan">
                <i class="pi pi-copy text-xs"></i>
              </button>
            </div>
          </div>
          <div>
            <p class="text-xs text-gray-400">Tanggal</p>
            <p class="font-medium text-gray-800 mt-0.5">
              {{ formatDate(order.booking_date || order.created_at) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Jam</p>
            <p class="font-medium text-gray-800 mt-0.5">
              {{ order.booking_time || formatTime(order.created_at) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Metode Pembayaran</p>
            <p class="font-medium text-gray-800 mt-0.5">{{ order.payment_method }}</p>
          </div>
          <div v-if="order.order_type !== 'jasa'">
            <p class="text-xs text-gray-400">Metode Pengiriman</p>
            <p class="font-medium text-gray-800 mt-0.5">
              {{ order.delivery_type === 'pickup' ? 'Ambil Sendiri (Pickup)' : 'Kirim ke Alamat (Delivery)' }}
            </p>
          </div>
          <div v-if="order.order_type === 'jasa'">
            <p class="text-xs text-gray-400">Cara Pemesanan</p>
            <p class="font-medium text-gray-800 mt-0.5">{{ order.cara_pemesanan_label || '-' }}</p>
          </div>
          <div v-if="order.order_type === 'jasa'">
            <p class="text-xs text-gray-400">Tipe Layanan</p>
            <p class="font-medium text-gray-800 mt-0.5">{{ order.service_type_label || '-' }}</p>
          </div>
          <div v-if="order.order_type === 'jasa' && order.booking_date">
            <p class="text-xs text-gray-400">Jadwal Layanan</p>
            <p class="font-medium text-gray-800 mt-0.5">
              {{ formatDate(order.booking_date) }} {{ order.booking_time || '' }}
            </p>
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
          <div class="w-10 h-10 overflow-hidden bg-gray-100 rounded-full shrink-0 flex items-center justify-center border border-gray-200">
            <img v-if="order.customer.profile_picture" :src="order.customer.profile_picture" class="object-cover w-full h-full" alt="Customer avatar" />
            <svg v-else class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">
              {{ order.customer.name }}
            </p>
            <a :href="waLink" target="_blank" class="text-xs text-merchant-primary underline flex items-center gap-1 mt-0.5">
              <i class="pi pi-whatsapp"></i> {{ order.customer.phone }}
            </a>
            <p v-if="order.customer.email" class="text-xs text-gray-500 mt-0.5">
              {{ order.customer.email }}
            </p>
          </div>
        </div>

        <div v-if="order.shipping_address && order.delivery_type === 'delivery' && order.order_type !== 'jasa'" class="pt-1">
          <p class="mb-1 text-xs text-gray-400">Alamat Pengiriman</p>
          <div class="flex items-start gap-2">
            <i
              class="pi pi-map-marker text-xs text-gray-400 mt-0.5 shrink-0"
            ></i>
            <div class="flex-1">
              <p class="text-sm text-gray-700">{{ order.shipping_address }}</p>
              <div v-if="distanceKm && gmapsRouteUrl" class="mt-2 flex items-center gap-3">
                <span class="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{{ distanceKm }} km</span>
                <a :href="gmapsRouteUrl" target="_blank" class="text-xs font-semibold text-white bg-blue-500 px-3 py-1 rounded-md hover:bg-blue-600 transition flex items-center gap-1">
                  <i class="pi pi-map"></i> Rute Gmaps
                </a>
              </div>
            </div>
          </div>
        </div>

        <div v-if="order.note" class="pt-1">
          <p class="mb-1 text-xs text-gray-400">Catatan pelanggan</p>
          <div class="flex items-start gap-2">
            <i class="pi pi-comment text-xs text-gray-400 mt-0.5 shrink-0"></i>
            <p class="text-sm italic text-gray-700">{{ order.note }}</p>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- PROOF OF DELIVERY (PRODUCT) -->
      <!-- ======================== -->
      <div v-if="order.proof_image_url && order.order_type !== 'jasa'" class="p-4 bg-white shadow-sm rounded-2xl">
        <h2 class="pb-2 text-sm font-semibold text-gray-700 border-b border-gray-100">
          Bukti Foto
        </h2>
        <div class="mt-3">
          <img :src="order.proof_image_url" class="w-full max-w-sm rounded-xl border border-gray-200" alt="Bukti Foto" />
        </div>
      </div>


      <!-- ======================== -->
      <!-- ULASAN PELANGGAN (JASA)   -->
      <!-- ======================== -->
      <div v-if="order.order_type === 'jasa' && order.review" class="p-4 bg-white shadow-sm rounded-2xl">
        <h2 class="pb-2 text-sm font-semibold text-gray-700 border-b border-gray-100">
          Ulasan Pelanggan
        </h2>
        <div class="mt-3 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <i v-for="star in 5" :key="star" class="pi text-sm" :class="star <= order.review.rating ? 'pi-star-fill text-amber-400' : 'pi-star text-gray-300'"></i>
              <span class="text-sm font-bold text-gray-700 ml-1">{{ order.review.rating }}/5</span>
            </div>
            <span class="text-xs text-gray-400">{{ formatDate(order.review.created_at) }}</span>
          </div>
          <p class="text-sm text-gray-700 font-medium">
            {{ order.review.comment || 'Tidak ada komentar tertulis.' }}
          </p>

          <!-- Review Media -->
          <div v-if="order.review.media && order.review.media.length > 0" class="flex flex-wrap gap-2 pt-1">
            <div v-for="(m, idx) in order.review.media" :key="m.id || idx" class="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 cursor-pointer" @click="openLightbox({ file_url: m.file_url || m.media_url, file_type: 'image' })">
              <img :src="m.file_url || m.media_url" class="object-cover w-full h-full hover:scale-105 transition" alt="Review Media" />
            </div>
          </div>

          <!-- Merchant Reply -->
          <div v-if="order.review.merchant_reply || order.merchant_reply" class="bg-purple-50 border border-purple-100 p-3 rounded-xl mt-3">
            <div class="flex items-center gap-1.5 mb-1 text-purple-700 font-semibold text-xs">
              <i class="pi pi-comment"></i> Tanggapan Anda
            </div>
            <p class="text-xs text-purple-900 leading-relaxed">
              {{ order.review.merchant_reply || order.merchant_reply }}
            </p>
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
          {{ order.order_type === 'jasa' ? 'Layanan (1 item)' : `Produk (${order.items.length} item)` }}
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
                v-if="item.product?.image || item.image"
                :src="item.product?.image ? (item.product.image.startsWith('http') ? item.product.image : 'http://localhost:8000/storage/' + item.product.image.replace(/^\/+/, '')) : item.image"
                :alt="item.product?.name || item.name || 'Item'"
                class="object-cover w-full h-full"
              />
              <img v-else src="/placeholder.png" class="object-cover w-full h-full" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">
                {{ item.product?.name || item.name || 'Item' }}
              </p>
              <p v-if="order.order_type === 'jasa' && item.category" class="text-xs text-purple-500 font-medium mt-0.5">
                {{ item.category }}
              </p>
              <p v-if="item.variant" class="text-xs text-gray-500 mt-0.5">
                {{ item.variant }}
              </p>
              <p v-if="item.addons && item.addons.length" class="text-xs text-gray-500 mt-0.5">
                <span class="text-merchant-primary">+</span> {{ item.addons.map(a => a.name).join(', ') }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ item.qty }}x × Rp {{ formatIDR(item.price || 0) }}
              </p>
            </div>
            <p class="text-sm font-semibold text-gray-800 shrink-0">
              Rp {{ formatIDR(item.subtotal) }}
            </p>
          </div>
        </div>

        <!-- Alamat layanan jika ada (untuk Jasa) -->
        <div v-if="order.order_type === 'jasa' && order.service_location_address" class="mt-4 pt-3 border-t border-gray-100">
          <p class="mb-1 text-xs text-gray-400">Alamat Layanan</p>
          <div class="flex items-start gap-2">
            <i class="pi pi-map-marker text-xs text-gray-400 mt-0.5 shrink-0"></i>
            <p class="text-sm text-gray-700">{{ order.service_location_address }}</p>
          </div>
        </div>

        <!-- Amount breakdown -->
        <div class="pt-4 mt-4 space-y-2 border-t border-gray-100">
          <div class="flex justify-between text-sm text-gray-600">
            <span>{{ order.order_type === 'jasa' ? 'Subtotal Layanan' : 'Subtotal' }}</span>
            <span>Rp {{ formatIDR(order.amounts.subtotal) }}</span>
          </div>
          <div
            v-if="order.amounts.discount > 0 && order.order_type !== 'jasa'"
            class="flex justify-between text-sm text-green-600"
          >
            <span>Diskon</span>
            <span>-Rp {{ formatIDR(order.amounts.discount) }}</span>
          </div>
          <div v-if="order.order_type !== 'jasa'" class="flex justify-between text-sm text-gray-600">
            <span>Ongkos Kirim</span>
            <span>Rp {{ formatIDR(order.amounts.shipping) }}</span>
          </div>
          <div
            v-if="order.amounts.platform_fee > 0"
            class="flex justify-between text-sm text-gray-600"
          >
            <span>Biaya Layanan/Admin</span>
            <span>Rp {{ formatIDR(order.amounts.platform_fee) }}</span>
          </div>
          <div
            class="flex justify-between pt-2 text-base font-bold text-gray-800 border-t border-gray-100"
          >
            <span>{{ order.order_type === 'jasa' ? 'Total Harga Disepakati' : 'Total' }}</span>
            <span>Rp {{ formatIDR(order.amounts.total) }}</span>
          </div>
        </div>
      </div>

      <!-- ======================== -->
      <!-- ACTION BUTTON (PRODUCT)  -->
      <!-- ======================== -->
      <div v-if="order.order_type !== 'jasa'" class="pb-6 space-y-2">
        <Button
          v-if="nextActionLabel"
          variant="merchant"
          block
          :loading="actionLoading"
          @click="handleNextAction"
          size="lg"
        >
          <i class="pi pi-check-circle"></i>
          {{ nextActionLabel }}
        </Button>
        <Button
          v-if="canCancel"
          variant="danger-outline"
          block
          :disabled="actionLoading"
          @click="handleCancel"
        >
          Tolak / Batalkan Pesanan
        </Button>
        <Button
          v-if="canUndelivered"
          variant="warning-outline"
          block
          :disabled="actionLoading"
          @click="handleUndelivered"
        >
          {{ rawOrder?.delivery_type === 'pickup' ? 'Tandai Tidak Diambil' : 'Tandai Gagal Kirim' }}
        </Button>
      </div>

      <!-- ======================== -->
      <!-- ACTION BUTTON (JASA)     -->
      <!-- ======================== -->
      <div v-if="order && order.order_type === 'jasa'" class="pb-6 space-y-2">
        <!-- 1. Menunggu Konfirmasi -->
        <template v-if="order.status === 'menunggu_konfirmasi' || order.status === 'menunggu_konfirmasi_merchant'">
          <Button
            variant="merchant"
            block
            :loading="actionLoading"
            @click="updateJasaStatusAction('diterima')"
            size="lg"
          >
            <i class="pi pi-check-circle"></i>
            Terima Pesanan
          </Button>
          <Button
            variant="danger-outline"
            block
            :disabled="actionLoading"
            @click="openJasaRejectModal()"
          >
            Tolak Pesanan
          </Button>
        </template>

        <!-- 2. Diterima -->
        <template v-else-if="order.status === 'diterima'">
          <Button
            variant="merchant"
            block
            :loading="actionLoading"
            @click="updateJasaStatusAction('layanan_dikerjakan')"
            size="lg"
          >
            <i class="pi pi-play"></i>
            Kerjakan Layanan
          </Button>
          <Button
            variant="danger-outline"
            block
            :disabled="actionLoading"
            @click="openJasaRejectModal()"
          >
            Batalkan Pesanan
          </Button>
        </template>

        <!-- 3. Layanan Dikerjakan -->
        <template v-else-if="order.status === 'layanan_dikerjakan'">
          <Button
            variant="merchant"
            block
            :loading="actionLoading"
            @click="openJasaEvidenceUploadModal()"
            size="lg"
          >
            <i class="pi pi-upload"></i>
            Upload Bukti Penyelesaian
          </Button>
          <Button
            variant="danger-outline"
            block
            :disabled="actionLoading"
            @click="openJasaRejectModal()"
          >
            Batalkan Pesanan
          </Button>
        </template>

        <!-- 4. Menunggu Konfirmasi Selesai -->
        <template v-else-if="order.status === 'menunggu_konfirmasi_selesai'">
          <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center mb-2">
            <p class="text-xs text-amber-800 font-medium">
              Menunggu konfirmasi penyelesaian dari pelanggan.
            </p>
          </div>
          <Button
            v-if="order.completion_evidences && order.completion_evidences.length > 0"
            variant="muted-outline"
            block
            @click="openJasaEvidenceViewModal()"
          >
            <i class="pi pi-images"></i>
            Lihat Bukti Penyelesaian
          </Button>
        </template>

        <!-- 5. Selesai -->
        <template v-else-if="order.status === 'selesai'">
          <Button
            v-if="order.review && !order.review.merchant_reply && !order.merchant_reply"
            variant="merchant"
            block
            @click="openJasaReviewReplyModal()"
            size="lg"
          >
            <i class="pi pi-comment"></i>
            Tanggapi Ulasan
          </Button>
          <Button
            v-if="order.completion_evidences && order.completion_evidences.length > 0"
            variant="muted-outline"
            block
            @click="openJasaEvidenceViewModal()"
          >
            <i class="pi pi-images"></i>
            Lihat Bukti Penyelesaian
          </Button>
        </template>
      </div>
    </div>

    <!-- ======================== -->
    <!-- CONFIRM MODAL (PRODUCT)  -->
    <!-- ======================== -->
    <ResponsiveModal
      v-model:show="showConfirmModal"
      title="Konfirmasi Tindakan"
      subtitle="Apakah Anda yakin ingin mengubah status pesanan ini?"
      :showFooter="true"
    >
      <div class="flex items-center gap-4 py-2">
        <div class="flex items-center justify-center w-12 h-12 rounded-full shrink-0" :class="actionType === 'next' ? 'bg-merchant-primary/10' : (actionType === 'undelivered' ? 'bg-orange-100' : 'bg-red-100')">
          <i class="text-xl pi" :class="actionType === 'next' ? 'pi-check-circle text-merchant-primary' : (actionType === 'undelivered' ? 'pi-exclamation-triangle text-orange-500' : 'pi-times-circle text-red-500')"></i>
        </div>
        <p class="text-sm text-gray-600">
          <span v-if="actionType === 'undelivered'">Tindakan ini akan menandai pesanan {{ rawOrder?.delivery_type === 'pickup' ? 'tidak diambil' : 'gagal kirim' }}. Dana akan tetap diteruskan.</span>
          <span v-else-if="actionType === 'reject'">Tindakan ini akan menolak pesanan dan dana akan dikembalikan ke pembeli.</span>
          <span v-else>Tindakan ini akan memperbarui status pesanan dan dapat mengirimkan notifikasi ke pelanggan.</span>
        </p>
      </div>

      <!-- Upload Proof Image -->
      <div v-if="(actionType === 'next' && getNextStatus() === 'completed') || actionType === 'undelivered'" class="mt-4">
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Bukti Foto {{ actionType === 'undelivered' ? (rawOrder?.delivery_type === 'pickup' ? 'Tidak Diambil (Wajib)' : 'Gagal Kirim (Wajib)') : (rawOrder?.delivery_type === 'pickup' ? 'Selesai (Opsional)' : 'Barang Tiba (Wajib)') }}
        </label>
        <input type="file" @change="onFileChange" accept="image/*" class="w-full text-sm text-gray-500 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-merchant-primary file:text-white hover:file:bg-merchant-primary/90" />
      </div>

      <!-- Failed Reason -->
      <div v-if="actionType === 'undelivered'" class="mt-4">
        <label class="block text-sm font-semibold text-gray-700 mb-2">Alasan {{ rawOrder?.delivery_type === 'pickup' ? 'Tidak Diambil' : 'Gagal Kirim' }} (Wajib)</label>
        <textarea v-model="failedReason" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary" rows="3" :placeholder="rawOrder?.delivery_type === 'pickup' ? 'Contoh: Pembeli tidak datang untuk mengambil pesanan hingga toko tutup...' : 'Contoh: Pembeli tidak dapat dihubungi dan rumah kosong...'"></textarea>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <Button
            variant="muted-outline"
            block
            @click="showConfirmModal = false"
          >
            Batal
          </Button>
          <Button
            variant="merchant"
            block
            :loading="actionLoading"
            @click="confirmAction"
          >
            Ya, Konfirmasi
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ======================== -->
    <!-- JASA REJECT MODAL        -->
    <!-- ======================== -->
    <ResponsiveModal
      v-model:show="showJasaRejectModal"
      title="Tolak/Batalkan Pesanan Jasa"
      subtitle="Apakah Anda yakin ingin menolak atau membatalkan pesanan ini? Tindakan ini tidak dapat dibatalkan."
      :showFooter="true"
    >
      <div class="mt-4">
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Alasan Penolakan/Pembatalan (Wajib)
        </label>
        <textarea
          v-model="rejectReason"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary"
          rows="3"
          placeholder="Contoh: Jadwal bertabrakan dengan layanan lain, kuota penuh..."
        ></textarea>
      </div>
      <template #footer>
        <div class="flex gap-3">
          <Button
            variant="muted-outline"
            block
            @click="showJasaRejectModal = false"
          >
            Batal
          </Button>
          <Button
            variant="danger"
            block
            :loading="actionLoading"
            @click="submitJasaRejection"
          >
            Ya, Tolak/Batalkan
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ======================== -->
    <!-- JASA EVIDENCE UPLOAD MODAL -->
    <!-- ======================== -->
    <ResponsiveModal
      v-model:show="showJasaEvidenceModal"
      title="Upload Bukti Penyelesaian"
      subtitle="Unggah foto atau video sebagai bukti bahwa Anda telah menyelesaikan layanan jasa ini."
      :showFooter="true"
    >
      <div class="mt-4 space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Pengerjaan (Opsional)
          </label>
          <textarea
            v-model="completionNote"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary"
            rows="2"
            placeholder="Tuliskan catatan pengerjaan atau pesan untuk customer..."
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Unggah File Bukti (Maks. 5 file, Gambar/Video)
          </label>
          <input
            type="file"
            ref="evidenceInputRef"
            multiple
            accept="image/*,video/*"
            @change="handleEvidenceFileSelect"
            class="hidden"
          />
          <div
            @click="$refs.evidenceInputRef.click()"
            class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-merchant-primary transition bg-gray-50 flex flex-col items-center justify-center"
          >
            <i class="pi pi-upload text-2xl text-gray-400 mb-2"></i>
            <p class="text-sm font-semibold text-gray-600">Pilih file foto atau video</p>
            <p class="text-xs text-gray-400 mt-1">Maks. Ukuran: Foto 5MB, Video 50MB</p>
          </div>
        </div>

        <!-- Selected Files Preview -->
        <div v-if="evidenceFiles.length > 0" class="space-y-2">
          <p class="text-xs font-semibold text-gray-400 uppercase">File Terpilih ({{ evidenceFiles.length }}):</p>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="(file, idx) in evidenceFiles" :key="idx" class="flex items-center justify-between p-2 bg-gray-50 border border-gray-100 rounded-lg">
              <span class="text-xs text-gray-600 truncate flex-1 mr-2">{{ file.name }}</span>
              <button @click="removeEvidenceFile(idx)" class="text-red-500 hover:text-red-700 p-1">
                <i class="pi pi-trash text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3">
          <Button
            variant="muted-outline"
            block
            @click="showJasaEvidenceModal = false"
          >
            Batal
          </Button>
          <Button
            variant="merchant"
            block
            :loading="actionLoading"
            @click="submitJasaEvidence"
          >
            Kirim Bukti
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ======================== -->
    <!-- JASA REVIEW REPLY MODAL  -->
    <!-- ======================== -->
    <ResponsiveModal
      v-model:show="showJasaReviewReplyModal"
      title="Tanggapi Ulasan Customer"
      subtitle="Berikan tanggapan atau ucapan terima kasih atas ulasan yang diberikan customer."
      :showFooter="true"
    >
      <div class="mt-4">
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Tanggapan Anda (Maks. 1000 karakter)
        </label>
        <textarea
          v-model="merchantReplyText"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary"
          rows="4"
          placeholder="Tulis tanggapan Anda di sini..."
          maxlength="1000"
        ></textarea>
      </div>
      <template #footer>
        <div class="flex gap-3">
          <Button
            variant="muted-outline"
            block
            @click="showJasaReviewReplyModal = false"
          >
            Batal
          </Button>
          <Button
            variant="merchant"
            block
            :loading="actionLoading"
            @click="submitMerchantReply"
          >
            Kirim Tanggapan
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- ======================== -->
    <!-- LIGHTBOX PREVIEW MODAL   -->
    <!-- ======================== -->
    <ResponsiveModal
      v-model:show="showLightboxModal"
      title="Pratinjau Media"
      :showFooter="false"
      size="lg"
    >
      <div class="flex flex-col items-center justify-center p-2 bg-black rounded-xl overflow-hidden min-h-[300px] relative">
        <template v-if="lightboxEvidence">
          <img
            v-if="isImageEvidence(lightboxEvidence)"
            :src="getEvidenceUrl(lightboxEvidence)"
            class="max-w-full max-h-[70vh] object-contain"
            alt="Pratinjau Foto"
          />
          <video
            v-else-if="isVideoEvidence(lightboxEvidence)"
            :src="getEvidenceUrl(lightboxEvidence)"
            controls
            autoplay
            class="max-w-full max-h-[70vh] object-contain"
          ></video>
          <div v-else class="text-white flex flex-col items-center p-6">
            <i class="pi pi-file text-5xl mb-3"></i>
            <span class="text-sm">{{ lightboxEvidence.file_path || 'File' }}</span>
            <a :href="getEvidenceUrl(lightboxEvidence)" target="_blank" class="mt-4 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition flex items-center gap-1">
              <i class="pi pi-download"></i> Unduh File
            </a>
          </div>
          <p v-if="lightboxEvidence.note" class="text-xs text-gray-300 mt-3 italic px-4 text-center">
            "{{ lightboxEvidence.note }}"
          </p>
        </template>
      </div>
    </ResponsiveModal>

    <!-- ======================== -->
    <!-- JASA EVIDENCE VIEW MODAL -->
    <!-- ======================== -->
    <ResponsiveModal
      v-model:show="showJasaEvidenceViewModal"
      title="Bukti Penyelesaian Layanan"
      subtitle="Berikut adalah catatan dan bukti foto/video penyelesaian layanan yang telah diunggah."
      :showFooter="true"
    >
      <div class="mt-4 space-y-4 text-left">
        <div v-if="order && (order.completion_note || rawOrder?.completion_note)" class="p-3 bg-purple-50 border border-purple-100 rounded-xl">
          <p class="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Catatan Pengerjaan</p>
          <p class="italic text-sm text-purple-700">"{{ order.completion_note || rawOrder?.completion_note }}"</p>
        </div>

        <div v-if="order && order.completion_evidences && order.completion_evidences.length > 0" class="space-y-2">
          <p class="text-xs font-semibold text-gray-400 uppercase">Bukti Foto / Video ({{ order.completion_evidences.length }}):</p>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="(ev, idx) in order.completion_evidences" :key="ev.id || idx" class="relative group aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer" @click="openLightbox(ev)">
              <img v-if="isImageEvidence(ev)" :src="getEvidenceUrl(ev)" class="object-cover w-full h-full hover:scale-105 transition duration-300" alt="Bukti Foto" />
              <div v-else-if="isVideoEvidence(ev)" class="w-full h-full flex items-center justify-center bg-black relative">
                <video :src="getEvidenceUrl(ev)" class="object-cover w-full h-full"></video>
                <div class="absolute inset-0 flex items-center justify-center bg-black/30">
                  <i class="pi pi-play text-white text-lg"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button
          variant="muted-outline"
          block
          @click="showJasaEvidenceViewModal = false"
        >
          Tutup
        </Button>
      </template>
    </ResponsiveModal>
  </div>
</template>

<style scoped></style>
