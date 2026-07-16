<script setup>
// =========================
// IMPORTS
// =========================
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useToast } from "vue-toastification";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import AppButton from "@/components/common/Button.vue";
import { useForm } from "vee-validate";
import * as yup from "yup";
import PasswordField from "@/components/forms/PasswordField.vue";

// =========================
// STATE
// =========================
const isDev = import.meta.env.DEV;
const router = useRouter();
const userStore = useUserStore();
const toast = useToast();
const loading = ref(false);

const schema = yup.object({
  current_password: yup.string().required("Kata sandi sekarang wajib diisi"),
  new_password: yup
    .string()
    .min(8, "Minimal 8 karakter")
    .matches(/[A-Z]/, "Harus mengandung huruf besar (A-Z)")
    .matches(/[a-z]/, "Harus mengandung huruf kecil (a-z)")
    .matches(/[0-9]/, "Harus mengandung angka (0-9)")
    .matches(/[!@#$%^&*(),.?":{}|<>]/, "Harus mengandung simbol")
    .required("Kata sandi baru wajib diisi"),
  new_password_confirmation: yup
    .string()
    .oneOf([yup.ref("new_password")], "Konfirmasi kata sandi tidak cocok")
    .required("Konfirmasi kata sandi wajib diisi"),
});

const { values, setFieldError, handleSubmit } = useForm({
  validationSchema: schema,
  initialValues: {
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  },
});

// =========================
// COMPUTED
// =========================

const newPassword = computed(() => String(values.new_password ?? ""));

// Password indicators (mirip Register.vue)
const hasMinLength = computed(() => newPassword.value.length >= 8);
const hasUppercase = computed(() => /[A-Z]/.test(newPassword.value));
const hasLowercase = computed(() => /[a-z]/.test(newPassword.value));
const hasNumber = computed(() => /[0-9]/.test(newPassword.value));
const hasSymbol = computed(() =>
  /[!@#$%^&*(),.?":{}|<>]/.test(newPassword.value),
);

// =========================
// METHODS
// =========================
const onSubmit = handleSubmit(async (formValues) => {
  loading.value = true;

  try {
    await userStore.changePassword({
      current_password: formValues.current_password,
      new_password: formValues.new_password,
      new_password_confirmation: formValues.new_password_confirmation,
    });

    toast.success("Kata sandi berhasil diubah!");
    router.push("/profile");
  } catch (error) {
    if (isDev) {
      console.error("Error changing password:", error);
    }
    const msg = error?.response?.data?.message;
    if (msg) setFieldError("current_password", msg);
    else toast.error("Gagal mengubah kata sandi. Silakan coba lagi.");
  } finally {
    loading.value = false;
  }
});

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="">
    <!-- Header -->
    <MobileHeader title="Ubah Kata Sandi" @back="goBack" variant="primary"/>

    <!-- Content -->
    <div class="max-w-3xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
      <div class="sm:p-8 sm:bg-white sm:border sm:border-gray-100 sm:shadow-sm rounded-2xl">
        <h3 class="mb-6 text-xl font-bold text-gray-900 hidden sm:block">
          Ubah Kata Sandi
        </h3>
        <form @submit.prevent="onSubmit" class="space-y-6">
        <!-- Current Password -->
        <PasswordField
          name="current_password"
          label="Kata Sandi Sekarang"
          placeholder="••••••••"
          required
        />

        <!-- New Password -->
        <PasswordField
          name="new_password"
          label="Kata Sandi Baru"
          placeholder="••••••••"
          required
        />

        <!-- Confirm Password -->
        <PasswordField
          name="new_password_confirmation"
          label="Konfirmasi Sandi Baru"
          placeholder="••••••••"
          required
        />

        <!-- Password Requirements -->
        <!-- Password Indicators (mirip Register.vue) -->
        <div
          class="flex flex-col gap-1 p-4 text-xs border border-blue-200 rounded-xl bg-blue-50"
          aria-live="polite"
        >
          <div
            class="flex items-center"
            :class="hasMinLength ? 'text-green-600' : 'text-muted-foreground'"
          >
            <svg
              v-if="hasMinLength"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="9" stroke-width="2" />
            </svg>
            Minimal 8 karakter
          </div>
          <div
            class="flex items-center"
            :class="hasUppercase ? 'text-green-600' : 'text-muted-foreground'"
          >
            <svg
              v-if="hasUppercase"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="9" stroke-width="2" />
            </svg>
            Mengandung huruf besar (A-Z)
          </div>
          <div
            class="flex items-center"
            :class="hasLowercase ? 'text-green-600' : 'text-muted-foreground'"
          >
            <svg
              v-if="hasLowercase"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="9" stroke-width="2" />
            </svg>
            Mengandung huruf kecil (a-z)
          </div>
          <div
            class="flex items-center"
            :class="hasNumber ? 'text-green-600' : 'text-muted-foreground'"
          >
            <svg
              v-if="hasNumber"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="9" stroke-width="2" />
            </svg>
            Mengandung angka (0-9)
          </div>
          <div
            class="flex items-center"
            :class="hasSymbol ? 'text-green-600' : 'text-muted-foreground'"
          >
            <svg
              v-if="hasSymbol"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="9" stroke-width="2" />
            </svg>
            Mengandung simbol (!@#$%^&*(),.?":{}|&lt;&gt;)
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex gap-2">
          <!-- Desktop Buttons -->
          <div class="hidden sm:flex w-full gap-2">
            <AppButton
              type="button"
              variant="muted-outline"
              size="md"
              @click="goBack"
              class="w-full"
            >
              Batal
            </AppButton>

            <AppButton
              type="submit"
              variant="primary"
              size="md"
              block
              :loading="loading"
              :disabled="loading"
              class="w-full"
            >
              {{ loading ? "Menyimpan..." : "Simpan" }}
            </AppButton>
          </div>

          <!-- Mobile Sticky Button -->
          <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 sm:hidden pb-safe">
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              block
              :loading="loading"
              :disabled="loading"
              class="w-full"
            >
              {{ loading ? "Menyimpan..." : "Simpan" }}
            </AppButton>
          </div>
        </div>
      </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Status bar simulation */
.status-bar {
  height: 44px;
  background: white;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .max-w-4xl {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
</style>