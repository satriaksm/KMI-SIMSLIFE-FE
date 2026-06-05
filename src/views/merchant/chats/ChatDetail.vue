<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Fixed Header (Mobile) -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white border-b border-gray-100 sm:hidden"
    >
      <button
        @click="$router.back()"
        class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100"
      >
        <i class="pi pi-arrow-left"></i>
      </button>
      <div class="text-center flex-1">
        <h1 class="text-base font-semibold text-gray-900 truncate">{{ conversation?.buyer?.name || 'Chat' }}</h1>
        <p class="text-xs text-gray-500 truncate">{{ conversation?.jasa?.title }}</p>
      </div>
      <div class="w-10 h-10"></div>
    </div>

    <!-- Spacer for fixed header -->
    <div class="h-24 sm:h-0"></div>

    <div class="px-4 sm:px-6">
      <!-- Desktop Header with back button -->
      <div class="hidden mb-6 sm:flex items-center gap-4 py-4">
        <button
          @click="$router.back()"
          class="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <i class="pi pi-arrow-left text-xl"></i>
        </button>
        <div v-if="conversation" class="flex-1">
          <div class="flex items-center gap-3">
            <img
              v-if="conversation.buyer?.profile_picture"
              :src="conversation.buyer.profile_picture"
              :alt="conversation.buyer.name"
              class="w-12 h-12 rounded-full object-cover"
            />
            <div v-else class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
              <i class="pi pi-user text-gray-600 text-lg"></i>
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900">{{ conversation.buyer?.name }}</h1>
              <p class="text-sm text-gray-600">{{ conversation.jasa?.title }}</p>
            </div>
            <span
              class="px-3 py-1 text-sm font-medium rounded-full"
              :class="statusClasses(conversation.status)"
            >
              {{ statusLabel(conversation.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Messages Container -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Messages Section (Left) -->
        <div class="lg:col-span-2">
          <!-- Messages -->
          <div
            ref="messagesContainer"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-96 overflow-y-auto mb-4"
          >
            <div v-if="loading" class="flex justify-center items-center h-full">
              <div
                class="w-10 h-10 border-4 rounded-full border-gray-200 border-t-green-500 animate-spin"
              ></div>
            </div>

            <div v-else-if="messages.length === 0" class="flex justify-center items-center h-full">
              <p class="text-gray-500">Belum ada pesan. Mulai percakapan dengan mengirim pesan pertama.</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="message in messages"
                :key="message.id"
                :class="[
                  'flex gap-3',
                  message.sender_role === 'merchant' ? 'justify-end' : 'justify-start',
                ]"
              >
                <!-- Buyer message bubble -->
                <div
                  v-if="message.sender_role !== 'merchant'"
                  class="max-w-xs lg:max-w-sm"
                >
                  <div class="bg-gray-100 rounded-lg p-3 text-gray-900 text-sm">
                    {{ message.body }}
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatMessageTime(message.created_at) }}
                  </p>
                </div>

                <!-- Merchant message bubble -->
                <div
                  v-else
                  class="max-w-xs lg:max-w-sm"
                >
                  <div class="bg-green-500 rounded-lg p-3 text-white text-sm">
                    {{ message.body }}
                  </div>
                  <p class="text-xs text-gray-500 mt-1 text-right">
                    {{ formatMessageTime(message.created_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Message Input -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div v-if="error" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {{ error }}
            </div>
            <div class="flex gap-2">
              <input
                v-model="newMessage"
                type="text"
                placeholder="Ketik pesan..."
                class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                @keyup.enter="sendMessage"
              />
              <button
                @click="sendMessage"
                :disabled="sending || !newMessage || newMessage.trim().length === 0"
                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:opacity-75 disabled:cursor-not-allowed transition"
              >
                <i v-if="!sending" class="pi pi-send"></i>
                <i v-else class="pi pi-spin pi-spinner"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Info & Offer Section (Right) -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Conversation Info Card -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 class="font-semibold text-gray-900 mb-4">Informasi Percakapan</h3>
            <div class="space-y-3 text-sm">
              <div>
                <p class="text-gray-600">Status</p>
                <p class="font-medium text-gray-900">{{ statusLabel(conversation?.status) }}</p>
              </div>
              <div>
                <p class="text-gray-600">Dimulai</p>
                <p class="font-medium text-gray-900">{{ formatDate(conversation?.created_at) }}</p>
              </div>
              <div>
                <p class="text-gray-600">Pembeli</p>
                <p class="font-medium text-gray-900">{{ conversation?.buyer?.name }}</p>
              </div>
              <div>
                <p class="text-gray-600">Jasa</p>
                <p class="font-medium text-gray-900">{{ conversation?.jasa?.title }}</p>
              </div>
            </div>
          </div>

          <!-- Offer Form (conditional) -->
          <div
            v-if="conversation?.status === 'pending_offer'"
            class="bg-yellow-50 rounded-2xl border border-yellow-200 shadow-sm p-4"
          >
            <h3 class="font-semibold text-yellow-900 mb-4">Penawaran Tersedia</h3>
            <p class="text-sm text-yellow-800 mb-4">
              Harga: <span class="font-bold">Rp {{ formatPrice(conversation?.offered_price) }}</span>
            </p>
            <button
              class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition"
            >
              <i class="pi pi-check mr-2"></i>Terima Penawaran
            </button>
          </div>

          <!-- Make Offer Form -->
          <div
            v-if="conversation?.status === 'active' || conversation?.status === 'pending_offer'"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
          >
            <h3 class="font-semibold text-gray-900 mb-4">Buat Penawaran</h3>
            <div class="space-y-3">
              <div>
                <label class="text-sm text-gray-600 block mb-1">Harga</label>
                <input
                  v-model="offerPrice"
                  type="number"
                  placeholder="Masukkan harga"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label class="text-sm text-gray-600 block mb-1">Catatan (opsional)</label>
                <textarea
                  v-model="offerNote"
                  placeholder="Catatan untuk penawaran..."
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm h-20 resize-none"
                ></textarea>
              </div>
              <button
                @click="submitOffer"
                :disabled="!offerPrice || sendingOffer"
                class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                <i class="pi pi-send mr-2"></i>Kirim Penawaran
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChat } from '@/composables/useChat';

const route = useRoute();
const router = useRouter();
const { 
  loadConversation, 
  sendMessage: sendChatMessage, 
  makeOffer: submitChatOffer 
} = useChat();

const conversation = ref(null);
const messages = ref([]);
const newMessage = ref('');
const sending = ref(false);
const loading = ref(false);
const error = ref('');
const messagesContainer = ref(null);

// Offer fields
const offerPrice = ref('');
const offerNote = ref('');
const sendingOffer = ref(false);

// Format helpers
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins}m lalu`;
  if (diffHours < 24) return `${diffHours}h lalu`;
  if (diffDays < 7) return `${diffDays}d lalu`;
  
  return date.toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
  });
};

const formatPrice = (price) => {
  if (!price) return '0';
  return new Intl.NumberFormat('id-ID').format(price);
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
    active: 'bg-green-100 text-green-800',
    pending_offer: 'bg-yellow-100 text-yellow-800',
    deal_accepted: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

// Scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// Send message
const sendMessage = async () => {
  if (!newMessage.value.trim()) return;

  sending.value = true;
  error.value = '';
  
  try {
    const conversationId = route.params.conversationId;
    console.log('Sending message to conversation:', conversationId);
    
    const result = await sendChatMessage(conversationId, newMessage.value);
    console.log('Message sent successfully:', result);
    
    newMessage.value = '';
    // Reload conversation to get new message
    await loadConversation(conversationId);
    scrollToBottom();
  } catch (err) {
    console.error('Error sending message:', err);
    error.value = err.response?.data?.message || err.message || 'Gagal mengirim pesan. Silakan coba lagi.';
  } finally {
    sending.value = false;
  }
};

// Submit offer
const submitOffer = async () => {
  if (!offerPrice.value) return;

  sendingOffer.value = true;
  try {
    await submitChatOffer(route.params.conversationId, parseInt(offerPrice.value), offerNote.value);
    
    offerPrice.value = '';
    offerNote.value = '';
    // Reload conversation to get updated status
    await loadConversation(route.params.conversationId);
  } catch (error) {
    console.error('Error submitting offer:', error);
  } finally {
    sendingOffer.value = false;
  }
};

// Load conversation
onMounted(async () => {
  loading.value = true;
  try {
    const { conversation: conv, messages: msgs } = await loadConversation(route.params.conversationId);
    conversation.value = conv;
    messages.value = msgs;
    scrollToBottom();
  } catch (error) {
    console.error('Error loading conversation:', error);
    router.push({ name: 'Merchant Chat' });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Add any scoped styles here */
</style>
