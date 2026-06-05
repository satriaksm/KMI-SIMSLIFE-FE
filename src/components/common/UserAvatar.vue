<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { getUserProfileUrl } from '@/libs/getImageUrl';

const props = defineProps({
  user: {
    type: Object,
    required: true,
    default: () => ({})
  },
  size: {
    type: String,
    default: 'md', // xs, sm, md, lg, xl
  },
  clickable: {
    type: Boolean,
    default: true
  },
  customClass: {
    type: String,
    default: ''
  }
});

const router = useRouter();

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

const initials = computed(() => {
  if (!props.user?.name) return 'U';
  return props.user.name.charAt(0).toUpperCase();
});

const hasProfilePicture = computed(() => {
  return !!(props.user?.profile_picture_path || props.user?.profile_picture);
});

const profileUrl = computed(() => {
  if (props.user?.profile_picture && typeof props.user.profile_picture === 'string' && props.user.profile_picture.startsWith('http')) {
    return props.user.profile_picture;
  }
  return getUserProfileUrl(props.user);
});

const handleClick = () => {
  if (props.clickable && props.user?.id) {
    router.push({ name: 'Public Profile', params: { id: props.user.id } });
  }
};
</script>

<template>
  <div 
    :class="[
      'rounded-full bg-merchant-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100',
      sizeClasses[size] || sizeClasses.md,
      clickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : '',
      customClass
    ]"
    @click="handleClick"
  >
    <img 
      v-if="hasProfilePicture"
      :src="profileUrl" 
      :alt="user?.name"
      class="w-full h-full object-cover"
      @error="(e) => { 
        e.target.style.display = 'none'; 
        e.target.parentElement.classList.add('bg-merchant-primary/10');
        const span = document.createElement('span');
        span.className = 'text-merchant-primary font-semibold';
        span.innerText = initials;
        e.target.parentElement.appendChild(span);
      }"
    />
    <span v-else class="text-merchant-primary font-semibold">
      {{ initials }}
    </span>
  </div>
</template>
