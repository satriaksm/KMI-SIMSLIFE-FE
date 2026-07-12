<script setup>
// =========================
// IMPORTS
// =========================
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "vue-toastification";
import { Form } from "vee-validate";
import * as yup from "yup";
import TextField from "@/components/forms/TextField.vue";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import AppButton from "@/components/common/Button.vue";
import ResponsiveImage from "@/components/common/ResponsiveImage.vue";
import ImageCropperModal from "@/components/common/ImageCropperModal.vue";
import { compressImage } from "@/utils/imageCompressor.js";

// =========================
// STATE & REFS
// =========================

const isDev = import.meta.env.DEV;
const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const toast = useToast();

// Validation Schema
const schema = yup.object({
  name: yup.string().required("Nama lengkap wajib diisi"),
  phone: yup
    .string()
    .required("Nomor telepon wajib diisi")
    .matches(/^08[0-9]{8,11}$/, "Format telepon tidak valid (contoh: 08123456789)")
    .min(10, "No. Telepon minimal 10 digit")
    .max(13, "No. Telepon maksimal 13 digit"),
  email: yup.string().required("Email wajib diisi").email("Format email tidak valid"),
  nik: yup
    .string()
    .nullable()
    .test("len", "NIK harus 16 digit", (val) => !val || val.length === 16)
    .test("num", "NIK harus berupa angka", (val) => !val || /^[0-9]+$/.test(val)),
});

// Form data
const formData = ref({
  name: "",
  email: "",
  phone: "",
  nik: "",
  full_address: "",
  profile_picture: "",
});
const profilePictureFile = ref(null);
const fileInput = ref(null);

const imgLoaded = ref(false);
const imgError = ref(false);

const MAX_PROFILE_IMAGE_MB = 5;
const MAX_PROFILE_IMAGE_BYTES = MAX_PROFILE_IMAGE_MB * 1024 * 1024;

const showCropper = ref(false);
const cropperImageUrl = ref("");

// =========================
// COMPUTED
// =========================
const isInitialProfileLoading = computed(
  () => userStore.loading && !userStore.user,
);

const hasProfilePicture = computed(() => {
  const val = formData.value?.profile_picture;
  return typeof val === "string" && val.trim().length > 0;
});

const onImgLoad = () => {
  imgLoaded.value = true;
};

const onImgError = () => {
  imgError.value = true;
  imgLoaded.value = true;
};

// =========================
// WATCHERS
// =========================
watch(
  () => formData.value?.profile_picture,
  () => {
    imgLoaded.value = false;
    imgError.value = false;
  },
);

// Watch for changes in store user data
watch(
  () => userStore.user,
  (newUser) => {
    if (newUser) {
      formData.value = {
        ...newUser,
        profile_picture:
          typeof newUser?.profile_picture === "string"
            ? newUser.profile_picture
            : "",
      };
    }
  },
  { immediate: true },
);

// =========================
// METHODS
// =========================
const handleCancel = () => {
  router.push("/profile");
};

const goBack = () => {
  router.back();
};

const handlePhotoUpload = () => {
  fileInput.value.click();
};

const handleSave = async () => {
  try {
    const payload = new FormData();
    payload.append("name", formData.value.name);
    payload.append("email", formData.value.email);
    payload.append("phone", formData.value.phone);
    payload.append("nik", formData.value.nik);
    payload.append("full_address", formData.value.full_address);
    if (profilePictureFile.value) {
      payload.append("profile_picture", profilePictureFile.value);
    }

    await userStore.updateProfile(payload);
    authStore.updateLocalUser({
      name: userStore.user?.name ?? formData.value.name,
      email: userStore.user?.email ?? formData.value.email,
      phone: userStore.user?.phone ?? formData.value.phone,
      nik: userStore.user?.nik ?? formData.value.nik,
      profile_picture: userStore.user?.profile_picture || null,
    });

    toast.success("Profil berhasil diperbarui");
    router.push("/profile");
  } catch (error) {
    if (isDev) {
      console.error("Error saving profile:", error);
    }

    // Tangani error khusus jika email diubah dan butuh verifikasi ulang
    if (error.response?.status === 403 && error.response?.data?.message?.includes("verified")) {
      authStore.logout({ silent: true });
      toast.success("Email berhasil diubah. Silakan login kembali dan periksa email Anda untuk verifikasi.");
      router.push("/login");
      return;
    }

    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      const specificMessage = Object.values(errors).flat().join(", ");
      toast.error(specificMessage);
    } else {
      let fallbackMsg = "Gagal memperbarui profil. Silakan coba lagi.";
      if (error.response) {
         fallbackMsg = `Gagal (Error ${error.response.status}: ${error.response.statusText || 'Server Error'}). Silakan coba lagi.`;
      } else if (error.message) {
         fallbackMsg = `Gagal memperbarui profil (${error.message}).`;
      }
      
      const message = error.response?.data?.message || fallbackMsg;
      toast.error(message);
    }
  }
};

