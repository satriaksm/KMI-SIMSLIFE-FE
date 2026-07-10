<template>
  <div
    class="relative flex flex-col items-center justify-start min-h-[calc(100vh-64px)] sm:min-h-screen sm:bg-gray-50 bg-white sm:justify-center sm:pb-8"
  >
    <div class="absolute top-0 left-0 w-full h-[50vh] bg-primary sm:hidden"></div>
    <!-- Mobile header -->
    <div
      class="relative z-10 flex flex-col justify-end w-full px-4 py-2 pt-8 sm:hidden shrink-0 sm:px-0 sm:pt-0"
    >
      <h2
        class="inline mb-2 text-2xl font-bold text-center text-white sm:hidden sm:text-3xl sm:text-left"
      >
        Verifikasi Email
      </h2>
      <p
        class="sm:hidden inline text-[12px] sm:text-sm text-center sm:text-left mb-6 text-white"
      >
        Cek inbox Anda dan verifikasi email untuk melanjutkan
      </p>
    </div>

    <div
      class="relative z-10 flex flex-col justify-start w-full p-8 bg-white shadow-none grow sm:flex-0 sm:p-12 sm:max-w-xl sm:rounded-4xl rounded-t-4xl sm:shadow-lg"
    >
      <!-- Desktop header -->
      <div class="items-center hidden gap-3 mb-2 sm:flex">
        <span
          class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary"
        >
          <i class="pi pi-envelope"></i>
        </span>
        <h1 class="text-xl font-bold text-black">Verifikasi Email</h1>
      </div>

      <p
        class="hidden mb-6 text-xs text-center text-gray-600 sm:block sm:text-sm sm:text-left"
        v-if="status === ''"
      >
        Kami telah mengirim tautan verifikasi ke email Anda. Silakan cek inbox
        atau folder spam.
      </p>

      <div
        v-if="status === 'verified'"
        class="p-3 mb-0 text-sm text-green-700 border border-green-200 rounded-lg sm:mb-4 bg-green-50"
      >
        Email Anda berhasil diverifikasi. Silakan masuk untuk melanjutkan.
      </div>
      <div
        v-else-if="status === 'already_verified'"
        class="p-3 mb-0 text-sm text-blue-700 border border-blue-200 rounded-lg sm:mb-4 bg-blue-50"
      >
        Email sudah terverifikasi. Anda dapat langsung masuk.
      </div>
      <div
        v-else-if="status === 'invalid'"
        class="p-3 mb-0 text-sm text-red-700 border border-red-200 rounded-lg sm:mb-4 bg-red-50"
      >
        Link verifikasi tidak valid atau sudah kadaluarsa. Kirim ulang link
        verifikasi.
      </div>

      <!-- Desktop Buttons -->
      <div class="hidden sm:flex flex-col gap-2 mt-6">
        <AppButton
          v-if="status === '' || status === 'invalid'"
          type="button"
          variant="primary"
          size="md"
          @click="resend"
          :loading="sending"
          block
        >
          Kirim Ulang Link Verifikasi
        </AppButton>
        <AppButton
          type="button"
          variant="primary-outline"
          size="md"
          @click="goToLogin"
          block
        >
          Ke Halaman Login
        </AppButton>
      </div>

      <!-- Mobile Sticky Buttons -->
      <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 sm:hidden pb-safe flex flex-col gap-2">
        <AppButton
          v-if="status === '' || status === 'invalid'"
          type="button"
          variant="primary"
          size="md"
          @click="resend"
          :loading="sending"
          block
        >
          Kirim Ulang Link Verifikasi
        </AppButton>
        <AppButton
          type="button"
          variant="primary-outline"
          size="md"
          @click="goToLogin"
          block
        >
          Ke Halaman Login
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import AppButton from "@/components/common/Button.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

let auth = null;
try {
  auth = useAuthStore();
} catch {}

const isAuthenticated = computed(() => !!auth?.isAuthenticated?.value);
const status = computed(() => (route?.query?.status || "").toString());
const email = ref((route?.query?.email || "").toString());
const sending = ref(false);

// Tampilkan toast sekali per perubahan status
const lastStatusToast = ref("");
watch(
  () => status.value,
  (val) => {
    if (!val || val === lastStatusToast.value) return;
    if (val === "verified") toast.success("Email berhasil diverifikasi.");
    else if (val === "already_verified")
      toast.info("Email sudah terverifikasi.");
    else if (val === "invalid")
      toast.error("Link verifikasi tidak valid atau kadaluarsa.");
    lastStatusToast.value = val;
  },
  { immediate: true },
);

async function resend() {
  sending.value = true;
  try {
    if (isAuthenticated.value) {
      await api.post("/api/auth/email/verification-notification");
    } else {
      if (!email.value) {
        toast.error("Email wajib diisi");
        return;
      }
      await api.post("/api/auth/resend-verification", { email: email.value });
    }
    toast.success("Tautan verifikasi telah dikirim. Periksa inbox Anda.");
  } catch (e) {
    const msg = e.response?.data?.message || "Gagal mengirim email verifikasi.";
    toast.error(msg);
  } finally {
    sending.value = false;
  }
}

function goToLogin() {
  router.push({ name: "Login" }).catch(() => router.push("/login"));
}
</script>
