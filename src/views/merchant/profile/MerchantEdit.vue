<template>
  <div class="min-h-screen pb-20 bg-gray-50 sm:pb-0">
    <!-- Mobile Header -->
    <MerchantMobileHeader
      title="Edit Informasi Toko"
      :backRoute="
        merchantSlug
          ? `/merchant-center/${merchantSlug}/profile`
          : '/merchant-profile'
      "
    />

    <!-- Desktop Header with Breadcrumb -->
    <div class="hidden py-6 sm:block bg-gray-50">
      <div class="px-4 mx-auto sm:px-6 lg:px-8">
        <div
          class="flex flex-wrap items-center justify-between gap-y-2 gap-x-4"
        >
          <div>
            <!-- Breadcrumb Component -->
            <Breadcrumb :items="breadcrumbItems" :merchantId="merchantSlug" />
            <p class="mt-1 text-xs text-muted-foreground lg:text-sm">
              Perbarui informasi UMKM Anda.
            </p>
          </div>

          <!-- Desktop Save Button -->
          <div v-if="!isLoading" class="flex items-center gap-3">
            <AppButton
              @click="handleSave"
              :loading="isSaving"
              variant="merchant"
            >
              Simpan
            </AppButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Spacer for Mobile Only -->
    <div class="h-[88px] sm:h-0"></div>

    <div
      v-if="isLoading"
      class="flex justify-center items-center min-h-[80dvh] w-full rounded-lg mx-0"
    >
      <div
        class="w-10 h-10 border-4 rounded-full border-muted-foreground border-t-merchant-primary animate-spin"
      ></div>
    </div>
    <!-- Container Responsive -->
    <div v-else class="mx-auto sm:px-4 lg:px-6 sm:py-6 sm:pt-0">
      <div
        class="p-4 mx-4 mb-2 border border-blue-200 sm:mx-0 sm:mb-4 bg-blue-50 rounded-xl"
      >
        <div class="flex gap-3">
          <i
            class="pi pi-info-circle text-merchant-primary text-lg shrink-0 mt-0.5"
          ></i>
          <div class="flex-1">
            <h4 class="mb-1 text-sm font-semibold text-merchant-primary">
              Informasi Penting
            </h4>
            <ul class="pl-4 space-y-1 text-xs list-disc text-merchant-primary">
              <li>Kontak UMKM harus aktif dan dapat dihubungi.</li>
              <li>Lengkapi deskripsi untuk memperkenalkan UMKM Anda.</li>
              <li>Pastikan alamat dan lokasi UMKM sudah benar dan lengkap.</li>
              <li>
                Unggah logo dan cover dengan ukuran maksimal 5 MB (format
                JPG/PNG).
              </li>
              <li>Atur jam operasional sesuai waktu buka UMKM Anda.</li>
              <li>
                Data yang valid akan memudahkan pelanggan menemukan UMKM Anda.
              </li>
            </ul>
          </div>
        </div>
      </div>
      <!-- Mobile: Card with Cover & Logo -->
      <div
        class="mx-4 mb-4 overflow-hidden bg-white shadow-sm sm:hidden rounded-2xl"
      >
        <!-- Cover Image -->
        <div class="relative w-full overflow-hidden aspect-24/9 lg:aspect-4/1">
          <img
            v-if="hasFormCover"
            :src="form.coverImage"
            alt="Cover"
            class="absolute inset-0 object-cover w-full h-full"
            @error="onCoverImgError"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted-background to-muted-foreground"
            aria-hidden="true"
          >
            <svg
              class="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 19V5h14v14H5zm8-7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-6 7l3-4 2.5 3 3.5-5 4 6H7z"
              />
            </svg>
          </div>
          <button
            @click="handleUploadCover"
            class="absolute flex items-center justify-center w-10 h-10 text-white transition-opacity rounded-full shadow-lg top-3 right-3 bg-merchant-primary hover:opacity-90"
          >
            <i class="text-base pi pi-camera"></i>
          </button>
        </div>

        <!-- Logo - Overlapping -->
        <div class="relative px-4 pb-4 pt-14">
          <div class="absolute -top-12 left-4">
            <div class="relative">
              <img
                v-if="hasFormLogo"
                :src="form.logo"
                alt="Logo"
                class="object-cover w-24 h-24 border-4 border-white shadow-lg rounded-2xl"
                @error="onLogoImgError"
              />
              <span
                v-else
                class="flex items-center justify-center w-24 h-24 bg-gray-100 border-4 border-white shadow-lg rounded-2xl"
                aria-hidden="true"
              >
                <svg
                  class="w-10 h-10 text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z"
                  />
                </svg>
              </span>
              <button
                @click="handleUploadLogo"
                class="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 text-white transition-opacity rounded-full shadow-lg bg-merchant-primary hover:opacity-90"
              >
                <i class="text-xs pi pi-camera"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop: Cover & Logo -->
      <div
        class="relative hidden mb-4 overflow-visible bg-white shadow-sm sm:block rounded-xl"
      >
        <div class="overflow-hidden rounded-xl">
          <div
            class="relative w-full overflow-hidden aspect-24/9 lg:aspect-4/1"
          >
            <img
              v-if="hasFormCover"
              :src="form.coverImage"
              alt="Cover"
              class="absolute inset-0 object-cover w-full h-full"
              @error="onCoverImgError"
            />
            <div
              v-else
              class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted-background to-muted-foreground"
              aria-hidden="true"
            >
              <svg
                class="w-12 h-12 text-white lg:w-16 lg:h-16"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 19V5h14v14H5zm8-7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-6 7l3-4 2.5 3 3.5-5 4 6H7z"
                />
              </svg>
            </div>
          </div>
        </div>
        <button
          @click="handleUploadCover"
          class="absolute p-3 text-white transition-opacity rounded-full shadow-lg top-6 right-6 bg-merchant-primary hover:opacity-90"
        >
          <svg
            class="w-6 h-6"
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

        <div class="absolute -bottom-12 left-8">
          <div class="relative">
            <img
              v-if="hasFormLogo"
              :src="form.logo"
              alt="Logo"
              class="object-cover w-32 h-32 border-4 border-white shadow-lg rounded-2xl"
              @error="onLogoImgError"
            />
            <span
              v-else
              class="flex items-center justify-center w-32 h-32 bg-gray-100 border-4 border-white shadow-lg rounded-2xl"
              aria-hidden="true"
            >
              <svg
                class="w-12 h-12 text-gray-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z"
                />
              </svg>
            </span>
            <button
              @click="handleUploadLogo"
              class="absolute bottom-0 right-0 p-2 text-white transition-opacity rounded-full shadow-lg bg-merchant-primary hover:opacity-90"
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
        </div>
      </div>

      <!-- Form Content -->
      <Form :validation-schema="editProfileSchema" @submit="handleSave" class="sm:pt-16">
        <!-- Mobile: Single Card -->
        <div
          class="p-4 mx-4 mb-2 space-y-5 bg-white shadow-sm sm:hidden rounded-2xl"
        >
          <h2 class="text-lg font-bold text-merchant-primary">
            Informasi UMKM
          </h2>

          <!-- Nama UMKM -->
          <div>
            <TextField
              name="name"
              v-model="form.name"
              label="Nama UMKM"
              placeholder="Masukkan nama toko"
              variant="merchant"
                            required

            />
          </div>

          <!-- Kontak -->
          <div>
            <TextField
              name="contact"
              v-model="form.contact"
              type="tel"
              label="Kontak"
              placeholder="Masukkan nomor kontak"
              variant="merchant"
            />
          </div>

          <!-- Tentang -->
          <div>
            <TextField
              name="description"
              v-model="form.description"
              :textarea="true"
              :rows="4"
              label="Tentang"
              placeholder="Ceritakan tentang toko Anda..."
              variant="merchant"
            />
          </div>

          <!-- Informasi Pajak & Bank -->
          <div class="pt-2">
            <p
              class="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Informasi Pajak &amp; Bank
            </p>
            <div class="space-y-4">
              <div>
                <TextField
                  name="NPWP"
                  v-model="form.NPWP"
                  label="NPWP"
                  placeholder="Contoh: 12.345.678.9-012.345"
                  variant="merchant"
                                required

                />
              </div>
              <div>
                <SelectField
                  name="bank_code"
                  label="Nama Bank"
                  v-model="form.bank_code"
                  :loading="banksLoading"
                  :disabled="banksLoading"
                  :options="banks.map((bank) => ({ value: bank.code, label: bank.name }))"
                  emptyText="Data bank tidak tersedia"
                                required

                />
              </div>
              <div>
                <TextField
                  name="bank_account_number"
                  v-model="form.bank_account_number"
                  label="Nomor Rekening"
                  placeholder="Contoh: 1234567890"
                  variant="merchant"
                                required

                />
              </div>
              <div>
                <TextField
                  name="bank_account_name"
                  v-model="form.bank_account_name"
                  label="Nama Pemilik Rekening"
                  placeholder="Sesuai buku tabungan"
                  variant="merchant"
                                required

                />
              </div>
            </div>
          </div>

          <!-- Lokasi (Langsung di halaman, bukan modal) -->
          <div>
            <label
              class="block mb-2 text-sm font-semibold text-merchant-primary"
              >Lokasi</label
            >

            <!-- Map Picker -->
            <div class="mb-4">
              <MapPicker
                v-model:lat="latitude"
                v-model:lng="longitude"
                :zoom="15"
                height="192px"
                variant="merchant"
              />
            </div>
            <!-- Wilayah Selection -->
            <div class="pt-4 mb-4">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectField
                  name="province_id"
                  label="Provinsi"
                  v-model="form.province_id"
                  :loading="provincesLoading"
                  :options="
                    provinces.map((p) => ({ value: p.id, label: p.name }))
                  "
                  variant="merchant"
                />
                <SelectField
                  name="city_id"
                  label="Kabupaten/Kota"
                  v-model="form.city_id"
                  :loading="citiesLoading"
                  :disabled="!form.province_id"
                  :options="cities.map((c) => ({ value: c.id, label: c.name }))"
                  variant="merchant"
                />
                <SelectField
                  name="district_id"
                  label="Kecamatan"
                  v-model="form.district_id"
                  :loading="districtsLoading"
                  :disabled="!form.city_id"
                  :options="
                    districts.map((d) => ({ value: d.id, label: d.name }))
                  "
                  variant="merchant"
                />
                <SelectField
                  name="village_id"
                  label="Desa/Kelurahan"
                  v-model="form.village_id"
                  :loading="villagesLoading"
                  :disabled="!form.district_id"
                  :options="
                    villages.map((v) => ({ value: v.id, label: v.name }))
                  "
                  variant="merchant"
                />
              </div>
              <!-- Detail alamat -->
              <div class="mt-3">
                <TextField
                  name="address"
                  :textarea="true"
                  v-model="form.address"
                  label="Alamat Lengkap"
                  placeholder="Contoh: Jl. Sudirman No. 123, RT 02/RW 05"
                  variant="merchant"
                />
              </div>
            </div>
          </div>

          <!-- Jam Operasional -->
          <div class="pt-4">
            <h3 class="mb-4 text-xl font-bold text-merchant-primary">
              Jam Operasional
            </h3>
            <div class="space-y-3">
              <div
                v-for="(day, index) in form.operationalHours"
                :key="index"
                class="overflow-hidden transition-all bg-gray-50 rounded-xl"
              >
                <!-- Header row -->
                <div class="flex items-center justify-between p-4">
                  <div class="flex items-center gap-4">
                    <span
                      class="px-4 py-2 rounded-lg text-sm font-semibold min-w-[100px] text-center transition-colors"
                      :class="
                        day.isOpen
                          ? 'bg-merchant-primary text-white'
                          : 'bg-gray-200 text-gray-500'
                      "
                    >
                      {{ day.name }}
                    </span>
                    <div>
                      <span
                        v-if="day.isOpen"
                        class="text-base font-medium text-gray-700"
                      >
                        {{ day.open || "06:00" }} — {{ day.close || "18:00" }}
                      </span>
                      <span v-else class="text-base font-medium text-gray-400">
                        Tutup
                      </span>
                    </div>
                  </div>

                  <label
                    class="relative inline-flex items-center cursor-pointer shrink-0"
                  >
                    <input
                      type="checkbox"
                      v-model="day.isOpen"
                      class="sr-only peer"
                      @change="onDayToggle(index)"
                    />
                    <div
                      class="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-merchant-primary"
                    ></div>
                  </label>
                </div>

                <!-- Inline time inputs (shown when open) -->
                <div v-if="day.isOpen" class="px-4 pb-4">
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <label
                        class="block mb-1.5 text-xs font-medium text-gray-500"
                        >Jam Buka</label
                      >
                      <input
                        type="time"
                        :value="day.open || '06:00'"
                        @input="
                          day.open = $event.target.value;
                          updateDayHours(index);
                        "
                        class="w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                        :class="day.open && day.close && day.close <= day.open ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-merchant-primary'"
                      />
                    </div>
                    <span class="mt-6 text-sm text-gray-400">—</span>
                    <div class="flex-1">
                      <label
                        class="block mb-1.5 text-xs font-medium text-gray-500"
                        >Jam Tutup</label
                      >
                      <input
                        type="time"
                        :value="day.close || '18:00'"
                        @input="
                          day.close = $event.target.value;
                          updateDayHours(index);
                        "
                        class="w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                        :class="day.open && day.close && day.close <= day.open ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-merchant-primary'"
                      />
                    </div>
                  </div>
                  <p v-if="day.open && day.close && day.close <= day.open" class="mt-2 text-xs font-medium text-red-500">
                    Jam tutup harus setelah jam buka.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop: Original Layout -->
        <div
          class="hidden p-6 mb-4 space-y-8 bg-white shadow-sm sm:block rounded-xl"
        >
          <h2 class="text-2xl font-bold text-merchant-primary">
            Informasi UMKM
          </h2>

          <!-- Grid Layout for Desktop -->
          <div
            class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-8 md:gap-y-6"
          >
            <!-- Nama UMKM -->
            <div>
              <TextField
                name="name"
                v-model="form.name"
                label="Nama UMKM"
                placeholder="Masukkan nama UMKM"
                variant="merchant"
                              required

              />
            </div>

            <!-- Kontak -->
            <div>
              <TextField
                name="contact"
                v-model="form.contact"
                type="tel"
                label="Kontak"
                placeholder="Masukkan nomor kontak"
                variant="merchant"
                              required

              />
            </div>

            <!-- Tentang - Full Width -->
            <div class="md:col-span-2">
              <TextField
                name="description"
                v-model="form.description"
                :textarea="true"
                :rows="4"
                label="Tentang"
                placeholder="Ceritakan tentang UMKM Anda..."
                variant="merchant"
              />
            </div>

            <!-- Informasi Pajak & Bank - Full Width -->
            <div class="md:col-span-2">
              <p
                class="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                Informasi Pajak &amp; Bank
              </p>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <TextField
                    name="NPWP"
                    v-model="form.NPWP"
                    label="NPWP"
                    placeholder="Contoh: 12.345.678.9-012.345"
                    variant="merchant"
                                  required

                  />
                </div>
                <div>
                  <SelectField
                    name="bank_code"
                    label="Nama Bank"
                    v-model="form.bank_code"
                    :loading="banksLoading"
                    :disabled="banksLoading"
                    :options="banks.map((bank) => ({ value: bank.code, label: bank.name }))"
                    emptyText="Data bank tidak tersedia"
                                  required

                  />
                </div>
                <div>
                  <TextField
                    name="bank_account_number"
                    v-model="form.bank_account_number"
                    label="Nomor Rekening"
                    placeholder="Contoh: 1234567890"
                    variant="merchant"
                                  required

                  />
                </div>
                <div>
                  <TextField
                    name="bank_account_name"
                    v-model="form.bank_account_name"
                    label="Nama Pemilik Rekening"
                    placeholder="Sesuai buku tabungan"
                    variant="merchant"
                                  required

                  />
                </div>
              </div>
            </div>

            <!-- Lokasi - Full Width -->
            <div class="md:col-span-2">
              <label
                class="block mb-2 text-base font-medium text-merchant-primary"
              >
                Lokasi
              </label>

              <!-- Map Picker (Langsung di halaman, bukan modal) -->
              <div class="mb-4">
                <MapPicker
                  v-model:lat="latitude"
                  v-model:lng="longitude"
                  :zoom="15"
                  height="320px"
                  variant="merchant"
                />
              </div>

              <!-- Wilayah Selection -->
              <div class="pt-4 mb-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField
                    name="province_id"
                    label="Provinsi"
                    v-model="form.province_id"
                    :loading="provincesLoading"
                    :options="
                      provinces.map((p) => ({ value: p.id, label: p.name }))
                    "
                    variant="merchant"
                    required
                  />

                  <SelectField
                    name="city_id"
                    label="Kabupaten/Kota"
                    v-model="form.city_id"
                    :loading="citiesLoading"
                    :disabled="!form.province_id"
                    :options="
                      cities.map((c) => ({ value: c.id, label: c.name }))
                    "
                    variant="merchant"
                    required
                  />

                  <SelectField
                    name="district_id"
                    label="Kecamatan"
                    v-model="form.district_id"
                    :loading="districtsLoading"
                    :disabled="!form.city_id"
                    :options="
                      districts.map((d) => ({ value: d.id, label: d.name }))
                    "
                    variant="merchant"
                    required
                  />

                  <SelectField
                    name="village_id"
                    label="Desa/Kelurahan"
                    v-model="form.village_id"
                    :loading="villagesLoading"
                    :disabled="!form.district_id"
                    :options="
                      villages.map((v) => ({ value: v.id, label: v.name }))
                    "
                    variant="merchant"
                    required
                  />
                </div>

                <div class="mt-3">
                  <TextField
                    name="address"
                    :textarea="true"
                    v-model="form.address"
                    label="Alamat Lengkap (Opsional)"
                    placeholder="Contoh: Jl. Sudirman No. 123, RT 02/RW 05"
                    variant="merchant"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Jam Operasional -->
          <div class="pt-4">
            <h3 class="mb-4 text-xl font-bold text-merchant-primary">
              Jam Operasional
            </h3>
            <div class="space-y-3">
              <div
                v-for="(day, index) in form.operationalHours"
                :key="index"
                class="overflow-hidden transition-all bg-gray-50 rounded-xl"
              >
                <!-- Header row -->
                <div class="flex items-center justify-between p-4">
                  <div class="flex items-center gap-4">
                    <span
                      class="px-4 py-2 rounded-lg text-sm font-semibold min-w-[100px] text-center transition-colors"
                      :class="
                        day.isOpen
                          ? 'bg-merchant-primary text-white'
                          : 'bg-gray-200 text-gray-500'
                      "
                    >
                      {{ day.name }}
                    </span>
                    <div>
                      <span
                        v-if="day.isOpen"
                        class="text-base font-medium text-gray-700"
                      >
                        {{ day.open || "06:00" }} — {{ day.close || "18:00" }}
                      </span>
                      <span v-else class="text-base font-medium text-gray-400">
                        Tutup
                      </span>
                    </div>
                  </div>

                  <label
                    class="relative inline-flex items-center cursor-pointer shrink-0"
                  >
                    <input
                      type="checkbox"
                      v-model="day.isOpen"
                      class="sr-only peer"
                      @change="onDayToggle(index)"
                    />
                    <div
                      class="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-merchant-primary"
                    ></div>
                  </label>
                </div>

                <!-- Inline time inputs (shown when open) -->
                <div v-if="day.isOpen" class="px-4 pb-4">
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <label
                        class="block mb-1.5 text-xs font-medium text-gray-500"
                        >Jam Buka</label
                      >
                      <input
                        type="time"
                        :value="day.open || '06:00'"
                        @input="
                          day.open = $event.target.value;
                          updateDayHours(index);
                        "
                        class="w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                        :class="day.open && day.close && day.close <= day.open ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-merchant-primary'"
                      />
                    </div>
                    <span class="mt-6 text-sm text-gray-400">—</span>
                    <div class="flex-1">
                      <label
                        class="block mb-1.5 text-xs font-medium text-gray-500"
                        >Jam Tutup</label
                      >
                      <input
                        type="time"
                        :value="day.close || '18:00'"
                        @input="
                          day.close = $event.target.value;
                          updateDayHours(index);
                        "
                        class="w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                        :class="day.open && day.close && day.close <= day.open ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-merchant-primary'"
                      />
                    </div>
                  </div>
                  <p v-if="day.open && day.close && day.close <= day.open" class="mt-2 text-xs font-medium text-red-500">
                    Jam tutup harus setelah jam buka.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Save Button -->
        <div class="justify-end hidden mt-6 sm:flex">
          <AppButton type="submit" :loading="isSaving" variant="merchant">
            Simpan
          </AppButton>
        </div>

        <!-- Mobile Action Button - Fixed at Bottom -->
        <div
          class="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 sm:hidden"
        >
          <button
            type="submit"
            class="w-full py-3 text-sm font-semibold text-center text-white transition-opacity bg-merchant-primary rounded-xl hover:opacity-90"
          >
            Simpan
          </button>
        </div>
      </Form>
    </div>

    <input
      ref="coverInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onCoverSelected"
    />

    <input
      ref="logoInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onLogoSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import MerchantMobileHeader from "@/components/merchant/MerchantMobileHeader.vue";
