<template>
  <div
    class="relative sm:bg-gray-50 flex items-center flex-col min-h-[calc(100vh-64px)] sm:min-h-screen sm:justify-center justify-start sm:pb-8 bg-white"
  >
    <div class="absolute top-0 left-0 w-full h-[50vh] bg-primary sm:hidden"></div>
    <!-- Mobile header -->
    <div
      class="relative z-10 sm:hidden flex flex-col shrink-0 justify-end w-full sm:px-0 px-4 py-2 sm:pt-0 pt-8"
    >
      <h2
        class="sm:hidden inline text-2xl sm:text-3xl font-bold text-center sm:text-left mb-2 text-white"
      >
        Lupa Password
      </h2>
      <p
        class="sm:hidden inline text-[12px] sm:text-sm text-center sm:text-left mb-6 text-white"
      >
        Masukkan email Anda, kami akan mengirimkan tautan untuk mengatur ulang
        password
      </p>
    </div>

    <div
      class="relative z-10 flex flex-col justify-start sm:flex-0 grow sm:grow-0 flex-2/3 p-8 sm:p-12 sm:max-w-xl w-full bg-white rounded-t-4xl sm:rounded-4xl sm:shadow-lg"
    >
      <!-- Desktop header -->
      <div class="hidden sm:flex gap-3 items-center mb-2">
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <i class="pi pi-key"></i>
        </span>
        <h1 class="text-xl font-bold text-black">Lupa Password</h1>
      </div>
      <p
        class="hidden sm:block text-xs sm:text-sm text-center sm:text-left mb-6 text-gray-600"
      >
        Masukkan email Anda. Kami akan mengirim tautan untuk mengatur ulang
        password.
      </p>

      <Form @submit="handleSubmit" :validation-schema="schema">
        <div class="space-y-4">
          <TextField
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
          />

          <!-- Desktop Buttons -->
          <div class="hidden sm:block space-y-4">
            <AppButton
              type="submit"
              :loading="isLoading"
              :disabled="isLoading || cooldown > 0"
              variant="primary"
              size="md"
              block
            >
              <span v-if="cooldown > 0">Kirim Ulang ({{ cooldown }}s)</span>
              <span v-else>{{
                showResendText ? "Kirim Ulang" : "Kirim Link Reset"
              }}</span>
            </AppButton>

            <p v-if="cooldown > 0" class="text-xs text-gray-500 text-center">
              Anda dapat meminta ulang dalam {{ cooldown }} detik.
            </p>

            <AppButton
              type="button"
              variant="primary-outline"
              size="md"
              block
              @click="goToLogin"
            >
              Kembali ke Login
            </AppButton>
          </div>

          <!-- Mobile Sticky Buttons -->
          <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 sm:hidden pb-safe space-y-4">
            <AppButton
              type="submit"
              :loading="isLoading"
              :disabled="isLoading || cooldown > 0"
              variant="primary"
              size="md"
              block
            >
              <span v-if="cooldown > 0">Kirim Ulang ({{ cooldown }}s)</span>
              <span v-else>{{
                showResendText ? "Kirim Ulang" : "Kirim Link Reset"
              }}</span>
            </AppButton>

            <p v-if="cooldown > 0" class="text-xs text-gray-500 text-center mb-2 mt-2">
              Anda dapat meminta ulang dalam {{ cooldown }} detik.
            </p>

            <AppButton
              type="button"
              variant="primary-outline"
              size="md"
              block
              @click="goToLogin"
            >
              Kembali ke Login
            </AppButton>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { Form, useForm } from "vee-validate";
import * as yup from "yup";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";
import TextField from "@/components/forms/TextField.vue";
import AppButton from "@/components/common/Button.vue";

const router = useRouter();
const toast = useToast();

const isLoading = ref(false);
const cooldown = ref(0); // sisa detik
const cooldownEndAtMs = ref(0); // timestamp akhir (ms)
let cooldownTimer = null;

const DEFAULT_COOLDOWN = 60;

// Keys localStorage
const COOLDOWNS_KEY = "fp_cooldowns"; // map: { [emailLower]: endAtMs }
const LAST_EMAIL_KEY = "fp_last_email";

// Ambil email terakhir yang pernah sukses dikirimi (untuk resume di refresh)
const initialEmail = localStorage.getItem(LAST_EMAIL_KEY) || "";

// Inisialisasi vee-validate dengan email awal (agar input terisi dan resume aktif)
const { values } = useForm({
  initialValues: { email: initialEmail }, // IMPORTANT
});
const currentEmail = computed(() => (values.email || "").toString().trim());

// Simpan email sukses terakhir (ref)
const lastEmailSent = ref(initialEmail);

// Flag sesi
const hasSentInThisSession = ref(false);

// Label tombol
const showResendText = computed(() => {
  if (cooldown.value > 0) return true; // selama countdown => Kirim Ulang (Xs)
  return (
    hasSentInThisSession.value &&
    currentEmail.value &&
    currentEmail.value.toLowerCase() === lastEmailSent.value.toLowerCase()
  );
});

