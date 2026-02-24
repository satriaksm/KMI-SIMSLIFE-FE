<script setup>
import { useRouter } from "vue-router";

const props = defineProps({
  /** Judul yang tampil di tengah header */
  title: {
    type: String,
    required: true,
  },
  /**
   * Route tujuan tombol back.
   * Jika tidak diisi, menggunakan router.back().
   */
  backRoute: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["back"]);

const router = useRouter();

function handleBack() {
  emit("back");
  if (props.backRoute) {
    router.push(props.backRoute);
  } else {
    router.back();
  }
}
</script>

<template>
  <div
    class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-6 text-white sm:hidden bg-merchant-primary rounded-b-2xl"
  >
    <button
      type="button"
      @click="handleBack"
      class="absolute flex items-center justify-center w-10 h-10 transition rounded-full left-4 hover:bg-white/10"
    >
      <i class="pi pi-arrow-left"></i>
    </button>

    <h1 class="text-lg font-semibold">{{ title }}</h1>

    <!-- Optional right-side slot (e.g. save button) -->
    <div v-if="$slots.right" class="absolute right-4">
      <slot name="right" />
    </div>
  </div>
</template>
