<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  urls: {
    type: Object,
    default: null, // { thumb: '', medium: '', original: '' }
  },
  alt: {
    type: String,
    default: 'Image',
  },
  customClass: {
    type: String,
    default: 'object-cover w-full h-full',
  },
  loading: {
    type: String,
    default: 'lazy',
  },
  sizes: {
    type: String,
    default: '(max-width: 640px) 150px, (max-width: 1024px) 600px, 1200px'
  }
});

const isError = ref(false);
const isLoaded = ref(false);

const srcset = computed(() => {
  if (!props.urls) return '';
  const parts = [];
  if (props.urls.thumb) parts.push(`${props.urls.thumb} 150w`);
  if (props.urls.medium) parts.push(`${props.urls.medium} 600w`);
  if (props.urls.original) parts.push(`${props.urls.original} 1200w`);
  return parts.join(', ');
});

const emit = defineEmits(['error', 'load']);

const onError = (e) => {
  isError.value = true;
  emit('error', e);
};

const onLoad = (e) => {
  isLoaded.value = true;
  emit('load', e);
};
</script>

<template>
  <img 
    v-if="!isError"
    :src="urls?.original || src" 
    :srcset="srcset"
    :sizes="sizes"
    :alt="alt"
    :loading="loading"
    :class="customClass"
    @error="onError"
    @load="onLoad"
  />
</template>
