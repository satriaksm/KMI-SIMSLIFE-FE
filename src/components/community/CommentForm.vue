<template>
  <!-- fixed bottom single bar -->
  <div class="fixed left-1/2 -translate-x-1/2 bottom-20 sm:bottom-6 z-[100] w-full max-w-2xl px-4">
    <div class="bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-3 flex items-center gap-3 border border-gray-100">
      <UserAvatar 
        v-if="user"
        :user="user" 
        size="md" 
        :clickable="false"
      />
      <div v-else class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <i class="pi pi-user text-gray-400"></i>
      </div>

      <div class="flex-1">
        <textarea
          ref="ta"
          v-model="text"
          :placeholder="placeholderText"
          rows="1"
          @keydown.enter.prevent="onEnter"
          @input="autoResize"
          class="min-h-10 max-h-40 w-full resize-none bg-transparent outline-none px-2 py-2 text-[13px] sm:text-sm rounded focus:ring-0"
        />
        <div v-if="isReply" class="text-[10px] sm:text-xs text-gray-400 mt-1 ml-1">
          Membalas <span class="font-medium text-gray-700">{{ parentLabel }}</span>
        </div>
      </div>

      <button
        @click="submit"
        :disabled="loading || !text.trim()"
        class="bg-primary text-white px-4 py-2 rounded-full text-sm disabled:opacity-60 flex items-center gap-2"
      >
        <template v-if="loading">
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25"/><path d="M22 12a10 10 0 00-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
          Mengirim...
        </template>
        <template v-else> Kirim </template>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import api from '@/libs/axios'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/common/UserAvatar.vue'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const props = defineProps({
  postId: { type: [String, Number], required: true },
  parentId: { type: [String, Number], default: null },
  parentLabel: { type: String, default: '' },
  userAvatarUrl: { type: String, default: null }
})
const emit = defineEmits(['added', 'clearReply'])

const text = ref('')
const loading = ref(false)
const ta = ref(null)

const isReply = computed(() => !!props.parentId)
const placeholderText = computed(() => isReply.value ? `Balas ke ${props.parentLabel || 'User'}...` : 'Tulis komentar...')

watch(() => props.parentId, (v) => {
  if (v) nextTick(() => ta.value?.focus())
})

function autoResize() {
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  const max = 160
  el.style.height = Math.min(el.scrollHeight, max) + 'px'
}
function onEnter(e) {
  if (e.shiftKey) {
    text.value += '\n'
    nextTick(autoResize)
    return
  }
  submit()
}

async function submit() {
  if (!text.value.trim()) return
  loading.value = true
  try {
    if (isReply.value && props.parentId) {
      await api.post(`/api/community/posts/${props.postId}/comments/${props.parentId}`, {
        comment_content: text.value.trim()
      })
    } else {
      await api.post(`/api/community/posts/${props.postId}/comments`, {
        comment_content: text.value.trim()
      })
    }
    text.value = ''
    autoResize()
    emit('added')
    if (isReply.value) emit('clearReply')
  } catch (err) {
    console.error(err)
    alert('Gagal mengirim komentar.')
  } finally {
    loading.value = false
  }
}
</script>
