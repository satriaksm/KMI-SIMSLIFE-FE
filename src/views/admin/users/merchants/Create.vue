<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Form, Field, ErrorMessage } from "vee-validate";
import * as yup from "yup";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
} from "@/services/api/location";
import { getSegmentations } from "@/services/api/segmentation";
import api from "@/libs/axios";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import ErrorAlert from "@/components/forms/ErrorAlert.vue";
import MapPicker from "@/components/forms/MapPicker.vue";
import { useToast } from "vue-toastification";
import AppButton from "@/components/common/Button.vue";

const router = useRouter();
const route = useRoute();
const toast = useToast();

const isLoading = ref(false);
const errorMessage = ref("");
const apiUrl = import.meta.env.VITE_API_BASE_URL || "Not set";
const isDev = import.meta.env.DEV;

const latitude = ref(null);
const longitude = ref(null);

// Segmentation (Select from API)
const segmentations = ref([]);
const segmentationId = ref("");

// User select
const users = ref([]);
const selectedUserId = ref("");
const usersLoading = ref(false);
const userSearch = ref("");

// Debounce helper
let userSearchTimeout = null;
const fetchUsers = async (search = "") => {
  usersLoading.value = true;
  try {
    const res = await api.get("/api/admin/users", {
      params: { per_page: 20, search },
    });
    users.value = res.data.data || [];
  } catch (e) {
    users.value = [];
    toast.error("Gagal memuat user");
  } finally {
    usersLoading.value = false;
  }
};

watch(userSearch, (val) => {
  clearTimeout(userSearchTimeout);
  userSearchTimeout = setTimeout(() => {
    fetchUsers(val);
  }, 400);
});

onMounted(async () => {
  await fetchUsers();
  await loadProvinces();
  await loadSegmentations();
  
  const userId = route.query.userId;
  if (userId) {
    const userIdNum = Number(userId);
    selectedUserId.value = userIdNum;
    
    await nextTick();
    
    const selectedUser = users.value.find(u => u.id === userIdNum);
    if (selectedUser) {
      toast.info(`Membuat merchant untuk: ${selectedUser.name}`, { timeout: 3000 });
    }
  }
});

// ✅ FIXED: Sync selectedUserId with form values using computed
const formInitialValues = computed(() => ({
  user_id: selectedUserId.value,
  name: '',
  phone: '',
  segmentation_id: '',
  description: '',
  address: {
    province_id: '',
    city_id: '',
    district_id: '',
    village_id: '',
    detail: '',
    latitude: null,
    longitude: null,
  }
}));

// ✅ FIXED: Watch selectedUserId changes and update form
const formRef = ref(null);

watch(selectedUserId, (newVal) => {
  if (formRef.value && newVal) {
    formRef.value.setFieldValue('user_id', newVal);
  }
});

// ✅ FIXED: Add user_id to schema and sync with selectedUserId
const schema = yup.object({
  user_id: yup.number().required("User wajib dipilih"),
  name: yup.string().required("Nama wajib diisi"),
  phone: yup
    .string()
    .matches(/^[0-9+\-()\s]{8,20}$/, "Nomor telepon tidak valid")
    .required("Nomor telepon wajib diisi"),
  segmentation_id: yup
    .number()
    .typeError("Jenis usaha wajib dipilih")
    .required("Jenis usaha wajib dipilih"),
  description: yup.string().nullable(),
  address: yup.object({
    province_id: yup
      .number()
      .typeError("Provinsi wajib dipilih")
      .required("Provinsi wajib dipilih"),
    city_id: yup
      .number()
      .typeError("Kabupaten/Kota wajib dipilih")
      .required("Kabupaten/Kota wajib dipilih"),
    district_id: yup
      .number()
      .typeError("Kecamatan wajib dipilih")
      .required("Kecamatan wajib dipilih"),
    village_id: yup
      .number()
      .typeError("Desa wajib dipilih")
      .required("Desa wajib dipilih"),
    detail: yup.string().nullable(),
    latitude: yup
      .number()
      .typeError("Latitude tidak valid")
      .min(-90)
      .max(90)
      .required("Latitude wajib diisi"),
    longitude: yup
      .number()
      .typeError("Longitude tidak valid")
      .min(-180)
      .max(180)
      .required("Longitude wajib diisi"),
  }),
});

