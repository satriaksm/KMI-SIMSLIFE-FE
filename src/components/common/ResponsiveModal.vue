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
  size: {
    type: String,
    default: "xl",
  },
});

const sizeClass = computed(() => {
  const sizeMap = {
    xs: "sm:max-w-xs sm:w-full",
    sm: "sm:max-w-sm sm:w-full",
    md: "sm:max-w-md sm:w-full",
    lg: "sm:max-w-lg sm:w-full",
    xl: "sm:max-w-3xl sm:w-3/4",
    "2xl": "sm:max-w-5xl sm:w-11/12",
    "3xl": "sm:max-w-7xl sm:w-11/12",
    full: "sm:max-w-full sm:w-11/12",
  };
  return sizeMap[props.size] ?? "sm:max-w-3xl sm:w-3/4";
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
  <teleport to="body">
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
      v-show="show"
      @click="handleBackdropClick"
      :class="[
        'fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center p-0 sm:p-4',
        backdropClass,
      ]"
    ></div>
  </transition>

  <!-- Modal Container dengan max-height -->
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full sm:opacity-0 sm:scale-95 sm:translate-y-0"
    enter-to-class="translate-y-0 sm:opacity-100 sm:scale-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-y-0 sm:opacity-100 sm:scale-100"
    leave-to-class="translate-y-full sm:opacity-0 sm:scale-95 sm:translate-y-0"
  >
    <div
      v-show="show"
      @click.stop
      :class="[
        // Mobile: Full width, bottom sheet, max 90vh, min 70vh
        'fixed inset-x-0 bottom-0 max-h-[90vh] min-h-[70vh]',
        // Desktop: Centered without top constraint
        'sm:fixed sm:inset-x-0 sm:inset-y-0 sm:m-auto',
        'sm:max-h-[85vh] sm:min-h-[560px] sm:h-auto',
        sizeClass,
        // Base styles
        'bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl',
        'flex flex-col z-[70]',
        'overflow-hidden',
      ]"
    >
      <!--Header - Fixed (tidak scroll) -->
      <div
        :class="[
          'flex items-center justify-between px-4 sm:px-6 py-4',
          'border-b border-gray-200',
          'bg-white rounded-t-3xl sm:rounded-t-2xl',
          'flex-shrink-0', //Prevent shrinking
          'sticky top-0 z-10', //Sticky on mobile scroll
          headerClass,
        ]"
      >
        <div class="flex-1 min-w-0 pr-2">
          <h2 class="text-base font-semibold text-black truncate sm:text-lg">
            {{ title }}
          </h2>
          <p
            v-if="subtitle"
            class="mt-1 text-xs truncate sm:text-sm text-muted-foreground"
          >
            {{ subtitle }}
          </p>
        </div>
        <button
          v-if="showCloseButton"
          @click="handleClose"
          type="button"
          class="flex items-center justify-center flex-shrink-0 w-8 h-8 transition rounded-full hover:bg-muted-background"
        >
          <i class="pi pi-times text-muted-foreground"></i>
        </button>
      </div>

      <!--Body - Scrollable Area -->
      <div
        :class="[
          'flex-1 overflow-y-auto',
          'px-4 sm:px-6 pt-4 pb-28 sm:pb-32 sm:min-h-[320px]',
          'custom-scrollbar', //Custom scrollbar class
          bodyClass,
        ]"
      >
        <slot></slot>
      </div>

      <!--Footer - Fixed (tidak scroll) -->
      <div
        v-if="showFooter || $slots.footer"
        :class="[
          'border-t border-gray-200 p-4',
          'bg-white rounded-b-3xl sm:rounded-b-2xl',
          'flex-shrink-0 sticky bottom-0 bg-white z-20',
          footerClass,
        ]"
      >
        <slot name="footer"></slot>
      </div>
    </div>
  </transition>
</teleport>
</template>

<style scoped>
/*Custom scrollbar for modal body */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  transition: background 0.2s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/*Firefox scrollbar */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

/*Smooth scrolling */
.custom-scrollbar {
  scroll-behavior: smooth;
}

/*Mobile: Handle safe area (iPhone notch, etc.) */
@media (max-width: 640px) {
  .custom-scrollbar {
    /* Add padding bottom for safe area */
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}
</style>