import { onMounted, watch } from "vue";
import { useMerchants } from "@/composables/useMerchants";
import { useAuthStore } from "@/stores/auth";
import {
  getProvinces,
  getCities,
  getDistricts,
  getVillages,
} from "@/services/api/location";
import { fetchBanks } from "@/services/api/bank";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import MapPicker from "@/components/forms/MapPicker.vue";
import { useToast } from "vue-toastification";
import AppButton from "@/components/common/Button.vue";
import * as yup from "yup";
import { Form } from "vee-validate";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const isDev = import.meta.env.DEV;
const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const { fetchMerchantProfile, updateMerchantProfile } = useMerchants();

const merchantSlug = computed(() => {
  const slug =
    route.params.merchantSlug ??
    authStore.merchantSlug ??
    authStore.activeMerchant?.slug ??
    null;
  return slug ? String(slug) : null;
});

const breadcrumbItems = computed(() => [
  {
    label: "Profil UMKM",
    path: merchantSlug.value
      ? `/merchant-center/${merchantSlug.value}/profile`
      : "/merchant-profile",
  },
  {
    label: "Edit Profil UMKM",
  },
]);

const form = ref({
  name: "",
  contact: "",
  description: "",
  address: "",
  logo: "",
  coverImage: "",
  city_id: null,
  district_id: null,
  province_id: null,
  village_id: null,
  NPWP: "",
  bank_code: "",
  bank_account_number: "",
  bank_account_name: "",
  operationalHours: [
    {
      key: "monday",
      name: "Senin",
      shortName: "Sen",
      isOpen: false,
      open: null,
      close: null,
    },
    {
      key: "tuesday",
      name: "Selasa",
      shortName: "Sel",
      isOpen: false,
      open: null,
      close: null,
    },
    {
      key: "wednesday",
      name: "Rabu",
      shortName: "Rab",
      isOpen: false,
      open: null,
      close: null,
    },
    {
      key: "thursday",
      name: "Kamis",
      shortName: "Kam",
      isOpen: false,
      open: null,
      close: null,
    },
    {
      key: "friday",
      name: "Jumat",
      shortName: "Jum",
      isOpen: false,
      open: null,
      close: null,
    },
    {
      key: "saturday",
      name: "Sabtu",
      shortName: "Sab",
      isOpen: false,
      open: null,
      close: null,
    },
    {
      key: "sunday",
      name: "Minggu",
      shortName: "Min",
      isOpen: false,
      open: null,
      close: null,
    },
  ],
});

