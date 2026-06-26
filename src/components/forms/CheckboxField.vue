<script setup>
import { Field, ErrorMessage } from "vee-validate";
import { computed } from "vue";

const props = defineProps({
  name: { type: String, required: true },
  label: { type: String, default: "" },
  modelValue: { type: [Boolean, Array], default: false },
  value: { type: [String, Number, Boolean], default: true },
  readonly: { type: Boolean, default: false },
  variant: { type: String, default: "primary" },
  customClass: { type: String, default: "" },
  wrapperClass: { type: String, default: "mb-4" },
  description: { type: String, default: "" }, // Tambahan deskripsi di bawah label
});

const emit = defineEmits(["update:modelValue"]);

const labelClasses = computed(() => {
  const classes = ["text-sm font-medium"];
  if (props.variant === "muted") {
    classes.push("text-gray-600");
  } else {
    classes.push("text-gray-900");
  }
  return classes.join(" ");
});

const checkboxClasses = computed(() => {
  const baseClasses = [
    "appearance-none w-4.5 h-4.5 border-1 rounded-sm bg-transparent transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
  ];
  if (props.variant === "merchant") {
    baseClasses.push("border-muted-foreground checked:bg-merchant-primary checked:border-merchant-primary focus:ring-merchant-primary");
  } else if (props.variant === "muted") {
    baseClasses.push("border-muted-foreground checked:bg-gray-500 checked:border-gray-500 focus:ring-gray-300");
  } else {
    baseClasses.push("border-muted-foreground checked:bg-primary checked:border-primary focus:ring-primary");
  }
  
  if (props.readonly) {
    baseClasses.push("opacity-50 cursor-not-allowed");
  } else {
    baseClasses.push("cursor-pointer");
  }
  
  if (props.customClass) {
    baseClasses.push(props.customClass);
  }
  
  return baseClasses.join(" ");
});
</script>

<template>
  <div :class="[wrapperClass]">
    <Field
      :name="name"
      type="checkbox"
      :value="value"
      :modelValue="modelValue"
      @update:modelValue="(v) => emit('update:modelValue', v)"
      v-slot="{ field, meta, errors }"
    >
      <div :class="['flex gap-3', description ? 'items-start' : 'items-center']">
        <div class="flex items-center justify-center shrink-0" :class="description ? 'mt-0.5' : ''">
          <input
            v-bind="field"
            type="checkbox"
            :id="name + '-' + String(value)"
            :class="[checkboxClasses, meta.touched && errors.length ? 'border-danger-foreground focus:ring-danger-foreground' : '']"
            :disabled="readonly"
          />
        </div>
        
        <div class="flex flex-col flex-1">
          <label :for="name + '-' + String(value)" :class="[labelClasses, !readonly && 'cursor-pointer']">
            <slot>{{ label || name }}</slot>
          </label>
          <span v-if="description" class="text-xs text-gray-500 mt-0.5">
            {{ description }}
          </span>
        </div>
      </div>
    </Field>
    <ErrorMessage :name="name" class="mt-1 text-xs text-danger-foreground block" />
  </div>
</template>
