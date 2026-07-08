<script setup>
import { Field, ErrorMessage } from "vee-validate";
import { computed } from "vue";

const props = defineProps({
  name: { type: String, required: true },
  label: { type: String, default: "" },
  options: { type: Array, required: true },
  variant: { type: String, default: "primary" },
  required: { type: Boolean, default: false },
  modelValue: { type: [Array, String, Number, Boolean], default: () => [] },
  layout: { type: String, default: "flex" },
});

const emit = defineEmits(["update:modelValue"]);

const borderColorClass = computed(() => {
  return props.variant === "merchant"
    ? "peer-checked:border-merchant-primary"
    : "peer-checked:border-primary";
});

const textColorClass = computed(() => {
  return props.variant === "merchant"
    ? "peer-checked:text-merchant-primary"
    : "peer-checked:text-primary";
});

const bgColorClass = computed(() => {
  return props.variant === "merchant"
    ? "peer-checked:bg-merchant-primary/5"
    : "peer-checked:bg-primary/5";
});

const dotColorClass = computed(() => {
  // we keep the same naming convention for consistency with RadioGroupPills
  return props.variant === "merchant"
    ? "group-peer-checked:bg-merchant-primary"
    : "group-peer-checked:bg-primary";
});

const ringColorClass = computed(() => {
  return props.variant === "merchant"
    ? "peer-focus:ring-merchant-primary"
    : "peer-focus:ring-primary";
});
</script>

<template>
  <div class="text-foreground">
    <span v-if="label" class="block text-sm font-bold text-black mb-2">
      {{ label }}
      <span v-if="required" class="text-danger-foreground">*</span>
    </span>
    <div :class="layout === 'grid' ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap items-center gap-3'">
      <label
        v-for="opt in options"
        :key="opt.value"
        :class="[
          'select-none',
          opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          layout === 'grid' ? 'w-full' : ''
        ]"
      >
        <Field
          type="checkbox"
          :name="name"
          :value="opt.value"
          :disabled="opt.disabled"
          :modelValue="modelValue"
          @update:modelValue="(val) => emit('update:modelValue', val)"
          class="sr-only peer"
        />
        <span
          :class="[
            layout === 'grid' ? 'flex items-start gap-3 w-full h-full' : 'inline-flex items-center gap-2',
            'px-3 py-3 rounded-xl border border-muted-foreground text-muted-foreground transition',
            !opt.disabled ? borderColorClass : '',
            !opt.disabled ? textColorClass : '',
            !opt.disabled ? bgColorClass : '',
            !opt.disabled ? ringColorClass : '',
            !opt.disabled ? 'peer-focus:ring-1 group' : 'bg-gray-100'
          ]"
        >
          <span
            :class="[
              'rounded bg-muted-foreground transition shrink-0 flex items-center justify-center',
              layout === 'grid' ? 'mt-1 w-4 h-4' : 'w-3.5 h-3.5',
              !opt.disabled ? dotColorClass : ''
            ]"
          >
            <!-- Here we add the check icon, we rely on peer mechanics or we could conditionally render it, but we can't easily do it in pure CSS without a plugin if group-peer-checked is fake. -->
            <!-- Actually we can use peer-checked on a parent by changing the CSS, or we can use vue bindings if we know if it's selected. -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5 text-white transition-opacity duration-200" :class="(Array.isArray(modelValue) ? modelValue.includes(opt.value) : modelValue === opt.value) ? 'opacity-100' : 'opacity-0'" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </span>
          <div class="flex flex-1 items-start justify-between min-w-0 gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 text-sm font-semibold" :class="{ 'line-through text-gray-400': opt.disabled }">
                <i v-if="opt.icon" :class="['pi', opt.icon, !opt.disabled ? 'text-inherit opacity-80' : 'text-gray-500']"></i>
                {{ opt.label }}
              </div>
              <div v-if="opt.description" class="mt-1 text-[11px]" :class="!opt.disabled ? 'text-gray-500' : 'text-red-500'">
                {{ opt.description }}
              </div>
            </div>
            <span v-if="opt.suffix" class="text-sm font-semibold whitespace-nowrap" :class="!opt.disabled ? 'text-gray-900' : 'text-gray-400'">
              {{ opt.suffix }}
            </span>
          </div>
        </span>
      </label>
    </div>
    <ErrorMessage :name="name" class="text-danger-foreground text-xs mt-1" />
  </div>
</template>
