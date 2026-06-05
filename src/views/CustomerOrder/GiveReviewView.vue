<template>
  <div class="pb-8 px-4 py-4 mx-auto max-w-6xl">
      <div class="p-4 space-y-4 bg-white border border-gray-200 rounded-xl">
        <!-- Product Info -->
        <div class="flex gap-3">
          <img 
            src="https://via.placeholder.com/100x100/D2B48C/FFFFFF?text=CemalCemil" 
            alt="CemalCemil" 
            class="w-20 h-20 rounded-lg object-cover"
          />
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-gray-900">CemalCemil</h3>
            <p class="mt-1 text-sm text-gray-600">Pentol Juara</p>
            <div class="flex gap-1 mt-2">
              <button 
                v-for="star in 5" 
                :key="star"
                @click="rating = star"
                class="focus:outline-none transition-transform">
                <svg 
                  class="w-5 h-5 transition-colors"
                  :class="star <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'"
                  fill="currentColor" 
                  viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Images Section -->
        <div>
          <h4 class="text-sm font-medium text-gray-900 mb-2">Tambahkan Gambar</h4>
          <div class="flex gap-2">
            <div v-for="(img, idx) in images" :key="idx" class="relative">
              <img 
                :src="img" 
                alt="Review" 
                class="w-16 h-16 rounded-lg object-cover"
              />
              <button 
                @click="removeImage(idx)"
                class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600">
                ×
              </button>
            </div>

            <label v-if="images.length < 5" class="w-16 h-16 border border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
              <input type="file" class="hidden" accept="image/*" multiple @change="handleFileUpload">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </label>
          </div>
          <p class="mt-1 text-xs text-gray-500">Maks 5 gambar</p>
        </div>

        <!-- Opinion Section -->
        <div>
          <h4 class="text-sm font-medium text-gray-900 mb-2">Bagikan Pendapat</h4>
          <textarea 
            v-model="reviewText"
            placeholder="Tulis pendapatmu tentang produk ini..."
            class="w-full text-sm border border-gray-300 rounded-lg p-2 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-transparent resize-none"
          ></textarea>
        </div>
      </div>

      <button 
        @click="submitReview"
        :disabled="rating === 0 || !reviewText.trim()"
        class="w-full mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg bg-merchant-primary hover:bg-merchant-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
        Kirim
      </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const rating = ref(0);
const reviewText = ref('');
const images = ref([]);

const handleFileUpload = (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      images.value.push(e.target.result);
    };
    reader.readAsDataURL(file);
  });
};

const removeImage = (index) => {
  images.value.splice(index, 1);
};

const submitReview = () => {
  if (rating.value === 0 || !reviewText.value.trim()) {
    return;
  }
  
  // Handle review submission here
  console.log({
    rating: rating.value,
    text: reviewText.value,
    images: images.value
  });
  
  // Show success message or navigate
  alert('Review berhasil dikirim!');
  router.back();
};
</script>

<style scoped>
/* Responsive adjustments */
@media (min-width: 768px) {
  .max-w-4xl {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
</style>