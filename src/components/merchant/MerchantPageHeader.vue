<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  backTo: {
    type: String,
    default: '',
  },
  backLabel: {
    type: String,
    default: 'Kembali',
  },
  showBackButton: {
    type: Boolean,
    default: true,
  },
  showMenuButton: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['toggle-sidebar']);

const route = useRoute();

const fallbackBackTo = computed(() => {
  const merchantSlug = route.params?.merchantSlug;
  if (merchantSlug) {
    return `/merchant-center/${merchantSlug}/dashboard`;
  }
  return '/merchant-center';
});

const resolvedBackTo = computed(() => props.backTo || fallbackBackTo.value);
</script>

<template>
  <header
    class="merchant-page-header fixed top-0 left-0 right-0 z-20 flex items-center justify-between bg-white px-4 py-6 sm:static sm:px-6"
  >
    <div class="merchant-page-header__left flex items-center gap-3 min-w-0">
      <button
        v-if="showMenuButton"
        @click="emit('toggle-sidebar')"
        class="merchant-page-header__menu flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 sm:hidden"
        aria-label="Buka menu"
      >
        <i class="pi pi-bars"></i>
      </button>

      <router-link
        v-if="showBackButton"
        :to="resolvedBackTo"
        class="merchant-page-header__back hidden h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 sm:inline-flex"
        :aria-label="backLabel"
      >
        <i class="pi pi-arrow-left text-[22px]"></i>
      </router-link>
    </div>

    <div class="merchant-page-header__text min-w-0 flex-1">
      <h1 class="merchant-page-header__title text-base font-semibold text-gray-900 sm:text-2xl sm:font-bold">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="merchant-page-header__subtitle mt-1 text-xs text-gray-600 sm:text-sm">
        {{ subtitle }}
      </p>
    </div>
  </header>
  <div class="merchant-page-header__spacer h-24 sm:h-0"></div>
</template>

<style scoped>
.merchant-page-header {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  /* Align with dashboard header spacing */
  background: #fff;
}

.merchant-page-header__menu,
.merchant-page-header__back {
  color: #334155;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.merchant-page-header__menu:hover,
.merchant-page-header__back:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.merchant-page-header__text {
  min-width: 0;
}

@media (max-width: 639px) {
  .merchant-page-header__title {
    font-size: 16px;
  }

  .merchant-page-header__subtitle {
    font-size: 12px;
  }
}
</style>