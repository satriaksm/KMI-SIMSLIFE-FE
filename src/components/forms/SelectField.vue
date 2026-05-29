<script setup>
/*
SelectField — Select terintegrasi vee-validate dengan state loading

Contoh pakai:
<Form :validation-schema="schema">
  <SelectField
    name="province_id"
    label="Provinsi"
    :options="provinces"
    :loading="loadingProvinces"
    placeholder="Pilih Provinsi"
    variant="merchant"
  />
</Form>

Props:
- name: string (wajib) => nama field vee-validate
- label: string => label di atas select
- options: Array<{ value:any, label:string }>
- disabled: boolean
- modelValue: string|number => dukung v-model luar
- loading: boolean => menampilkan skeleton dan spinner
- placeholder: string (default "Pilih")
- emptyText: string (default "Tidak ada data")
- skeleton: boolean (default true) => tampilkan skeleton saat loading
- variant: string (default "primary") => "primary" | "merchant"

Events:
- update:modelValue => emit saat nilai berubah
*/
import { Field, ErrorMessage } from "vee-validate";
import { computed, ref, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  name: { type: String, required: true },
  label: { type: String, default: "" },
  options: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  modelValue: { type: [String, Number], default: "" },
  loading: { type: Boolean, default: false },
  placeholder: { type: String, default: "Pilih" },
  emptyText: { type: String, default: "Tidak ada data" },
  skeleton: { type: Boolean, default: true },
  variant: { type: String, default: "primary" },
  required: { type: Boolean, default: false }, 
});
const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(false);
const searchQuery = ref("");
const containerRef = ref(null);
const searchInputRef = ref(null);

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options;
  const q = searchQuery.value.toLowerCase();
  return props.options.filter((opt) => 
    opt.label.toLowerCase().includes(q)
  );
});

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value == props.modelValue);
  return opt ? opt.label : "";
});

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

const selectClasses = (invalid) =>
  [
    "w-full px-4 py-2.5 pr-10 text-sm border rounded-xl bg-white text-black transition-all text-left",
    "placeholder:text-muted-foreground",
    invalid
      ? "border-danger-foreground focus:ring-2 focus:ring-danger-foreground"
      : `${borderClass.value} focus:ring-2 ${focusRingClass.value}`,
    "cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed focus:outline-none flex items-center justify-between",
  ].join(" ");

const toggleDropdown = () => {
  if (props.disabled || props.loading) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = "";
    setTimeout(() => {
      searchInputRef.value?.focus();
    }, 50);
  }
};

const selectOption = (opt, field) => {
  field.onChange(opt.value);
  emit("update:modelValue", opt.value);
  isOpen.value = false;
};

const handleClickOutside = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div ref="containerRef">
    <label
      v-if="label"
      :for="name"
      class="block text-sm font-bold text-black mb-2"
    >
      {{ label }}
      <span v-if="required" class="text-danger-foreground">*</span>
    </label>

    <!-- Skeleton saat loading -->
    <div
      v-if="skeleton && loading"
      class="h-10 w-full rounded-xl bg-gray-100 border border-gray-200 animate-pulse"
    ></div>

    <!-- Select -->
    <div v-else class="relative" :aria-busy="loading ? 'true' : 'false'">
      <Field
        :name="name"
        :modelValue="modelValue"
        v-slot="{ field, meta, errors }"
      >
        <!-- Display Button -->
        <button
          type="button"
          :id="name"
          @click="toggleDropdown"
          :disabled="disabled || loading"
          :class="selectClasses(meta.touched && errors.length)"
        >
          <span :class="!selectedLabel ? 'text-gray-400' : 'text-gray-900'">
            {{ selectedLabel || placeholder }}
          </span>
          
          <!-- Spinner indikator loading -->
          <svg
            v-if="loading"
            class="h-4 w-4 text-muted-foreground animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
          <!-- Chevron -->
          <svg
            v-else
            aria-hidden="true"
            :class="[
              'h-4 w-4 transition-transform',
              isOpen ? 'rotate-180' : '',
              variant === 'merchant' ? 'text-merchant-primary/60' : 'text-muted-foreground',
            ]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <div 
          v-show="isOpen" 
          class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-60"
        >
          <!-- Search Input -->
          <div class="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0">
            <div class="relative">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input 
                ref="searchInputRef"
                type="text" 
                v-model="searchQuery"
                class="w-full pl-8 pr-3 py-2 text-sm border-gray-200 rounded-lg focus:ring-2 focus:border-transparent bg-white"
                :class="focusRingClass"
                placeholder="Cari..."
                @click.stop
              />
            </div>
          </div>
          
          <!-- Options List -->
          <ul class="overflow-y-auto flex-1 p-1">
            <li v-if="filteredOptions.length === 0" class="px-3 py-3 text-sm text-gray-500 text-center">
              {{ emptyText }}
            </li>
            <li 
              v-for="opt in filteredOptions" 
              :key="opt.value"
              @click="selectOption(opt, field)"
              class="px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors flex items-center justify-between"
              :class="[
                modelValue === opt.value 
                  ? (variant === 'merchant' ? 'bg-merchant-primary/10 text-merchant-primary font-medium' : 'bg-primary/10 text-primary font-medium')
                  : 'text-gray-700 hover:bg-gray-100'
              ]"
            >
              <span>{{ opt.label }}</span>
              <i v-if="modelValue === opt.value" class="pi pi-check text-xs"></i>
            </li>
          </ul>
        </div>
      </Field>
    </div>

    <!-- Sembunyikan error saat skeleton -->
    <ErrorMessage
      v-if="!(skeleton && loading)"
      :name="name"
      class="text-danger-foreground text-xs mt-1"
    />
  </div>
</template>
