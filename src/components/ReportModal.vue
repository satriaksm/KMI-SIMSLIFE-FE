<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 class="text-xl font-semibold text-gray-900">
          Laporkan {{ reportableTypeLabel }}
        </h3>
        <button
          @click="$emit('close')"
          class="p-1 rounded-lg hover:bg-gray-100"
        >
          <X :size="24" class="text-gray-500" />
        </button>
      </div>

      <!-- Content Preview -->
      <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <p class="text-sm text-gray-600">Konten yang dilaporkan:</p>
        <p class="font-medium text-gray-900 mt-1">{{ reportableName }}</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="submitReport" class="p-6 space-y-4">
        <!-- Report Reason -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Alasan Laporan <span class="text-red-500">*</span>
          </label>
          <select
            v-model="form.report_reason_id"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          >
            <option value="">Pilih alasan...</option>
            <option
              v-for="reason in reasons"
              :key="reason.id"
              :value="reason.id"
            >
              {{ reason.reason_title }}
            </option>
          </select>
          <p v-if="selectedReason" class="text-xs text-gray-500 mt-1">
            {{ selectedReason.reason_description }}
          </p>
        </div>

        <!-- Additional Comment (Required if "Lainnya") -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Keterangan Tambahan
            <span v-if="isLainnya" class="text-red-500">*</span>
            <span v-else class="text-gray-400">(Opsional)</span>
          </label>
          <textarea
            v-model="form.report_comment"
            rows="4"
            :required="isLainnya"
            :placeholder="isLainnya ? 'Wajib diisi untuk alasan Lainnya' : 'Jelaskan lebih detail (opsional)'"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 resize-none"
          ></textarea>
          <p v-if="isLainnya" class="text-xs text-red-500 mt-1">
            * Wajib diisi untuk alasan "Lainnya"
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>

        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Loader2 v-if="isSubmitting" :size="16" class="animate-spin" />
            {{ isSubmitting ? 'Mengirim...' : 'Kirim Laporan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { X, Loader2 } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import api from '@/libs/axios';

const props = defineProps({
  reportableType: {
    type: String,
    required: true,
  },
  reportableId: {
    type: Number,
    required: true,
  },
  reportableName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['close']);
const toast = useToast();

// State
const reasons = ref([]);
const form = ref({
  report_reason_id: '',
  report_comment: '',
});
const isSubmitting = ref(false);
const errorMessage = ref('');

// Computed
const reportableTypeLabel = computed(() => {
  const labels = {
    product: 'Produk',
    service: 'Jasa',
    merchant: 'Merchant',
    post: 'Postingan',
    post_comment: 'Komentar',
    user: 'Pengguna',
  };
  return labels[props.reportableType] || 'Konten';
});

const selectedReason = computed(() => {
  return reasons.value.find((r) => r.id === form.value.report_reason_id);
});

const isLainnya = computed(() => {
  return selectedReason.value?.reason_title?.toLowerCase() === 'lainnya';
});

// Methods
const fetchReasons = async () => {
  try {
    const response = await api.get(`/api/report-reasons`, {
      params: { type: props.reportableType },
    });
    reasons.value = response.data;
  } catch (error) {
    console.error('Failed to fetch report reasons:', error);
    toast.error('Gagal memuat alasan laporan');
  }
};

const submitReport = async () => {
  errorMessage.value = '';

  // Validate reason selected
  if (!form.value.report_reason_id) {
    errorMessage.value = 'Pilih alasan laporan terlebih dahulu';
    return;
  }

  // Validate "Lainnya" requires comment
  if (isLainnya.value && !form.value.report_comment.trim()) {
    errorMessage.value = 'Keterangan wajib diisi untuk alasan "Lainnya"';
    return;
  }

  isSubmitting.value = true;

  try {
    await api.post('/api/reports', {
      reportable_type: props.reportableType,
      reportable_id: props.reportableId,
      report_reason_id: form.value.report_reason_id,
      report_comment: form.value.report_comment || null,
    });

    toast.success('Laporan berhasil dikirim');
    emit('close');
  } catch (error) {
    console.error('Failed to submit report:', error);
    
    if (error.response?.status === 409) {
      errorMessage.value = 'Anda sudah pernah melaporkan konten ini';
    } else if (error.response?.status === 403) {
      errorMessage.value = 'Tidak dapat melaporkan konten sendiri';
    } else {
      errorMessage.value = error.response?.data?.message || 'Gagal mengirim laporan';
    }
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchReasons();
});
</script>
