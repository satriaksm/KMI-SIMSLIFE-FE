<template>
  <div class="pb-8">
    <div class="sticky top-[73px] z-10 bg-white border-b border-gray-200">
      <div class="flex mx-auto max-w-6xl">
        <button
          @click="activeTab = 'aktif'"
          :class="[
            'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'aktif'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500',
          ]"
        >
          Aktif
        </button>
        <button
          @click="activeTab = 'selesai'"
          :class="[
            'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'selesai'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500',
          ]"
        >
          Selesai
        </button>
      </div>
    </div>

    <div class="px-4 py-4 mx-auto max-w-6xl space-y-3">
      <div
        v-for="order in shownOrders"
        :key="order.id"
        class="p-4 bg-white border border-gray-200 rounded-xl"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ order.merchant }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ order.items }}</p>
          </div>
          <span
            class="px-2 py-1 text-xs rounded-full"
            :class="
              order.status === 'Dalam Proses'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            "
          >
            {{ order.status }}
          </span>
        </div>

        <div class="flex items-center justify-between mt-3">
          <p class="text-sm text-gray-600">Total</p>
          <p class="text-sm font-semibold text-gray-900">{{ order.total }}</p>
        </div>

        <div class="flex gap-2 mt-4">
          <button
            v-if="activeTab === 'aktif'"
            class="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hubungi Penjual
          </button>

          <button
            v-if="activeTab === 'selesai'"
            class="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Pesan Lagi
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
const activeTab = ref("aktif");

const activeOrders = [
  {
    id: 1,
    merchant: "CemalCemil",
    items: "Pentol Juara, Pempek Kapal Selam",
    total: "Rp xx.xxx",
    status: "Dalam Proses",
  },
  {
    id: 2,
    merchant: "Sumber Rejeki",
    items: "Beras WangiKu, MinyakKita",
    total: "Rp xx.xxx",
    status: "Dalam Proses",
  },
];

const doneOrders = [
  {
    id: 3,
    merchant: "CemalCemil",
    items: "Pentol Juara, Pempek Kapal Selam",
    total: "Rp 36.000",
    status: "Selesai",
  },
  {
    id: 4,
    merchant: "Sumber Rejeki",
    items: "Beras WangiKu, MinyakKita",
    total: "Rp 85.000",
    status: "Selesai",
  },
];

const shownOrders = computed(() =>
  activeTab.value === "aktif" ? activeOrders : doneOrders
);
</script>