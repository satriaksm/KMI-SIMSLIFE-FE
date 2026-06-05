<template>
  <div class="relative" @click.stop.prevent>
    <!-- 3-dots button -->
    <button
      @click.stop.prevent="toggleMenu"
      class="p-1.5 transition-colors focus:outline-none rounded hover:bg-black/5"
      :aria-label="`Report ${reportableName}`"
    >
      <MoreVertical :size="18" class="text-gray-500 hover:text-gray-800" />
    </button>

    <!-- Dropdown menu -->
    <div
      v-if="isMenuOpen"
      v-click-outside="closeMenu"
      class="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 z-50"
    >
      <button
        @click.stop="openReportModal"
        class="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
      >
        <Flag :size="15" />
        Laporkan
      </button>
    </div>

    <!-- Report Modal via Teleport → renders at body level, bypasses overflow:hidden -->
    <Teleport to="body">
      <ReportModal
        v-if="showReportModal"
        :reportable-type="reportableType"
        :reportable-id="reportableId"
        :reportable-name="reportableName"
        @close="closeReportModal"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { MoreVertical, Flag } from 'lucide-vue-next';
import ReportModal from './ReportModal.vue';

defineProps({
  reportableType: {
    type: String,
    required: true,
    validator: (value) => ['product', 'service', 'merchant', 'post', 'post_comment', 'user'].includes(value),
  },
  reportableId: {
    type: Number,
    required: true,
  },
  reportableName: {
    type: String,
    required: true,
  },
});

const isMenuOpen = ref(false);
const showReportModal = ref(false);

const router = useRouter();
const authStore = useAuthStore();

const toggleMenu = () => {
  if (!authStore.isAuthenticated) {
    authStore.requireLoginToast();
    router.push({ name: 'Login' });
    return;
  }
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

const openReportModal = () => {
  closeMenu();
  // small tick so dropdown closes before modal opens
  setTimeout(() => {
    showReportModal.value = true;
  }, 50);
};

const closeReportModal = () => {
  showReportModal.value = false;
};

// Click outside directive
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value();
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent);
  },
};
</script>
