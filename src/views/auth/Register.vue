<template>
  <div
    class="relative flex flex-col items-center justify-start min-h-[calc(100vh-64px)] sm:min-h-screen sm:bg-gray-50 bg-white sm:justify-center sm:pb-8"
  >
    <div class="absolute top-0 left-0 w-full h-[50vh] bg-primary sm:hidden"></div>
    <div
      class="relative z-10 flex flex-col justify-end w-full px-4 py-2 pt-8 sm:hidden shrink-0 sm:px-0 sm:pt-0"
    >
      <h2
        class="inline mb-2 text-2xl font-bold text-center text-white sm:hidden sm:text-3xl sm:text-left"
      >
        Daftar
      </h2>
      <p
        class="sm:hidden inline text-[12px] text-sm text-center sm:text-left mb-6 text-white"
      >
        Lengkapi data dirimu untuk membuat akun dan mulai jelajahi layanan
        terbaik
      </p>
    </div>
    <div
      class="relative z-10 flex flex-col justify-start w-full p-8 bg-white shadow-none grow sm:flex-0 sm:p-12 sm:max-w-xl sm:rounded-4xl rounded-t-4xl sm:shadow-lg"
    >
      <!-- Right Side - Form -->
      <div class="flex-col sm:flex">
        <div class="flex items-center gap-3 mb-2">
          <span
            class="items-center justify-center hidden w-10 h-10 rounded-full sm:inline-flex bg-primary/10 text-primary"
          >
            <!-- <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 3a6 6 0 1 0 3.917 10.566l2.258 2.258A2 2 0 0 0 20.586 17H21a1 1 0 1 0 0-2h-.586l-.707-.707.293-.293H21a1 1 0 1 0 0-2h-2a1 1 0 0 0-.707.293l-.293.293-1.758-1.758A6 6 0 0 0 12 3Zm-4 6a4 4 0 1 1 8.001.001A4 4 0 0 1 8 9Z"
              />
            </svg> -->
            <i class="pi pi-user-plus"></i>
          </span>
          <h2
            class="hidden text-2xl font-bold text-center text-black sm:inline sm:text-xl sm:text-left"
          >
            Daftar
          </h2>
        </div>

        <p
          class="hidden mb-6 text-xs text-center text-gray-600 sm:inline sm:text-sm sm:text-left"
        >
          Lengkapi data dirimu untuk membuat akun dan mulai jelajahi layanan
          terbaik
        </p>
        <Form
          @submit="handleRegister"
          :validation-schema="schema"
          v-slot="{ errors, meta }"
        >
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="name"
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              required
            />

            <TextField
              name="email"
              type="email"
              label="Email"
              placeholder="Masukkan email"
              required
            />

            <TextField
              name="nik"
              label="NIK (Opsional)"
              placeholder="Masukkan NIK (opsional)"
            />

            <TextField
              name="telepon"
              type="tel"
              label="No. Telepon"
              placeholder="Masukkan no. telepon"
              required
            />

            <PasswordField
              name="password"
              label="Kata Sandi"
              placeholder="Masukkan kata sandi"
              v-model="passwordValue"
              required
            />

            <PasswordField
              name="password_confirmation"
              label="Konfirmasi Kata Sandi"
              placeholder="Ulangi kata sandi"
              required
            />

            <!-- Indicators -->
            <div
              class="flex flex-col col-span-1 gap-1 p-4 text-xs rounded-xl bg-muted-background sm:col-span-2"
              aria-live="polite"
            >
              <div
                class="flex items-center"
                :class="
                  hasMinLength ? 'text-green-600' : 'text-muted-foreground'
                "
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
                :class="
                  hasUppercase ? 'text-green-600' : 'text-muted-foreground'
                "
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
                Mengandung simbol (!@#$%^&*-_)
              </div>
            </div>

            <div class="sm:col-span-2">
              <ErrorAlert :message="errorMessage" />
            </div>

            <!-- Submit Button (Desktop) -->
            <div class="hidden sm:block sm:col-span-2">
              <AppButton
                type="submit"
                :loading="isLoading"
                :disabled="!meta.valid || isLoading"
                variant="primary"
                size="md"
                block
                class="mb-2"
              >
                Daftar
              </AppButton>
            </div>

            <!-- Submit Button (Mobile Sticky) -->
            <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 sm:hidden pb-safe">
              <AppButton
                type="submit"
                :loading="isLoading"
                :disabled="!meta.valid || isLoading"
                variant="primary"
                size="md"
                block
                class="w-full"
              >
                Daftar
              </AppButton>
            </div>

            <!-- Login Link -->
            <div class="sm:col-span-2">
              <p class="text-xs text-center text-black sm:text-sm">
                Sudah punya akun?
                <router-link
                  to="login"
                  class="font-semibold underline transition-colors cursor-pointer text-primary hover:text-secondary-hover"
                >
                  Masuk
                </router-link>
              </p>
            </div>
          </div>
        </Form>
        <!-- Debug Info (Development Only) -->
        <!-- <div
          v-if="isDev"
          class="p-4 mt-6 text-xs border border-gray-200 bg-gray-50 rounded-xl"
        >
          <p class="mb-2 font-semibold text-gray-700">Debug Info:</p>
          <p class="text-gray-600"><strong>API URL:</strong> {{ apiUrl }}</p>
        </div> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Form } from "vee-validate";
