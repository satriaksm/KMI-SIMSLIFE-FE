<script setup>
import { computed } from "vue";

const props = defineProps({
  // Control
  show: {
    type: Boolean,
    required: true,
  },

  // Content
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: null,
  },

  // Behavior
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  persistent: {
    type: Boolean,
    default: false,
  },

  // Footer
  showFooter: {
    type: Boolean,
    default: false,
  },

  backdropClass: {
    type: String,
    default: "bg-black/50",
  },
  headerClass: {
    type: String,
    default: "",
  },
  bodyClass: {
    type: String,
    default: "",
  },
  footerClass: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close", "update:show"]);

// Methods
const handleClose = () => {
  if (!props.persistent) {
    emit("close");
    emit("update:show", false);
  }
};

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    handleClose();
  }
};
</script>

<template>
  <!-- Backdrop -->
  <transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      @click="handleBackdropClick"
      :class="[
        'fixed inset-0 z-[60]',
        backdropClass,
      ]"
    ></div>
  </transition>

  <!-- Desktop Modal -->
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="show"
      class="hidden sm:block"
    >
      <div
        @click.stop
        :class="[
          'fixed inset-0 z-[70] m-auto',
          'max-h-[85vh] w-full max-w-lg',
          'bg-white rounded-2xl shadow-2xl',
          'flex flex-col',
        ]"
      >
        <!-- Header -->
        <div
          :class="[
            'flex items-center justify-between px-6 py-4',
            'border-b border-gray-200',
            'flex-shrink-0',
            headerClass,
          ]"
        >
          <div class="flex-1 min-w-0 pr-4">
            <h2 class="text-lg font-semibold text-black">
              {{ title }}
            </h2>
            <p
              v-if="subtitle"
              class="mt-1 text-sm text-gray-500"
            >
              {{ subtitle }}
            </p>
          </div>
          <button
            v-if="showCloseButton"
            @click="handleClose"
            type="button"
            class="flex items-center justify-center w-8 h-8 transition rounded-full hover:bg-gray-100"
          >
            <i class="pi pi-times text-gray-500"></i>
          </button>
        </div>

        <!-- Body - Scrollable -->
        <div
          :class="[
            'flex-1 overflow-y-auto px-6 py-4',
            'custom-scrollbar',
            bodyClass,
          ]"
        >
          <slot></slot>
        </div>

        <!-- Footer -->
        <div
          v-if="showFooter || $slots.footer"
          :class="[
            'border-t border-gray-200 p-4',
            'flex-shrink-0',
            footerClass,
          ]"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </transition>

  <!-- Mobile Modal (Bottom Sheet) -->
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="show"
      class="sm:hidden"
    >
      <div
        @click.stop
        class="fixed inset-x-0 bottom-0 z-[70] max-h-[90vh] flex flex-col bg-white rounded-t-3xl shadow-2xl"
      >
        <!-- Mobile Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 class="text-base font-semibold text-black">{{ title }}</h2>
          <button
            v-if="showCloseButton"
            @click="handleClose"
            type="button"
            class="flex items-center justify-center w-8 h-8 transition rounded-full hover:bg-gray-100"
          >
            <i class="pi pi-times text-gray-500"></i>
          </button>
        </div>

        <!-- Mobile Body -->
        <div
          :class="[
            'flex-1 overflow-y-auto px-4 py-4 max-h-[60vh]',
            'custom-scrollbar',
            bodyClass,
          ]"
        >
          <slot></slot>
        </div>

        <!-- Mobile Footer -->
        <div
          v-if="showFooter || $slots.footer"
          class="border-t border-gray-200 p-4 flex-shrink-0"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Firefox scrollbar */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}
</style>