const isSaving = ref(false);
const isLoading = ref(true);
const latitude = ref(null);
const longitude = ref(null);
const coverInput = ref(null);
const logoInput = ref(null);

const hasFormLogo = computed(() => {
  const val = form.value?.logo;
  return typeof val === "string" && val.trim().length > 0;
});

const hasFormCover = computed(() => {
  const val = form.value?.coverImage;
  return typeof val === "string" && val.trim().length > 0;
});

const onCoverImgError = () => {
  form.value.coverImage = "";
  form.value.coverFile = null;
};

const onLogoImgError = () => {
  form.value.logo = "";
  form.value.logoFile = null;
};

const provincesLoading = ref(false);
const citiesLoading = ref(false);
const districtsLoading = ref(false);
const villagesLoading = ref(false);
const banksLoading = ref(false);

const provinces = ref([]);
const cities = ref([]);
const districts = ref([]);
const villages = ref([]);
const banks = ref([]);

async function loadBanks() {
  banksLoading.value = true;
  try {
    banks.value = await fetchBanks();
  } catch (e) {
    console.error("Gagal memuat daftar bank:", e);
    banks.value = [];
  } finally {
    banksLoading.value = false;
  }
}

watch(
  () => form.value.province_id,
  async (pid) => {
    form.value.city_id = null;
    form.value.district_id = null;
    form.value.village_id = null;

    cities.value = [];
    districts.value = [];
    villages.value = [];

    if (pid) {
      await loadCities(pid);
    }
  },
);

