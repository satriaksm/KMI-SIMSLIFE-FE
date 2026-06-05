<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
      <div class="flex items-center gap-3 px-4 py-4 mx-auto max-w-6xl">
        <button
          @click="goBack"
          class="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition"
          aria-label="Kembali"
        >
          <i class="pi pi-arrow-left text-gray-700"></i>
        </button>
        <div>
          <h1 class="text-lg font-semibold text-gray-900">{{ pageTitle }}</h1>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const pageTitle = computed(() => "Pesanan");

const goBack = () => {
  if (route.name === "MyOrder") {
    router.push("/");
    return;
  }
  router.back();
};
</script>
