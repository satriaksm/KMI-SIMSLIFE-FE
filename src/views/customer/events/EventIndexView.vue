<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/libs/axios";
import { formatDateID } from "@/libs/format";

const router = useRouter();
const events = ref([]);
const loading = ref(true);

const fetchEvents = async () => {
  try {
    const response = await api.get("/api/public/events");
    events.value = response.data.data;
  } catch (error) {
    console.error("Error fetching events:", error);
  } finally {
    loading.value = false;
  }
};

const goToDetail = (id) => {
  router.push({ name: "Event Detail", params: { id } });
};

onMounted(() => {
  fetchEvents();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 pt-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div class="flex items-center gap-4">
          <button 
            @click="router.back()"
            class="w-11 h-11 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-primary hover:border-primary/20 transition-all"
          >
            <i class="pi pi-arrow-left"></i>
          </button>
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Daftar Event</h1>
            <p class="text-sm text-gray-500 mt-0.5">Temukan berbagai kegiatan seru di Banyuanyar</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="bg-white rounded-3xl overflow-hidden border border-gray-100 animate-pulse">
          <div class="aspect-[16/9] bg-gray-100"></div>
          <div class="p-6 space-y-3">
            <div class="h-6 bg-gray-100 rounded-lg w-3/4"></div>
            <div class="h-4 bg-gray-100 rounded-lg w-full"></div>
            <div class="h-4 bg-gray-100 rounded-lg w-1/2 pt-4"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="events.length === 0" class="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
        <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <i class="pi pi-calendar-times text-4xl text-gray-300"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Belum ada event aktif</h3>
        <p class="text-gray-500 max-w-sm mx-auto">
          Saat ini tidak ada event yang sedang berlangsung. Pantau terus halaman ini untuk update kegiatan mendatang!
        </p>
      </div>

      <!-- Events Grid -->
      <div v-else class="grid gap-10 sm:grid-cols-2 lg:grid-cols-2">
        <div 
          v-for="event in events" 
          :key="event.id"
          @click="goToDetail(event.id)"
          class="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer"
        >
          <!-- Banner Image Container -->
          <div class="aspect-[21/9] relative overflow-hidden bg-gray-100">
            <img 
              :src="event.banner_url" 
              :alt="event.event_name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            />
            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
            
            <!-- Floating Date Badge -->
            <div class="absolute top-6 left-6">
              <div class="px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                {{ formatDateID(event.event_start_date) }}
              </div>
            </div>
          </div>

          <!-- Title Div (Overlay / Bottom Content) -->
          <div class="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black/90 to-transparent">
            <div class="flex items-end justify-between gap-4">
              <div class="min-w-0">
                <h3 class="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight tracking-tight group-hover:text-primary transition-colors">
                  {{ event.event_name }}
                </h3>
                <p class="text-white/60 text-xs sm:text-sm line-clamp-1 font-medium">
                  {{ event.event_description }}
                </p>
              </div>
              <div class="shrink-0 mb-1">
                <div class="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <i class="pi pi-arrow-up-right font-bold"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-primary {
  color: #10b981;
}
.bg-primary {
  background-color: #10b981;
}
</style>
