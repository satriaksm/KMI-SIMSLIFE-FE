<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
    <!-- Header with Report Button -->
    <div class="p-4 flex items-start justify-between">
      <div class="flex-1">
        <h3 class="font-semibold text-gray-900 dark:text-white">{{ post.post_title }}</h3>
      </div>
      
      <!-- Report Button -->
      <ReportButton
        reportable-type="post"
        :reportable-id="post.id"
        :reportable-name="post.post_title"
      />
    </div>
    
    <!-- Content -->
    <div class="px-2 sm:px-2.5 pt-2 sm:pt-4">
      <p class="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-600 line-clamp-2">
        {{ post.post_content }}
      </p>
    </div>
  </div>
</template>

<script setup>
import ReportButton from '@/components/ReportButton.vue';

defineProps({
  post: {
    type: Object,
    required: true,
  },
});
</script>
