<template>
  <!-- Seluruh card adalah link -->
  <router-link :to="`/community/${post.post_slug}`" class="block group">
    <article class="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 bg-white border border-gray-100">

      <!-- ══ BANNER HERO ══ -->
      <div class="relative w-full h-48 sm:h-60 overflow-hidden bg-secondary">
        <img
          v-if="post.event?.banner_url || post.event?.banner_img_path"
          :src="post.event.banner_url || getImageUrl(post.event.banner_img_path)"
          :alt="post.event?.event_name"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          @error="(e) => { if(!e.target.dataset.errored) { e.target.dataset.errored='true'; e.target.src='/placeholder.png'; } }"
        />
        <!-- Fallback pattern -->
        <div v-else class="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="grid-ev" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid-ev)"/></svg>
        </div>

        <!-- Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent"></div>

        <!-- TOP: Badge + Views -->
        <div class="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
          <span class="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm text-secondary text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md">
            Event
            <img :src="LogoWithText" alt="Sumilir" class="h-3.5 object-contain" />
          </span>
          <span class="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white/90 text-[10px] px-2.5 py-1 rounded-full shadow-sm">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            {{ post.views_count ?? 0 }}
          </span>
        </div>

        <!-- BOTTOM: Event name + dates -->
        <div class="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <p v-if="post.event?.event_name" class="text-white font-bold text-sm sm:text-base leading-snug drop-shadow mb-1.5 line-clamp-2">
            {{ post.event.event_name }}
          </p>
          <div v-if="post.event" class="flex flex-wrap gap-1.5">
            <span class="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ formatDate(post.event.event_start_date) }}
            </span>
            <span v-if="post.event.event_end_date && post.event.event_end_date !== post.event.event_start_date"
              class="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              s/d {{ formatDate(post.event.event_end_date) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ══ CARD BODY ══ -->
      <div class="p-4 sm:p-5">

        <!-- Author row -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="shrink-0 rounded-full p-0.5 bg-secondary/20">
              <UserAvatar :user="post.author" size="md" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-gray-900">{{ post.author?.name }}</span>
                <span v-if="post.author?.is_super_admin"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-white">
                  <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  Superadmin
                </span>
                <span v-else-if="post.author?.is_admin"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
                  <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                  Admin
                </span>
              </div>
              <p class="text-[11px] text-gray-400 mt-0.5">{{ formatDateTime(post.created_at) }}</p>
            </div>
          </div>
          <div @click.prevent.stop>
            <ReportButton reportable-type="post" :reportable-id="post.id" :reportable-name="post.post_title || 'Postingan Event'" />
          </div>
        </div>

        <!-- Title + content -->
        <h2 v-if="post.post_title" class="font-bold text-gray-900 text-[15px] sm:text-base mb-1.5 group-hover:text-secondary transition-colors leading-snug">
          {{ post.post_title }}
        </h2>
        <p class="text-gray-500 text-[12px] sm:text-[13px] leading-relaxed line-clamp-2">
          {{ post.post_content }}
        </p>

        <!-- Footer stats -->
        <div class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {{ post.comments_count ?? 0 }} komentar
          </span>
        </div>
      </div>
    </article>
  </router-link>
</template>

<script setup>
import { ref } from 'vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import ReportButton from '@/components/ReportButton.vue';
import LogoWithText from '@/assets/icons/LogoWithText.png';

const props = defineProps({
  post: { type: Object, required: true },
});
defineEmits(['comment']);

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${path}`;
};
</script>
