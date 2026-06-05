<template>
  <div class="min-h-screen flex flex-col sm:bg-gray-50 bg-white text-gray-900">
    <!-- Header: tampil hanya ≥ sm -->
    <header class="w-full sm:bg-gray-50 bg-white hidden sm:block">
      <div
        class="max-w-5xl mx-auto sm:px-4 px-0 py-4 flex items-center justify-center"
      >
        <RouterLink to="/" class="flex items-center gap-3 group">
          <!-- <span
            class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 transition-transform group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 2c.9 0 1.79.24 2.57.7l4.86 2.81A3 3 0 0 1 21 8.16V12a9 9 0 0 1-5.1 8.08l-2.78 1.39a2 2 0 0 1-1.78 0L8.56 20.1A9 9 0 0 1 3 12V8.16a3 3 0 0 1 1.57-2.65l4.86-2.81C10.21 2.24 11.1 2 12 2Z"
              />
            </svg>
          </span> -->
        </RouterLink>

        <div v-if="$slots['header-actions']" class="flex items-center gap-3">
          <slot name="header-actions" />
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1">
      <div class="mx-auto sm:px-4 px-0 max-w-full sm:max-w-5xl">
        <router-view />
      </div>
    </main>

    <!-- Footer: tampil hanya ≥ sm -->
    <footer class="w-full bg-gray-50 hidden sm:block">
      <div
        class="max-w-5xl mx-auto px-4 py-6 text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-center gap-2"
      >
        <p class="text-center sm:text-left">
          © {{ year }} {{ brandName }}. Semua hak dilindungi.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps({
  title: { type: String, default: "" },
  brand: { type: String, default: "" },
});

const brandName = computed(
  () => props.brand || import.meta.env.VITE_APP_NAME || "SUMILIR"
);
const year = new Date().getFullYear();

onMounted(() => {
  if (props.title) document.title = props.title;
});
</script>
