<script setup>
import { computed } from "vue";

const props = defineProps({
  /** Direct rating data passed from parent (preferred when API provides it) */
  rating: {
    type: Number,
    default: null,
  },
  /** Total review count passed from parent */
  count: {
    type: Number,
    default: null,
  },
  /** Show review count next to rating */
  showCount: {
    type: Boolean,
    default: true,
  },
  /** Badge size: sm | md | lg */
  size: {
    type: String,
    default: "sm",
  },
});

const localRating = computed(() => Number(props.rating ?? 0));
const localCount = computed(() => Number(props.count ?? 0));

const displayRating = computed(() => localRating.value.toFixed(1));
const hasReviews = computed(() => localCount.value > 0);

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5 bg-orange-50 border border-orange-200",
  md: "text-sm px-2 py-1 bg-orange-50 border border-orange-200",
  lg: "text-base px-2.5 py-1 bg-orange-50 border border-orange-200",
};
</script>

<template>
  <div
    :class="[
      'inline-flex items-center gap-1 rounded-full font-medium',
      sizeClasses[size],
    ]"
  >
    <i class="pi pi-star-fill text-orange-400"></i>
    <span class="text-orange-700">{{ displayRating }}</span>
    <span v-if="showCount && hasReviews" class="text-orange-600">
      ({{ localCount }})
    </span>
  </div>
</template>