// Data wilayah
const provinces = ref([]);
const cities = ref([]);
const districts = ref([]);
const villages = ref([]);

const provinceId = ref("");
const cityId = ref("");
const districtId = ref("");
const villageId = ref("");

const segmentationsLoading = ref(false);
const provincesLoading = ref(false);
const citiesLoading = ref(false);
const districtsLoading = ref(false);
const villagesLoading = ref(false);

const loadUsers = async () => {
  usersLoading.value = true;
  try {
    const res = await api.get("/api/admin/users", { params: { per_page: 1000 } });
    users.value = res.data.data || [];
  } catch (e) {
    users.value = [];
    toast.error("Gagal memuat user");
  } finally {
    usersLoading.value = false;
  }
};

async function loadProvinces() {
  provincesLoading.value = true;
  try {
    provinces.value = await getProvinces();
  } catch (e) {
    provinces.value = [];
  } finally {
    provincesLoading.value = false;
  }
}

async function loadCities(pid) {
  citiesLoading.value = true;
  if (!pid) {
    cities.value = [];
    citiesLoading.value = false;
    return;
  }
  try {
    cities.value = await getCities(pid);
  } catch (e) {
    cities.value = [];
  } finally {
    citiesLoading.value = false;
  }
}

async function loadDistricts(cid) {
  districtsLoading.value = true;
  if (!cid) {
    districts.value = [];
    districtsLoading.value = false;
    return;
  }
  try {
    districts.value = await getDistricts(cid);
  } catch (e) {
    districts.value = [];
  } finally {
    districtsLoading.value = false;
  }
}

async function loadVillages(did) {
  villagesLoading.value = true;
  if (!did) {
    villages.value = [];
    villagesLoading.value = false;
    return;
  }
  try {
    villages.value = await getVillages(did);
  } catch (e) {
    villages.value = [];
  } finally {
    villagesLoading.value = false;
  }
}

async function loadSegmentations() {
  segmentationsLoading.value = true;
  try {
    segmentations.value = await getSegmentations();
  } catch (e) {
    segmentations.value = [];
  } finally {
    segmentationsLoading.value = false;
  }
}

watch(provinceId, async (val) => {
  cityId.value = "";
  districtId.value = "";
  villageId.value = "";
  cities.value = [];
  districts.value = [];
  villages.value = [];
  await loadCities(val);
});
watch(cityId, async (val) => {
  districtId.value = "";
  villageId.value = "";
  districts.value = [];
  villages.value = [];
  await loadDistricts(val);
});
watch(districtId, async (val) => {
  villageId.value = "";
  villages.value = [];
  await loadVillages(val);
});

// Submit pakai endpoint admin
const handleRegister = async (values) => {
  if (!selectedUserId.value) {
    toast.error("User wajib dipilih");
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
      const payload = {
        user_id: selectedUserId.value,
        name: values.name,
        phone: values.phone,
        description: values.description || null,
        segmentation_id: Number(values.segmentation_id),
        address: {
          province_id: Number(values.address.province_id),
          city_id: Number(values.address.city_id),
          district_id: Number(values.address.district_id),
          village_id: Number(values.address.village_id),
          detail: values.address.detail || null,
          latitude: Number(values.address.latitude),
          longitude: Number(values.address.longitude),
        }
      };
  
      console.log('Submitting payload:', payload);
      
      const response = await api.post("/api/admin/merchants", payload);
      console.log('Response:', response);
  
      toast.success("Merchant berhasil dibuat & langsung di-approve.", { timeout: 3000 });
      router.push({ name: "Admin - Merchants List" });
    } catch (error) {
      console.error('Submit error:', error);
      errorMessage.value = error.response?.data?.message || "Gagal membuat merchant";
      toast.error(errorMessage.value);
    } finally {
      isLoading.value = false;
    }
  };

