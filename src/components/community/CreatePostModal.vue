<template>
  <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl md:max-w-3xl">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Buat Post Baru</h2>
        <button @click="$emit('close')" class="text-sm px-2 py-1 rounded hover:bg-gray-100">Tutup ✕</button>
      </div>

      <form @submit.prevent="submit" novalidate>
        <div class="mb-3">
          <label class="block text-sm font-medium mb-1">Judul</label>
          <input v-model="title" required class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          <p v-if="errors.post_title" class="text-red-600 text-sm mt-1" v-for="(m,i) in errors.post_title" :key="i">{{ m }}</p>
        </div>

        <div class="mb-3">
          <label class="block text-sm font-medium mb-1">Caption</label>
          <textarea v-model="content" rows="4" required class="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"></textarea>
          <p v-if="errors.post_content" class="text-red-600 text-sm mt-1" v-for="(m,i) in errors.post_content" :key="i">{{ m }}</p>
        </div>

        <div class="mb-3">
          <label class="block text-sm font-medium mb-2">Gambar (maks 5)</label>

          <!-- Drop / click area -->
          <label
            class="flex items-center justify-center gap-3 border-dashed border-2 border-gray-200 rounded-md p-4 cursor-pointer hover:border-gray-300"
          >
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
              multiple
              @change="handleFileChange"
            />
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0l4-4m-4 4-4-4"/></svg>
            <span class="text-sm text-gray-600">Klik untuk pilih atau tarik gambar (jpg/png/gif/webp). Maks: 5, tiap file ≤ 2MB</span>
          </label>

          <!-- previews -->
          <div v-if="previews.length" class="grid grid-cols-4 gap-3 mt-3">
            <div v-for="(p, idx) in previews" :key="p" class="relative group">
              <img :src="p" class="w-full h-24 object-cover rounded-md border" />
              <button type="button" @click="removeImage(idx)"
                class="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                ✕
              </button>
            </div>
          </div>

          <!-- client error messages -->
          <div v-if="clientErrors.length" class="mt-2">
            <p v-for="(m,i) in clientErrors" :key="i" class="text-red-600 text-sm">{{ m }}</p>
          </div>

          <!-- server errors for images -->
          <p v-if="errors.images" class="text-red-600 text-sm mt-2" v-for="(m,i) in errors.images" :key="i">{{ m }}</p>

          <div class="text-xs text-gray-500 mt-2">Terpilih: {{ imageFiles.length }} / 5</div>
        </div>

        <div class="flex gap-3 mt-4">
          <button
            type="submit"
            :disabled="loading || submitDisabled"
            class="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/85 disabled:opacity-60"
          >
            {{ loading ? 'Mengirim...' : 'Kirim' }}
          </button>
          <button type="button" @click="$emit('close')" class="px-4 py-2 rounded-md border">Batal</button>
        </div>

        <!-- general server error -->
        <p v-if="serverMessage" class="text-red-600 text-sm mt-3">{{ serverMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '@/libs/axios'
import { compressImage } from '@/utils/imageCompressor'

const title = ref('')
const content = ref('')
const imageFiles = ref([])      // Array<File>
const previews = ref([])        // Array<objectURL>
const loading = ref(false)
const errors = ref({})          // server validation errors
const clientErrors = ref([])    // validation messages client-side
const serverMessage = ref('')

const maxFiles = 5
const maxSize = 2 * 1024 * 1024 // 2MB
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']

const submitDisabled = computed(() => imageFiles.value.length > maxFiles)

async function handleFileChange(e) {
  clientErrors.value = []
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    if (imageFiles.value.length >= maxFiles) {
      clientErrors.value.push(`Maksimal ${maxFiles} gambar.`)
      break
    }
    if (!allowedTypes.includes(f.type)) {
      clientErrors.value.push(`${f.name} bukan format yang didukung.`)
      continue
    }
    if (f.size > maxSize) {
      clientErrors.value.push(`${f.name} melebihi ukuran 2 MB.`)
      continue
    }
    
    try {
      const compressedFile = await compressImage(f, 1920)
      imageFiles.value.push(compressedFile)
      previews.value.push(URL.createObjectURL(compressedFile))
    } catch (err) {
      imageFiles.value.push(f)
      previews.value.push(URL.createObjectURL(f))
    }
  }
  // reset file input so user bisa pilih file yang sama lagi bila perlu
  e.target.value = ''
}

function removeImage(idx) {
  if (previews.value[idx]) {
    URL.revokeObjectURL(previews.value[idx])
  }
  previews.value.splice(idx, 1)
  imageFiles.value.splice(idx, 1)
}

async function submit() {
  errors.value = {}
  clientErrors.value = []
  serverMessage.value = ''

  if (!title.value.trim()) {
    errors.value.post_title = ['The post title field is required.']
  }
  if (!content.value.trim()) {
    errors.value.post_content = ['The post content field is required.']
  }
  if (imageFiles.value.length > maxFiles) {
    clientErrors.value.push(`Maksimal ${maxFiles} gambar.`)
  }
  if (Object.keys(errors.value).length) return

  const formData = new FormData()
  formData.append('post_title', title.value)
  formData.append('post_content', content.value)

  // append each file as images[]
  for (const f of imageFiles.value) {
    formData.append('images[]', f)
  }

  loading.value = true
  try {
    for (const pair of formData.entries()) {
      console.log('formdata', pair[0], pair[1])
    }
    const res = await api.post('/api/community/posts', formData, {
      // jangan set Content-Type langsung
      transformRequest: [(data, headers) => {
        // pastikan axios tidak meng-stringify FormData
        return data
      }]
    })
    // success: emit created and close
    ;(window || {}).console?.log('[CreatePostModal] created', res)
    // optionally clear state
    title.value = ''
    content.value = ''
    for (const p of previews.value) URL.revokeObjectURL(p)
    previews.value = []
    imageFiles.value = []
    errors.value = {}
    clientErrors.value = []
    emit('created')
    emit('close')
  } catch (err) {
    console.error('[CreatePostModal] error', err)
    if (err.response && err.response.data) {
      if (err.response.data.errors) {
        errors.value = err.response.data.errors
      } else if (err.response.data.message) {
        serverMessage.value = err.response.data.message
      } else {
        serverMessage.value = 'Gagal mengirim. Coba lagi.'
      }
    } else {
      serverMessage.value = err.message || 'Gagal mengirim. Periksa koneksi.'
    }
  } finally {
    loading.value = false
  }
}

// emit helper for <script setup>
const emit = defineEmits(['close', 'created'])
</script>

<style scoped>
/* kecilkan overlay tombol hapus supaya tetap klik-able */
</style>
