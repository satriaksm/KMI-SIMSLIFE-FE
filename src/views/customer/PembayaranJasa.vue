<template>
  <div class="min-h-screen pb-32 bg-gradient-to-b from-gray-50 via-white to-gray-100 sm:pb-28">

    <!-- Mobile Layout (default) -->
    <div class="lg:hidden">

      <!-- AppBar — full width header -->
      <header class="sticky top-0 z-20 w-full px-4 py-3 text-white shadow-md bg-gradient-to-r from-merchant-primary to-merchant-primary/90">
        <div class="flex items-center gap-3">
          <button type="button" class="flex items-center justify-center text-white transition rounded-full shadow-sm w-9 h-9 bg-white/15 hover:bg-white/25 backdrop-blur-sm" @click="goBack" aria-label="Kembali">
            <i class="text-sm pi pi-arrow-left"></i>
          </button>
          <div class="flex flex-col">
            <h1 class="text-sm font-semibold sm:text-base">Ringkasan Pesanan</h1>
            <p class="text-[11px] sm:text-xs text-white/80">Cek kembali data sebelum mengirim ke chat penjual</p>
          </div>
        </div>
      </header>

      <!-- Content area — max-w container di dalam -->
      <main class="px-4 mt-4">
        <div class="max-w-screen-sm mx-auto space-y-4">
        <!-- Data Pemesan -->
        <section
          class="p-4 border border-gray-100 shadow-sm bg-white/95 rounded-2xl sm:p-5"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2
                class="flex items-center gap-2 text-sm font-semibold text-gray-900 sm:text-base"
              >
                <i class="pi pi-user text-merchant-primary"></i>
                Data Pemesan
              </h2>
              <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Pastikan nama dan nomor dapat dihubungi oleh penjual.
              </p>
            </div>
            <button
              type="button"
              class="px-2 py-1 text-xs border rounded-full border-amber-300 text-amber-700 bg-amber-50"
              @click="useProfileContact"
            >
              Gunakan data profil
            </button>
          </div>
          <div class="space-y-3">
            <input
              v-model="form.nama"
              type="text"
              placeholder="Nama Lengkap"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-merchant-primary/70 focus:border-merchant-primary"
            />
            <input
              v-model="form.tel"
              type="tel"
              placeholder="Nomor Telp"
              inputmode="numeric"
              pattern="[0-9]*"
              @input="onPhoneInput"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-merchant-primary/70 focus:border-merchant-primary"
            />
          </div>
        </section>

        <!-- Detail Pesanan -->
        <section
          class="p-4 border border-gray-100 shadow-sm bg-white/95 rounded-2xl sm:p-5"
        >
          <h2
            class="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900 sm:text-base"
          >
            <i class="pi pi-clipboard text-merchant-primary"></i>
            Detail Pesanan
          </h2>
          <div class="flex items-center gap-3">
            <div
              class="w-24 h-16 overflow-hidden bg-gray-100 shadow-sm rounded-xl"
            >
              <img :src="order.image" class="object-cover w-full h-full" />
            </div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-gray-900 line-clamp-2">
                {{ order.title }}
              </div>
              <div class="mt-1 flex items-baseline gap-1.5">
                <span class="text-sm font-semibold text-merchant-primary">
                  Rp {{ formatIDR(order.price) }}
                </span>
                <span
                  v-if="orderPriceTypeLabel"
                  class="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700"
                >
                  {{ orderPriceTypeLabel }}
                </span>
                <!-- Hapus label status seperti 'Available' jika ada -->
              </div>
            </div>
          </div>
          <textarea
            v-model="form.catatan"
            rows="3"
            placeholder="Catatan tambahan"
            class="w-full px-3 py-2 mt-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-merchant-primary/70 focus:border-merchant-primary"
          ></textarea>
        </section>

        <!-- Detail Alamat — hanya tampil untuk layanan yang butuh alamat (on_site / ke_rumah_pelanggan) -->
        <section
          v-if="isHomeService"
          class="p-4 border border-gray-100 shadow-sm bg-white/95 rounded-2xl sm:p-5"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2
                class="flex items-center gap-2 text-sm font-semibold text-gray-900 sm:text-base"
              >
                <i class="pi pi-map-marker text-merchant-primary"></i>
                Alamat Layanan
              </h2>
              <p class="mt-0.5 text-[11px] text-gray-500">
                Wajib diisi — layanan dikerjakan di lokasi Anda.
              </p>
            </div>
          </div>

          <!-- Textarea alamat -->
          <textarea
            v-model="form.alamat"
            rows="3"
            placeholder="Ketik alamat lengkap layanan di sini..."
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-merchant-primary/70 focus:border-merchant-primary resize-none"
          ></textarea>

          <!-- Tombol ambil lokasi + koordinat -->
          <div class="flex items-center gap-2 mt-2">
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="locatingDevice"
              @click="requestDeviceLocation"
            >
              <i :class="locatingDevice ? 'pi pi-spin pi-spinner' : 'pi pi-map-marker'" class="text-[10px]"></i>
              {{ locatingDevice ? 'Mengambil lokasi...' : 'Ambil Lokasi Saat Ini' }}
            </button>
            <span v-if="locatingError" class="text-[11px] text-red-500">{{ locatingError }}</span>
          </div>
          <p v-if="deviceCoordinates" class="mt-1.5 text-[11px] text-gray-500">
            <i class="pi pi-globe mr-0.5"></i>
            Koordinat: {{ deviceCoordinates.latitude.toFixed(6) }}, {{ deviceCoordinates.longitude.toFixed(6) }}
          </p>
        </section>

        <!-- Alamat read-only untuk layanan online -->
        <section
          v-else-if="isOnlineService"
          class="p-4 border border-gray-100 shadow-sm bg-white/95 rounded-2xl sm:p-5"
        >
          <div class="flex items-center justify-between mb-2">
            <h2
              class="flex items-center gap-2 text-sm font-semibold text-gray-900 sm:text-base"
            >
              <i class="pi pi-map-marker text-merchant-primary"></i>
              Alamat Layanan
            </h2>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Online</span>
          </div>
          <div class="flex items-start gap-2 text-sm text-gray-800">
            <span class="mt-0.5 text-gray-500"><i class="pi pi-globe"></i></span>
            <p class="leading-snug break-words">Layanan dilakukan secara online</p>
          </div>
        </section>

        <!-- Alamat read-only untuk layanan di tempat UMKM -->
        <section
          v-else-if="isAtMerchantLocation"
          class="p-4 border border-gray-100 shadow-sm bg-white/95 rounded-2xl sm:p-5"
        >
          <div class="flex items-center justify-between mb-2">
            <h2
              class="flex items-center gap-2 text-sm font-semibold text-gray-900 sm:text-base"
            >
              <i class="pi pi-map-marker text-merchant-primary"></i>
              Alamat Layanan
            </h2>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Di Tempat UMKM</span>
          </div>
          <div class="flex items-start gap-2 text-sm text-gray-800">
            <span class="mt-0.5 text-gray-500"><i class="pi pi-map-marker"></i></span>
            <p class="leading-snug break-words">{{ form.alamat || 'Tidak ada alamat' }}</p>
          </div>
        </section>

        <!-- Promo -->
        <section
          class="overflow-hidden border border-gray-100 shadow-sm bg-white/95 rounded-2xl"
        >
          <div
            class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-lime-100 to-emerald-50"
          >
            <div class="text-sm font-semibold text-gray-800">
              {{
                selectedPromo
                  ? selectedPromo.title
                  : promos.length
                    ? "Pilih voucher diskon"
                    : "Tidak ada voucher tersedia"
              }}
            </div>
            <button
              class="px-3 py-1 text-xs font-semibold rounded-full"
              style="background: #ffa30e; color: #fff"
              @click="selectedPromo ? clearPromo() : usePromo(promos[0])"
            >
              {{ selectedPromo ? "Batalkan" : "Pakai" }}
            </button>
          </div>

          <button
            class="flex items-center justify-between w-full px-4 py-3 text-sm text-gray-700"
            @click="openPromo = true"
          >
            Lihat promo lainnya
            <span>➜</span>
          </button>
        </section>

        <!-- Ringkasan Pembayaran -->
        <section
          class="p-4 border border-gray-100 shadow-sm bg-white/95 rounded-2xl sm:p-5"
        >
          <h2
            class="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900 sm:text-base"
          >
            <i class="pi pi-wallet text-merchant-primary"></i>
            Ringkasan Pembayaran
          </h2>

          <div class="space-y-3">
            <div class="text-sm text-gray-600">Metode Pembayaran</div>

            <!-- Loading State -->
            <div v-if="paymentFeesLoading" class="space-y-2">
              <div v-for="n in 2" :key="n" class="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>

            <!-- Payment Methods Grid -->
            <div v-else class="space-y-3">
              <div v-for="group in groupedPaymentMethods" :key="group.type">
                <div class="mb-1.5 text-xs font-semibold text-gray-500 uppercase">{{ group.title }}</div>
                <div class="grid grid-cols-2 gap-2">
                  <label
                    v-for="method in group.items"
                    :key="method.id"
                    class="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs"
                    :class="selectedPayment === method.id ? 'border-merchant-primary bg-merchant-primary/5' : 'border-gray-200 hover:border-gray-300'"
                    @click="selectedPayment = method.id"
                  >
                    <div
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition"
                      :class="selectedPayment === method.id ? 'border-merchant-primary bg-merchant-primary' : 'border-gray-300'"
                    >
                      <svg v-if="selectedPayment === method.id" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-800 truncate">{{ method.name }}</div>
                      <div class="text-[10px] text-gray-500 truncate">{{ method.description }}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="pt-2 space-y-1 text-sm text-gray-700">
              <div class="flex justify-between">
                <span>Harga Jasa</span>
                <span>Rp {{ formatIDR(amounts.jasa) }}</span>
              </div>
              <div v-if="amounts.ongkir > 0" class="flex justify-between">
                <span>Biaya Pengantaran</span>
                <span>Rp {{ formatIDR(amounts.ongkir) }}</span>
              </div>
              <div v-if="amounts.platformFee > 0" class="flex justify-between text-xs text-gray-500">
                <span>Biaya Admin</span>
                <span>Rp {{ formatIDR(amounts.platformFee) }}</span>
              </div>
              <div class="flex justify-between">
                <span>
                  Diskon
                  <span
                    v-if="selectedPromo"
                    class="font-semibold text-amber-600"
                    >({{ selectedPromo.code }})</span
                  >
                </span>
                <span>-Rp {{ formatIDR(amounts.diskon) }}</span>
              </div>
              <div class="my-1 border-t border-gray-300"></div>
              <div
                class="flex items-center justify-between px-3 py-2 mt-1 text-sm font-semibold bg-amber-50 rounded-xl"
              >
                <span>Total Pembayaran</span>
                <span>Rp {{ formatIDR(total) }}</span>
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>

      <!-- Bottom bar (Total + Chat button) - Mobile Only -->
      <div class="fixed left-0 right-0 bottom-16 sm:bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] px-4 py-3">
        <div class="max-w-screen-sm mx-auto space-y-1.5">
          <div class="flex items-center justify-between text-xs font-semibold text-gray-900 sm:text-sm">
            <span>Total Pembayaran</span>
            <span>Rp {{ formatIDR(total) }}</span>
          </div>
          <p class="text-[11px] text-gray-500">Pesanan akan dikirim ke chat penjual.</p>
          <button class="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-[#FFA30E] to-[#ffba3d] hover:from-[#e5920d] hover:to-[#ffb024] text-white font-semibold text-center transition shadow-md" @click="sendToChat">
            <i class="text-sm pi pi-send"></i>
            <span>Pesan Sekarang</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Desktop Layout (lg: and above) -->
    <div class="hidden lg:block bg-gray-50 min-h-screen">
      <!-- Desktop Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button type="button" class="w-10 h-10 rounded-xl bg-merchant-primary/10 flex items-center justify-center text-merchant-primary hover:bg-merchant-primary/20 transition" @click="goBack">
                <i class="pi pi-arrow-left"></i>
              </button>
              <div>
                <h1 class="text-lg font-bold text-gray-900">Ringkasan Pesanan</h1>
                <p class="text-sm text-gray-500">Lengkapi data untuk memesan layanan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="grid grid-cols-12 gap-6" style="height: calc(100vh - 180px);">
          <!-- Left Panel - Form -->
          <div class="col-span-8 overflow-y-auto pr-2">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div class="grid grid-cols-2 gap-6">
                <!-- Data Pemesan -->
                <div>
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold">1</span>
                      Data Pemesan
                    </h3>
                    <button type="button" class="text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition" @click="useProfileContact">
                      <i class="pi pi-user mr-1"></i> Gunakan profil
                    </button>
                  </div>
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">Nama Lengkap</label>
                      <input v-model="form.nama" type="text" placeholder="Nama pemesan" class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-merchant-primary/50 focus:border-merchant-primary bg-gray-50" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1.5">Nomor Telepon</label>
                      <input v-model="form.tel" type="tel" placeholder="08xxxxxxxxxx" inputmode="numeric" pattern="[0-9]*" @input="onPhoneInput" class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-merchant-primary/50 focus:border-merchant-primary bg-gray-50" />
                    </div>
                  </div>
                </div>

                <!-- Detail Pesanan -->
                <div>
                  <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold">2</span>
                    Detail Pesanan
                  </h3>
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-16 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      <img :src="order.image" class="object-cover w-full h-full" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-900 line-clamp-2">{{ order.title }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-sm font-bold text-merchant-primary">Rp {{ formatIDR(order.price) }}</span>
                        <span v-if="orderPriceTypeLabel" class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ orderPriceTypeLabel }}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1.5">Catatan</label>
                    <textarea v-model="form.catatan" rows="2" placeholder="Catatan tambahan..." class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-merchant-primary/50 focus:border-merchant-primary bg-gray-50 resize-none"></textarea>
                  </div>
                </div>

                <!-- Alamat Layanan — hanya untuk on_site / ke_rumah_pelanggan -->
                <div v-if="isHomeService" class="col-span-2">
                  <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold">3</span>
                    Alamat Layanan
                    <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Wajib Diisi</span>
                  </h3>
                  <div class="mb-2">
                    <label class="block text-xs font-medium text-gray-600 mb-1.5">Alamat Lengkap</label>
                    <textarea v-model="form.alamat" rows="3" placeholder="Ketik alamat lengkap layanan di sini..." class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-merchant-primary/50 focus:border-merchant-primary bg-gray-50 resize-none"></textarea>
                  </div>
                  <div class="flex items-center gap-2">
                    <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition disabled:opacity-50" :disabled="locatingDevice" @click="requestDeviceLocation">
                      <i :class="locatingDevice ? 'pi pi-spin pi-spinner' : 'pi pi-map-marker'" class="text-[10px]"></i>
                      {{ locatingDevice ? 'Mengambil lokasi...' : 'Ambil Lokasi Saat Ini' }}
                    </button>
                    <span v-if="locatingError" class="text-xs text-red-500">{{ locatingError }}</span>
                  </div>
                  <p v-if="deviceCoordinates" class="text-xs text-gray-500 mt-1.5">Koordinat: {{ deviceCoordinates.latitude.toFixed(6) }}, {{ deviceCoordinates.longitude.toFixed(6) }}</p>
                </div>

                <!-- Alamat read-only untuk layanan online -->
                <div v-else-if="isOnlineService" class="col-span-2">
                  <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold">3</span>
                    Alamat Layanan
                    <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Online</span>
                  </h3>
                  <div class="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <span class="text-purple-400"><i class="pi pi-globe"></i></span>
                    <p class="flex-1 text-sm text-purple-700">Layanan dilakukan secara online</p>
                  </div>
                </div>

                <!-- Alamat read-only untuk di tempat UMKM -->
                <div v-else-if="isAtMerchantLocation" class="col-span-2">
                  <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold">3</span>
                    Alamat Layanan
                    <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Di Tempat UMKM</span>
                  </h3>
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span class="text-gray-400"><i class="pi pi-map-marker"></i></span>
                    <p class="flex-1 text-sm text-gray-700">{{ form.alamat || 'Tidak ada alamat' }}</p>
                  </div>
                </div>

                <!-- Promo & Pembayaran -->
                <div class="col-span-2">
                  <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <span class="w-7 h-7 rounded-lg bg-merchant-primary text-white flex items-center justify-center text-xs font-bold">4</span>
                    Promo & Pembayaran
                  </h3>
                  <div class="grid grid-cols-2 gap-4">
                    <!-- Promo -->
                    <div class="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-semibold text-gray-700">{{ selectedPromo ? selectedPromo.title : promos.length ? 'Pilih voucher' : 'Tidak ada voucher' }}</span>
                        <button class="text-xs px-2 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition" @click="openPromo = true">
                          {{ selectedPromo ? 'Batalkan' : 'Pakai' }}
                        </button>
                      </div>
                      <button class="text-xs text-merchant-primary hover:underline" @click="openPromo = true">Lihat promo lainnya →</button>
                    </div>

                    <!-- Metode Bayar -->
                    <div class="p-3 bg-gray-50 rounded-xl">
                      <label class="block text-xs font-medium text-gray-600 mb-2">Metode Pembayaran</label>

                      <!-- Loading State -->
                      <div v-if="paymentFeesLoading" class="space-y-2">
                        <div class="h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div class="h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>

                      <!-- Payment Methods (same as mobile) -->
                      <div v-else class="space-y-2">
                        <div v-for="group in groupedPaymentMethods" :key="group.type">
                          <div class="mb-1 text-[10px] font-semibold text-gray-400 uppercase">{{ group.title }}</div>
                          <div class="grid grid-cols-2 gap-1.5">
                            <label
                              v-for="method in group.items"
                              :key="method.id"
                              class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition text-xs"
                              :class="selectedPayment === method.id ? 'border-merchant-primary bg-merchant-primary/5' : 'border-gray-200 hover:border-gray-300 bg-white'"
                              @click="selectedPayment = method.id"
                            >
                              <div
                                class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0"
                                :class="selectedPayment === method.id ? 'border-merchant-primary bg-merchant-primary' : 'border-gray-300'"
                              >
                                <svg v-if="selectedPayment === method.id" class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div class="flex-1 min-w-0">
                                <div class="font-medium text-gray-700 truncate">{{ method.name }}</div>
                                <div class="text-[9px] text-gray-400 truncate">{{ method.description }}</div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Panel - Summary -->
          <div class="col-span-4">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6 h-fit">
              <!-- Header -->
              <div class="bg-white border-b border-gray-100 px-5 py-4">
                <h3 class="font-bold text-gray-900 text-base">Ringkasan Pesanan</h3>
                <p class="text-gray-500 text-xs mt-0.5">Periksa pesanan Anda</p>
              </div>

              <!-- Content -->
              <div class="p-5">
                <!-- Product Info -->
                <div class="mb-4">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Detail Layanan</p>
                  <div class="bg-gray-50 rounded-xl p-3">
                    <div class="flex items-start gap-3 mb-3">
                      <div class="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                        <img :src="order.image" class="object-cover w-full h-full" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{{ order.title }}</p>
                        <div class="flex items-baseline gap-1.5 mt-1">
                          <span class="text-sm font-bold text-merchant-primary">Rp {{ formatIDR(order.price) }}</span>
                          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{{ orderPriceTypeLabel || 'Harga Tetap' }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span class="text-gray-500">Kategori</span>
                      <span class="text-gray-700 font-medium">Jasa</span>
                    </div>
                  </div>
                </div>

                <!-- Order Info -->
                <div class="mb-4">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Info Pemesanan</p>
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">Pemesan</span>
                      <span class="text-gray-800 font-medium">{{ form.nama || '-' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">Tanggal</span>
                      <span class="text-gray-800">{{ form.tanggalLabel || '—' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">Waktu</span>
                      <span class="text-gray-800">{{ form.waktu || '—' }}</span>
                    </div>
                    <div v-if="isOnlineService" class="flex justify-between text-sm">
                      <span class="text-gray-500">Alamat</span>
                      <span class="text-purple-600 font-medium">Online</span>
                    </div>
                    <div v-else-if="isHomeService" class="flex justify-between text-sm">
                      <span class="text-gray-500">Alamat</span>
                      <span class="text-gray-800 text-right max-w-[55%] line-clamp-2">{{ form.alamat || '-' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">Pembayaran</span>
                      <span class="px-2 py-0.5 rounded-full bg-merchant-primary/10 text-merchant-primary text-xs font-semibold">
                        {{ selectedPaymentMethodName }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Diskon info -->
                <div v-if="selectedPromo" class="flex justify-between text-sm mb-3 p-2 bg-amber-50 rounded-lg">
                  <span class="text-gray-500">Diskon <span class="text-amber-600 font-medium">({{ selectedPromo.code }})</span></span>
                  <span class="text-amber-600 font-semibold">-Rp {{ formatIDR(amounts.diskon) }}</span>
                </div>

                <!-- Total -->
                <div class="flex items-center justify-between py-3 border-t border-gray-100 mb-4">
                  <span class="text-base font-bold text-gray-900">Total</span>
                  <span class="text-xl font-bold text-merchant-primary">Rp {{ formatIDR(total) }}</span>
                </div>

                <!-- Button -->
                <button
                  :disabled="submitting"
                  class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#FFA30E] to-[#ffba3d] hover:from-[#e5920d] hover:to-[#ffb024] text-white font-bold text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  @click="sendToChat"
                >
                  <i :class="submitting ? 'pi pi-spin pi-spinner' : 'pi pi-send'" class="text-sm"></i>
                  {{ submitting ? 'Memproses...' : 'Booking Sekarang' }}
                </button>
                <p class="text-xs text-gray-400 text-center mt-2">Pesanan akan dikirim via WhatsApp</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bubble Notifikasi dengan tombol OK -->
    <transition name="fade">
      <div v-if="errorMessage || successMessage" class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm sm:backdrop-blur">
        <div class="absolute inset-0"></div>
        <div class="relative max-w-sm w-[90%] sm:w-auto rounded-2xl shadow-lg px-4 py-3 flex flex-col gap-2 text-xs sm:text-sm border bg-opacity-95" :class="errorMessage ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'">
          <p class="leading-snug">{{ errorMessage || successMessage }}</p>
          <button type="button" class="self-end mt-1 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold" :class="errorMessage ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'" @click="clearNotification">
            Oke
          </button>
        </div>
      </div>
    </transition>

    <!-- Bottom Sheet Promo List -->
    <transition name="fade">
      <div v-if="openPromo" class="fixed inset-0 z-40">
        <div class="absolute inset-0 bg-black/40" @click="openPromo = false"></div>
        <div class="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto">
          <div class="w-12 h-1 mx-auto mb-3 bg-gray-300 rounded-full"></div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-gray-900">Pilih Promo</h3>
            <button class="text-gray-500" @click="openPromo = false">✕</button>
          </div>
          <div class="space-y-3">
            <div v-for="p in promos" :key="p.code" class="overflow-hidden border border-gray-200 rounded-xl">
              <div class="flex items-center justify-between px-4 py-3 bg-gray-50">
                <div>
                  <div class="text-sm font-semibold text-gray-800">{{ p.title }}</div>
                  <div class="text-xs text-gray-600">{{ p.desc }}</div>
                </div>
                <button class="px-3 py-1 text-xs font-semibold rounded-full" :class="selectedPromo && selectedPromo.code === p.code ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-900'" @click="usePromo(p)">
                  {{ selectedPromo && selectedPromo.code === p.code ? "Dipakai" : "Gunakan" }}
                </button>
              </div>
              <div class="px-4 py-3 text-xs text-gray-600">
                Kode: <span class="font-mono font-semibold">{{ p.code }}</span>
              </div>
            </div>
          </div>
          <div class="flex justify-end mt-4">
            <button class="px-4 py-2 border border-gray-200 rounded-lg" @click="openPromo = false">Tutup</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Bottom Sheet Pilih Alamat -->
    <transition name="fade">
      <div v-if="openAlamatOptions" class="fixed inset-0 z-40">
        <div class="absolute inset-0 bg-black/40" @click="openAlamatOptions = false"></div>
        <div class="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto">
          <div class="w-12 h-1 mx-auto mb-3 bg-gray-300 rounded-full"></div>
          <div class="mb-3">
            <h3 class="text-base font-semibold text-gray-900">Pilih Sumber Alamat</h3>
            <p class="text-xs text-gray-500 mt-0.5">Kamu bisa gunakan alamat profil atau lokasi perangkat.</p>
          </div>
          <div class="space-y-3 text-sm">
            <button type="button" class="flex items-center w-full gap-3 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50" @click="useProfileAddress">
              <span class="flex items-center justify-center w-8 h-8 text-lg rounded-full bg-emerald-100 text-emerald-600"><i class="pi pi-user"></i></span>
              <div class="flex-1 text-left">
                <p class="font-semibold text-gray-800">Alamat Profil</p>
                <p class="text-xs text-gray-500">Gunakan alamat yang tersimpan di profil kamu jika tersedia.</p>
              </div>
            </button>
          </div>
          <div class="flex justify-end mt-4">
            <button class="px-4 py-2 text-sm border border-gray-200 rounded-lg" @click="openAlamatOptions = false">Tutup</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Overlay Ringkasan Pemesanan (Card) -->
    <transition name="fade">
      <div v-if="showChat" class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm sm:backdrop-blur-md">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col max-h-[80vh] sm:max-h-[85vh]">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 class="text-sm font-semibold text-gray-900">Ringkasan Pemesanan</h2>
            <button class="text-sm text-gray-500 hover:text-gray-700" @click="showChat = false">✕</button>
          </div>
          <div class="flex flex-col flex-1 gap-4 p-4 bg-gray-50">
            <div class="px-4 py-3 text-white transition cursor-pointer rounded-2xl bg-merchant-primary hover:bg-merchant-primary/90" @click="showDetails = !showDetails">
              <p class="mb-1 text-xs opacity-90">Layanan Jasa</p>
              <p class="text-sm font-semibold truncate">{{ order.title }}</p>
              <p class="mt-1 text-sm font-medium">Rp {{ formatIDR(order.price) }}</p>
              <p class="text-[11px] mt-2 opacity-90 flex items-center justify-between">
                <span>{{ form.tanggalLabel }} • {{ form.waktu }}</span>
                <span class="underline">{{ showDetails ? "Sembunyikan detail" : "Lihat detail" }}</span>
              </p>
            </div>
            <div v-if="showDetails" class="px-4 py-3 text-xs text-gray-700 whitespace-pre-line bg-white border border-gray-200 rounded-2xl sm:text-sm">
              {{ summaryText }}
            </div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import api from "@/libs/axios.js";
import { usePaymentMethods } from "@/composables/usePaymentMethods";

const route = useRoute();
const router = useRouter();

// ===== Payment Methods =====
const {
  paymentMethodsList,
  paymentFeesLoading,
  fetchPaymentFees,
  getFilteredPaymentMethods,
  calculatePlatformFee,
  isCodMethod,
  isCodEnabled,
} = usePaymentMethods();

const XENDIT_CHANNELS = ['QRIS', 'BCA', 'BNI', 'BRI', 'MANDIRI', 'OVO', 'DANA', 'SHOPEEPAY', 'ALFAMART'];

// selectedPayment: variabel utama yang berubah saat user klik metode
const selectedPayment = ref(null);

// paymentMethod: abstrak untuk backend (COD vs XENDIT)
const paymentMethod = computed(() => {
  const val = selectedPayment.value;
  if (!val) return 'COD';
  const upper = String(val).toUpperCase();
  return upper === 'COD' ? 'COD' : 'XENDIT';
});

// paymentChannel: channel aktual yang dikirim ke backend
const paymentChannel = computed(() => {
  const val = selectedPayment.value;
  if (!val) return null;
  const upper = String(val).toUpperCase();
  if (upper === 'COD') return null;
  return XENDIT_CHANNELS.includes(upper) ? upper : null;
});

// isXendit / isCod
const isXenditPayment = computed(() => paymentMethod.value === 'XENDIT');
const isCodPayment = computed(() => paymentMethod.value === 'COD');

// Inisialisasi: pilih metode pertama yang tersedia (COD didahulukan jika enabled)
onMounted(() => {
  if (selectedPayment.value !== null) return; // sudah diset oleh user
  if (isCodEnabled(order.paymentMethods)) {
    selectedPayment.value = 'cod';
  } else {
    const first = availablePaymentMethods.value[0];
    selectedPayment.value = first ? first.id : 'cod';
  }
});

// Watch: hanya set default jika user belum memilih apa pun
watch(selectedPayment, (val) => {
  console.log('[PembayaranJasa] selectedPayment changed to:', val);
  console.log('[PembayaranJasa] paymentMethod:', paymentMethod.value);
  console.log('[PembayaranJasa] paymentChannel:', paymentChannel.value);
});

// Platform fee
watch(selectedPayment, (methodId) => {
  const jasa = toNumber(amounts.value.jasa);
  const ongkir = toNumber(amounts.value.ongkir);
  const diskon = toNumber(amounts.value.diskon);
  const gross = Math.max(0, jasa + ongkir - diskon);
  amounts.value.platformFee = calculatePlatformFee(methodId, gross);
});

// Get filtered payment methods based on jasa's enabled methods
const availablePaymentMethods = computed(() => {
  return getFilteredPaymentMethods(order.paymentMethods);
});

// Group filtered methods by type
const groupedPaymentMethods = computed(() => {
  const enabledMethods = availablePaymentMethods.value;
  if (!enabledMethods.length) return [];

  const groups = [
    { title: 'Bayar Tunai', type: 'cod', items: [] },
    { title: 'QRIS', type: 'qris', items: [] },
    { title: 'Transfer Bank', type: 'va', items: [] },
    { title: 'E-Wallet', type: 'ewallet', items: [] },
    { title: 'Gerai Retail', type: 'retail', items: [] },
  ];

  enabledMethods.forEach(m => {
    const group = groups.find(g => g.type === m.type);
    if (group) group.items.push(m);
  });

  return groups.filter(g => g.items.length > 0);
});

// ===== Data dari query =====
const order = {
  jasaSlug: route.query.jasa_slug || "",
  merchantSlug: route.query.merchant_slug || "",
  merchantName: route.query.merchant_name || "",
  title: route.query.title || "Nama Jasa",
  image: route.query.image || "",
  price: Number(route.query.price || 0),
  tglISO: route.query.tgl || "",
  waktu: route.query.waktu || "",
  priceType: route.query.price_type || "",
  serviceType: route.query.service_type || "",
  paymentMethods: (route.query.payment_methods || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
};

const goBack = () => {
  router.back();
};

// ===== localStorage helpers =====
const LOCAL_BOOKINGS_KEY = "customer_service_bookings";

function saveLocalBooking(booking) {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((b) => String(b.id) !== String(booking.id));
    filtered.unshift(booking);
    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {
    console.error("[PembayaranJasa] saveLocalBooking error:", e);
  }
}

function getLocalBookings() {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Jenis layanan jasa (online / di lokasi penyedia / ke lokasi pelanggan)
const serviceType = ref(route.query.service_type || null);

// Mekanisme pemesanan: booking (dengan jadwal) atau keranjang (tanpa jadwal)
// Default kosong agar isBookingMechanism aman (false) kecuali route override
// Helper: ekstrak mekanisme dari data jasa API
// Primary: cara_pemesanan (DB: langsung_pesan | booking | memerlukan_konsultasi)
// Maps to FE format: keranjang | booking | konsultasi
const getMekanismeFromJasa = (jasaData) => {
  if (!jasaData) return null;

  // 1. order_method — FE format dari API (keranjang | booking | konsultasi)
  const om = jasaData?.order_method;
  if (om !== null && om !== undefined && om !== '' && String(om).trim() !== '') {
    const v = String(om).trim();
    console.log(`[PembayaranJasa] order_method dari API: "${v}"`);
    return v;
  }

  // 2. cara_pemesanan — DB format (langsung_pesan | booking | memerlukan_konsultasi)
  const cp = jasaData?.cara_pemesanan;
  if (cp !== null && cp !== undefined && cp !== '' && String(cp).trim() !== '') {
    const raw = String(cp).trim();
    // Map DB format to FE format
    const mapped = raw === 'langsung_pesan' ? 'keranjang'
      : (raw === 'memerlukan_konsultasi' ? 'konsultasi' : raw);
    console.log(`[PembayaranJasa] cara_pemesanan dari API: "${raw}" → "${mapped}"`);
    return mapped;
  }

  // 3. Fallback: mekanisme_pemesanan / booking_type
  const fallbackFields = ['mekanisme_pemesanan', 'booking_type', 'mechanism'];
  for (const f of fallbackFields) {
    const v = jasaData?.[f];
    if (v !== null && v !== undefined && v !== '' && String(v).trim() !== '') {
      console.log(`[PembayaranJasa] fallback field "${f}" dari API: "${String(v).trim()}"`);
      return String(v).trim();
    }
  }

  return null;
};

const mekanismePemesanan = ref(
  route.query.mekanisme_pemesanan ||
  route.query.order_type ||
  ''
);

// Helper: apakah ini checkout tanpa jadwal (keranjang)?
const isKeranjangCheckout = computed(() => {
  const m = String(mekanismePemesanan.value || '').toLowerCase();
  return ['keranjang', 'langsung_pesan', 'direct', 'checkout', 'tanpa_jadwal', 'cart', 'walk_in'].some((kw) => m.includes(kw));
});

// Helper: apakah ini booking dengan jadwal?
const isBookingMechanism = computed(() => {
  const m = String(mekanismePemesanan.value || '').toLowerCase().trim();
  if (!m) return false;
  return ['booking', 'scheduled', 'jadwal'].some((kw) => m.includes(kw));
});

// Format booking_time ke H:i yang valid
// Input: "14.00", "14.00 WIB", "14:00", "7:30" → Output: "14:00", "07:30"
// Return null jika format tidak valid (bukan HH:MM)
const formatTimeForApi = (time) => {
  if (!time) return null;
  const cleaned = String(time)
    .replace(/\s*WIB\s*$/gi, "")
    .replace(".", ":")
    .trim();
  // Validasi format: HH:MM
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = String(match[1]).padStart(2, '0');
  const minute = match[2];
  return `${hour}:${minute}`;
};

// Format tanggal untuk API payload — YYYY-MM-DD
const formatDateForApi = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return null;
  }
};

// ===== Form =====
const form = ref({
  nama: "",
  tel: "",
  alamat: String(serviceType.value || "").toLowerCase().includes("online") ? "Online" : (route.query.alamat || ""),
  catatan: route.query.catatan || "",
  tanggalISO: order.tglISO,
  tanggalLabel: fmtTanggal(order.tglISO),
  waktu: order.waktu || "—",
});

// Simpan data kontak dari jasa
const jasaWhatsappLink = ref("");

// Helper tanggal
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// ===== Nominal (default mengikuti harga jasa) =====
const amounts = ref({
  jasa: Number(order.price || 0),
  ongkir: 0,
  diskon: 0,
  platformFee: 0,
});

const total = computed(() => {
  const jasa = toNumber(amounts.value.jasa);
  const ongkir = toNumber(amounts.value.ongkir);
  const diskon = toNumber(amounts.value.diskon);
  const platformFee = toNumber(amounts.value.platformFee);
  const gross = Math.max(0, jasa + ongkir - diskon);
  return gross + platformFee;
});

// Label tipe harga untuk menandai harga tetap vs harga mulai
const orderPriceTypeLabel = computed(() => {
  if (order.priceType === "fixed") return "Harga Tetap";
  if (order.priceType === "base") return "Mulai dari";
  if (order.priceType === "cart") return "Keranjang (Tanpa Jadwal)";
  return "";
});

// Get human-readable name for selected payment method
const selectedPaymentMethodName = computed(() => {
  const allMethods = paymentMethodsList.value;
  const method = allMethods.find(m => m.id === selectedPayment);
  return method?.name || selectedPayment || '-';
});

// Pesan error / sukses untuk ditampilkan di layar (bukan alert browser)
const errorMessage = ref("");
const successMessage = ref("");

const clearNotification = () => {
  errorMessage.value = "";
  successMessage.value = "";
};

const isOnlineService = computed(() => serviceType.value === "online");
const isAtMerchantLocation = computed(() => serviceType.value === "di_tempat_umkm" || serviceType.value === "at_location");
const isHomeService = computed(() => {
  const type = String(serviceType.value || '').toLowerCase();
  return ['ke_rumah_pelanggan', 'on_site', 'rumah_pelanggan', 'home_service', 'customer_location', 'tempat_pelanggan'].some((kw) => type.includes(kw));
});

// Alamat wajib untuk layanan ke lokasi pelanggan
const isCustomerAddressRequired = computed(() => isHomeService.value);

// Alamat tidak wajib untuk layanan online dan di tempat UMKM
const addressRequired = computed(() => !isOnlineService.value && !isAtMerchantLocation.value);

function resolveMerchantAddress(merchant, jasaLocationAddress = "") {
  const locationCandidate = String(jasaLocationAddress || "").trim();
  if (locationCandidate) return locationCandidate;

  if (!merchant) return "";

  const primaryAddress = merchant.primary_address || merchant.primaryAddress;
  if (primaryAddress) {
    const parts = [
      primaryAddress.detail,
      primaryAddress.village,
      primaryAddress.district,
      primaryAddress.city,
      primaryAddress.province,
    ].filter(Boolean);

    const formatted = parts.join(", ").trim();
    if (formatted) return formatted;
  }

  return String(merchant.address || merchant.alamat || "").trim();
}

// Validasi sederhana form sebelum lanjut pembayaran
// Hanya butuh jadwal (tanggal & waktu). Data pemesan (nama & telp)
// sudah dicek terpisah di sendToChat.
const isFormValid = computed(() => {
  return (
    form.value.tanggalLabel !== "" &&
    !!form.value.waktu &&
    form.value.waktu !== ""
  );
});

// Helper validasi nama (huruf dan spasi) & telp (angka saja)
function isValidName(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Huruf (termasuk aksen sederhana), spasi, titik, koma, apostrof, dan tanda hubung
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/.test(trimmed);
}

function isValidPhone(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  // Hanya angka, minimal 8 digit supaya tidak terlalu pendek
  return /^[0-9]{8,}$/.test(trimmed);
}

// Normalisasi input nomor telepon agar hanya berisi digit
function onPhoneInput(event) {
  const raw = event.target.value || "";
  const digits = raw.replace(/[^0-9]/g, "");
  form.value.tel = digits;
}

// ===== Helpers =====

// Convert formatted currency string to number
// Handles formats like "Rp 1.500.000", "1.500.000", "Rp 150.000" -> 150000
function toNumber(value) {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const formatIDR = (v) => Number(v || 0).toLocaleString("id-ID");
function fmtTanggal(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ===== Promo State =====
const openPromo = ref(false);
const selectedPromo = ref(null);
const promos = ref([]);
const promosLoading = ref(false);

async function loadVouchersForJasa(merchantSlug) {
  if (!merchantSlug) return;
  promosLoading.value = true;
  try {
    const { data } = await api.get(
      `/api/checkout/${merchantSlug}/vouchers`,
      {
        params: { amount: toNumber(order.price) || 0 },
      },
    );

    const list = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

    promos.value = list.map((v) => ({
      code: v.voucher_code,
      title: v.voucher_name,
      desc: v.voucher_description || "",
      type: v.voucher_type === "percent" ? "percent" : "flat",
      value: v.value,
      raw: v,
    }));
  } catch (e) {
    console.error("[PembayaranJasa] Gagal memuat voucher merchant", e);
  } finally {
    promosLoading.value = false;
  }
}

function computeDiscount(promo) {
  if (!promo) return 0;

  const base = toNumber(order.price || 0);
  const raw = promo.raw || {};
  const type = raw.voucher_type || promo.type;
  const value = toNumber(raw.value ?? promo.value ?? 0);

  let discount = 0;
  if (type === "percent") {
    discount = Math.round((value / 100) * base);
    if (raw.max_discount_amount) {
      discount = Math.min(discount, toNumber(raw.max_discount_amount));
    }
  } else {
    discount = value;
  }

  return Math.max(0, Math.min(discount, base));
}

function usePromo(p) {
  if (!p) return;

  const discount = computeDiscount(p);
  if (discount <= 0) {
    selectedPromo.value = null;
    amounts.value.diskon = 0;
    return;
  }

  selectedPromo.value = p;
  amounts.value.diskon = discount;
  openPromo.value = false;
}

function clearPromo() {
  selectedPromo.value = null;
  amounts.value.diskon = 0;
}
// ===== Chat / WhatsApp integration =====
const showChat = ref(false);
const summaryText = ref("");
const showDetails = ref(false);

const authStore = useAuthStore();
const userStore = useUserStore();
const locatingDevice = ref(false);
const locatingError = ref("");
const deviceCoordinates = ref(null);

// Checkout state — cekah double-submit & tampilkan loading
const submitting = ref(false);

// Modal pilihan alamat (legacy, dipertahankan agar kompatibel)
const openAlamatOptions = ref(false);

// Coba gunakan alamat dari profil user (jika ada)
function useProfileAddress() {
  const user = authStore.user;
  const profileUser = userStore.user;
  // Prioritas: alamat lengkap dari profil user (full_address), lalu address/alamat biasa
  const candidate =
    profileUser?.full_address ||
    profileUser?.address ||
    profileUser?.alamat ||
    user?.address ||
    user?.alamat ||
    user?.profile?.address ||
    user?.profile?.alamat ||
    "";

  if (candidate) {
    form.value.alamat = candidate;
    openAlamatOptions.value = false;
    successMessage.value = "Alamat berhasil diisi dari profil.";
  } else {
    errorMessage.value =
      "Alamat profil belum tersedia. Silakan lengkapi profil terlebih dahulu.";
  }
}

// Helper: reverse geocode lat,lng menjadi alamat teks (best effort)
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat,
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    // gunakan display_name atau rangkai dari bagian alamat
    if (data.display_name) return data.display_name;
    if (data.address) {
      const a = data.address;
      const parts = [
        a.road,
        a.suburb,
        a.village || a.town || a.city,
        a.state,
        a.postcode,
        a.country,
      ].filter(Boolean);
      if (parts.length) return parts.join(", ");
    }
    return null;
  } catch (e) {
    console.error("Reverse geocode error", e);
    return null;
  }
}

async function requestDeviceLocation() {
  if (!navigator.geolocation) {
    locatingError.value = "Perangkat tidak mendukung pengambilan lokasi otomatis. Silakan isi alamat secara manual.";
    return;
  }

  locatingDevice.value = true;
  locatingError.value = "";
  clearNotification();

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });

    const latitude = position?.coords?.latitude;
    const longitude = position?.coords?.longitude;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new Error("Koordinat tidak valid");
    }

    deviceCoordinates.value = { latitude, longitude };

    const address = await reverseGeocode(latitude, longitude);
    if (address) {
      form.value.alamat = address;
      successMessage.value = "Lokasi berhasil terdeteksi dan alamat terisi otomatis.";
    } else {
      form.value.alamat = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      successMessage.value = "Koordinat ditemukan. Silakan lengkapi alamat secara manual.";
    }
  } catch (error) {
    console.error("[PembayaranJasa] Gagal mengambil lokasi device", error);
    if (error.code === 1) {
      locatingError.value = "Izin lokasi ditolak. Silakan isi alamat secara manual.";
    } else if (error.code === 2) {
      locatingError.value = "Lokasi tidak tersedia. Silakan isi alamat secara manual.";
    } else if (error.code === 3) {
      locatingError.value = " Waktu habis. Silakan coba lagi atau isi alamat manual.";
    } else {
      locatingError.value = "Gagal mengambil lokasi. Silakan isi alamat secara manual.";
    }
  } finally {
    locatingDevice.value = false;
  }
}

// Isi nama & nomor telepon dari profil user (opsional, tetap bisa diedit manual)
function useProfileContact() {
  const user = authStore.user;
  if (!user) {
    errorMessage.value =
      "Silakan login terlebih dahulu agar data pemesan bisa diambil dari profil.";
    return;
  }

  const nameCandidate = user.name || user.full_name || user.profile?.name || "";
  const phoneCandidate =
    user.phone || user.no_telp || user.profile?.phone || "";

  if (!nameCandidate && !phoneCandidate) {
    errorMessage.value =
      "Data nama dan nomor telepon di profil belum lengkap. Silakan lengkapi profil terlebih dahulu.";
    return;
  }

  if (nameCandidate) {
    form.value.nama = nameCandidate;
  }
  if (phoneCandidate) {
    form.value.tel = phoneCandidate;
  }

  successMessage.value =
    "Data pemesan berhasil diisi dari profil. Kamu masih bisa mengubahnya jika perlu.";
}

// Simpan merchant address yang diambil dari API
const merchantAddress = ref("");

// Ambil info jasa (WhatsApp link, merchant info, service type) saat halaman dibuka
onMounted(async () => {
  // Fetch payment fees from backend
  fetchPaymentFees();

  if (order.merchantSlug) {
    await loadVouchersForJasa(order.merchantSlug);
  }

  if (!order.jasaSlug) return;

  try {
    const { data } = await api.get(`/api/public/jasas/${encodeURIComponent(order.jasaSlug)}`);
    const payload = data?.data ?? data;

    // Prioritas sumber nomor WhatsApp penjual
    const rawWhatsapp =
      payload?.whatsapp_link ||
      payload?.merchant?.whatsapp ||
      payload?.merchant?.phone ||
      "";
    jasaWhatsappLink.value = rawWhatsapp;

    // Simpan merchant address untuk digunakan di localBooking
    const fetchedMerchantAddr = resolveMerchantAddress(
      payload?.merchant,
      payload?.location_address,
    );
    if (fetchedMerchantAddr) {
      merchantAddress.value = fetchedMerchantAddr;
    }

    // Isi merchant_name dari payload jika belum ada
    if (!order.merchantName && payload?.merchant?.name) {
      order.merchantName = payload.merchant.name;
    }

    // Otomatis isi alamat berdasarkan service_type
    if (payload?.service_type === 'at_location') {
      form.value.alamat = fetchedMerchantAddr;
    } else if (payload?.service_type === 'on_site') {
      form.value.alamat = '';
    }

    if (!order.merchantSlug && payload?.merchant?.slug) {
      await loadVouchersForJasa(payload.merchant.slug);
    }

    if (!serviceType.value && payload?.service_type) {
      serviceType.value = payload.service_type;
    }
  } catch (e) {
    console.error("[PembayaranJasa] Gagal mengambil data jasa", e);
  }
});

// Bangun pesan WhatsApp untuk dikirim ke penjual
// Format: Mendapat Pesanan Layanan Jasa Sumilir +
// data pemesan, jadwal, layanan, dan ringkasan pembayaran
function buildWhatsappMessage() {
  const lines = [];

  // Header
  lines.push("Mendapat Pesanan Layanan Jasa Sumilir");
  lines.push("");

  // Data pemesan
  lines.push("=== Data Pemesan ===");
  lines.push(`Nama Pemesan : ${form.value.nama || "-"}`);
  lines.push(`No. Telepon  : ${form.value.tel || "-"}`);
  lines.push("");

  // Jadwal layanan
  lines.push("=== Jadwal Layanan ===");
  if (form.value.tanggalLabel && form.value.tanggalLabel !== "—") {
    lines.push(`Tanggal : ${form.value.tanggalLabel}`);
  }
  if (form.value.waktu && form.value.waktu !== "—") {
    lines.push(`Waktu   : ${form.value.waktu}`);
  }
  lines.push("");

  // Detail layanan jasa
  lines.push("=== Layanan Jasa ===");
  lines.push(`Nama Jasa : ${order.title}`);
  lines.push(`Harga     : Rp ${formatIDR(order.price)}`);
  if (orderPriceTypeLabel.value) {
    lines.push(`Tipe Harga: ${orderPriceTypeLabel.value}`);
  }
  if (!isOnlineService.value) {
    lines.push(`Alamat    : ${form.value.alamat || "-"}`);
  }
  if (deviceCoordinates.value) {
    lines.push(
      `Koordinat : ${deviceCoordinates.value.latitude.toFixed(6)}, ${deviceCoordinates.value.longitude.toFixed(6)}`
    );
  }
  if (form.value.catatan) {
    lines.push(`Catatan   : ${form.value.catatan}`);
  }
  lines.push("");

  // Ringkasan pembayaran
  lines.push("=== Ringkasan Pembayaran ===");
  lines.push(`Harga Jasa       : Rp ${formatIDR(toNumber(amounts.value.jasa))}`);
  lines.push(`Biaya Pengantaran: Rp ${formatIDR(toNumber(amounts.value.ongkir))}`);
  if (selectedPromo.value) {
    lines.push(
      `Diskon (${selectedPromo.value.code}) : Rp ${formatIDR(
        toNumber(amounts.value.diskon),
      )}`,
    );
  } else {
    lines.push(`Diskon            : Rp ${formatIDR(toNumber(amounts.value.diskon))}`);
  }
  lines.push(`Total Pembayaran  : Rp ${formatIDR(toNumber(total.value) || order.price)}`);

  return lines.join("\n");
}

const sendToChat = async () => {
  // reset pesan
  errorMessage.value = "";
  successMessage.value = "";

  // Cegah double-submit
  if (submitting.value) return;
  submitting.value = true;

  try {
    // ===== Validasi form =====
    if (!form.value.nama || !isValidName(form.value.nama)) {
      errorMessage.value = "Nama wajib diisi dan hanya boleh berisi huruf.";
      return;
    }

    if (!form.value.tel || !isValidPhone(form.value.tel)) {
      errorMessage.value = "Nomor telepon wajib diisi dan hanya boleh berisi angka (min. 8 digit).";
      return;
    }

    if (isCustomerAddressRequired.value && !String(form.value.alamat || '').trim()) {
      errorMessage.value = "Alamat layanan wajib diisi terlebih dahulu.";
      return;
    }

    // Validasi jadwal: hanya untuk mekanisme Booking
    // Keranjang/tanpa jadwal langsung skip validasi jadwal
    console.log("[PembayaranJasa] Mekanisme:", mekanismePemesanan.value, "| isBookingMechanism:", isBookingMechanism.value);
    if (isBookingMechanism.value) {
      if (!isFormValid.value) {
        errorMessage.value = "Mohon lengkapi data pemesan dan jadwal terlebih dahulu.";
        return;
      }

      const parsedTime = formatTimeForApi(form.value.waktu);
      if (!parsedTime) {
        errorMessage.value = "Format waktu booking tidak valid. Gunakan format HH:MM, contoh: 14:00.";
        return;
      }
    }
    // Keranjang/tanpa jadwal: tidak perlu validasi tanggal dan jam

    // ===== Helpers =====
    const cleanValue = (val) => {
      if (val === null || val === undefined || val === "") return null;
      if (val === "—" || val === "-" || val === "null" || val === "undefined") return null;
      return val;
    };

    // ===== Kirim ke backend — WAJIB SUKSES =====
    let jasaId = null;
    let jasaDataForLog = null;
    let fetchedJasaData = null;
    try {
      const { data: jasaData } = await api.get(`/api/public/jasas/${encodeURIComponent(order.jasaSlug)}`);
      jasaId = jasaData?.id || jasaData?.data?.id || null;
      jasaDataForLog = jasaData;
      fetchedJasaData = jasaData?.data || jasaData; // normalize
      console.log("[PembayaranJasa] Fetch jasa:", { jasaId, raw: jasaData });
    } catch (e) {
      // Jika 404 (jasa tidak ditemukan), tetap lanjut dengan fallback
      const isNotFound = e.response?.status === 404;
      console.warn(`[PembayaranJasa] Gagal fetch jasa (${isNotFound ? '404' : 'other'}):`, e.response?.data);
      if (!isNotFound) {
        errorMessage.value = "Gagal memuat data jasa. Silakan coba lagi.";
        return;
      }
      // Fallback: coba dari query param
      jasaId = route.query.jasa_id || null;
    }

    // ===== Override mekanisme dari data jasa API (prioritas tertinggi) =====
    const apiMekanisme = getMekanismeFromJasa(fetchedJasaData);
    if (apiMekanisme) {
      mekanismePemesanan.value = apiMekanisme;
      console.log(`[PembayaranJasa] Mekanisme di-override dari API: "${apiMekanisme}"`);
      console.log(`[PembayaranJasa] isKeranjangCheckout: ${isKeranjangCheckout.value} | isBookingMechanism: ${isBookingMechanism.value}`);
    } else {
      console.log(`[PembayaranJasa] Mekanisme dari API kosong — pakai route query / default kosong`);
      console.log(`[PembayaranJasa] isKeranjangCheckout: ${isKeranjangCheckout.value} | isBookingMechanism: ${isBookingMechanism.value}`);
    }

    if (!jasaId) {
      errorMessage.value = "Data jasa tidak ditemukan. Silakan ulangi.";
      return;
    }

    // ===== Bangun payload =====
    // order_method: mekanisme pemesanan (FE format: keranjang | booking | konsultasi)
    const mappedOrderMethod = isKeranjangCheckout.value ? 'keranjang' : (isBookingMechanism.value ? 'booking' : 'keranjang');

    const orderPayload = {
      jasa_id: jasaId,
      service_name: order.title,
      service_type: serviceType.value,
      customer_name: form.value.nama,
      customer_phone: form.value.tel,
      customer_address: cleanValue(form.value.alamat),
      booking_date: isKeranjangCheckout.value ? null : formatDateForApi(form.value.tanggalISO),
      booking_time: isKeranjangCheckout.value ? null : formatTimeForApi(form.value.waktu),
      booking_note: cleanValue(form.value.catatan),
      // order_method: mekanisme pemesanan (PRIMARY - keranjang | booking | konsultasi)
      order_method: mappedOrderMethod,
      payment_method: selectedPayment.value?.toUpperCase() === 'COD' ? 'COD' : 'xendit', // abstract/consistent value
      payment_channel: paymentChannel.value, // actual channel e.g. BCA, QRIS, etc.
      channel_code: paymentChannel.value, // explicit channel code
      subtotal: toNumber(amounts.value.jasa), // service price before fee
      total_price: toNumber(total.value) || toNumber(order.price) || 0, // includes fee
      latitude: deviceCoordinates.value?.latitude ?? null,
      longitude: deviceCoordinates.value?.longitude ?? null,
    };

    console.log('[PembayaranJasa] Service Order Payload:', orderPayload);
    console.log('[PembayaranJasa] Payload fields:', {
      jasa_id: orderPayload.jasa_id,
      service_type: orderPayload.service_type,
      customer_name: orderPayload.customer_name,
      customer_phone: orderPayload.customer_phone,
      customer_address: orderPayload.customer_address,
      booking_date: orderPayload.booking_date,
      booking_time: orderPayload.booking_time,
      order_method: orderPayload.order_method,
      payment_method: orderPayload.payment_method,
      payment_channel: orderPayload.payment_channel,
      subtotal: orderPayload.subtotal,
      total_price: orderPayload.total_price,
    });

    // ===== Debug: log semua info yang diperlukan =====
    console.log('[PembayaranJasa] selectedPayment (channel):', selectedPayment.value);
    console.log('[PembayaranJasa] paymentMethod (abstract):', paymentMethod.value);
    console.log('[PembayaranJasa] paymentChannel (for backend):', paymentChannel.value);
    console.log('[PembayaranJasa] Available methods:', availablePaymentMethods.value.map(m => m.id));

    // ===== Kirim ke backend — WAJIB SUKSES =====
    const response = await api.post("/api/jasa-orders", orderPayload);
    console.log('[PembayaranJasa] Full response:', response);
    console.log('[PembayaranJasa] Response.data:', response.data);

    // ApiResponse::success → { message, data: { success, order_id, ... } }
    const responseData = response.data?.data || response.data;
    console.log('[PembayaranJasa] Normalized responseData:', responseData);

    // ===== Ambil order_id / jasa_order_item_id =====
    // Support multiple field names: order_id, jasa_order_item_id, id (fallback)
    const orderId =
      responseData?.order_id ||
      responseData?.jasa_order_item_id ||
      responseData?.id;

    if (!orderId) {
      console.error('[PembayaranJasa] Response tanpa order_id:', response.data);
      errorMessage.value = response.data?.message || 'Gagal membuat pesanan. ID pesanan tidak ditemukan.';
      return;
    }

    // Simpan payment_id, external_id, order_id, jasa_order_item_id jika tersedia
    const paymentId = responseData?.payment_id || null;
    const externalId = responseData?.external_id || null;
    const jasaOrderItemId = responseData?.jasa_order_item_id || null;
    console.log('[PembayaranJasa] Order IDs:', { orderId, paymentId, externalId, jasaOrderItemId });

    // ===== Cek apakah ini payment COD atau Xendit =====
    const isCodPayment = selectedPayment.value?.toUpperCase() === 'COD' || paymentMethod.value === 'COD';
    console.log('[PembayaranJasa] Payment check:', {
      selectedPayment: selectedPayment.value,
      paymentMethod: paymentMethod.value,
      isCodPayment: isCodPayment
    });

    // ===== XENDIT: Cek apakah invoice_url sudah ada di response (BE bikin langsung) =====
    const directInvoiceUrl = responseData?.invoice_url;
    if (directInvoiceUrl) {
      console.log('[PembayaranJasa] invoice_url langsung dari response, redirect...');
      window.location.href = directInvoiceUrl;
      return;
    }

    // ===== XENDIT: Panggil PaymentController untuk buat invoice =====
    if (!isCodPayment) {
      console.log('[PembayaranJasa] Calling PaymentController for Xendit invoice...');

      try {
        const invoiceResponse = await api.post(`/api/payments/${orderId}/invoice`, {
          payment_method: selectedPayment.value?.toUpperCase() === 'COD' ? 'COD' : 'xendit',
          payment_channel: paymentChannel.value,
          channel_code: paymentChannel.value
        });
        console.log('[PembayaranJasa] Invoice response:', invoiceResponse);

        const invoiceData = invoiceResponse.data?.data || invoiceResponse.data;
        const invoiceUrl = invoiceData?.invoice_url;

        if (invoiceUrl) {
          console.log('[PembayaranJasa] Redirecting to Xendit invoice:', invoiceUrl);
          window.location.href = invoiceUrl;
          return;
        }

        // Invoice dibuat tapi URL kosong - error
        console.error('[PembayaranJasa] Invoice created but URL missing:', invoiceData);
        errorMessage.value = 'Invoice berhasil dibuat tapi URL tidak ditemukan. Hubungi admin.';
        return;
      } catch (invoiceError) {
        console.error('[PembayaranJasa] Invoice creation failed:', invoiceError);
        errorMessage.value = invoiceError.response?.data?.message || 'Gagal membuat invoice pembayaran. Silakan coba lagi.';
        return;
      }
    }

    // ===== COD: redirect ke Pesanan Saya =====
    console.log('[PembayaranJasa] COD payment - redirecting to orders');
    router.push('/orders');
    return;

  } catch (err) {
    console.error("[PembayaranJasa] Error checkout:", err);
    console.error("[PembayaranJasa] Status:", err.response?.status);
    console.error("[PembayaranJasa] Response Data:", err.response?.data);
    console.error("[PembayaranJasa] Validation Errors:", err.response?.data?.errors);

    const backendMessage = err.response?.data?.message;
    const validationErrors = err.response?.data?.errors;

    if (validationErrors) {
      // Tampilkan semua error validasi dari backend
      const allErrors = Object.entries(validationErrors)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join(' | ');
      errorMessage.value = allErrors || "Validasi gagal. Periksa kembali data Anda.";
    } else if (backendMessage) {
      errorMessage.value = backendMessage;
    } else if (err.request) {
      errorMessage.value = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
    } else {
      errorMessage.value = "Terjadi kesalahan. Silakan coba lagi.";
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
