<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useChat } from "@/composables/useChat";
import { useAuthStore } from "@/stores/auth";
import Button from "@/components/common/Button.vue";

const props = defineProps({
  // Jika sudah punya conversationId, langsung load.
  conversationId: {
    type: [Number, String],
    default: null,
  },
  // Jika buyer masuk dari detail jasa, cukup kirim jasaId,
  // komponen akan otomatis startConversation.
  jasaId: {
    type: [Number, String],
    default: null,
  },
  // "buyer" | "merchant" | "auto" (default).
  // Mode hanya untuk mengontrol tampilan UI (offer section).
  mode: {
    type: String,
    default: "auto",
  },
  // Judul custom di header, jika tidak diisi akan pakai nama jasa.
  title: {
    type: String,
    default: "",
  },
});

const {
  activeConversation,
  messages,
  loading,
  startConversation,
  loadConversation,
  sendMessage,
  makeOffer,
  respondOffer,
} = useChat();

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user);

const messageText = ref("");
const offerPrice = ref("");
const offerNote = ref("");
const sending = ref(false);
const sendingOffer = ref(false);
const error = ref("");

const headerTitle = computed(() => {
  if (props.title) return props.title;
  const convo = activeConversation.value;
  if (convo?.jasa) {
    return convo.jasa.title || convo.jasa.name || "Konsultasi Jasa";
  }
  return "Konsultasi";
});

const isBuyer = computed(() => {
  if (props.mode === "buyer") return true;
  if (props.mode === "merchant") return false;
  const user = currentUser.value;
  const convo = activeConversation.value;
  if (!user || !convo) return false;
  return convo.buyer_id === user.id;
});

const isMerchant = computed(() => !isBuyer.value);

const sortedMessages = computed(() => {
  return [...messages.value].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
});

const isOfferMessage = (msg) => String(msg?.type || "text") === "offer";

const isPlainMessage = (msg) => !isOfferMessage(msg);

function isOwnMessage(msg) {
  const user = currentUser.value;
  if (!user) return false;
  return msg.sender_id === user.id;
}

function formatCurrency(value) {
  if (!value) return "-";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch (e) {
    return `${value}`;
  }
}

async function initConversation() {
  try {
    if (props.conversationId) {
      console.log('Loading existing conversation:', props.conversationId);
      await loadConversation(props.conversationId);
    } else if (props.jasaId) {
      console.log('Starting new conversation with jasa:', props.jasaId);
      const convo = await startConversation(props.jasaId);
      console.log('Conversation started:', convo);
      if (convo?.id) {
        console.log('Loading conversation details:', convo.id);
        await loadConversation(convo.id);
        console.log('Conversation loaded, activeConversation:', activeConversation.value);
      } else {
        console.error('Failed to start conversation - no ID returned');
        error.value = 'Gagal membuat percakapan. Silakan coba lagi.';
      }
    }
  } catch (err) {
    console.error('Error initializing conversation:', err);
    error.value = err.response?.data?.message || err.message || 'Gagal memuat percakapan. Silakan coba lagi.';
  }
}

onMounted(() => {
  initConversation();
});

watch(
  () => props.conversationId,
  async (val) => {
    if (val) {
      await loadConversation(val);
    }
  }
);

async function handleSend() {
  if (!messageText.value.trim() || !activeConversation.value) return;
  sending.value = true;
  error.value = '';
  try {
    const role = isBuyer.value ? 'buyer' : 'merchant';
    await sendMessage(activeConversation.value.id, messageText.value.trim(), role);
    messageText.value = "";
  } catch (err) {
    console.error('Error sending message:', err);
    error.value = err.response?.data?.message || err.message || 'Gagal mengirim pesan. Silakan coba lagi.';
  } finally {
    sending.value = false;
  }
}

async function handleOffer() {
  if (!offerPrice.value || !activeConversation.value) return;

  // Normalisasi angka rupiah (buang karakter non-digit)
  const raw =
    typeof offerPrice.value === "string"
      ? offerPrice.value.replace(/[^0-9]/g, "")
      : offerPrice.value;
  const price = parseInt(raw || 0, 10);
  if (!price) return;

  sendingOffer.value = true;
  try {
    if (isMerchant.value) {
      await makeOffer(activeConversation.value.id, price, offerNote.value.trim());
    } else {
      const offerTextLines = [
        `💰 Penawaran harga dari pembeli: ${formatCurrency(price)}`,
      ];
      if (offerNote.value?.trim()) {
        offerTextLines.push(`📝 ${offerNote.value.trim()}`);
      }

      await sendMessage(
        activeConversation.value.id,
        offerTextLines.join("\n"),
        "buyer"
      );
    }

    offerPrice.value = "";
    offerNote.value = "";
  } finally {
    sendingOffer.value = false;
  }
}

async function handleRespondOffer(messageId, accept) {
  if (!activeConversation.value || !isBuyer.value) return;
  await respondOffer(activeConversation.value.id, messageId, accept);
}
</script>

