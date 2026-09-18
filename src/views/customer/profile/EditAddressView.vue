<script setup>
// =========================
// IMPORTS
// =========================
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useUserStore } from "@/stores/user";
import { Form, useForm } from "vee-validate";
import * as yup from "yup";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import AppButton from "@/components/common/Button.vue";
import MapPicker from "@/components/forms/MapPicker.vue";
import SelectField from "@/components/forms/SelectField.vue";
import TextField from "@/components/forms/TextField.vue";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
} from "@/services/api/location";
import { getMyAddress, upsertMyAddress } from "@/services/api/address";
import { useAddressMapSync } from "@/composables/useAddressMapSync";

// =========================
// STATE
// =========================
const isDev = import.meta.env.DEV; // ✅ ADD: Development mode check
const router = useRouter();
const toast = useToast();
const userStore = useUserStore();

const loading = ref(true);
const saving = ref(false);
const prefilling = ref(false);

const { syncMapToAddress, syncAddressToMap, isSyncing } = useAddressMapSync();
const mapRef = ref(null);

const loadingProvinces = ref(false);
const loadingCities = ref(false);
const loadingDistricts = ref(false);
const loadingVillages = ref(false);

const provinces = ref([]);
const cities = ref([]);
const districts = ref([]);
const villages = ref([]);

const schema = yup.object({
  province_id: yup.string().required("Pilih provinsi."),
  city_id: yup.string().required("Pilih kota/kabupaten."),
  district_id: yup.string().required("Pilih kecamatan."),
  village_id: yup.string().required("Pilih desa/kelurahan."),
  detail: yup.string().nullable(),
  latitude: yup
    .number()
    .typeError("Tentukan lokasi Anda di peta.")
    .required("Tentukan lokasi Anda di peta."),
  longitude: yup
    .number()
    .typeError("Tentukan lokasi Anda di peta.")
    .required("Tentukan lokasi Anda di peta."),
});

const { values, setFieldValue, setFieldError, errors } = useForm({
  validationSchema: schema,
  initialValues: {
    province_id: "",
    city_id: "",
    district_id: "",
    village_id: "",
    detail: "",
    latitude: null,
    longitude: null,
  },
});

const lat = ref(null);
const lng = ref(null);

// Sync lat/lng ref → vee-validate field
watch(lat, (val) => {
  setFieldValue("latitude", val ?? null);
  if (val !== null) setFieldError("latitude", undefined);
});
watch(lng, (val) => {
  setFieldValue("longitude", val ?? null);
  if (val !== null) setFieldError("longitude", undefined);
});

// =========================
// COMPUTED
// =========================
const provinceOptions = computed(() =>
  (provinces.value ?? []).map((p) => ({ value: String(p.id), label: p.name })),
);
const cityOptions = computed(() =>
  (cities.value ?? []).map((c) => ({ value: String(c.id), label: c.name })),
);
const districtOptions = computed(() =>
  (districts.value ?? []).map((d) => ({ value: String(d.id), label: d.name })),
);
const villageOptions = computed(() =>
  (villages.value ?? []).map((v) => ({ value: String(v.id), label: v.name })),
);

// =========================
// METHODS
// =========================
const goBack = () => {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.push({ name: "Beranda" });
  }
};

async function loadProvinces() {
  loadingProvinces.value = true;
  try {
    const data = await getProvinces();
    provinces.value = Array.isArray(data) ? data : (data?.data ?? []);
  } finally {
    loadingProvinces.value = false;
  }
}

async function loadCities(provinceId) {
  if (!provinceId) {
    cities.value = [];
    return;
  }
  loadingCities.value = true;
  try {
    const data = await getCities(provinceId);
    cities.value = Array.isArray(data) ? data : (data?.data ?? []);
  } finally {
    loadingCities.value = false;
  }
}

async function loadDistricts(cityId) {
  if (!cityId) {
    districts.value = [];
    return;
  }
  loadingDistricts.value = true;
  try {
    const data = await getDistricts(cityId);
    districts.value = Array.isArray(data) ? data : (data?.data ?? []);
  } finally {
    loadingDistricts.value = false;
  }
}

async function loadVillages(districtId) {
  if (!districtId) {
    villages.value = [];
    return;
  }
  loadingVillages.value = true;
  try {
    const data = await getVillages(districtId);
    villages.value = Array.isArray(data) ? data : (data?.data ?? []);
  } finally {
    loadingVillages.value = false;
  }
}

