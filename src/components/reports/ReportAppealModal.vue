<template>
  <div class="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 class="text-xl font-semibold text-gray-900">Ajukan Sanggahan</h3>
        <button @click="$emit('close')" class="p-1 rounded-lg hover:bg-gray-100">
          <X :size="24" class="text-gray-500" />
        </button>
      </div>

      <div class="p-6">
        <p class="text-sm text-gray-600 mb-4">
          Jika Anda merasa tindakan moderasi ini tidak tepat, Anda dapat mengajukan sanggahan. Tim kami akan meninjau ulang keputusan tersebut.
        </p>
        
        <div v-if="targetName" class="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
          <p class="text-gray-500 mb-1">Konten Terkait:</p>
          <p class="font-medium text-gray-800">{{ targetName }}</p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Alasan Sanggahan <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="appealText"
            rows="5"
            class="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block"
            placeholder="Jelaskan secara detail mengapa tindakan ini tidak tepat..."
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">Minimal 5 karakter.</p>
        </div>
      </div>

      <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="$emit('close')"
          class="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Batal
        </button>
        <button
          @click="handleSubmit"
          :disabled="isSubmitting || appealText.trim().length < 5"
          class="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
        >
          <Loader2 v-if="isSubmitting" :size="16" class="animate-spin" />
          {{ isSubmitting ? 'Mengirim...' : 'Kirim Sanggahan' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { X, Loader2 } from 'lucide-vue-next';
import { useReports } from '@/composables/useReports';
import { useToast } from 'vue-toastification';

const props = defineProps({
  reportId: {
    type: Number,
    required: true
  },
  targetName: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(['close', 'success']);
const { submitAppeal } = useReports();
const toast = useToast();

const appealText = ref('');
const isSubmitting = ref(false);

const handleSubmit = async () => {
  if (appealText.value.trim().length < 5) {
    toast.error("Alasan sanggahan terlalu singkat. Minimal 5 karakter.");
    return;
  }

  isSubmitting.value = true;
  try {
    await submitAppeal(props.reportId, appealText.value);
    emit('success');
    emit('close');
  } catch (error) {
    // Error is already handled by composable
  } finally {
    isSubmitting.value = false;
  }
};
</script>
