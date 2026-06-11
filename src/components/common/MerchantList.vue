<script setup>
import { computed } from "vue";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  checkboxValue: {
    type: [String, Number],
    default: null,
  },
  showCheckbox: {
    type: Boolean,
    default: true,
  },
  showImage: {
    type: Boolean,
    default: true,
  },
  imageSrc: {
    type: String,
    default: "",
  },
  imageAlt: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
  clickable: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["toggle-select", "view-detail"]);

const resolvedCheckboxValue = computed(() => {
  if (props.checkboxValue !== null && props.checkboxValue !== undefined) {
    return props.checkboxValue;
  }

  if (props.item && typeof props.item === "object" && "id" in props.item) {
    return props.item.id;
  }

  return null;
});

const onViewDetail = () => {
  if (!props.clickable) return;
  emit("view-detail", props.item);
};

const onToggleSelect = () => {
  emit("toggle-select", resolvedCheckboxValue.value);
};
</script>

<template>
  <div
    class="flex flex-col gap-2 p-4 bg-white shadow hover:shadow-md transition rounded-xl"
  >
    <!-- Header -->
    <div class="flex gap-3 items-center">
      <div v-if="showCheckbox" class="flex-shrink-0 pt-1">
        <label class="cursor-pointer inline-block">
          <input
            type="checkbox"
            :checked="selected"
            @change="onToggleSelect"
            class="appearance-none w-4.5 h-4.5 border-1 border-muted-foreground rounded-sm bg-transparent cursor-pointer transition-all duration-200 checked:bg-merchant-primary checked:border-merchant-primary focus:outline-none focus:ring-2 focus:ring-merchant-primary focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
          />
        </label>
      </div>

      <div
        v-if="showImage"
        @click="onViewDetail"
        class="w-16 h-16 rounded-lg overflow-hidden bg-muted-background cursor-pointer flex-shrink-0"
      >
        <img
          v-if="imageSrc"
          :src="imageSrc"
          :alt="imageAlt || title"
          class="w-full h-full object-cover"
          @error="(e) => (e.target.style.display = 'none')"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center bg-gray-200"
        >
          <i class="pi pi-image text-gray-400"></i>
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <h3
          @click="onViewDetail"
          class="text-sm font-semibold text-merchant-primary truncate cursor-pointer hover:text-merchant-primary/80 transition"
          :title="title"
        >
          {{ title }}
        </h3>
        <p
          v-if="subtitle"
          class="text-xs text-muted-foreground font-medium truncate mt-0.5"
          :title="subtitle"
        >
          {{ subtitle }}
        </p>

        <slot name="badges" :item="item" />
      </div>
    </div>

    <div class="border-t border-muted-background"></div>

    <!-- Details -->
    <slot name="details" :item="item" />

    <div class="border-t border-muted-background"></div>

    <!-- Actions -->
    <slot name="actions" :item="item" />
  </div>
</template>