const userDropdownOpen = ref(false);
const userDropdownRef = ref(null);
const userSearchInputRef = ref(null);

// Tutup dropdown jika klik di luar
function handleClickOutside(event) {
  if (
    userDropdownOpen.value &&
    userDropdownRef.value &&
    !userDropdownRef.value.contains(event.target)
  ) {
    userDropdownOpen.value = false;
  }
}
onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});
watch(userDropdownOpen, async (open) => {
  if (open) {
    await nextTick();
    userSearchInputRef.value?.focus();
  }
});
onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});

// Untuk menampilkan nama user yang dipilih
const selectedUser = computed(() =>
  users.value.find((u) => u.id === selectedUserId.value)
);
</script>

<template>
  <div
    class="min-h-screen sm:bg-gray-50 bg-merchant-primary flex items-center flex-col sm:justify-center justify-end sm:p-8"
  >
    <div
      class="sm:hidden flex flex-col flex-1/3 justify-end sm:px-0 px-4 py-2 sm:pt-0 pt-8"
    >
      <h2
        class="sm:hidden inline text-2xl sm:text-3xl font-bold text-center sm:text-left mb-2 text-white"
      >
        Daftarkan UMKM
      </h2>
      <p
        class="sm:hidden inline text-[10px] sm:text-sm text-center sm:text-left mb-6 text-white"
      >
        Isi data diri dan informasi UMKM-mu untuk memulai perjalananmu bersama
        kami
      </p>
    </div>
    <div
      class="flex flex-col justify-center sm:flex-0 flex-2/3 p-8 sm:p-12 sm:max-w-xl w-full bg-white sm:rounded-4xl rounded-t-4xl sm:shadow-lg shadow-none"
    >
      <div class="sm:flex flex-col">
        <div class="flex gap-3 mb-2 items-center">
          <span
            class="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full bg-merchant-primary/10 text-merchant-primary"
          >
            <i class="pi pi-shop"></i>
          </span>
          <h2
            class="hidden sm:inline text-2xl sm:text-xl font-bold text-center sm:text-left text-black"
          >
            Daftarkan UMKM
          </h2>
        </div>

        <p
          class="hidden sm:inline text-xs sm:text-sm text-center sm:text-left mb-6 text-gray-600"
        >
          Isi data diri dan informasi UMKM-mu untuk memulai perjalananmu bersama
          kami
        </p>

        <Form 
          ref="formRef"
          @submit="handleRegister" 
          :validation-schema="schema" 
          :initial-values="formInitialValues"
          v-slot="{ errors, values, setFieldValue }"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Info banner -->
            <div 
              v-if="route.query.userId && selectedUser" 
              class="sm:col-span-2 bg-merchant-primary/10 border border-merchant-primary/20 rounded-lg p-3"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-merchant-primary"></i>
                <div class="flex-1">
                  <p class="text-sm font-medium text-merchant-primary">
                    Membuat merchant untuk: {{ selectedUser.name }}
                  </p>
                  <p class="text-xs text-gray-600">
                    {{ selectedUser.email }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Field component -->
            <Field name="user_id" v-slot="{ field, meta }">
              <input type="hidden" v-bind="field" :value="selectedUserId" />
            </Field>

            <!-- Pilih User dropdown -->
            <div class="sm:col-span-2">
              <label class="block text-sm font-bold mb-2 text-black">
                Pilih User <span class="text-red-500">*</span>
              </label>
              <div class="relative" ref="userDropdownRef">
                <button
                  type="button"
                  class="block w-full py-2.5 pl-4 pr-10 text-sm border text-left rounded-xl bg-white text-black focus:ring-2 focus:outline-none transition-all"
                  :class="
                    !selectedUserId || errors.user_id
                      ? 'border-danger-foreground focus:ring-danger-foreground'
                      : 'border-merchant-primary focus:ring-merchant-primary'
                  "
                  @click="userDropdownOpen = !userDropdownOpen"
                  style="min-height:44px"
                >
                  <span v-if="selectedUser" class="truncate">
                    {{ selectedUser.name }} ({{ selectedUser.email }})
                  </span>
                  <span v-else class="text-gray-400 text-left block w-full truncate">
                    Cari atau pilih user...
                  </span>
                  <i class="pi pi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                </button>
                <div
                  v-if="userDropdownOpen"
                  class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg"
                >
                  <div class="p-2 border-b border-gray-100">
                    <input
                      ref="userSearchInputRef"
                      v-model="userSearch"
                      type="text"
                      class="w-full px-2 py-2 border border-merchant-primary rounded-lg text-sm focus:ring-2 focus:ring-merchant-primary focus:outline-none"
                      placeholder="Cari nama/email user..."
                    />
                  </div>
                  <div class="max-h-64 overflow-y-auto">
                    <div
                      v-if="usersLoading"
                      class="flex items-center justify-center py-4 text-gray-500"
                    >
                      <i class="pi pi-spin pi-spinner mr-2"></i> Memuat...
                    </div>
                    <template v-else>
                      <div
                        v-for="u in users"
                        :key="u.id"
                        @click="
                          selectedUserId = u.id;
                          setFieldValue('user_id', u.id);
                          userDropdownOpen = false;
                        "
                        class="px-4 py-2 cursor-pointer hover:bg-merchant-primary/10 text-sm"
                        :class="{ 'bg-merchant-primary/5': selectedUserId === u.id }"
                      >
                        <span class="font-medium">{{ u.name }}</span>
                        <span class="text-xs text-gray-500 ml-2">({{ u.email }})</span>
                      </div>
                      <div v-if="users.length === 0" class="px-4 py-2 text-gray-400 text-sm">
                        Tidak ditemukan user
                      </div>
                    </template>
                  </div>
                </div>
              </div>
              <!-- Only show error if user_id field is touched and invalid -->
              <div v-if="errors.user_id && !selectedUserId" class="text-xs text-danger-foreground mt-1">
                {{ errors.user_id }}
              </div>
            </div>

            <!-- Nama Usaha -->
            <TextField
              variant="merchant"
              name="name"
              label="Nama Usaha"
              placeholder="Masukkan nama usaha"
              class="sm:col-span-2"
              required
            />

            <!-- Phone Number -->
            <TextField
              variant="merchant"
              name="phone"
              label="Nomor Telepon"
              placeholder="Contoh: 081234567890"
              class="sm:col-span-2"
              required
            />

            <!-- Jenis Usaha (dari API /segmentations) -->
            <SelectField
              variant="merchant"
              name="segmentation_id"
              label="Jenis Usaha"
              placeholder="Pilih Jenis Usaha"
              v-model="segmentationId"
              :loading="segmentationsLoading"
              :disabled="segmentationsLoading"
              :options="segmentations.map((s) => ({ value: s.id, label: s.name }))"
              class="sm:col-span-2"
              required
            />

            <!-- Wilayah (nested di address.*) -->
            <SelectField
              variant="merchant"
              name="address.province_id"
              label="Provinsi"
              placeholder="Pilih Provinsi"
              v-model="provinceId"
              :loading="provincesLoading"
              :options="provinces.map((p) => ({ value: p.id, label: p.name }))"
              required
            />

            <SelectField
              variant="merchant"
              name="address.city_id"
              label="Kabupaten/Kota"
              placeholder="Pilih Kabupaten/Kota"
              v-model="cityId"
              :loading="citiesLoading"
              :disabled="!provinceId"
              :options="cities.map((r) => ({ value: r.id, label: r.name }))"
              required
            />

            <SelectField
              variant="merchant"
              name="address.district_id"
              label="Kecamatan"
              placeholder="Pilih Kecamatan"
              v-model="districtId"
              :loading="districtsLoading"
              :disabled="!cityId"
              :options="districts.map((d) => ({ value: d.id, label: d.name }))"
              required
            />

            <SelectField
              variant="merchant"
              name="address.village_id"
              label="Desa"
              placeholder="Pilih Desa"
              v-model="villageId"
              :loading="villagesLoading"
              :disabled="!districtId"
              :options="villages.map((v) => ({ value: v.id, label: v.name }))"
              required
            />

            <!-- Pemetaan Lokasi -->
            <div class="sm:col-span-2">
              <label class="block text-sm font-bold mb-2 text-black">
                Pemetaan Lokasi <span class="text-red-500">*</span>
              </label>
              <MapPicker
                variant="merchant"
                v-model:lat="latitude"
                v-model:lng="longitude"
                :zoom="15"
              />

              <!-- Bind map coords into vee-validate values (required by schema) -->
              <Field
                name="address.latitude"
                :modelValue="latitude"
                v-slot="{ field }"
              >
                <input type="hidden" v-bind="field" :value="latitude ?? ''" />
              </Field>
              <Field
                name="address.longitude"
                :modelValue="longitude"
                v-slot="{ field }"
              >
                <input type="hidden" v-bind="field" :value="longitude ?? ''" />
              </Field>

              <ErrorMessage
                name="address.latitude"
                class="mt-1 text-xs text-danger-foreground"
              />
              <ErrorMessage
                name="address.longitude"
                class="text-xs text-danger-foreground"
              />
            </div>

            <!-- Koordinat -->
            <TextField
              variant="merchant"
              name="address.latitude"
              label="Latitude"
              v-model="latitude"
              :readonly="true"
              placeholder="-6.200000"
              required
            />
            <TextField
              variant="merchant"
              name="address.longitude"
              label="Longitude"
              v-model="longitude"
              :readonly="true"
              placeholder="106.816666"
              required
            />

            <!-- Detail alamat (optional) -->
            <TextField
              variant="merchant"
              name="address.detail"
              label="Alamat Lengkap (Opsional)"
              placeholder="Nama jalan, RT/RW, patokan, dsb"
              class="sm:col-span-2"
            />

            <!-- ✅ IMPROVED: Better error summary display -->
            <div v-if="Object.keys(errors).length > 0 && !selectedUserId" class="sm:col-span-2">
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-start gap-2">
                  <i class="pi pi-exclamation-circle text-red-600 mt-0.5"></i>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-red-800 mb-1">
                      Harap lengkapi field yang wajib diisi:
                    </p>
                    <ul class="text-xs text-red-700 space-y-1 list-disc list-inside">
                      <li v-for="(error, field) in errors" :key="field">
                        {{ error }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Error -->
            <ErrorAlert :message="errorMessage" class="sm:col-span-2" />

            <!-- ✅ IMPROVED: Submit button -->
            <div class="sm:col-span-2">
              <AppButton
                variant="merchant"
                type="submit"
                :loading="isLoading"
                :disabled="isLoading"
                size="md"
                block
                class="mb-2"
              >
                <template v-if="isLoading">
                  <i class="pi pi-spin pi-spinner mr-2"></i>
                  Mendaftarkan UMKM...
                </template>
                <template v-else>
                  <i class="pi pi-check mr-2"></i>
                  Daftarkan UMKM
                </template>
              </AppButton>
              
              <!-- ✅ ADD: Helper text -->
              <p class="text-xs text-center text-gray-500 mt-2">
                <span class="text-red-500">*</span> Field wajib diisi
              </p>
            </div>
          </div>
        </Form>

        <!-- Debug Info -->
        <div
          v-if="isDev"
          class="mt-6 p-4 bg-gray-50 rounded-xl text-xs border border-gray-200"
        >
          <p class="font-semibold mb-2 text-gray-700">Debug Info:</p>
          <p class="text-gray-600"><strong>API URL:</strong> {{ apiUrl }}</p>
          <p class="text-gray-600"><strong>Selected User ID:</strong> {{ selectedUserId }}</p>
          <p class="text-gray-600"><strong>Form user_id value:</strong> {{ formRef?.values?.user_id }}</p>
          <p class="text-gray-600"><strong>Latitude:</strong> {{ latitude }}</p>
          <p class="text-gray-600"><strong>Longitude:</strong> {{ longitude }}</p>
          <p class="text-gray-600"><strong>Route Query:</strong> {{ JSON.stringify(route.query) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

