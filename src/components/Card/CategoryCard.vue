<template>
  <component
    :is="to ? 'router-link' : 'button'"
    :to="to"
    class="group flex flex-col items-center gap-1.5 p-2 rounded-xl transition border"
    :class="[
      active
        ? 'border-secondary/40 bg-secondary/10'
        : 'bg-white border-transparent hover:border-secondary/30 hover:bg-secondary/20'
    ]"
    @click="$emit('click', $event)"
  >
    <div
      class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition group-hover:scale-105"
      :class="[active ? 'bg-secondary' : 'bg-primary']"
    >
      <img :src="icon" :alt="label" class="w-5 h-5 sm:w-6 sm:h-6" />
    </div>
    <span
      class="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-secondary/70"
    >
      {{ label }}
    </span>
  </component>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  icon: { type: String, required: true },
  to: { type: [String, Object], required: false, default: null },
  active: { type: Boolean, default: false }
});

defineEmits(['click']);
</script>
