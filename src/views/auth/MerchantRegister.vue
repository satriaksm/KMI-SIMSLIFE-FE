<template>
  <div
    class="relative flex flex-col items-center justify-start min-h-[calc(100vh-64px)] sm:min-h-screen sm:bg-gray-50 bg-white sm:justify-center sm:p-8"
  >
    <div class="absolute top-0 left-0 w-full h-[50vh] bg-primary sm:hidden"></div>
    <div
      class="relative z-10 flex flex-col justify-end w-full px-4 py-2 pt-8 sm:hidden shrink-0 sm:px-0 sm:pt-0"
    >
      <h2
        class="inline mb-2 text-2xl font-bold text-center text-white sm:hidden sm:text-3xl sm:text-left"
      >
        Daftarkan UMKM
      </h2>
      <p
        class="sm:hidden inline text-[12px] sm:text-sm text-center sm:text-left mb-6 text-white"
      >
        Isi data diri dan informasi UMKM-mu untuk memulai perjalananmu bersama
        kami
      </p>
    </div>
    <div
      class="relative z-10 flex flex-col justify-start w-full p-8 bg-white shadow-none grow sm:flex-0 sm:p-12 sm:max-w-2xl lg:max-w-6xl xl:max-w-7xl sm:rounded-4xl rounded-t-4xl sm:shadow-lg"
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
            <i class="pi pi-shop"></i>
          </span>
          <h2
            class="hidden text-2xl font-bold text-center text-black sm:inline sm:text-xl sm:text-left"
          >
            Daftarkan UMKM
          </h2>
        </div>

        <p
          class="hidden mb-6 text-xs text-center text-gray-600 sm:inline sm:text-sm sm:text-left"
        >
          Isi data diri dan informasi UMKM-mu untuk memulai perjalananmu bersama
          kami
        </p>

        <Form @submit="handleRegister" :validation-schema="schema">
          <div class="grid grid-cols-1 gap-x-6 lg:grid-cols-2 lg:gap-x-12">
            
            <!-- LEFT COLUMN: Basic Info, & Alamat Dropdowns -->
            <div class="space-y-4">
              <!-- Basic Info -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <!-- Nama Usaha -->
                <TextField
                  name="name"
                  label="Nama Usaha"
                  placeholder="Masukkan nama usaha"
                  autocomplete="organization"
                  required
                />

                <!-- Phone Number -->
                <TextField
                  name="phone"
                  label="Nomor Telepon"
                  placeholder="Contoh: 081234567890"
                  autocomplete="tel"
                  required
                />

                <!-- Jenis Usaha (dari API /segmentations) -->
                <SelectField
                  name="segmentation_id"
                  label="Jenis Usaha"
                  placeholder="Pilih Jenis Usaha"
                  v-model="segmentationId"
                  :loading="segmentationsLoading"
                  :disabled="segmentationsLoading"
                  :options="
                    segmentations.map((s) => ({ value: s.id, label: s.name }))
                  "
                  required
                />

                <TextField
                  name="NPWP"
                  label="NPWP (Opsional)"
                  placeholder="Contoh: 12.345.678.9-012.345"
                />
              </div>

            

              <!-- Alamat Dropdowns -->
              <div class="pt-2">
                <p
                  class="text-xs font-semibold tracking-wide text-gray-500 uppercase"
                >
                  Alamat Usaha
                </p>
              </div>
              
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  name="address.province_id"
                  label="Provinsi"
                  placeholder="Pilih Provinsi"
                  v-model="provinceId"
                  :loading="provincesLoading"
                  :options="provinces.map((p) => ({ value: p.id, label: p.name }))"
                  required
                />

                <SelectField
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
                  name="address.village_id"
                  label="Desa"
                  placeholder="Pilih Desa"
                  v-model="villageId"
                  :loading="villagesLoading"
                  :disabled="!districtId"
                  :options="villages.map((v) => ({ value: v.id, label: v.name }))"
                  required
                />
              </div>
            </div>

            <!-- RIGHT COLUMN: Map & Detail Alamat -->
            <div class="space-y-4 mb-12 sm:mb-0">

              <!-- Pemetaan Lokasi -->
              <div class="flex flex-col gap-4 pt-6 sm:pt-0">
                <div class="flex items-center justify-between mb-0">
                  <span v-if="isSyncing" class="text-xs text-gray-500 animate-pulse">Menyesuaikan...</span>
                  <span v-else class="text-xs text-gray-500 font-semibold tracking-wide uppercase">Lokasi Peta</span>
                </div>
                
                <div>
                  <MapPicker
                    ref="mapRef"
                    v-model:lat="latitude"
                    v-model:lng="longitude"
                    @manual-change="handleManualLocationChange"
                    :zoom="15"
                    height="350px"
                  />
                </div>

                <!-- Bind map coords into vee-validate values -->
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

                <!-- Detail alamat (nested di address.detail) -->
                <TextField
                  name="address.detail"
                  label="Alamat Lengkap"
                  placeholder="Nama jalan, RT/RW, patokan, dsb (opsional)"
                  autocomplete="address-line1"
                  :textarea="true"
                  :rows="4"
                  
                />
              </div>
            </div>

            <!-- Error and Submit (Full Width) -->
            <div class="lg:col-span-2">
              <ErrorAlert :message="errorMessage" />
              <!-- Desktop Submit Button -->
              <div class="hidden sm:block">
                <AppButton
                  type="submit"
                  :loading="isLoading"
                  variant="primary"
                  size="md"
                  block
                  class="mb-2 mt-4 w-full"
                >
                  Daftarkan UMKM
                </AppButton>
              </div>

              <!-- Mobile Sticky Button -->
              <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 sm:hidden pb-safe">
                <AppButton
                  type="submit"
                  :loading="isLoading"
                  variant="primary"
                  size="md"
                  block
                  class="w-full"
                >
                  Daftarkan UMKM
                </AppButton>
              </div>
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
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { Form, Field, ErrorMessage } from "vee-validate";
import * as yup from "yup";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
} from "@/services/api/location";
import { getSegmentations } from "@/services/api/segmentation";
import { registerMerchant } from "@/services/api/merchant";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import ErrorAlert from "@/components/forms/ErrorAlert.vue";
import MapPicker from "@/components/forms/MapPicker.vue";
import { useToast } from "vue-toastification";
import AppButton from "@/components/common/Button.vue";
import { useAddressMapSync } from "@/composables/useAddressMapSync";