watch(
  () => form.value.city_id,
  async (cid) => {
    form.value.district_id = null;
    form.value.village_id = null;

    districts.value = [];
    villages.value = [];

    if (cid) {
      await loadDistricts(cid);
    }
  },
);

watch(
  () => form.value.district_id,
  async (did) => {
    form.value.village_id = null;
    villages.value = [];

    if (did) {
      await loadVillages(did);
    }
  },
);

// Ambil data wilayah dari service
async function loadProvinces() {
  provincesLoading.value = true;
  try {
    provinces.value = await getProvinces();
  } catch (e) {
    if (isDev) {
      console.error("Gagal memuat provinsi:", e);
    }
    toast.error("Gagal memuat data provinsi");
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
    if (isDev) {
      console.error("Gagal memuat kota/kabupaten:", e);
    }
    toast.error("Gagal memuat data kota/kabupaten");
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
    if (isDev) {
      console.error("Gagal memuat kecamatan:", e);
    }
    toast.error("Gagal memuat data kecamatan");
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
    if (isDev) {
      console.error("Gagal memuat kelurahan/desa:", e);
    }
    toast.error("Gagal memuat data kelurahan/desa");
    villages.value = [];
  } finally {
    villagesLoading.value = false;
  }
}

const DAYS = [
  { key: "monday", label: "Senin", short: "Sen" },
  { key: "tuesday", label: "Selasa", short: "Sel" },
  { key: "wednesday", label: "Rabu", short: "Rab" },
  { key: "thursday", label: "Kamis", short: "Kam" },
  { key: "friday", label: "Jumat", short: "Jum" },
  { key: "saturday", label: "Sabtu", short: "Sab" },
  { key: "sunday", label: "Minggu", short: "Min" },
];

