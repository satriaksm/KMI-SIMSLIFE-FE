<template>
  <div class="flex gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
    <!-- Avatar -->
    <div class="flex-shrink-0">
      <div class="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
        <img
          v-if="comment.author?.profile_picture"
          :src="comment.author.profile_picture"
          :alt="comment.author.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <User :size="20" class="text-gray-500" />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Header -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <p class="font-medium text-gray-900 dark:text-white">
            {{ comment.author?.name || 'Pengguna' }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatDate(comment.created_at) }}
          </p>
        </div>

        <!-- Report Button -->
        <ReportButton
          reportable-type="post_comment"
          :reportable-id="comment.id"
          :reportable-name="`Komentar oleh ${comment.author?.name}`"
        />
      </div>

      <!-- Comment Text -->
      <p class="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {{ comment.comment }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { User } from 'lucide-vue-next';
import ReportButton from '@/components/ReportButton.vue';

defineProps({
  comment: {
    type: Object,
    required: true,
  },
});

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>