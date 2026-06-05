<template>
  <div class="pb-8">
    <div class="sticky top-[73px] z-10 bg-white border-b border-gray-200">
      <div class="flex items-center px-4 py-3 mx-auto max-w-6xl">
        <button @click="goBack" class="mr-3">
          <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="text-lg font-semibold text-gray-900">Lihat Penilaian</h1>
      </div>
    </div>

    <div class="px-4 py-4 mx-auto max-w-6xl space-y-3">
      <div class="p-4 bg-white border border-gray-200 rounded-xl">
        <!-- Product Info -->
        <div class="flex gap-3 pb-4 border-b border-gray-200">
          <img 
            src="https://via.placeholder.com/100x100/D2B48C/FFFFFF?text=CemalCemil" 
            alt="CemalCemil" 
            class="w-20 h-20 rounded-lg object-cover"
          />
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-gray-900">CemalCemil</h3>
            <p class="mt-1 text-xs text-gray-500">Pentol Juara</p>
            <div class="flex gap-1 mt-2">
              <svg v-for="i in 5" :key="i" class="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Review Text -->
        <div class="py-3 border-b border-gray-200">
          <p class="text-sm text-gray-700">Pentolnya muanteeeep poll</p>
        </div>

        <!-- Review Images -->
        <div class="py-3 border-b border-gray-200">
          <div class="flex gap-2">
            <img 
              src="https://via.placeholder.com/100x100/FFA500/FFFFFF?text=Foto+1" 
              alt="Review 1" 
              class="w-16 h-16 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
            />
            <img 
              src="https://via.placeholder.com/100x100/FF8C00/FFFFFF?text=Foto+2" 
              alt="Review 2" 
              class="w-16 h-16 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-3 justify-end">
          <button 
            @click="router.push('/my-order/review/edit-review')"
            class="px-3 py-2 text-xs font-medium text-white rounded-lg bg-merchant-primary hover:bg-merchant-primary/90 transition-colors"
          >
            Edit
          </button>
          <button 
            @click="deleteReview"
            class="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.back();
};

const deleteReview = () => {
  const confirmed = confirm('Apakah Anda yakin ingin menghapus review ini?');
  if (confirmed) {
    console.log('Delete review');
    alert('Review berhasil dihapus');
    router.back();
  }
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