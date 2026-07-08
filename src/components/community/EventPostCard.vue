<template>
  <article
    :class="[
      'bg-white shadow-md rounded-2xl overflow-hidden transition-all',
      post.author?.is_super_admin ? 'ring-2 ring-indigo-400 bg-gradient-to-br from-white to-indigo-50/40' :
      post.author?.is_admin       ? 'ring-2 ring-[#194a7a]/30 bg-gradient-to-br from-white to-blue-50/40' : ''
    ]"
  >
    <!-- Event Banner -->
    <div v-if="post.event?.banner_img_path || post.event?.banner_url" class="w-full h-48 sm:h-64 bg-gray-100 relative">
      <img
        :src="post.event.banner_url || getImageUrl(post.event.banner_img_path)"
        :alt="post.event.event_name"
        class="w-full h-full object-cover"
        @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
      />
      <div class="absolute top-4 left-4 bg-merchant-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
        <i class="pi pi-calendar"></i>
        EVENT RESMI
      </div>
    </div>

    <div class="p-5">
      <!-- header -->
      <div class="flex items-start gap-4 mb-4">
        <UserAvatar 
          :user="post.author" 
          size="lg"
        />
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <router-link
                  :to="`/profile/${post.author?.id}`"
                  class="font-semibold hover:underline"
                >
                  {{ post.author?.name }}
                </router-link>
                <!-- Admin badge -->
                <span
                  v-if="post.author?.is_super_admin"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  Superadmin
                </span>
                <span
                  v-else-if="post.author?.is_admin"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#194a7a]/10 text-[#194a7a] border border-[#194a7a]/20"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                  Admin
                </span>
              </div>
              <div class="mt-1 text-xs text-gray-500">
                {{ formatDateTime(post.created_at) }}
              </div>
            </div>

            <div class="text-gray-400" @click.stop>
              <ReportButton
                reportable-type="post"
                :reportable-id="post.id"
                :reportable-name="post.post_title || 'Postingan Event'"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Title & content -->
      <router-link
        :to="`/community/${post.post_slug}`"
        class="block group"
      >
        <h2
          class="text-lg font-bold text-gray-900 group-hover:text-[#194a7a] transition-colors mb-2"
          v-if="post.post_title"
        >
          {{ post.post_title }}
        </h2>

        <!-- Event Details Box -->
        <div v-if="post.event" class="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div>
              <div class="text-xs text-gray-500 mb-1">Tanggal Mulai</div>
              <div class="font-semibold text-gray-800 text-sm">
                <i class="pi pi-calendar text-[#194a7a] mr-1"></i>
                {{ formatDate(post.event.event_start_date) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 mb-1">Tanggal Selesai</div>
              <div class="font-semibold text-gray-800 text-sm">
                <i class="pi pi-calendar-times text-[#194a7a] mr-1"></i>
                {{ formatDate(post.event.event_end_date) }}
              </div>
            </div>
          </div>
        </div>

        <p
          class="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm"
          :class="{ 'line-clamp-3': !isExpanded }"
        >
          {{ post.post_content }}
        </p>
      </router-link>
      
      <button
        v-if="post.post_content?.length > 150"
        @click.stop="isExpanded = !isExpanded"
        class="text-[#194a7a] hover:underline text-sm font-medium mt-2 focus:outline-none"
      >
        {{ isExpanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya' }}
      </button>

      <!-- actions -->
      <div class="pt-3 mt-4 border-t border-gray-100">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-4">
            <router-link
              :to="`/community/${post.post_slug}`"
              class="flex items-center gap-2 text-[10px] text-gray-600 hover:text-gray-800"
            >
              <svg
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                />
              </svg>
              <span>{{ post.comments_count ?? 0 }} komentar</span>
            </router-link>
          </div>

          <div class="text-[10px] text-gray-400">
            {{ post.views_count ?? 0 }} views
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref } from 'vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ReportButton from '@/components/ReportButton.vue';

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
});

defineEmits(['comment']);

const isExpanded = ref(false);

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Fallback image utility if using raw path
const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${path}`;
};
</script>
