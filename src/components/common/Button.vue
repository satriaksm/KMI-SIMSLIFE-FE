<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading ? 'true' : 'false'"
    :class="[
      'inline-flex items-center justify-center rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:-translate-y-0.5',
      block ? 'w-full' : 'w-auto',
      sizeClasses[size],
      variantClasses[variant],
      customClass,
      isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
    ]"
  >
    <span class="inline-flex justify-center items-center gap-2">
      <svg
        v-if="loading"
        class="h-4 w-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        />
      </svg>
      <slot />
    </span>
  </button>
</template>

<script setup>
/*
AppButton — Tombol serbaguna dengan state loading

Contoh pakai:
<template>
  <AppButton type="submit" :loading="saving" block> Simpan </AppButton>
  <AppButton variant="outline" @click="onCancel"> Batal </AppButton>
  <AppButton variant="merchant" size="md"> Merchant Action </AppButton>
  <AppButton variant="merchant-outline"> Outline Merchant </AppButton>
  <AppButton variant="ghost" size="sm"> Aksi Kecil </AppButton>
</template>

Props:
- type: "button" | "submit" | "reset" (default: "button")
- variant: "primary" | "merchant" | "outline" | "merchant-outline" | "ghost" | "danger" (default: "primary")
- size: "sm" | "md" | "lg" (default: "md")
- loading: boolean => tampilkan spinner dan auto disabled
- disabled: boolean => nonaktifkan tombol
- block: boolean => lebar penuh (w-full)
- customClass: string => tambahan kelas manual

Slots:
- default => label tombol (teks atau icon)
*/
import { computed } from "vue";

const props = defineProps({
  type: { type: String, default: "button" },
  variant: { type: String, default: "primary" }, // primary | merchant | outline | merchant-outline | ghost | danger
  size: { type: String, default: "md" }, // sm | md | lg
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  customClass: { type: String, default: "" },
});

const isDisabled = computed(() => props.disabled || props.loading);

const sizeClasses = {
  sm: "text-xs sm:text-sm py-2 px-3",
  md: "text-sm sm:text-base py-2.5 px-4",
  lg: "text-base sm:text-lg py-3 px-5",
};

const variantClasses = {
  // Orange Primary (default)
  primary:
    "bg-primary text-white hover:bg-primary/90 disabled:bg-gray-400 shadow-sm hover:shadow-lg duration-200 active:scale-95 focus:ring-primary",

  secondary:
    "bg-secondary text-white hover:bg-secondary/90 disabled:bg-gray-400 shadow-sm hover:shadow-lg duration-200 active:scale-95 focus:ring-secondary",
  // Blue Merchant Primary
  merchant:
    "bg-merchant-primary text-white hover:bg-merchant-primary/90 disabled:bg-gray-400 shadow-sm hover:shadow-lg duration-200 active:scale-95 focus:ring-merchant-primary",

  // Outline Primary (Orange)
  "primary-outline":
    "border border-primary text-primary hover:bg-primary/10 disabled:opacity-60 focus:ring-primary duration-200 active:scale-95",

  // Outline Merchant (Blue)
  "merchant-outline":
    "border border-merchant-primary text-merchant-primary hover:bg-merchant-primary/10 disabled:opacity-60 focus:ring-merchant-primary duration-200 active:scale-95",

  // Ghost (no background)
  ghost:
    "text-primary hover:bg-primary/10 disabled:opacity-60 focus:ring-primary duration-200 active:scale-95",

  // Ghost Merchant
  "merchant-ghost":
    "text-merchant-primary hover:bg-merchant-primary/10 disabled:opacity-60 focus:ring-merchant-primary duration-200 active:scale-95",

  // Danger (Red)
  danger:
    "bg-danger-foreground text-white hover:bg-red-600 disabled:bg-gray-400 shadow-sm hover:shadow-lg duration-200 active:scale-95 focus:ring-red-500",

  // Outline Danger
  "danger-outline":
    "border border-danger-foreground bg-white text-danger-foreground hover:bg-danger-foreground hover:text-white active:bg-red-700 active:text-white disabled:opacity-60 focus:ring-red-500 duration-200 active:scale-95",

  muted:
    "bg-muted-background text-muted-foreground hover:bg-gray-300 disabled:bg-muted-background disabled:opacity-60 focus:ring-gray-400 duration-200 active:scale-95",

  "muted-outline":
    "border border-muted-foreground text-muted-foreground hover:bg-gray-100 disabled:opacity-60 focus:ring-gray-400 duration-200 active:scale-95",

  warning:
    "bg-warning-foreground text-white hover:bg-yellow-600 disabled:bg-gray-400 shadow-sm hover:shadow-lg duration-200 active:scale-95 focus:ring-yellow-500",

  "warning-outline":
    "border border-warning-background text-warning-background disabled:opacity-60 focus:ring-yellow-500 duration-200 active:scale-95",
};
</script>
