<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/libs/axios';
import { useToast } from 'vue-toastification';
import UserAvatar from '@/components/common/UserAvatar.vue';
import MerchantCard from '@/components/Card/MerchantCard.vue';
import { getCommunityImageUrl } from '@/libs/getImageUrl';
import ReportButton from '@/components/ReportButton.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const user = ref(null);
const merchants = ref([]);
const posts = ref([]);
const loading = ref(true);

const fetchProfile = async () => {
  loading.value = true;
  try {
    const res = await api.get(`/api/public/profiles/${route.params.id}`);
    const data = res.data.data;
    user.value = data.user;
    merchants.value = data.merchants;
    posts.value = data.posts;
  } catch (error) {
    console.error('Error fetching profile:', error);
    toast.error('Gagal memuat profil pengguna');
    router.push('/community');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProfile);

watch(() => route.params.id, fetchProfile);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-merchant-primary"></div>
        <p class="mt-4 text-gray-500">Memuat profil...</p>
      </div>

      <template v-else-if="user">
        <!-- Profile Header Card -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div class="h-32 bg-gradient-to-r from-merchant-primary to-merchant-primary/70"></div>
          <div class="px-6 pb-6">
            <div class="relative flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12">
              <UserAvatar 
                :user="user" 
                size="2xl" 
                :clickable="false"
                custom-class="ring-4 ring-white shadow-md bg-white"
              />
              <div class="flex-1 text-center sm:text-left mb-2">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 class="text-3xl font-bold text-gray-900">{{ user.name }}</h1>
                    <p class="text-gray-500 flex items-center justify-center sm:justify-start gap-2 mt-1">
                      <i class="pi pi-calendar text-sm"></i>
                      Bergabung sejak {{ formatDate(user.created_at) }}
                    </p>
                  </div>
                  <ReportButton
                    reportable-type="user"
                    :reportable-id="user.id"
                    :reportable-name="user.name"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Sidebar: User Stats & Info -->
          <div class="lg:col-span-1 space-y-6">
            <div class="bg-white rounded-2xl p-6 shadow-sm">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Ringkasan</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between py-2 border-b border-gray-50">
                  <span class="text-gray-500 flex items-center gap-2">
                    <i class="pi pi-building"></i>
                    Merchant
                  </span>
                  <span class="font-bold text-gray-900">{{ merchants.length }}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-gray-50">
                  <span class="text-gray-500 flex items-center gap-2">
                    <i class="pi pi-comments"></i>
                    Postingan
                  </span>
                  <span class="font-bold text-gray-900">{{ posts.length }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content: Merchants and Posts -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Merchants Section -->
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-gray-900">Merchant Terhubung</h2>
                <span class="text-sm text-gray-500">{{ merchants.length }} Merchant</span>
              </div>
              
              <div v-if="merchants.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <MerchantCard 
                  v-for="merchant in merchants" 
                  :key="merchant.id" 
                  :merchant="merchant"
                />
              </div>
              <div v-else class="bg-white rounded-2xl p-8 text-center shadow-sm border border-dashed border-gray-200">
                <i class="pi pi-building text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">Belum ada merchant yang terhubung</p>
              </div>
            </section>

            <!-- Posts Section -->
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-gray-900">Riwayat Postingan</h2>
                <span class="text-sm text-gray-500">{{ posts.length }} Postingan</span>
              </div>

              <div v-if="posts.length > 0" class="space-y-4">
                <router-link 
                  v-for="post in posts" 
                  :key="post.id"
                  :to="`/community/post/${post.post_slug}`"
                  class="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-merchant-primary/20"
                >
                  <div class="flex gap-4">
                    <div v-if="post.image_id || post.thumbnail_url" class="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      <img 
                        :src="post.image_id ? getCommunityImageUrl(post.image_id, 'thumb') : post.thumbnail_url" 
                        class="w-full h-full object-cover" 
                        @error="(e) => { e.target.src = '/placeholder.png' }"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 class="font-bold text-gray-900 truncate mb-1">{{ post.post_title }}</h4>
                      <p class="text-sm text-gray-600 line-clamp-2 mb-2">{{ post.post_content }}</p>
                      <div class="flex items-center gap-4 text-[10px] sm:text-xs text-gray-400">
                        <span class="flex items-center gap-1">
                          <i class="pi pi-clock text-[10px]"></i>
                          {{ formatDate(post.created_at) }}
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="pi pi-eye text-[10px]"></i>
                          {{ post.views_count }} dilihat
                        </span>
                      </div>
                    </div>
                  </div>
                </router-link>
              </div>
              <div v-else class="bg-white rounded-2xl p-8 text-center shadow-sm border border-dashed border-gray-200">
                <i class="pi pi-comments text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">Belum ada postingan komunitas</p>
              </div>
            </section>
          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
