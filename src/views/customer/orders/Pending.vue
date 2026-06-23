<template>
  <div class="min-h-screen bg-gray-100">
    <MobileHeader
      title="Menunggu Pembayaran"
      @back="goBack"
      variant="primary"
    />

    <div class="px-4 py-4 mx-auto space-y-4 max-w-7xl">
      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="grid grid-cols-1 gap-4">
          <div
            v-for="n in 3"
            :key="'skel-' + n"
            class="p-4 bg-white border border-gray-200 rounded-2xl animate-pulse"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-gray-200 rounded-full"></div>
                <div class="w-24 h-4 bg-gray-200 rounded"></div>
              </div>
              <div class="w-28 h-5 bg-amber-100 rounded-full"></div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 bg-gray-200 rounded-xl shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="w-3/4 h-4 bg-gray-200 rounded"></div>
                <div class="w-1/2 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div class="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
              <div class="w-28 h-4 bg-gray-200 rounded"></div>
              <div class="w-16 h-8 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Order list -->
        <div class="grid grid-cols-1 gap-4">
          <template v-for="order in orders" :key="order.id">
            <!-- Jasa Order Card -->
            <ServiceOrderCard
              v-if="order.order_type === 'jasa'"
              :order="order"
              :status-props="pendingStatusProps"
              @click="openOrder"
            >
              <template #action="{ order: o }">
                <Button variant="primary" size="sm" @click.stop="pay(o)">
                  Bayar
                </Button>
              </template>
            </ServiceOrderCard>

            <!-- Product/Kuliner Order Card -->
            <OrderCard
              v-else
              :order="order"
              :status-props="pendingStatusProps"
              @click="openOrder"
            >
              <template #action="{ order: o }">
                <Button variant="primary" size="sm" @click.stop="pay(o)">
                  Bayar
                </Button>
              </template>
            </OrderCard>
          </template>
        </div>

        <!-- Empty -->
        <div
          v-if="orders.length === 0"
          class="p-8 text-center bg-white border border-gray-200 rounded-2xl"
        >
          <div class="text-lg font-bold text-black">Pesanan tidak ditemukan</div>
          <div class="mt-1 text-sm text-muted-foreground">
            Coba ubah kata kunci pencarian.
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import OrderCard from "@/components/customer/OrderCard.vue";
import ServiceOrderCard from "@/components/customer/ServiceOrderCard.vue";
import { getCustomerOrders } from "@/services/api/order";
import { createOrderInvoice } from "@/services/api/payment";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import echo from "@/libs/echo";
import api from "@/libs/axios";

const router = useRouter();
const toast = useToast();
const loading = ref(false);
const authStore = useAuthStore();
const userId = computed(() => authStore.user?.id);
let ordersChannel = null;

const pendingStatusProps = {
  variant: "payment",
  status: "pending",
  label: "Menunggu Pembayaran",
  size: "sm",
  showIcon: true,
};

const orders = ref([]);

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getOrderSnapshotUrl(orderItemId, path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/order-snapshots/${orderItemId}`;
}

function mapOrder(o) {
  return {
    id: o.id,
    storeName: o.merchant?.name || "Toko",
    dateLabel: formatDateLabel(o.created_at),
    status: "pending_payment",
    total: o.gross_amount,
    items: (o.items || []).map((it) => ({
      id: it.id,
      title: it.product_name_snapshot || "Produk",
      qty: it.quantity,
      variant: it.product_variant_snapshot || "",
      addons: (it.addons || []).map((a) => ({
        name: a.addon_name_snapshot || a.addon?.name || "Addon",
        price: Number(a.addon_price_snapshot || 0),
      })),
      price: it.unit_price_snapshot,
      imageUrl: getOrderSnapshotUrl(it.id, it.image_snapshot_path),
    })),
    _raw: o,
  };
}

function getOrdersList(res) {
  if (!res) return [];
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

function needsPayment(order) {
  if (!order) return false;
  const method = String(order.payment_method || '').toUpperCase();
  if (method === 'COD') return false;

  const ps = String(order.payment_status || '').toUpperCase();
  if (['PAID', 'SETTLED', 'SUCCEEDED'].includes(ps)) return false;

  const rawStatus = String(order.status || '').toLowerCase();
  const terminalStatuses = ['cancelled', 'dibatalkan', 'ditolak', 'expired', 'selesai', 'completed'];
  if (terminalStatuses.includes(rawStatus)) return false;

  return true;
}

async function fetchPendingOrders() {
  loading.value = true;
  try {
    const [resJasa, resProducts] = await Promise.all([
      api.get("/api/jasa-orders", { params: { per_page: 100 } }),
      getCustomerOrders({ status: "pending", per_page: 100 }),
    ]);

    const rawJasaOrders = getOrdersList(resJasa)
      .map((item) => ({
        ...item,
        id: item.id || item.order_id,
        order_id: item.order_id || item.id,
        order_type: 'jasa',
      }))
      .filter(needsPayment);

    const productList = getOrdersList(resProducts);
    const transferOnlyProducts = productList.filter(o => {
      if (o.payment_method === 'COD') return false;
      if (o.payment && o.payment.expired_at) {
        const expireTime = new Date(o.payment.expired_at).getTime();
        if (new Date().getTime() > expireTime) return false;
      }
      return true;
    }).map(mapOrder);

    const merged = [...rawJasaOrders, ...transferOnlyProducts];
    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    orders.value = merged;
  } catch (e) {
    console.error("Gagal memuat pesanan pending:", e);
    toast.error("Gagal memuat pesanan");
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/');
}

function openOrder(order) {
  router
    .push({ name: "Detail Pesanan", params: { orderId: order.id } })
    .catch(() => router.push(`/orders/${order.id}`));
}

async function pay(order) {
  try {
    const { data } = await createOrderInvoice(order.id);
    const payload = data?.data ?? data;
    const invoiceUrl = payload?.invoice_url;

    if (!invoiceUrl) {
      toast.warning("Invoice belum tersedia. Coba lagi sebentar.");
      openOrder(order);
      return;
    }

    window.location.href = invoiceUrl;
  } catch (e) {
    console.error("Gagal membuat invoice:", e);
    toast.error(
      e?.response?.data?.message ||
        "Gagal membuka pembayaran. Silakan coba lagi.",
    );
  }
}

onMounted(() => {
  fetchPendingOrders();
  subscribeOrdersChannel();
});

onUnmounted(() => {
  leaveOrdersChannel(userId.value);
});

watch(userId, (next, prev) => {
  if (prev) {
    leaveOrdersChannel(prev);
  }
  if (next) {
    subscribeOrdersChannel();
  }
});

function subscribeOrdersChannel() {
  if (!userId.value) return;

  ordersChannel = echo.private(`users.${userId.value}.orders`);
  ordersChannel
    .listen(".order.created", () => {
      fetchPendingOrders();
    })
    .listen(".order.status.updated", () => {
      fetchPendingOrders();
    })
    .listen(".payment.status.updated", () => {
      fetchPendingOrders();
    });
}

function leaveOrdersChannel(id) {
  if (!id) return;
  echo.leave(`users.${id}.orders`);
  ordersChannel = null;
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
