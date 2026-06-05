<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Form } from "vee-validate";
import * as yup from "yup";
import api from "@/libs/axios";
import TextField from "@/components/forms/TextField.vue";
import ErrorAlert from "@/components/forms/ErrorAlert.vue";
import { useToast } from "vue-toastification";
import Button from "@/components/common/Button.vue";

const router = useRouter();
const toast = useToast();

const isLoading = ref(false);
const errorMessage = ref("");

const schema = yup.object({
  name: yup.string().required("Nama wajib diisi").min(3, "Minimal 3 karakter"),
  email: yup
    .string()
    .required("Email wajib diisi")
    .email("Format email tidak valid"),
  password: yup
    .string()
    .required("Password wajib diisi")
    .min(8, "Password minimal 8 karakter")
    .matches(/[A-Z]/, "Password harus mengandung huruf besar")
    .matches(/[0-9]/, "Password harus mengandung angka")
    .matches(/[!@#$%^&*\-_]/, "Password harus mengandung simbol"),
  password_confirmation: yup
    .string()
    .required("Konfirmasi password wajib diisi")
    .oneOf([yup.ref("password")], "Password tidak cocok"),
});

const handleCreate = async (values) => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      password_confirmation: values.password_confirmation,
    };

    await api.post("/api/admin/manage-admins", payload);
    
    toast.success("Admin berhasil dibuat", { timeout: 3000 });
    router.push({ name: "Admin - Admin System List" });
  } catch (error) {
    console.error("Create admin error:", error);
    errorMessage.value =
      error.response?.data?.message || "Gagal membuat admin";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-10">
    <div class="px-4 sm:px-6 py-6">
      <div class="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Tambah Admin Baru</h2>
          <p class="text-sm text-gray-600 mt-1">
            Isi formulir di bawah untuk menambahkan admin baru
          </p>
        </div>

        <Form @submit="handleCreate" :validation-schema="schema">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <TextField
              variant="merchant"
              name="name"
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              class="sm:col-span-2"
              required
            />

            <TextField
              variant="merchant"
              name="email"
              label="Email"
              type="email"
              placeholder="contoh@email.com"
              class="sm:col-span-2"
              required
            />

            <TextField
              variant="merchant"
              name="password"
              label="Password"
              type="password"
              placeholder="Minimal 8 karakter"
              required
            />

            <TextField
              variant="merchant"
              name="password_confirmation"
              label="Konfirmasi Password"
              type="password"
              placeholder="Masukkan ulang password"
              required
            />

            <div class="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <i class="pi pi-info-circle text-blue-600 mt-0.5"></i>
                <div class="flex-1">
                  <p class="text-sm text-blue-900 font-medium mb-1">Informasi Password:</p>
                  <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>Minimal 8 karakter</li>
                    <li>Harus mengandung huruf besar</li>
                    <li>Harus mengandung angka</li>
                    <li>Harus mengandung simbol</li>
                  </ul>
                </div>
              </div>
            </div>

            <ErrorAlert :message="errorMessage" class="sm:col-span-2" />

            <div class="sm:col-span-2 flex gap-3 justify-end pt-4 border-t">
              <Button
                @click="router.push({ name: 'Admin - Admin System List' })"
                variant="secondary"
                type="button"
              >
                Batal
              </Button>
              <Button
                variant="merchant"
                type="submit"
                :loading="isLoading"
                size="md"
              >
                <i class="pi pi-check mr-2"></i>
                Simpan Admin
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  </div>
</template>
