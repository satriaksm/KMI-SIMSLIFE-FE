<template>
  <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <h3 class="text-base font-bold text-gray-800">{{ title }}</h3>
        <button @click="onCancel" class="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100">
          <i class="pi pi-times"></i>
        </button>
      </div>
      
      <!-- Cropper Container -->
      <div class="relative w-full bg-black flex-1 min-h-[300px] max-h-[60vh] overflow-hidden">
        <img ref="imageRef" :src="imageUrl" class="block max-w-full" alt="Crop Preview" crossorigin="anonymous" />
      </div>

      <!-- Controls & Actions -->
      <div class="p-4 bg-white border-t border-gray-100">
        <div class="flex items-center justify-between gap-3">
          <div class="flex gap-2">
            <button @click="zoom(0.1)" class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-merchant-primary transition-all">
              <i class="pi pi-search-plus"></i>
            </button>
            <button @click="zoom(-0.1)" class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-merchant-primary transition-all">
              <i class="pi pi-search-minus"></i>
            </button>
            <button @click="rotate()" class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-merchant-primary transition-all">
              <i class="pi pi-refresh"></i>
            </button>
          </div>
          <div class="flex gap-3">
            <button @click="onCancel" class="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Batal
            </button>
            <button @click="onCrop" class="px-4 py-2 text-sm font-bold text-white bg-merchant-primary rounded-xl hover:bg-merchant-primary/90 shadow-lg shadow-merchant-primary/20 transition-all">
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import CropperModule from 'cropperjs'
import '@/assets/cropper.css'

// ESM interop fallback
const Cropper = typeof CropperModule === 'function' ? CropperModule : CropperModule.default

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    required: true
  },
  aspectRatio: {
    type: Number,
    default: 1 // 1 for 1:1, 16/9 for 16:9, NaN for free
  },
  title: {
    type: String,
    default: 'Sesuaikan Gambar'
  }
})

const emit = defineEmits(['close', 'crop'])

const imageRef = ref(null)
const cropper = shallowRef(null)

const initCropper = () => {
  if (cropper.value) {
    cropper.value.destroy()
    cropper.value = null
  }
  
  if (!imageRef.value) return

  if (Cropper) {
    try {
      cropper.value = new Cropper(imageRef.value, {
        aspectRatio: props.aspectRatio,
        viewMode: 1, // Restrict the crop box to not exceed the size of the canvas.
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      })
    } catch (e) {
      console.error('Gagal inisialisasi cropper:', e)
    }
  } else {
    console.error('CropperJS is not loaded')
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    nextTick(() => {
      setTimeout(() => {
        initCropper()
      }, 150)
    })
  } else {
    if (cropper.value) {
      cropper.value.destroy()
      cropper.value = null
    }
  }
})

onBeforeUnmount(() => {
  if (cropper.value) {
    cropper.value.destroy()
  }
})

const zoom = (ratio) => {
  if (cropper.value) cropper.value.zoom(ratio)
}

const rotate = () => {
  if (cropper.value) cropper.value.rotate(90)
}

const onCancel = () => {
  emit('close')
}

const onCrop = () => {
  if (!cropper.value) return
  
  // Get cropped canvas
  const canvas = cropper.value.getCroppedCanvas({
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  })
  
  if (!canvas) return
  
  // Convert to Blob
  canvas.toBlob((blob) => {
    if (!blob) return
    
    // Create a new file from blob
    const file = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg', lastModified: Date.now() })
    emit('crop', file)
  }, 'image/jpeg', 0.9)
}
</script>

<style scoped>
/* Any specific cropper overrides if needed */
</style>