const handleManualLocationChange = async ({ lat, lng }) => {
  prefilling.value = true;
  try {
    await syncMapToAddress(lat, lng, {
      provinces: provinces.value,
      setProvince: (id) => setFieldValue("province_id", id),
      loadCities: async (id) => { await loadCities(id); return cities.value; },
      setCity: (id) => setFieldValue("city_id", id),
      loadDistricts: async (id) => { await loadDistricts(id); return districts.value; },
      setDistrict: (id) => setFieldValue("district_id", id),
      loadVillages: async (id) => { await loadVillages(id); return villages.value; },
      setVillage: (id) => setFieldValue("village_id", id)
    });
  } finally {
    prefilling.value = false;
  }
};

async function prefillFromApi() {
  const res = await getMyAddress();
  const address = res?.data ?? null;
  if (!address) return;

  prefilling.value = true;
  try {
    const provinceId = address.province_id;
    setFieldValue("province_id", provinceId);
    await loadCities(provinceId);

    const cityId = address.city_id;
    setFieldValue("city_id", cityId);
    await loadDistricts(cityId);

    const districtId = address.district_id;
    setFieldValue("district_id", districtId);
    await loadVillages(districtId);

    setFieldValue("village_id", address.village_id);
    setFieldValue("detail", address.detail ?? "");

    lat.value = address.latitude ?? null;
    lng.value = address.longitude ?? null;
    setFieldValue("latitude", lat.value);
    setFieldValue("longitude", lng.value);
  } finally {
    prefilling.value = false;
  }
}

async function handleSave(formValues) {
  if (lat.value === null || lng.value === null) {
    toast.error("Tentukan lokasi Anda di peta terlebih dahulu.");
    return;
  }
  saving.value = true;
  try {
    await upsertMyAddress({
      province_id: Number(formValues.province_id),
      city_id: Number(formValues.city_id),
      district_id: Number(formValues.district_id),
      village_id: Number(formValues.village_id),
      detail: formValues.detail || null,
      latitude: lat.value === "" ? null : lat.value,
      longitude: lng.value === "" ? null : lng.value,
    });
    await userStore.fetchProfile();
    toast.success("Alamat berhasil disimpan");
    router.push("/profile");
  } catch (error) {
    if (isDev) {
      console.error("Error saving address:", error);
    }
    const message =
      error?.response?.data?.message ||
      "Gagal menyimpan alamat. Silakan coba lagi.";
    toast.error(message);
  } finally {
    saving.value = false;
  }
}

// =========================
// WATCHERS
// =========================
watch(
  () => values.province_id,
  async (provinceId, prev) => {
    if (prefilling.value) return;
    if (provinceId === prev) return;
    setFieldValue("city_id", "");
    setFieldValue("district_id", "");
    setFieldValue("village_id", "");
    districts.value = [];
    villages.value = [];
    await loadCities(provinceId);
  },
);

watch(
  () => values.city_id,
  async (cityId, prev) => {
    if (prefilling.value) return;
    if (cityId === prev) return;
    setFieldValue("district_id", "");
    setFieldValue("village_id", "");
    villages.value = [];
    await loadDistricts(cityId);
  },
);

watch(
  () => values.district_id,
  async (districtId, prev) => {
    if (prefilling.value) return;
    if (districtId === prev) return;
    setFieldValue("village_id", "");
    await loadVillages(districtId);
  },
);

watch(
  () => values.village_id,
  (val) => {
    if (prefilling.value) return;
    if (val) {
      const provName = provinceOptions.value.find((p) => p.value == values.province_id)?.label;
      const cityName = cityOptions.value.find((c) => c.value == values.city_id)?.label;
      const distName = districtOptions.value.find((d) => d.value == values.district_id)?.label;
      const villName = villageOptions.value.find((v) => v.value == val)?.label;
      
      syncAddressToMap([villName, distName, cityName, provName], mapRef);
    }
  }
);