<template>
  <div
    class="flex flex-col h-full min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-gray-200 bg-white"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-merchant-primary/10 flex items-center justify-center text-merchant-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8.25 9A3.75 3.75 0 1 0 15.75 9 3.75 3.75 0 0 0 8.25 9Zm-3 9.75A6 6 0 0 1 17.25 18.3M12 3.75c2.9 0 5.25 2.35 5.25 5.25 0 1.752-.86 3.302-2.18 4.25"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-sm sm:text-[15px] font-semibold text-gray-900 truncate">
            {{ headerTitle }}
          </p>
          <p class="text-[11px] sm:text-xs text-gray-500 truncate">
            <span v-if="isBuyer">Mode Pembeli</span>
            <span v-else-if="isMerchant">Mode Penjual</span>
            <span v-else>Memuat percakapan...</span>
          </p>
        </div>
      </div>
      <span v-if="loading" class="text-[11px] sm:text-xs text-gray-500">Memuat...</span>
    </div>

    <!-- Messages -->
    <div class="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2.5 bg-gray-50/50">
      <div v-if="sortedMessages.length === 0" class="h-full flex items-center">
        <div class="w-full text-center text-xs text-gray-500 px-3">
          Belum ada pesan. Mulai percakapan dengan mengirim pesan pertama.
        </div>
      </div>

      <template v-else>
        <div
          v-for="msg in sortedMessages"
          :key="msg.id"
          :class="['flex w-full', isOwnMessage(msg) ? 'justify-end' : 'justify-start']"
        >
          <div class="max-w-[88%] sm:max-w-[78%] lg:max-w-[70%] flex flex-col gap-0.5">
            <!-- Bubble -->
            <div
              :class="[
                'rounded-2xl px-3 py-2 text-xs sm:text-sm break-words border',
                isOwnMessage(msg)
                  ? 'bg-merchant-primary text-white border-merchant-primary rounded-br-sm'
                  : 'bg-white text-gray-900 border-gray-200 rounded-bl-sm',
              ]"
            >
              <!-- Pesan biasa -->
              <p v-if="isPlainMessage(msg)">
                {{ msg.body }}
              </p>

              <!-- Penawaran -->
              <div v-else class="space-y-1.5">
                <p class="font-semibold flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    class="w-4 h-4"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 6v12m-6-6h12"
                    />
                  </svg>
                  Penawaran harga
                </p>
                <p class="text-sm font-bold">
                  {{ formatCurrency(msg.offer_price) }}
                </p>
                <p v-if="msg.body" class="text-xs opacity-90">
                  {{ msg.body }}
                </p>
                <p class="text-[11px] mt-1">
                  Status:
                  <span
                    :class="[
                      'font-semibold capitalize',
                      msg.offer_status === 'accepted'
                        ? 'text-emerald-500'
                        : msg.offer_status === 'rejected'
                        ? 'text-red-500'
                        : 'text-yellow-500',
                    ]"
                  >
                    {{ msg.offer_status || 'pending' }}
                  </span>
                </p>

                <!-- Tombol aksi untuk pembeli -->
                <div
                  v-if="isBuyer && msg.offer_status === 'pending'"
                  class="mt-2 flex flex-wrap gap-2"
                >
                  <Button
                    size="sm"
                    variant="primary"
                    @click="handleRespondOffer(msg.id, true)"
                  >
                    Terima Penawaran
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-outline"
                    @click="handleRespondOffer(msg.id, false)"
                  >
                    Tolak
                  </Button>
                </div>
              </div>
            </div>

            <!-- Meta waktu (opsional) -->
            <p class="text-[10px] text-gray-400 px-1" v-if="msg.created_at">
              {{ new Date(msg.created_at).toLocaleString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              }) }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <!-- Footer: form pesan + offer -->
    <div class="border-t border-gray-200 bg-white px-3 py-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)] space-y-2 shrink-0">
      <!-- Error message -->
      <div v-if="error" class="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
        {{ error }}
      </div>
      
      <!-- Input pesan -->
      <div class="flex items-end gap-2">
        <textarea
          v-model="messageText"
          rows="1"
          placeholder="Tulis pesan untuk konsultasi..."
          class="flex-1 resize-none text-xs sm:text-sm px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary bg-white"
          @keyup.enter.exact.prevent="handleSend"
        ></textarea>
        <Button
          variant="merchant"
          size="sm"
          :loading="sending || loading"
          :disabled="!messageText.trim() || !activeConversation || loading"
          @click="handleSend"
          title="Klik untuk mengirim pesan"
        >
          {{ loading ? 'Memuat...' : 'Kirim' }}
        </Button>
      </div>

      <!-- Area penawaran harga -->
      <div
        v-if="isMerchant || isBuyer"
        class="rounded-xl border border-dashed border-merchant-primary/35 bg-merchant-primary/5 px-3 py-2 space-y-1.5"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] sm:text-xs font-medium text-gray-800">
            {{
              isMerchant
                ? 'Buat penawaran harga ke pembeli'
                : 'Ajukan penawaran harga ke penjual'
            }}
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            v-model="offerPrice"
            type="text"
            inputmode="numeric"
            placeholder="Contoh: 150000 (tanpa titik)"
            class="flex-1 text-xs sm:text-sm px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary bg-white"
          />
          <Button
            variant="merchant-outline"
            size="sm"
            :loading="sendingOffer"
            :disabled="!offerPrice || !activeConversation"
            @click="handleOffer"
          >
            Kirim Penawaran
          </Button>
        </div>
        <textarea
          v-model="offerNote"
          rows="1"
          :placeholder="
            isMerchant
              ? 'Catatan (opsional), misal: sudah termasuk ongkos kirim'
              : 'Catatan (opsional), misal: bisa nego di harga ini'
          "
          class="w-full resize-none text-xs sm:text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-merchant-primary focus:border-merchant-primary bg-white"
        ></textarea>
      </div>
    </div>
  </div>
</template>
