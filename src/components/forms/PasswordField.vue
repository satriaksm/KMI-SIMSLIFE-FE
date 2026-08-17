<script setup>
/*
PasswordField — Input password dengan toggle show/hide, integrasi vee-validate

Contoh pakai:
<Form :validation-schema="schema">
  <PasswordField name="password" label="Kata Sandi" placeholder="Minimal 8 karakter" variant="merchant" />
  <PasswordField name="password_confirmation" label="Konfirmasi Kata Sandi" />
</Form>

Props:
- name: string (wajib) => nama field vee-validate
- label: string (default "Kata Sandi")
- placeholder: string
- modelValue: string => dukung v-model dari luar
- variant: string (default "primary") => "primary" | "merchant"

Catatan:
- Ikon mata di kanan untuk show/hide password
- Sudah ada style focus dan error state
*/
import { ref, computed } from "vue";
import { Field, ErrorMessage } from "vee-validate";

const props = defineProps({
  name: { type: String, required: true },
  label: { type: String, default: "Kata Sandi" },
  placeholder: { type: String, default: "Masukkan kata sandi" },
  modelValue: { type: String, default: "" },
  variant: { type: String, default: "primary" },
  required: { type: Boolean, default: false }, // NEW
});
const emit = defineEmits(["update:modelValue"]);

const show = ref(false);

const focusRingClass = computed(() => {
  return props.variant === "merchant"
    ? "focus:ring-merchant-primary"
    : "focus:ring-primary";
});

const borderClass = computed(() => {
  return props.variant === "merchant"
    ? "border-merchant-primary"
    : "border-primary";
});

const toggleButtonClass = computed(() => {
  return props.variant === "merchant"
    ? "text-merchant-primary hover:text-merchant-primary/80"
    : "text-muted-foreground hover:text-gray-700";
});

const inputClasses = (invalid) =>
  [
    "w-full px-4 py-2.5 pr-10 text-sm border rounded-xl focus:outline-none bg-white",
    invalid
      ? "border-danger-foreground focus:ring-2 focus:ring-danger-foreground"
      : `${borderClass.value} focus:ring-2 ${focusRingClass.value}`,
    "text-black placeholder:text-gray-400 transition-all",
  ].join(" ");
</script>

<template>
  <div>
    <label :for="name" class="block text-sm font-bold text-black mb-2">
      {{ label }}
      <span v-if="required" class="text-danger-foreground">*</span>
    </label>

    <Field
      :name="name"
      :modelValue="modelValue"
      @update:modelValue="(v) => emit('update:modelValue', v)"
      v-slot="{ field, meta, errors }"
    >
      <div class="relative">
        <input
          v-bind="field"
          :id="name"
          :type="show ? 'text' : 'password'"
          :placeholder="placeholder"
          :class="inputClasses(meta.touched && errors.length)"
        />
        <button
          type="button"
          @click="show = !show"
          :class="[
            'absolute inset-y-0 right-3 flex items-center transition-colors',
            toggleButtonClass,
          ]"
          :aria-label="show ? 'Sembunyikan password' : 'Tampilkan password'"
          tabindex="-1"
        >
          <svg
            v-if="show"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M2.036 12.322a1 1 0 010-.644C3.423 7.51 7.36 5 12 5c4.64 0 8.577 2.51 9.964 6.678a1 1 0 010 .644C20.577 16.49 16.64 19 12 19c-4.64 0-8.577-2.51-9.964-6.678z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 3l18 18M10.584 10.587A3 3 0 0113.414 13.41M9.88 4.603A9.76 9.76 0 0112 4.5c4.64 0 8.577 2.51 9.964 6.678a1 1 0 010 .644 10.21 10.21 0 01-2.126 3.358M6.228 6.232C4.48 7.38 3.152 9.01 2.036 11.678a1 1 0 000 .644c1.387 4.168 5.324 6.678 9.964 6.678 1.088 0 2.141-.15 3.144-.43"
            />
          </svg>
        </button>
      </div>
    </Field>

    <ErrorMessage :name="name" class="text-danger-foreground text-xs mt-1" />
  </div>
</template>
