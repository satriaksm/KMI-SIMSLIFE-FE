<template>
  <div class="pb-8">
    <div class="sticky top-[73px] z-10 bg-white border-b border-gray-200">
      <div class="flex items-center px-4 py-3 mx-auto max-w-6xl">
        <button @click="goBack" class="mr-3">
          <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="text-lg font-semibold text-gray-900">Edit Penilaian</h1>
      </div>
    </div>

    <div class="px-4 py-4 mx-auto max-w-6xl">
      <div class="p-4 space-y-4 bg-white border border-gray-200 rounded-xl">
        <!-- Product Info -->
        <div class="flex gap-3">
          <img 
            :src="review.productImage" 
            :alt="review.productName" 
            class="w-20 h-20 rounded-lg object-cover"
          />
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-gray-900">{{ review.productName }}</h3>
            <p class="mt-1 text-xs text-gray-500">Diubah: {{ review.lastEdited }}</p>
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
          <h4 class="text-sm font-medium text-gray-900 mb-2">Kelola Gambar</h4>
          <div class="flex gap-2">
            <div v-for="(image, index) in images" :key="index" class="relative">
              <img 
                :src="image" 
                alt="Review" 
                class="w-16 h-16 rounded-lg object-cover"
              />
              <button 
                @click="removeImage(index)"
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
          <h4 class="text-sm font-medium text-gray-900 mb-2">Ubah Pendapat</h4>
          <textarea 
            v-model="reviewText"
            placeholder="Tulis ulasan Anda..."
            class="w-full text-sm border border-gray-300 rounded-lg p-2 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-transparent resize-none"
          ></textarea>
          <p class="mt-1 text-xs text-gray-500">{{ reviewText.length }} karakter</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 mt-4">
        <button 
          @click="cancelEdit"
          class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Batal
        </button>
        <button 
          @click="saveReview"
          :disabled="rating === 0 || !reviewText.trim()"
          class="px-4 py-2 text-sm font-medium text-white rounded-lg bg-merchant-primary hover:bg-merchant-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
          Simpan
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const review = ref({
  id: 1,
  productName: 'CemalCemil',
  productImage: 'https://via.placeholder.com/100x100/D2B48C/FFFFFF?text=CemalCemil',
  rating: 5,
  text: 'Pentolnya muanteeeep poll',
  images: [
    'https://via.placeholder.com/100x100/FFA500/FFFFFF?text=Foto+1',
    'https://via.placeholder.com/100x100/FF8C00/FFFFFF?text=Foto+2'
  ],
  lastEdited: '25 Nov 2025'
});

const rating = ref(review.value.rating);
const reviewText = ref(review.value.text);
const images = ref([...review.value.images]);

const goBack = () => {
  router.back();
};

const handleFileUpload = (event) => {
  const files = Array.from(event.target.files);
  const remainingSlots = 5 - images.value.length;
  
  files.slice(0, remainingSlots).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      images.value.push(e.target.result);
    };
    reader.readAsDataURL(file);
  });
  
  event.target.value = '';
};

const removeImage = (index) => {
  if (confirm('Hapus gambar ini?')) {
    images.value.splice(index, 1);
  }
};

const cancelEdit = () => {
  if (confirm('Batalkan perubahan?')) {
    router.back();
  }
};

const saveReview = () => {
  if (rating.value === 0 || !reviewText.value.trim()) {
    return;
  }
  
  console.log({
    id: review.value.id,
    rating: rating.value,
    text: reviewText.value,
    images: images.value
  });
  
  alert('Review berhasil diperbarui!');
  router.back();
};
</script>