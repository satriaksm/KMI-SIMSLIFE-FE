<template>
  <div class="flex gap-3 text-[11px] sm:text-sm">
    <UserAvatar 
      :user="comment.author ?? comment.user" 
      size="md"
    />

    <div class="flex-1">
      <div
        :class="[
          'rounded-xl p-2 sm:p-3 border',
          comment.author?.is_super_admin ?? comment.user?.is_super_admin
            ? 'bg-indigo-50 border-indigo-200'
            : (comment.author?.is_admin ?? comment.user?.is_admin)
              ? 'bg-blue-50/60 border-[#194a7a]/20'
              : 'bg-gray-50 border-transparent'
        ]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <div class="font-medium text-gray-800 text-[12px] sm:text-sm">
                {{ (comment.author ?? comment.user)?.name || 'User' }}
              </div>
              <!-- Admin badge -->
              <span
                v-if="(comment.author ?? comment.user)?.is_super_admin"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 w-fit"
              >
                <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                Superadmin
              </span>
              <span
                v-else-if="(comment.author ?? comment.user)?.is_admin"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#194a7a]/10 text-[#194a7a] border border-[#194a7a]/20 w-fit"
              >
                <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                Admin
              </span>
              
              <!-- Info replying to -->
              <div v-if="comment.replying_to" class="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-0">
                membalas <span class="font-semibold text-gray-700">{{ comment.replying_to.username }}</span>
              </div>
              
              <div class="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-0">
                {{ timeAgo(comment.created_at) }}
              </div>
            </div>

            <div class="mt-2 text-[11px] sm:text-sm text-gray-800 whitespace-pre-line">
              {{ comment.content }}
            </div>
          </div>

          <!-- actions -->
          <div class="flex flex-col items-end gap-1 ml-2 shrink-0">
            <ReportButton
              reportable-type="post_comment"
              :reportable-id="comment.id"
              :reportable-name="`Komentar oleh ${comment.user?.name || 'User'}`"
            />
            <button 
              @click="requestReply" 
              class="text-[11px] sm:text-sm px-2 py-1 text-gray-400 rounded hover:bg-gray-100 transition"
            >
              Balas
            </button>
          </div>
        </div>
      </div>

      <!-- nested replies -->
      <div v-if="comment.replies && comment.replies.length" class="mt-3 ml-4 space-y-3">
        <CommentItem
          v-for="r in visibleReplies"
          :key="r.id"
          :comment="r"
          :post-id="postId"
          @reply-request="$emit('reply-request', $event)"
          @reply-added="$emit('reply-added')"
        />
        <div v-if="comment.replies.length > visibleReplies.length" class="mt-1 ml-2">
          <button 
            @click="showAllReplies = true" 
            class="text-xs sm:text-sm text-primary hover:underline transition"
          >
            Tampilkan {{ comment.replies.length - visibleReplies.length }} balasan lagi ↓
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CommentItem from './CommentItem.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import ReportButton from '@/components/ReportButton.vue'

const props = defineProps({
  comment: { type: Object, required: true },
  postId: { type: [String, Number], default: null }
})

const emit = defineEmits(['reply-request', 'reply-added'])

const showAllReplies = ref(false)

const visibleReplies = computed(() => 
  showAllReplies.value 
    ? (props.comment.replies || []) 
    : (props.comment.replies || []).slice(0, 2)
)

function requestReply() {
  emit('reply-request', { 
    parentId: props.comment.id, 
    parentLabel: props.comment.user?.name || 'User' 
  })
}

function timeAgo(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / 1000)
  
  if (diff < 60) return `${diff} detik lalu`
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} minggu lalu`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} bulan lalu`
  return `${Math.floor(diff / 31536000)} tahun lalu`
}
</script>