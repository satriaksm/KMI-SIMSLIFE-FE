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
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import Button from "@/components/common/Button.vue";
import OrderCard from "@/components/customer/OrderCard.vue";

const router = useRouter();

const pendingStatusProps = {
  variant: "payment",
  status: "pending",
  label: "Menunggu Pembayaran",
  size: "sm",
  showIcon: true,
};

const orders = ref([
  {
    id: "ORD-1001",
    storeName: "Toko 1",
    dateLabel: "1 Mei 2025",
    status: "pending_payment",
    total: 39345,
    items: [
      {
        title: "Keripik Pisang Manis",
        qty: 1,
        variant: "Original",
        price: 21345,
        imageUrl: null,
      },
      {
        title: "Sambal Bawang Pedas",
        qty: 1,
        variant: "Botol 150ml",
        price: 18000,
        imageUrl: null,
      },
    ],
  },
]);

function goBack() {
  router.back();
}

function openOrder(order) {
  router
    .push({ name: "Detail Pesanan", params: { orderId: order.id } })
    .catch(() => router.push(`/orders/${order.id}`));
}

function pay(order) {}
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
