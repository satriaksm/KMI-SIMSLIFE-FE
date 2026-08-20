<template>
  <header
    class="sm:hidden sticky top-0 z-10 border-b border-gray-200"
    :class="bgColor"
  >
    <div
      class="px-4 py-6 flex items-center"
      :class="{ 'gap-8': !centered, 'gap-3': centered }"
    >
      <!-- Back Button -->
      <button
        v-if="showBack"
        @click="handleBack"
        class="flex-shrink-0"
        :class="backButtonClass"
        aria-label="Kembali"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2.5"
          stroke="currentColor"
          class="w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      <!-- Title -->
      <h1
        class="font-semibold truncate"
        :class="[titleClass, { 'flex-1 text-center': centered }]"
      >
        {{ title }}
      </h1>

      <!-- Right Actions Slot -->
      <div v-if="$slots.actions" class="flex items-center gap-2 ml-auto">
        <slot name="actions"></slot>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from "vue-router";
import { computed } from "vue";
const props = defineProps({
  // Title text
  title: {
    type: String,
    required: true,
  },

  // Show back button
  showBack: {
    type: Boolean,
    default: true,
  },

  // Center title (for pages without actions)
  centered: {
    type: Boolean,
    default: false,
  },

  // Background color variant
  variant: {
    type: String,
    default: "white", // white | primary | transparent
    validator: (value) => ["white", "primary", "transparent"].includes(value),
  },

  // Custom back handler
  onBack: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(["back"]);
const router = useRouter();

// Computed Classes
const bgColor = computed(() => {
  switch (props.variant) {
    case "primary":
      return "bg-[#FFA30E] text-white";
    case "transparent":
      return "bg-transparent";
    default:
      return "bg-white text-gray-900";
  }
});

const backButtonClass = computed(() => {
  return props.variant === "primary" ? "text-white" : "text-gray-900";
});

const titleClass = computed(() => {
  return props.variant === "primary" ? "text-white" : "text-gray-900";
});

// Handle back navigation
const handleBack = () => {
  if (props.onBack) {
    props.onBack();
  } else {
    emit("back");
    if (window.history.state?.back) {
      router.back();
    } else {
      router.push({ name: "Beranda" });
    }
  }
};
</script>
