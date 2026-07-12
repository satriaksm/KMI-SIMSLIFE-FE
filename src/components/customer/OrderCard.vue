<template>
  <button
    type="button"
    class="w-full overflow-hidden text-left bg-white border border-gray-200 cursor-pointer rounded-2xl"
    @click="$emit('click', order)"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200"
    >
      <div class="min-w-0">
        <div class="text-sm font-bold text-black truncate">
          {{ order.storeName }}
        </div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{{ order.dateLabel }}</span>
          <span class="inline-block w-1 h-1 rounded-full bg-gray-300"></span>
          <span class="font-medium text-primary">
            {{ order.order_type === 'jasa' ? (order.delivery_type === 'in-store' ? 'Di Tempat' : (order.delivery_type === 'on-site' ? 'Panggilan' : 'Online')) : (order.delivery_type === 'pickup' ? 'Ambil Sendiri' : 'Kirim') }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <StatusLabel v-bind="resolvedStatusProps" />
      </div>
    </div>

    <!-- Body -->
    <div class="px-4 py-3">
      <div class="space-y-3">
        <div
          v-for="(it, idx) in expanded ? order.items : order.items.slice(0, 1)"
          :key="idx"
          class="flex gap-3"
        >
          <div
            class="w-16 h-16 overflow-hidden bg-gray-200 rounded-xl shrink-0"
          >
            <img
              v-if="it.imageUrl"
              :src="it.imageUrl"
              :alt="it.title"
              class="object-cover w-full h-full"
              crossorigin="use-credentials"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-black truncate">
              {{ it.title }}
            </div>
            <div v-if="it.variant" class="text-xs text-muted-foreground">{{ it.variant }}</div>
            <div v-if="it.addons && it.addons.length" class="text-xs text-muted-foreground">
              <span class="text-primary">+</span> {{ it.addons.map(a => a.name).join(', ') }}
            </div>
            <div class="text-xs text-muted-foreground">{{ it.qty }}x</div>
          </div>
          <div class="flex items-center text-xs text-muted-foreground">
            Rp {{ formatIDR(it.price || it.subtotal || 0) }}
          </div>
        </div>
      </div>

      <div class="w-full mx-auto">
        <button
          v-if="(order.items?.length || 0) > 1"
          type="button"
          class="w-full mb-2 text-xs font-bold cursor-pointer text-secondary"
          @click.stop="expanded = !expanded"
        >
          {{ expanded ? "Tutup" : "Lihat semua" }}
          <i
            :class="[
              'pi pi-chevron-down text-xs transition-transform',
              expanded ? 'rotate-180' : '',
            ]"
          ></i>
        </button>
      </div>

      <div class="flex items-end justify-between gap-3 mt-3">
        <div>
          <div class="text-xs text-muted-foreground">Total Belanja</div>
          <div class="text-sm font-extrabold text-black">
            Rp {{ formatIDR(order.total) }}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <slot name="action" :order="order" />
        </div>
      </div>
    </div>
  </button>
</template>

<script setup>
import { ref, computed } from "vue";
import StatusLabel from "@/components/common/StatusLabel.vue";

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
  /** Override status label props. If omitted, derived from order.status. */
  statusProps: {
    type: Object,
    default: null,
  },
});

defineEmits(["click"]);

const expanded = ref(false);

const resolvedStatusProps = computed(() => {
  if (props.statusProps) return props.statusProps;

  const raw = String(props.order?.status || "").toLowerCase();

  if (raw === "pending_payment") {
    return {
      variant: "payment",
      status: "pending",
      label: "Menunggu Pembayaran",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "completed") {
    return {
      variant: "order",
      status: "completed",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "cancelled") {
    return {
      variant: "order",
      status: "cancelled",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "rejected") {
    return {
      variant: "order",
      status: "cancelled",
      label: "Ditolak Penjual",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "undelivered") {
    return {
      variant: "order",
      status: "cancelled",
      label: "Gagal Kirim",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "unpicked") {
    return {
      variant: "order",
      status: "cancelled",
      label: "Tidak Diambil",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "ready") {
    return {
      variant: "order",
      status: "ready",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "shipped") {
    return {
      variant: "order",
      status: "shipped",
      size: "sm",
      showIcon: true,
    };
  }
  if (raw === "processing") {
    return {
      variant: "order",
      status: "processing",
      size: "sm",
      showIcon: true,
    };
  }
  return { variant: "order", status: "pending", size: "sm", showIcon: true };
});

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}
</script>
