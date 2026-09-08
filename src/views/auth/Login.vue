<template>
  <div
    class="flex items-center justify-center p-4 bg-white sm:bg-gray-50 min-h-[calc(100vh-64px)] sm:min-h-screen sm:p-8"
  >
    <div
      class="w-full max-w-5xl overflow-hidden bg-white shadow-none rounded-2xl sm:shadow-lg"
    >
      <div class="grid grid-cols-1 gap-0 sm:grid-cols-2">
        <!-- Left Side - Illustration (Hidden on Mobile) -->
        <div
          class="hidden sm:flex items-center justify-center bg-gradient-to-br from-primary to-[#FFA30E] p-12"
        >
          <router-link to="/">
            <img
              :src="WhiteWithText"
              alt="Ilustration Login"
              class="w-full max-w-md transition-transform hover:scale-105"
            />
          </router-link>
        </div>

        <!-- Right Side - Form -->
        <div class="flex flex-col justify-center p-4 sm:p-12">
          <!-- Mobile Illustration -->
          <div class="items-center justify-center py-4 sm:hidden flex">
            <router-link to="/">
              <img
                :src="LogoWithText"
                alt="Ilustration Login"
                class="w-full mx-auto max-w-52 transition-transform active:scale-95"
              />
            </router-link>
          </div>

          <h2
            class="hidden mb-2 text-2xl font-bold text-center text-black sm:inline sm:text-3xl sm:text-left"
          >
            Selamat Datang
          </h2>
          <p
            class="mb-8 text-xs text-center text-gray-600 sm:text-sm sm:text-left"
          >
            Masukkan akunmu untuk melanjutkan perjalananmu
          </p>

          <Form @submit="handleLogin" :validation-schema="schema">
            <!-- Email -->

            <div>
              <TextField
                name="email"
                label="Email"
                type="email"
                placeholder="Masukkan email"
              />
            </div>

            <!-- Password -->
            <div class="mt-4">
              <PasswordField
                name="password"
                label="Kata Sandi"
                placeholder="Masukkan kata sandi"
              />
            </div>

            <!-- Forgot Password -->
            <div class="mt-2 mb-6">
              <router-link to="forgot-password">
                <p
                  class="text-xs text-[#FFA30E] flex justify-end underline cursor-pointer hover:text-secondary-hover transition-colors"
                >
                  Lupa Kata Sandi?
                </p>
              </router-link>
            </div>

            <ErrorAlert :message="errorMessage" />

            <!-- Submit -->
            <AppButton
              type="submit"
              :loading="isLoading"
              variant="primary"
              size="md"
              block
              class="mb-4"
            >
              Masuk
            </AppButton>

            <!-- Register -->
            <div>
              <p class="text-xs text-center text-black md:text-sm">
                Belum punya akun?
                <router-link to="register">
                  <span
                    class="text-[#FFA30E] underline cursor-pointer hover:text-secondary-hover transition-colors font-semibold"
                  >
                    Daftar
                  </span>
                </router-link>
              </p>
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
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { Form } from "vee-validate";
import * as yup from "yup";
import { RouterLink } from "vue-router";

import WhiteWithText from "@/assets/icons/White-with-Text.png";
import LogoWithText from "@/assets/icons/LogoWithText.png";
import TextField from "@/components/forms/TextField.vue";
import PasswordField from "@/components/forms/PasswordField.vue";
import ErrorAlert from "@/components/forms/ErrorAlert.vue";
import AppButton from "@/components/common/Button.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLoading = ref(false);
const errorMessage = ref("");
const apiUrl = import.meta.env.VITE_API_BASE_URL || "Not set";
const isDev = import.meta.env.DEV;

// Validation Schema
const schema = yup.object({
  email: yup.string(),
  password: yup.string(),
});

const handleLogin = async (values) => {
  isLoading.value = true;
  errorMessage.value = "";

  if (!values.email || !values.password) {
    errorMessage.value = "Email atau password harus diisi";
    isLoading.value = false;
    return;
  }

  try {
    // 1. Login via authStore
    const userData = await authStore.login({
      email: values.email,
      password: values.password,
    });

    if (isDev) {
      console.log("Login successful, user data:", userData);
    }

    // 2. ✅ Tunggu sebentar agar state terupdate
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 3. ✅ Redirect berdasarkan role
    const userRoles = (userData.roles || [])
      .map((r) => (typeof r === "string" ? r : r.name))
      .filter(Boolean)
      .map((r) => r.toLowerCase());

    if (isDev) {
      console.log("User roles:", userRoles);
    }

    if (userRoles.includes("umkm-owner") || userRoles.includes("customer")) {
      const redirectPath = route.query.redirect || "/";
      if (isDev) {
        console.log("Redirecting to", redirectPath);
      }
      await router.replace(redirectPath);
    } else {
      const redirectPath = route.query.redirect || "/admin/dashboard";
      if (isDev) {
        console.log("Redirecting to", redirectPath);
      }
      await router.replace(redirectPath);
    }
  } catch (error) {
    if (isDev) {
      console.error("Login error:", error);
    }
    
    if (error.response?.data?.need_verify) {
      router.push({ path: "/verify-email", query: { email: values.email } });
      return;
    }

    errorMessage.value =
      error.response?.data?.message || "Login gagal. Silakan coba lagi.";
  } finally {
    isLoading.value = false;
  }
};
</script>