const router = useRouter();
const toast = useToast(); // NEW

const isLoading = ref(false);
const errorMessage = ref("");
const apiUrl = import.meta.env.VITE_API_BASE_URL || "Not set";
const isDev = import.meta.env.DEV;

const latitude = ref(null);
const longitude = ref(null);

const { isSyncing, syncMapToAddress, syncAddressToMap } = useAddressMapSync();
const mapRef = ref(null);
const isPrefilling = ref(false);

const handleManualLocationChange = async ({ lat, lng }) => {
  isPrefilling.value = true;
  try {
    await syncMapToAddress(lat, lng, {
      provinces: provinces.value,
      setProvince: (id) => { provinceId.value = id; },
      loadCities: async (id) => { await loadCities(id); return cities.value; },
      setCity: (id) => { cityId.value = id; },
      loadDistricts: async (id) => { await loadDistricts(id); return districts.value; },
      setDistrict: (id) => { districtId.value = id; },
      loadVillages: async (id) => { await loadVillages(id); return villages.value; },
      setVillage: (id) => { villageId.value = id; },
    });
  } finally {
    isPrefilling.value = false;
  }
};

// Segmentation (Select dari API)
const segmentations = ref([]);
const segmentationId = ref("");

// Validation Schema (pakai objek address)
const schema = yup.object({
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
  NPWP: yup.string().nullable(),
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
      .typeError("Tentukan lokasi UMKM Anda di peta terlebih dahulu.")
      .min(-90)
      .max(90)
      .required("Tentukan lokasi UMKM Anda di peta terlebih dahulu."),
    longitude: yup.number().min(-180).max(180).required(""),
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

// Loading flags untuk setiap dropdown
const segmentationsLoading = ref(false);
const provincesLoading = ref(false);
const citiesLoading = ref(false);
const districtsLoading = ref(false);
const villagesLoading = ref(false);

// Ambil data wilayah dari service
async function loadProvinces() {
  provincesLoading.value = true;
  try {
    provinces.value = await getProvinces();
  } catch (e) {
    console.error("Gagal memuat provinsi:", e);
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
    console.error("Gagal memuat kota/kabupaten:", e);
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
    console.error("Gagal memuat kecamatan:", e);
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
    console.error("Gagal memuat kelurahan/desa:", e);
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
    console.error("Gagal memuat segmentations:", e);
    segmentations.value = [];
  } finally {
    segmentationsLoading.value = false;
  }
}


watch(provinceId, async (val) => {
  if (isPrefilling.value) return;
  cityId.value = "";
  districtId.value = "";
  villageId.value = "";
  cities.value = [];
  districts.value = [];
  villages.value = [];
  await loadCities(val);
});
watch(cityId, async (val) => {
  if (isPrefilling.value) return;
  districtId.value = "";
  villageId.value = "";
  districts.value = [];
  villages.value = [];
  await loadDistricts(val);
});
watch(districtId, async (val) => {
  if (isPrefilling.value) return;
  villageId.value = "";
  villages.value = [];
  await loadVillages(val);
});
watch(villageId, (val) => {
  if (isPrefilling.value) return;
  if (val) {
    const provName = provinces.value.find((p) => p.id == provinceId.value)?.name;
    const cityName = cities.value.find((c) => c.id == cityId.value)?.name;
    const distName = districts.value.find((d) => d.id == districtId.value)?.name;
    const villName = villages.value.find((v) => v.id == val)?.name;

    syncAddressToMap([villName, distName, cityName, provName], mapRef);
  }
});

onMounted(() => {
  loadProvinces();
  loadSegmentations();
});

// Submit pakai service
const handleRegister = async (values) => {
  console.log("Submitting merchant registration with values:", values);
  isLoading.value = true;
  errorMessage.value = "";

  // Validate coordinates from MapPicker
  if (latitude.value === null || longitude.value === null) {
    errorMessage.value =
      "Lokasi wajib dipilih. Gunakan peta untuk menentukan titik lokasi UMKM.";
    isLoading.value = false;
    return;
  }

  const lat = Number(latitude.value);
  const lng = Number(longitude.value);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errorMessage.value =
      "Latitude tidak valid. Gunakan peta untuk memilih lokasi.";
    isLoading.value = false;
    return;
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errorMessage.value =
      "Longitude tidak valid. Gunakan peta untuk memilih lokasi.";
    isLoading.value = false;
    return;
  }

  try {
    const payload = {
      name: values.name,
      phone: values.phone,
      description: values.description,
      NPWP: values.NPWP && values.NPWP.trim() !== "" ? values.NPWP.trim() : null,
      segmentation_id: Number(values.segmentation_id),
      address: {
        province_id: Number(values.address.province_id),
        city_id: Number(values.address.city_id),
        district_id: Number(values.address.district_id),
        village_id: Number(values.address.village_id),
        detail: values.address.detail || null,
        latitude: lat,
        longitude: lng,
      },
    };

    console.log("Submitting merchant registration:", payload);
    await registerMerchant(payload);

    toast.success("Pendaftaran UMKM dikirim. Menunggu persetujuan admin.", {
      timeout: 3000,
    });
    router.push("/");
  } catch (error) {
    console.error("Register merchant error:", error);
    if (error.response?.data?.errors) {
      errorMessage.value = Object.values(error.response.data.errors)
        .flat()
        .join(", ");
    } else {
      errorMessage.value =
        error.response?.data?.message ||
        "Registrasi merchant gagal. Silakan coba lagi.";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>