const schema = yup.object({
  email: yup
    .string()
    .email("Format email tidak valid")
    .required("Email wajib diisi"),
});

// Helpers localStorage (persist endAt per email)
function readCooldowns() {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWNS_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeCooldowns(map) {
  localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(map || {}));
}
function setCooldownEndAt(email, endAtMs) {
  const key = (email || "").toLowerCase();
  if (!key) return;
  const map = readCooldowns();
  map[key] = endAtMs;
  writeCooldowns(map);
}
function getCooldownEndAt(email) {
  const key = (email || "").toLowerCase();
  const map = readCooldowns();
  return Number(map[key] || 0);
}
function clearCooldownEndAt(email) {
  const key = (email || "").toLowerCase();
  const map = readCooldowns();
  if (map[key]) {
    delete map[key];
    writeCooldowns(map);
  }
}

// Interval countdown untuk email tertentu (tidak tergantung input aktif)
function startIntervalTo(emailKey, endAtMs) {
  cooldownEndAtMs.value = endAtMs;
  if (cooldownTimer) clearInterval(cooldownTimer);

  const tick = () => {
    const remain = Math.ceil((endAtMs - Date.now()) / 1000);
    cooldown.value = Math.max(0, remain);
    if (remain <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      cooldownEndAtMs.value = 0;
      clearCooldownEndAt(emailKey); // bersihkan untuk email yang benar
    }
  };

  tick();
  cooldownTimer = setInterval(tick, 1000);
}

// Mulai cooldown untuk email saat ini
function startCooldown(seconds, email) {
  const emailKey = (email || currentEmail.value || "").toLowerCase();
  if (!emailKey) return;

  const sec =
    Number.isFinite(seconds) && seconds > 0
      ? Math.floor(seconds)
      : DEFAULT_COOLDOWN;
  const endAt = Date.now() + sec * 1000;

  setCooldownEndAt(emailKey, endAt);
  startIntervalTo(emailKey, endAt);
}

// Resume countdown berdasarkan email tertentu
function resumeCooldownForEmail(email) {
  const emailKey = (email || "").toLowerCase();
  if (!emailKey) {
    cooldown.value = 0;
    cooldownEndAtMs.value = 0;
    if (cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
    return;
  }
  const endAt = getCooldownEndAt(emailKey);
  const remain = Math.ceil((endAt - Date.now()) / 1000);
  if (endAt && remain > 0) {
    startIntervalTo(emailKey, endAt);
  } else {
    cooldown.value = 0;
    cooldownEndAtMs.value = 0;
    if (endAt) clearCooldownEndAt(emailKey);
  }
}

// Saat halaman dibuka: resume pakai initialEmail (email terakhir yang dikirimi)
onMounted(() => {
  if (initialEmail) {
    resumeCooldownForEmail(initialEmail);
  }
});

// Saat email input berubah: coba resume utk email tersebut
watch(currentEmail, (val) => {
  if (val) resumeCooldownForEmail(val);
});

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

function getRetryAfterSeconds(resOrErr) {
  const hdr =
    resOrErr?.headers?.["retry-after"] ?? resOrErr?.headers?.["Retry-After"];
  const body = resOrErr?.data?.retry_after ?? resOrErr?.data?.retryAfter;
  const val = Number(hdr ?? body);
  return Number.isFinite(val) && val > 0 ? Math.floor(val) : null;
}

async function handleSubmit(values) {
  if (cooldown.value > 0 || isLoading.value) return;

  isLoading.value = true;
  try {
    const res = await api.post("/api/auth/forgot-password", {
      email: values.email,
    });

    hasSentInThisSession.value = true;
    lastEmailSent.value = values.email;
    localStorage.setItem(LAST_EMAIL_KEY, values.email);

    const seconds = getRetryAfterSeconds(res) ?? DEFAULT_COOLDOWN;
    startCooldown(seconds, values.email); // persist + interval untuk email kirim
    toast.success("Tautan reset telah dikirim.", { timeout: 4000 });
  } catch (e) {
    const status = e.response?.status;
    if (status === 429) {
      hasSentInThisSession.value = true;
      const seconds =
        getRetryAfterSeconds(e.response) ??
        getRetryAfterSeconds(e.response?.data) ??
        DEFAULT_COOLDOWN;
      startCooldown(seconds, values.email);
      toast.error(
        `Terlalu banyak permintaan. Coba lagi dalam ${seconds} detik.`,
        { timeout: 4000 }
      );
    } else if (status === 404) {
      toast.error("Email tidak terdaftar.", { timeout: 4000 });
    } else {
      const msg =
        e.response?.data?.message || "Gagal mengirim tautan reset. Coba lagi.";
      toast.error(msg, { timeout: 4000 });
    }
  } finally {
    isLoading.value = false;
  }
}

function goToLogin() {
  router.push({ name: "Login" }).catch(() => router.push("/login"));
}
</script>
