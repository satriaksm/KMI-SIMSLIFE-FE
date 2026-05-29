<template>
  <div class="min-h-screen bg-gray-100">
    <MobileHeader
      title="Menunggu Pembayaran"
      @back="goBack"
      variant="primary"
    />

    <div class="px-4 py-4 mx-auto space-y-4 max-w-7xl">
      <!-- Order list -->
      <div class="grid grid-cols-1 gap-4">
        <OrderCard
          v-for="order in orders"
          :key="order.id"
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import OrderCard from "@/components/customer/OrderCard.vue";
import { getCustomerOrders } from "@/services/api/order";
import { createOrderInvoice } from "@/services/api/payment";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import echo from "@/libs/echo";

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

async function fetchPendingOrders() {
  loading.value = true;
  try {
    const { data: res } = await getCustomerOrders({
      status: "pending",
      per_page: 100,
    });
    const list = res?.data ?? res ?? [];
    const transferOnlyList = (Array.isArray(list) ? list : []).filter(o => {
      // Exclude COD orders (they don't need payment)
      if (o.payment_method === 'COD') return false;
      
      if (o.payment && o.payment.expired_at) {
        const expireTime = new Date(o.payment.expired_at).getTime();
        if (new Date().getTime() > expireTime) return false;
      }
      return true;
    });
    orders.value = transferOnlyList.map(mapOrder);
  } catch (e) {
    console.error("Gagal memuat pesanan pending:", e);
    toast.error("Gagal memuat pesanan");
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.back();
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
