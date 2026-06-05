<template>
  <div class="flex gap-3 text-[11px] sm:text-sm">
    <UserAvatar 
      :user="comment.user" 
      size="md"
    />

    <div class="flex-1">
      <div class="bg-gray-50 rounded-xl p-2 sm:p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div class="font-medium text-gray-800 text-[12px] sm:text-sm">
                {{ comment.user?.name || 'User' }}
              </div>
              
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