onMounted(async () => {
  loadBanks();
  isLoading.value = true;
  await loadProvinces();

  // Kalau edit data lama (prefill)

  try {
    if (!merchantSlug.value) {
      toast.error("Merchant tidak valid");
      router.push("/merchant-register");
      return;
    }

    const data = await fetchMerchantProfile(merchantSlug.value);

    latitude.value = data?.primary_address?.latitude ?? null;
    longitude.value = data?.primary_address?.longitude ?? null;

    form.value.name = data?.name ?? "";
    form.value.contact = data?.phone ?? "";
    form.value.description = data?.description ?? "";
    form.value.address = data?.primary_address?.detail ?? "";
    form.value.province_id = data?.primary_address?.province_id ?? null;

    if (form.value.province_id) {
      await loadCities(form.value.province_id);
    }

    form.value.city_id = data?.primary_address?.city_id ?? null;
    if (form.value.city_id) {
      await loadDistricts(form.value.city_id);
    }

    form.value.district_id = data?.primary_address?.district_id ?? null;
    if (form.value.district_id) {
      await loadVillages(form.value.district_id);
    }
    form.value.village_id = data?.primary_address?.village_id ?? null;

    form.value.NPWP = data?.NPWP ?? "";
    form.value.bank_code = data?.bank_code ?? "";
    form.value.bank_account_number = data?.bank_account_number ?? "";
    form.value.bank_account_name = data?.bank_account_name ?? "";

    form.value.logo =
      typeof data?.logo_url === "string" && data.logo_url.trim()
        ? data.logo_url
        : "";

    form.value.coverImage =
      typeof data?.banner_url === "string" && data.banner_url.trim()
        ? data.banner_url
        : "";

    const hours = data?.operational_hours ?? {};

    form.value.operationalHours = DAYS.map((day) => {
      const item = hours[day.key];

      if (!item || item.is_open === false) {
        return {
          key: day.key,
          name: day.label,
          shortName: day.short,
          isOpen: false,
          open: null,
          close: null,
        };
      }

      return {
        key: day.key,
        name: day.label,
        shortName: day.short,
        isOpen: true,
        open: item.open,
        close: item.close,
      };
    });
    isLoading.value = false;
  } catch (error) {
    isLoading.value = false;
  }
});

const onCoverSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    toast.error("Ukuran gambar maksimal 5MB");
    e.target.value = "";
    return;
  }

  form.value.coverFile = file;
  form.value.coverImage = URL.createObjectURL(file);

  if (isDev) {
    console.log("Cover file:", file);
  }
};

const onLogoSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    toast.error("Ukuran gambar maksimal 5MB");
    e.target.value = "";
    return;
  }

  form.value.logoFile = file;
  form.value.logo = URL.createObjectURL(file);

  if (isDev) {
    console.log("Logo file:", file);
  }
};

const handleUploadCover = () => {
  coverInput.value.click();
};

const handleUploadLogo = () => {
  logoInput.value.click();
};

const onDayToggle = (index) => {
  const day = form.value.operationalHours[index];
  if (!day) return;

  if (day.isOpen) {
    day.open = day.open || "06:00";
    day.close = day.close || "18:00";
    day.hours = `[${day.open} - ${day.close}]`;
  } else {
    day.open = null;
    day.close = null;
    day.hours = "Tutup";
  }
};

const updateDayHours = (index) => {
  const day = form.value.operationalHours[index];
  if (!day) return;

  const open = day.open || "06:00";
  const close = day.close || "18:00";

  day.open = open;
  day.close = close;
  day.isOpen = true;
  day.hours = `[${open} - ${close}]`;
};

