<script setup>
import { computed, ref, provide, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import Button from "@/components/common/Button.vue";

const route = useRoute();
const router = useRouter();

const isCreateRoute = computed(() => route.name === "Admin - Create Event");
const isEditRoute = computed(() => route.name === "Admin - Edit Event");
const isDetailRoute = computed(() => route.name === "Admin - Event Detail");

const exportModalCallback = ref(null);

provide('registerExportModal', (callback) => {
  exportModalCallback.value = callback;
});

const breadcrumbItems = computed(() => {
  if (isCreateRoute.value) {
    return [
      { label: "Events", path: { name: "Admin - Events" } },
      { label: "Tambah Event" },
    ];
  }
  if (isEditRoute.value) {
    return [
      { label: "Events", path: { name: "Admin - Events" } },
      { label: "Edit Event" },
    ];
  }
  if (isDetailRoute.value) {
    return [
      { label: "Events", path: { name: "Admin - Events" } },
      { label: "Detail Event" },
    ];
  }
  return [{ label: "Events" }];
});

const addLabel = "Tambah Event";

const goToCreate = () => router.push({ name: "Admin - Create Event" });

const triggerExport = () => {
  
  if (typeof exportModalCallback.value === 'function') {
    exportModalCallback.value();
  } else {
    console.error('Export modal callback not registered');
  }
};

const headerSubtitle = computed(() => {
  if (isCreateRoute.value) return "Tambah event baru";
  if (isEditRoute.value) return "Edit event";
  if (isDetailRoute.value) return "Detail event";
  return "Kelola data event";
});

const showActionButtons = computed(() => !isCreateRoute.value && !isEditRoute.value );

watch(() => route.name, () => {
  exportModalCallback.value = null;
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div
      class="fixed sm:static top-0 left-0 right-0 flex justify-between items-center py-6 px-4 sm:px-6 bg-white z-10 border-b border-gray-200 shadow-sm"
    >
      <div class="flex items-center gap-3 min-w-0">
        <!-- Hamburger Button (Mobile Only) -->
        <button
          @click="$emit('toggle-sidebar')"
          class="lg:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
        >
          <i class="pi pi-bars text-gray-600"></i>
        </button>
        <div class="min-w-0">
          <Breadcrumb :items="breadcrumbItems" />
          <p class="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
            {{ headerSubtitle }}
          </p>
        </div>
      </div>
      
      <div v-if="showActionButtons" class="flex gap-2 sm:gap-3">
        <!-- Create Button -->
        <Button @click="goToCreate" variant="merchant" size="sm" customClass="!hidden sm:!inline">
          <i class="pi pi-plus"></i>
          <span class="hidden sm:inline ml-2">{{ addLabel }}</span>
        </Button>
        <Button @click="goToCreate" variant="merchant" size="md" customClass="sm:!hidden">
          <i class="pi pi-plus"></i>
        </Button>

        <!-- Export Button -->
        <Button @click="triggerExport" variant="merchant-outline" size="sm" customClass="!hidden sm:!inline">
          <i class="pi pi-download"></i>
          <span class="hidden sm:inline ml-2">Export</span>
        </Button>
        <Button @click="triggerExport" variant="merchant-outline" size="md" customClass="sm:!hidden">
          <i class="pi pi-download"></i>
        </Button>
      </div>
    </div>

    <div class="h-[92px] sm:h-0"></div>

    <div class="px-4 p-4 sm:px-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <router-view />
      </div>
    </div>
  </div>
</template>