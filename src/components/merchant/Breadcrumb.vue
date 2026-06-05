<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps({
  items: {
    type: Array,
    required: true,
    // Format: [{ label: 'Home', path: '/home' }, { label: 'Current' }]
  },
  merchantId: {
    type: [Number, String],
    default: null,
  },
});

const route = useRoute();
const router = useRouter();

const processedItems = computed(() => {
  return props.items.map((item) => {
    if (!item.path) return item;

    // If path is a route object, pass through as-is
    if (typeof item.path !== "string") {
      return item;
    }

    if (
      item.path.startsWith("http") ||
      item.path.includes("/:merchantId") ||
      item.path.includes("/:merchantSlug")
    ) {
      return item;
    }

    if (
      item.path.includes("/merchant-center") &&
      props.merchantId &&
      !item.path.includes(`/merchant-center/${props.merchantId}`)
    ) {
      const newPath = item.path.replace(
        "/merchant-center",
        `/merchant-center/${props.merchantId}`
      );
      return { ...item, path: newPath };
    }

    return item;
  });
});

const navigateTo = (path) => {
  if (path) {
    // Supports both string paths and route objects { name, params, query }
    router.push(path);
  }
};
</script>

<template>
  <nav class="flex items-center gap-2 text-sm">
    <template v-for="(crumb, index) in processedItems" :key="index">
      <!-- Clickable breadcrumb -->
      <button
        v-if="crumb.path"
        @click="navigateTo(crumb.path)"
        class="flex items-center gap-2 text-base font-medium transition cursor-pointer text-muted-foreground hover:text-merchant-primary sm:text-2xl"
        :class="{ '': crumb.path }"
      >
        <i v-if="crumb.icon" :class="crumb.icon" class="text-sm"></i>
        {{ crumb.label }}
      </button>

      <!-- Current breadcrumb (no link) -->
      <span
        v-else
        class="text-base font-bold text-merchant-primary sm:text-2xl whitespace-nowrap"
      >
        <i v-if="crumb.icon" :class="crumb.icon" class="mr-1 text-sm"></i>
        {{ crumb.label }}
      </span>

      <!-- Separator -->
      <i
        v-if="index < processedItems.length - 1"
        class="text-xs text-gray-400 pi pi-chevron-right"
      ></i>
    </template>
  </nav>
</template>