const buildOperationalHoursPayload = () => {
  const result = {};

  form.value.operationalHours.forEach((day) => {
    result[day.key] = day.isOpen
      ? {
          is_open: true,
          open: day.open,
          close: day.close,
        }
      : {
          is_open: false,
        };
  });

  return result;
};

const editProfileSchema = yup.object().shape({
  name: yup.string().required("Nama UMKM wajib diisi"),
  contact: yup.string().required("Kontak wajib diisi"),
  NPWP: yup.string().required("NPWP wajib diisi"),
  bank_code: yup.string().required("Bank wajib dipilih"),
  bank_account_number: yup.string().required("Nomor rekening wajib diisi"),
  bank_account_name: yup.string().required("Nama pemilik rekening wajib diisi"),
});

const getOperationalHoursErrors = () => {
  const errors = [];
  form.value.operationalHours.forEach((day) => {
    if (day.isOpen) {
      const open = day.open || "06:00";
      const close = day.close || "18:00";
      if (close <= open) {
        errors.push({
          day: day.name,
          message: `Jam tutup untuk hari ${day.name} harus setelah jam buka.`,
        });
      }
    }
  });
  return errors;
};

const handleSave = async () => {
  const timeErrors = getOperationalHoursErrors();
  if (timeErrors.length > 0) {
    toast.error(timeErrors[0].message);
    return;
  }

  if (isDev) {
    console.log("Saving changes...", form.value);
  }

  try {
    if (!merchantSlug.value) {
      toast.error("Merchant tidak valid");
      return;
    }

    isSaving.value = true;
    const fd = new FormData();

    // Basic info
    fd.append("name", form.value.name || "");
    fd.append("phone", form.value.contact || "");
    fd.append("description", form.value.description || "");

    // Tax & bank info
    fd.append("NPWP", form.value.NPWP || "");
    fd.append("bank_code", form.value.bank_code || "");
    fd.append("bank_account_number", form.value.bank_account_number || "");
    fd.append("bank_account_name", form.value.bank_account_name || "");

    // Address - only append if value exists (don't send empty strings for integers)
    if (form.value.province_id) {
      fd.append("province_id", form.value.province_id);
    }
    if (form.value.city_id) {
      fd.append("city_id", form.value.city_id);
    }
    if (form.value.district_id) {
      fd.append("district_id", form.value.district_id);
    }
    if (form.value.village_id) {
      fd.append("village_id", form.value.village_id);
    }
    fd.append("address_detail", form.value.address || "");

    // Coordinates - only append if value exists
    if (latitude.value != null && latitude.value !== "") {
      fd.append("latitude", latitude.value);
    }
    if (longitude.value != null && longitude.value !== "") {
      fd.append("longitude", longitude.value);
    }

    // Operational hours
    fd.append(
      "operational_hours",
      JSON.stringify(buildOperationalHoursPayload()),
    );

    // Images (optional)
    if (form.value.logoFile) {
      fd.append("logo", form.value.logoFile);
    }

    if (form.value.coverFile) {
      fd.append("cover", form.value.coverFile);
    }

    await updateMerchantProfile(merchantSlug.value, fd);

    
    // Redirect only on success
    const targetSlug = merchantSlug.value ?? authStore.merchantSlug;
    router.push(
      targetSlug ? `/merchant-center/${targetSlug}/profile` : "/merchant-profile",
    );
  } catch (error) {
    if (isDev) {
      console.error("Error updating merchant profile:", error);
      console.error("Error response:", error.response?.data);
      console.error("Validation errors:", error.response?.data?.errors);
    }

    // Show specific validation errors if available
    const validationErrors = error.response?.data?.errors;
    if (validationErrors) {
      const firstError = Object.values(validationErrors)[0];
      toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
    } else {
      toast.error(error.response?.data?.message || "Gagal menyimpan perubahan");
    }
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
@media (min-width: 640px) {
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  ::-webkit-scrollbar-thumb {
    background: #0891b2;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #047280;
  }
}

.fixed.z-40 {
  z-index: 40;
}
</style>
