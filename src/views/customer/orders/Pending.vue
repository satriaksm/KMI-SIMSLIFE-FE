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
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import OrderCard from "@/components/customer/OrderCard.vue";
import { getCustomerOrders } from "@/services/api/order";
import { useToast } from "vue-toastification";

const router = useRouter();
const toast = useToast();
const loading = ref(false);

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

function mapOrder(o) {
  return {
    id: o.id,
    storeName: o.merchant?.name || "Toko",
    dateLabel: formatDateLabel(o.created_at),
    status: "pending_payment",
    total: o.gross_amount,
    items: (o.items || []).map((it) => ({
      title: it.product_name_snapshot || "Produk",
      qty: it.quantity,
      variant: it.product_variant_snapshot || "",
      price: it.unit_price_snapshot,
      imageUrl: it.image_snapshot_path || null,
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
    orders.value = (Array.isArray(list) ? list : []).map(mapOrder);
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

function pay(order) {
  // Redirect to Midtrans payment if snap URL exists, otherwise go to detail
  const snapUrl = order._raw?.midtrans?.redirect_url;
  if (snapUrl) {
    window.location.href = snapUrl;
  } else {
    toast.info("Silakan hubungi admin untuk melanjutkan pembayaran");
    openOrder(order);
  }
}

onMounted(() => {
  fetchPendingOrders();
});
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