const onFileChange = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  if (!String(file.type || "").startsWith("image/")) {
    toast.error("File harus berupa gambar");
    if (e?.target) e.target.value = "";
    return;
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    toast.error(`Ukuran gambar maksimal ${MAX_PROFILE_IMAGE_MB}MB`);
    if (e?.target) e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    cropperImageUrl.value = event.target.result;
    showCropper.value = true;
  };
  reader.readAsDataURL(file);

  if (e?.target) e.target.value = "";
};

const handleCrop = async (croppedFile) => {
  showCropper.value = false;
  try {
    const compressedFile = await compressImage(croppedFile, 1920);
    profilePictureFile.value = compressedFile;
    formData.value.profile_picture = URL.createObjectURL(compressedFile);
  } catch (err) {
    profilePictureFile.value = croppedFile;
    formData.value.profile_picture = URL.createObjectURL(croppedFile);
  }
};

const onInvalidSubmit = ({ errors }) => {
  if (errors && Object.keys(errors).length > 0) {
    const firstError = Object.values(errors)[0];
    toast.error(firstError);
  } else {
    toast.error("Mohon periksa kembali isian Anda");
  }
};

// =========================
// LIFECYCLE
// =========================
onMounted(() => {
  if (!userStore.user) {
    userStore.fetchProfile();
  }
});
</script>