// =========================
// LIFECYCLE
// =========================
onMounted(async () => {
  loading.value = true;
  try {
    await loadProvinces();
    await prefillFromApi();
  } catch (error) {
    if (isDev) {
      console.error("Error loading address page:", error);
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="">
    <MobileHeader title="Alamat Utama" @back="goBack" variant="primary"/>

    <div class="px-0 py-0 mx-auto max-w-7xl sm:px-4 sm:py-4">
      <div class="p-4 sm:bg-white sm:p-6 sm:border sm:border-gray-100 sm:shadow-sm sm:rounded-2xl">
        <div v-if="loading" class="space-y-6 animate-pulse">
          <!-- Select Fields Skeleton -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <div class="w-24 h-4 bg-gray-200 rounded" />
              <div class="w-full bg-gray-200 h-11 rounded-xl" />
            </div>
            <div class="space-y-2">
              <div class="w-32 h-4 bg-gray-200 rounded" />
              <div class="w-full bg-gray-200 h-11 rounded-xl" />
            </div>
            <div class="space-y-2">
              <div class="h-4 bg-gray-200 rounded w-28" />
              <div class="w-full bg-gray-200 h-11 rounded-xl" />
            </div>
            <div class="space-y-2">
              <div class="w-32 h-4 bg-gray-200 rounded" />
              <div class="w-full bg-gray-200 h-11 rounded-xl" />
            </div>
          </div>

          <!-- Detail Address Skeleton -->
          <div class="space-y-2">
            <div class="h-4 bg-gray-200 rounded w-28" />
            <div class="w-full bg-gray-200 rounded-xl h-[92px]" />
          </div>

          <!-- Map Skeleton -->
          <div class="space-y-2">
            <div class="h-4 bg-gray-200 rounded w-28" />
            <div class="w-full bg-gray-200 rounded-xl h-80" />
          </div>

          <!-- Buttons Skeleton -->
          <div class="flex gap-4">
            <div class="flex-1 hidden h-12 bg-gray-200 sm:block rounded-xl" />
            <div class="flex-1 h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>

        <Form v-else @submit="handleSave" class="space-y-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              name="province_id"
              label="Provinsi"
              :required="true"
              :options="provinceOptions"
              :loading="loadingProvinces"
              placeholder="Pilih provinsi"
              :modelValue="values.province_id"
              @update:modelValue="(v) => setFieldValue('province_id', v)"
            />

            <SelectField
              name="city_id"
              label="Kota/Kabupaten"
              :required="true"
              :options="cityOptions"
              :loading="loadingCities"
              :disabled="!values.province_id"
              placeholder="Pilih kota/kabupaten"
              :modelValue="values.city_id"
              @update:modelValue="(v) => setFieldValue('city_id', v)"
            />

            <SelectField
              name="district_id"
              label="Kecamatan"
              :required="true"
              :options="districtOptions"
              :loading="loadingDistricts"
              :disabled="!values.city_id"
              placeholder="Pilih kecamatan"
              :modelValue="values.district_id"
              @update:modelValue="(v) => setFieldValue('district_id', v)"
            />

            <SelectField
              name="village_id"
              label="Desa/Kelurahan"
              :required="true"
              :options="villageOptions"
              :loading="loadingVillages"
              :disabled="!values.district_id"
              placeholder="Pilih desa/kelurahan"
              :modelValue="values.village_id"
              @update:modelValue="(v) => setFieldValue('village_id', v)"
            />
          </div>


          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-gray-700">
                Lokasi di Peta
                <span class="text-red-500">*</span>
              </label>
              <span v-if="isSyncing" class="text-xs text-gray-500 animate-pulse">Menyesuaikan...</span>
            </div>
            <MapPicker
              ref="mapRef"
              v-model:lat="lat"
              v-model:lng="lng"
              @manual-change="handleManualLocationChange"
              height="320px"
              variant="user"
            />
            <p
              v-if="errors.latitude || errors.longitude"
              class="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500"
            >
              <i class="pi pi-exclamation-circle"></i>
              Tentukan lokasi Anda di peta.
            </p>
          </div>


          <TextField
            name="detail"
            label="Detail Alamat"
            textarea
            :rows="3"
            placeholder="Contoh: Jl. Mawar No. 12, RT 01/RW 02"
            :modelValue="values.detail"
            @update:modelValue="(v) => setFieldValue('detail', v)"
          />

          <div class="flex gap-4">
            <!-- Desktop Buttons -->
            <div class="hidden sm:flex w-full gap-4">
              <AppButton
                type="button"
                variant="muted-outline"
                class="w-full"
                @click="goBack"
              >
                Batal
              </AppButton>
              <AppButton
                type="submit"
                variant="primary"
                class="w-full"
                :loading="saving"
                :disabled="saving"
              >
                {{ saving ? "Menyimpan..." : "Simpan" }}
              </AppButton>
            </div>

            <!-- Mobile Sticky Button -->
            <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 sm:hidden pb-safe">
              <AppButton
                type="submit"
                variant="primary"
                class="w-full"
                :loading="saving"
                :disabled="saving"
              >
                {{ saving ? "Menyimpan..." : "Simpan" }}
              </AppButton>
            </div>
          </div>
        </Form>
      </div>
    </div>
  </div>
</template>