<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Fixed Header (Mobile) -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white border-b border-gray-100 sm:static sm:px-6 sm:mb-6"
    >
      <div class="flex items-center gap-3">
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 rounded-full sm:hidden hover:bg-gray-100"
        >
          <i class="pi pi-bars"></i>
        </button>
        <div>
          <h1 class="text-base font-semibold text-merchant-primary sm:text-3xl sm:font-bold">Chat dengan Pembeli</h1>
          <p class="mt-1 text-xs sm:text-sm text-gray-600">Kelola percakapan dan penawaran dari pembeli</p>
        </div>
      </div>
    </div>

    <!-- spacer -->
    <div class="h-24 sm:h-0"></div>

    <div class="px-4 sm:px-6">
      <!-- Filter dan Search -->
      <div class="mb-6 flex gap-3 flex-wrap">
        <div class="flex-1 min-w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari pembeli atau jasa..."
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          v-model="filterStatus"
          class="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="pending_offer">Menunggu Penawaran</option>
          <option value="deal_accepted">Penawaran Diterima</option>
          <option value="completed">Selesai</option>
        </select>
      </div>

      <!-- Chat List -->
      <div class="grid gap-4">
        <div v-if="loading" class="col-span-full py-12 text-center">
          <div class="flex justify-center items-center">
            <div
              class="w-10 h-10 border-4 rounded-full border-gray-200 border-t-green-500 animate-spin"
            ></div>
          </div>
        </div>

        <div v-else-if="filteredConversations.length === 0" class="col-span-full py-12 text-center">
          <i class="pi pi-inbox text-5xl text-gray-300 mb-4"></i>
          <p class="text-gray-600">Belum ada percakapan</p>
        </div>

        <router-link
          v-for="chat in filteredConversations"
          :key="chat.id"
          :to="{ name: 'Merchant Chat Detail', params: { conversationId: chat.id } }"
          class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer border-l-4"
          :class="{
            'border-l-green-500': chat.status === 'active',
            'border-l-amber-500': chat.status === 'pending_offer',
            'border-l-green-600': chat.status === 'deal_accepted',
            'border-gray-300': chat.status === 'completed'
          }"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <!-- Pembeli Info -->
              <div class="flex items-center gap-3 mb-2">
                <img
                  v-if="chat.buyer?.profile_picture"
                  :src="chat.buyer.profile_picture"
                  :alt="chat.buyer.name"
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div v-else class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <i class="pi pi-user text-gray-600"></i>
                </div>
                <h3 class="font-semibold text-gray-900">{{ chat.buyer?.name || 'Pembeli' }}</h3>
                <span v-if="chat.unread_count && chat.unread_count > 0" class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {{ chat.unread_count }}
                </span>
              </div>

              <!-- Jasa Info -->
              <p v-if="chat.jasa" class="text-sm text-gray-600 mb-2">
                <span class="font-medium">Produk:</span> {{ chat.jasa.title }}
              </p>

              <!-- Last Message Preview -->
              <p class="text-sm text-gray-600 truncate mb-2">
                {{ chat.last_message?.body || 'Tidak ada pesan' }}
              </p>

              <!-- Status -->
              <div class="flex gap-2 items-center">
                <span class="inline-block px-2 py-1 text-xs font-medium rounded-full" :class="statusClasses(chat.status)">
                  {{ statusLabel(chat.status) }}
                </span>
              </div>
            </div>

            <!-- Time and Unread Indicator -->
            <div class="ml-4 text-right">
              <p class="text-xs text-gray-500">
                {{ formatTime(chat.last_message?.created_at || chat.updated_at) }}
              </p>
              <p v-if="chat.last_message?.sender_role === 'buyer'" class="text-xs text-green-600 mt-1 font-medium">
                <i class="pi pi-chevron-down"></i> Pesan Baru
              </p>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useChat } from '@/composables/useChat';

const emit = defineEmits(['toggle-sidebar']);
const { fetchConversations, conversations, loading } = useChat();
const searchQuery = ref('');
const filterStatus = ref('');

// Format time
const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
  });
};

// Status helpers
const statusLabel = (status) => {
  const labels = {
    active: 'Aktif',
    pending_offer: 'Menunggu Penawaran',
    deal_accepted: 'Penawaran Diterima',
    completed: 'Selesai',
  };
  return labels[status] || status;
};

const statusClasses = (status) => {
  const classes = {
    active: 'bg-blue-100 text-blue-800',
    pending_offer: 'bg-yellow-100 text-yellow-800',
    deal_accepted: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

// Filter conversations
const filteredConversations = computed(() => {
  let result = conversations.value;

  // Filter by status
  if (filterStatus.value) {
    result = result.filter(c => c.status === filterStatus.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(c =>
      c.buyer?.name?.toLowerCase().includes(query) ||
      c.jasa?.title?.toLowerCase().includes(query) ||
      c.last_message?.body?.toLowerCase().includes(query)
    );
  }

  return result;
});

// Load conversations
onMounted(() => {
  fetchConversations();
});
</script>

<style scoped>
/* Add any scoped styles here */
</style>