<template>
  <div class="">
    <!-- Hidden file input -->
    <input
      type="file"
      ref="fileInput"
      @change="onFileChange"
      class="hidden"
      accept="image/*"
    />

    <!-- Header -->
    <MobileHeader title="Edit Profil" @back="goBack" variant="primary"/>

    <!-- Content Container -->
    <div class="px-4 py-4 mx-auto max-w-7xl">
      <!-- DESKTOP LAYOUT -->
      <div class="hidden gap-8 sm:grid sm:grid-cols-12">
        <!-- Left: Profile Picture -->
        <div class="sm:col-span-4">
          <div
            class="sticky p-8 bg-white border border-gray-100 shadow-sm rounded-2xl top-12"
          >
            <div class="flex flex-col items-center">
              <div class="relative w-40 h-40">
                <div
                  v-if="
                    isInitialProfileLoading ||
                    (hasProfilePicture && !imgLoaded && !imgError)
                  "
                  class="w-40 h-40 bg-gray-200 border-4 border-white rounded-full shadow-lg animate-pulse"
                />
                <ResponsiveImage
                  v-if="
                    !isInitialProfileLoading && hasProfilePicture && !imgError
                  "
                  :src="formData.profile_picture"
                  :urls="formData.profile_picture === userStore.user?.profile_picture ? userStore.user?.profile_picture_urls : null"
                  :alt="formData.name"
                  loading="lazy"
                  customClass="object-cover w-40 h-40 border-4 border-white rounded-full shadow-lg"
                  :class="imgLoaded ? '' : 'opacity-0'"
                  @load="onImgLoad"
                  @error="onImgError"
                />
                <span v-else>
                  <svg
                    class="w-40 h-40 p-8 text-gray-300 bg-gray-100 border-4 border-white rounded-full shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                    />
                  </svg>
                </span>
                <button
                  @click="handlePhotoUpload"
                  class="absolute p-3 text-white transition-all rounded-full shadow-lg bottom-2 right-2 bg-primary hover:bg-orange-600 hover:scale-110"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>

              <button
                @click="handlePhotoUpload"
                class="mt-4 text-sm font-medium transition-colors text-primary hover:text-orange-600"
              >
                Edit Foto Profile
              </button>

              <p class="mt-2 text-xs text-center text-gray-500">
                Format: JPG, PNG<br />Max size: 5MB
              </p>
            </div>
          </div>
        </div>

        <!-- Right: Form -->
        <div class="sm:col-span-8">
          <div
            class="p-8 bg-white border border-gray-100 shadow-sm rounded-2xl"
          >
            <h3 class="mb-6 text-xl font-bold text-gray-900">
              Edit Informasi Profil
            </h3>

            <Form @submit="handleSave" @invalid-submit="onInvalidSubmit" :validation-schema="schema">
              <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <!-- Nama -->
                <div class="lg:col-span-2">
                  <TextField
                    name="name"
                    label="Nama Lengkap"
                    v-model="formData.name"
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <!-- Telepon -->
                <div>
                  <TextField
                    name="phone"
                    label="Nomor Telepon"
                    v-model="formData.phone"
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <!-- Email -->
                <div>
                  <TextField
                    name="email"
                    label="Email"
                    v-model="formData.email"
                    type="email"
                    required
                    placeholder="contoh@email.com"
                  />
                </div>

                <!-- NIK -->
                <div class="lg:col-span-2">
                  <TextField
                    name="nik"
                    label="NIK (Opsional)"
                    v-model="formData.nik"
                    type="text"
                    :maxlength="16"
                    placeholder="16 digit NIK (opsional)"
                  />
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-4 mt-8">
                <AppButton
                  type="button"
                  variant="muted-outline"
                  class="w-full"
                  @click="handleCancel"
                >
                  Batal
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  :loading="userStore.loading"
                  :disabled="userStore.loading"
                  class="w-full"
                >
                  {{ userStore.loading ? "Menyimpan..." : "Simpan Perubahan" }}
                </AppButton>
              </div>
            </Form>
          </div>
        </div>
      </div>

      <!-- MOBILE LAYOUT -->
      <div class="sm:hidden">
        <div class="flex flex-col items-center mb-8">
          <div class="relative w-32 h-32">
            <div
              v-if="
                isInitialProfileLoading ||
                (hasProfilePicture && !imgLoaded && !imgError)
              "
              class="w-32 h-32 bg-gray-200 border-4 border-white rounded-full shadow-lg animate-pulse"
            />
            <ResponsiveImage
              v-if="!isInitialProfileLoading && hasProfilePicture && !imgError"
              :src="formData.profile_picture"
              :urls="formData.profile_picture === userStore.user?.profile_picture ? userStore.user?.profile_picture_urls : null"
              :alt="formData.name"
              loading="lazy"
              customClass="object-cover w-32 h-32 border-4 border-white rounded-full shadow-lg"
              :class="imgLoaded ? '' : 'opacity-0'"
              @load="onImgLoad"
              @error="onImgError"
            />
            <span v-else>
              <svg
                class="w-32 h-32 p-6 text-gray-300 bg-gray-100 border-4 border-white rounded-full shadow-lg"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
            </span>
            <button
              @click="handlePhotoUpload"
              class="absolute bottom-0 right-0 p-2 text-white transition-colors rounded-full shadow-lg bg-primary hover:bg-orange-600"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          <button
            @click="handlePhotoUpload"
            class="mt-3 text-sm font-medium transition-colors text-primary hover:text-orange-600"
          >
            Edit Foto Profile
          </button>

          <p class="mt-1 text-xs text-center text-gray-500">
            Format: JPG, PNG<br />Max size: 5MB
          </p>
        </div>

        <Form @submit="handleSave" @invalid-submit="onInvalidSubmit" :validation-schema="schema" class="mb-6 space-y-4">
          <!-- Nama -->
          <div>
            
            
            <TextField
              name="name"
            label="Nama Lengkap"
              v-model="formData.name"
              type="text"
              required
              placeholder="Masukkan nama"
            />
          </div>

          <!-- Telepon -->
          <div>
            
            <TextField
              name="phone"
            label="Nomor Telepon"
              v-model="formData.phone"
              type="tel"
              required
              placeholder="Masukkan nomor telepon"
            />
          </div>

          <!-- Email -->
          <div>
            
            <TextField
              name="email"
            label="Email"
              v-model="formData.email"
              type="email"
              required
              placeholder="Masukkan email"
            />
          </div>

          <!-- NIK -->
          <div>
            
            <TextField
              name="nik"
            label="NIK (Opsional)"
              v-model="formData.nik"
              type="text"
              :maxlength="16"
              placeholder="Masukkan NIK"
            />
          </div>

          <!-- Save Button (Desktop) -->
          <div class="hidden sm:block">
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              block
              :loading="userStore.loading"
              :disabled="userStore.loading"
              customClass="w-full"
            >
              {{ userStore.loading ? "Menyimpan..." : "Simpan" }}
            </AppButton>
          </div>

          <!-- Save Button (Mobile Sticky) -->
          <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 sm:hidden pb-safe">
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              block
              :loading="userStore.loading"
              :disabled="userStore.loading"
              customClass="w-full"
            >
              {{ userStore.loading ? "Menyimpan..." : "Simpan" }}
            </AppButton>
          </div>
        </Form>
      </div>
    </div>
    
    <ImageCropperModal
      :show="showCropper"
      :image-url="cropperImageUrl"
      :aspect-ratio="1"
      title="Sesuaikan Foto Profil"
      @close="showCropper = false"
      @crop="handleCrop"
    />
  </div>
</template>