import * as yup from "yup";
import api from "@/libs/axios";
import { RouterLink } from "vue-router";
import { useToast } from "vue-toastification"; // NEW
import AppButton from "@/components/common/Button.vue";
import TextField from "@/components/forms/TextField.vue";
import PasswordField from "@/components/forms/PasswordField.vue";
import ErrorAlert from "@/components/forms/ErrorAlert.vue";

const router = useRouter();
const toast = useToast(); // NEW

const isLoading = ref(false);
const errorMessage = ref("");
const apiUrl = import.meta.env.VITE_API_BASE_URL || "Not set";
const isDev = import.meta.env.DEV;

// Validation Schema
const schema = yup.object({
  name: yup.string().required("Nama wajib diisi"),
  email: yup
    .string()
    .required("Email wajib diisi")
    .email("Format email tidak valid"),
  telepon: yup
    .string()
    .required("No. Telepon wajib diisi")
    .matches(
      /^08[0-9]{8,11}$/,
      "Format telepon tidak valid (contoh: 08123456789)",
    )
    .min(10, "No. Telepon minimal 10 digit")
    .max(13, "No. Telepon maksimal 13 digit"),
  nik: yup
    .string()
    .nullable()
    .test("len", "NIK harus 16 karakter", (val) => !val || val.length === 16)
    .test("num", "NIK harus berupa angka", (val) => !val || /^[0-9]+$/.test(val)),
  password: yup
    .string()
    .required("Kata sandi wajib diisi")
    .min(8, "Persyaratan kata sandi belum terpenuhi")
    .matches(
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*\-_]).+$/,
      "Persyaratan kata sandi belum terpenuhi",
    ),
  password_confirmation: yup
    .string()
    .required("Konfirmasi kata sandi wajib diisi")
    .oneOf([yup.ref("password")], "Kata sandi tidak cocok"),
});

// Password indicators
const passwordValue = ref("");
const hasMinLength = computed(() => passwordValue.value.length >= 8);
const hasUppercase = computed(() => /[A-Z]/.test(passwordValue.value));
const hasNumber = computed(() => /\d/.test(passwordValue.value));
const hasSymbol = computed(() => /[!@#$%^&*\-_]/.test(passwordValue.value));

const handleRegister = async (values) => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.post("/api/auth/register", {
      name: values.name,
      email: values.email,
      nik: values.nik,
      phone: values.telepon,
      password: values.password,
      password_confirmation: values.password_confirmation,
    });

    // Toast sukses langsung, tanpa menunggu email terkirim
    toast.success("Registrasi berhasil. Cek email untuk verifikasi.", {
      timeout: 4000,
    }); // NEW

    // Arahkan ke halaman login
    router.push({ name: "Login" }).catch(() => {});
  } catch (error) {
    if (isDev) console.error("Register error:", error);
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      errorMessage.value = Object.values(errors).flat().join(", ");
    } else {
      errorMessage.value =
        error.response?.data?.message || "Registrasi gagal. Silakan coba lagi.";
    }
  } finally {
    isLoading.value = false;
  }
};

</script>
