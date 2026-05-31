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
            <div class="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
              <label
                class="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition text-xs sm:text-sm"
                :class="
                  pay.method === 'COD'
                    ? 'bg-merchant-primary text-white border-merchant-primary shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-merchant-primary/70'
                "
              >
                <input
                  type="radio"
                  value="COD"
                  v-model="pay.method"
                  class="accent-merchant-primary"
                />
                <span>COD</span>
              </label>
              <label
                v-if="
                  order.paymentMethods.includes('qris') ||
                  order.paymentMethods.includes('QRIS')
                "
                class="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition text-xs sm:text-sm"
                :class="
                  pay.method === 'QRIS'
                    ? 'bg-merchant-primary text-white border-merchant-primary shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-merchant-primary/70'
                "
              >
                <input
                  type="radio"
                  value="QRIS"
                  v-model="pay.method"
                  class="accent-merchant-primary"
                />
                <span>QRIS</span>
              </label>
            </div>

            <div class="pt-2 space-y-1 text-sm text-gray-700">
              <div class="flex justify-between">
                <span>Harga Jasa</span>
                <span>Rp {{ formatIDR(amounts.jasa) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Biaya Pengantaran</span>
                <span>Rp {{ formatIDR(amounts.ongkir) }}</span>
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
                      <div class="flex gap-2">
                        <button type="button" class="flex-1 py-2 text-sm rounded-xl border-2 transition" :class="pay.method === 'COD' ? 'bg-merchant-primary text-white border-merchant-primary font-semibold' : 'bg-white text-gray-600 border-gray-200 hover:border-merchant-primary'" @click="pay.method = 'COD'">
                          COD
                        </button>
                        <button v-if="order.paymentMethods.includes('qris') || order.paymentMethods.includes('QRIS')" type="button" class="flex-1 py-2 text-sm rounded-xl border-2 transition" :class="pay.method === 'QRIS' ? 'bg-merchant-primary text-white border-merchant-primary font-semibold' : 'bg-white text-gray-600 border-gray-200 hover:border-merchant-primary'" @click="pay.method = 'QRIS'">
                          QRIS
                        </button>
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
                      <span class="px-2 py-0.5 rounded-full bg-merchant-primary/10 text-merchant-primary text-xs font-semibold">{{ pay.method }}</span>
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
                <button class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#FFA30E] to-[#ffba3d] hover:from-[#e5920d] hover:to-[#ffb024] text-white font-bold text-sm transition shadow-lg shadow-amber-500/20" @click="sendToChat">
                  <i class="pi pi-send text-sm"></i>
                  Booking Sekarang
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

const route = useRoute();
const router = useRouter();
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
const mekanismePemesanan = ref(
  route.query.mekanisme_pemesanan ||
  route.query.booking_type ||
  route.query.order_type ||
  'booking'
);

// Helper: apakah ini checkout tanpa jadwal (keranjang)?
const isKeranjangCheckout = computed(() => {
  const m = String(mekanismePemesanan.value || '').toLowerCase();
  return ['keranjang', 'checkout', 'tanpa_jadwal', 'cart', 'walk_in'].some((kw) => m.includes(kw));
});

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
});

const total = computed(() =>
  Math.max(0, amounts.value.jasa + amounts.value.ongkir - amounts.value.diskon),
);

// Label tipe harga untuk menandai harga tetap vs harga mulai
const orderPriceTypeLabel = computed(() => {
  if (order.priceType === "fixed") return "Harga Tetap";
  if (order.priceType === "base") return "Mulai dari";
  if (order.priceType === "cart") return "Keranjang (Tanpa Jadwal)";
  return "";
});
// Default metode: jika jasa hanya punya 1 metode, pakai itu; kalau tidak, COD.
const pay = ref({
  method:
    order.paymentMethods.length === 1 &&
    ["COD", "cod", "QRIS", "qris"].includes(order.paymentMethods[0])
      ? order.paymentMethods[0].toUpperCase()
      : "COD",
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
        params: { amount: order.price || 0 },
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

  const base = Number(order.price || 0);
  const raw = promo.raw || {};
  const type = raw.voucher_type || promo.type;
  const value = Number(raw.value ?? promo.value ?? 0);

  let discount = 0;
  if (type === "percent") {
    discount = Math.round((value / 100) * base);
    if (raw.max_discount_amount) {
      discount = Math.min(discount, Number(raw.max_discount_amount));
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
  lines.push(`Harga Jasa       : Rp ${formatIDR(amounts.value.jasa)}`);
  lines.push(`Biaya Pengantaran: Rp ${formatIDR(amounts.value.ongkir)}`);
  if (selectedPromo.value) {
    lines.push(
      `Diskon (${selectedPromo.value.code}) : Rp ${formatIDR(
        amounts.value.diskon,
      )}`,
    );
  } else {
    lines.push(`Diskon            : Rp ${formatIDR(amounts.value.diskon)}`);
  }
  lines.push(`Total Pembayaran  : Rp ${formatIDR(total.value || order.price)}`);

  return lines.join("\n");
}

const sendToChat = async () => {
  // reset pesan
  errorMessage.value = "";
  successMessage.value = "";
  const submitting = ref(false);

  // Validasi khusus nama & nomor telepon
  if (!form.value.nama || !isValidName(form.value.nama)) {
    errorMessage.value = "Nama wajib diisi dan hanya boleh berisi huruf.";
    return;
  }

  if (!form.value.tel || !isValidPhone(form.value.tel)) {
    errorMessage.value =
      "Nomor telepon wajib diisi dan hanya boleh berisi angka (min. 8 digit).";
    return;
  }

  if (isCustomerAddressRequired.value && !String(form.value.alamat || '').trim()) {
    errorMessage.value = "Alamat layanan wajib diisi terlebih dahulu.";
    return;
  }

  // Validasi jadwal untuk booking (non-keranjang)
  if (!isKeranjangCheckout.value && !isFormValid.value) {
    errorMessage.value = "Mohon lengkapi data pemesan dan jadwal terlebih dahulu.";
    return;
  }

  // Skip jadwal validation untuk keranjang checkout
  if (isKeranjangCheckout.value && !form.value.nama) {
    errorMessage.value = "Mohon lengkapi data pemesan terlebih dahulu.";
    return;
  }

  // ===== Helpers untuk API payload =====
  // Format booking_time ke H:i (backend requirement: "14:00", bukan "14.00" atau "14.00 WIB")
  const formatBookingTimeForApi = (time) => {
    if (!time) return null;
    return String(time)
      .replace(/\s*WIB\s*$/gi, "")
      .replace(".", ":")
      .trim();
  };

  // Map payment_method UI label → backend enum
  const paymentMethodMap = {
    "COD": "cod",
    "QRIS": "qris",
    "Bayar di Tempat": "cash",
    "cash": "cash",
    "cod": "cod",
    "qris": "qris",
  };

  // Map payment_method backend → UI display label
  const paymentMethodDisplayMap = {
    "cash": "Bayar di Tempat",
    "cod": "COD",
    "qris": "QRIS",
    "manual_transfer": "Transfer Manual",
  };

  const getBackendPaymentMethod = (uiMethod) => {
    if (!uiMethod) return "cash";
    return paymentMethodMap[uiMethod] || "cash";
  };

  const getPaymentMethodDisplayLabel = (backendMethod) => {
    if (!backendMethod) return "Bayar di Tempat";
    return paymentMethodDisplayMap[backendMethod] || backendMethod;
  };

  submitting.value = true;

  // 1. Buat service order di backend
  let orderId = null;
  let whatsappRedirectUrl = null;

  try {
    // Ambil jasa_id dari data yang sudah di-fetch di onMounted
    let jasaId = null;
    try {
      const { data: jasaData } = await api.get(`/api/public/jasas/${encodeURIComponent(order.jasaSlug)}`);
      // API returns {id,...} directly, not wrapped
      jasaId = jasaData?.id || jasaData?.data?.id || null;
      console.log("[PembayaranJasa] jasa_id:", jasaId, "raw:", jasaData);
    } catch (e) {
      console.warn("[PembayaranJasa] Gagal fetch jasa:", e);
      jasaId = route.query.jasa_id || null;
    }

    if (!jasaId) {
      errorMessage.value = "Data jasa tidak ditemukan. Silakan ulangi.";
      return;
    }

    // Helper to clean nullable values
    const cleanValue = (val) => {
      if (val === null || val === undefined || val === "") return null;
      if (val === "—" || val === "-" || val === "null" || val === "undefined") return null;
      return val;
    };

    const orderPayload = {
      jasa_id: jasaId,
      service_name: order.title,
      service_type: serviceType.value,
      customer_name: form.value.nama,
      customer_phone: form.value.tel,
      customer_address: cleanValue(form.value.alamat),
      // Keranjang/checkout tanpa jadwal: jangan kirim booking_date/booking_time
      booking_date: isKeranjangCheckout.value ? null : cleanValue(form.value.tanggalISO),
      booking_time: isKeranjangCheckout.value ? null : formatBookingTimeForApi(form.value.waktu),
      booking_note: cleanValue(form.value.catatan),
      booking_type: isKeranjangCheckout.value ? 'keranjang' : 'booking',
      payment_method: getBackendPaymentMethod(pay.method),
      total_price: total.value || order.price || 0,
      latitude: deviceCoordinates.value?.latitude ?? null,
      longitude: deviceCoordinates.value?.longitude ?? null,
      merchant_name: order.merchantSlug || '',
      merchant_slug: order.merchantSlug || '',
      service_image: order.image || '',
    };

    console.log("[PembayaranJasa] Creating order with payload:", orderPayload);
    const { data: orderData } = await api.post("/api/service-orders", orderPayload).catch((err) => {
      console.error("[PembayaranJasa] Order API error:", err.response?.data);
      throw err;
    });
    console.log("[PembayaranJasa] Order response:", orderData);

    // ApiResponse::success returns { message, data: { id, ... } }
    // Handle both { success: true, data: { id } } and { message, data: { id } }
    const createdOrder = orderData?.data;
    if (createdOrder?.id) {
      orderId = createdOrder.id;

      // Simpan ke localStorage sebagai backup (agar muncul di history meskipun API pending/bermasalah)
      const localBooking = {
        id: orderId,
        service_name: order.title,
        service_type: serviceType.value || order.serviceType || 'on_site',
        booking_type: 'booking',
        merchant_name: order.merchantName || createdOrder?.merchant_name || order.merchantSlug || '',
        merchant_slug: order.merchantSlug || createdOrder?.merchant_slug || '',
        merchant_address: merchantAddress.value || '',
        customer_name: form.value.nama,
        customer_phone: form.value.tel,
        customer_address: form.value.alamat || '',
        booking_date: form.value.tanggalISO || order.tglISO || null,
        booking_time: form.value.waktu || null,
        booking_note: form.value.catatan || '',
        payment_method: pay.method || 'COD',
        total_price: total.value || order.price || 0,
        latitude: deviceCoordinates.value?.latitude ?? null,
        longitude: deviceCoordinates.value?.longitude ?? null,
        service_image: order.image || '',
        status: 'menunggu_konfirmasi_merchant',
        created_at: new Date().toISOString(),
      };
      saveLocalBooking(localBooking);

      // 2. Dapatkan WhatsApp redirect URL dari backend
      try {
        const { data: waData } = await api.post(
          `/api/service-orders/${orderId}/redirect-whatsapp`,
          { order_id: orderId }
        ).catch((err) => {
          console.warn("[PembayaranJasa] WhatsApp redirect failed:", err.response?.data);
          return { data: { redirect_url: null } };
        });
        whatsappRedirectUrl = waData?.data?.redirect_url || null;
        console.log("[PembayaranJasa] WhatsApp URL:", whatsappRedirectUrl);
      } catch {
        // WhatsApp redirect gagal, lanjut dengan link manual
        whatsappRedirectUrl = null;
      }
    }
  } catch (err) {
    console.error("[PembayaranJasa] Gagal membuat service order:", err);
    if (err.response) {
      console.error("Status:", err.response.status, "Data:", err.response.data);
      errorMessage.value = err.response.data?.message || "Gagal membuat pesanan. Silakan coba lagi.";
    }
    // Tetap simpan ke localStorage sebagai fallback agar muncul di history
    const fallbackBooking = {
      id: "local_" + Date.now(),
      service_name: order.title,
      service_type: serviceType.value || order.serviceType || "on_site",
      booking_type: "booking",
      merchant_name: order.merchantName || order.merchantSlug || "",
      merchant_slug: order.merchantSlug || "",
      merchant_address: merchantAddress.value || "",
      customer_name: form.value.nama,
      customer_phone: form.value.tel,
      customer_address: form.value.alamat || "",
      booking_date: form.value.tanggalISO || order.tglISO || null,
      booking_time: form.value.waktu || null,
      booking_note: form.value.catatan || "",
      payment_method: pay.method || "COD",
      total_price: total.value || order.price || 0,
      latitude: deviceCoordinates.value?.latitude ?? null,
      longitude: deviceCoordinates.value?.longitude ?? null,
      service_image: order.image || "",
      status: "menunggu_konfirmasi_merchant",
      created_at: new Date().toISOString(),
      is_local: true,
    };
    saveLocalBooking(fallbackBooking);
    orderId = fallbackBooking.id;
  } finally {
    submitting.value = false;
  }

  // 3. Bangun pesan WhatsApp
  const message = buildWhatsappMessage();
  if (!message) return;

  let url = whatsappRedirectUrl || jasaWhatsappLink.value;

  if (!url) {
    errorMessage.value =
      "Nomor atau link WhatsApp penjual belum tersedia. Silakan hubungi penjual secara manual.";
    return;
  }

  // Jika URL dari backend, gunakan langsung; jika tidak, bangun dari nomor manual
  if (!url.startsWith("http") && !url.startsWith("wa.me")) {
    const phone = url.replace(/[^0-9]/g, "");
    url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  } else if (url.startsWith("http")) {
    url += url.includes("?") ? `&text=${encodeURIComponent(message)}` : `?text=${encodeURIComponent(message)}`;
  }

  // Buka WhatsApp
  window.open(url, "_blank");

  // 4. Redirect ke halaman konfirmasi
  const params = new URLSearchParams({
    order_id: orderId || "pending",
    jasa_id: route.query.jasa_id || "",
    merchant_slug: order.merchantSlug || "",
    merchant_name: order.merchantName || "",
    merchant_address: merchantAddress.value || "",
    jasa_title: order.title,
    service_type: serviceType.value || order.serviceType || "on_site",
    booking_type: "booking",
    nama: form.value.nama,
    tel: form.value.tel,
    alamat: form.value.alamat || "",
    tanggal: form.value.tanggalISO || order.tglISO,
    waktu: form.value.waktu,
    payment_method: pay.method || "Bayar di Tempat",
    total: total.value || order.price,
    catatan: form.value.catatan || "",
    service_image: order.image || "",
  });

  if (order.jasaSlug) {
    params.set("jasa_slug", order.jasaSlug);
  }

  router.push({
    path: "/booking-confirmation",
    query: Object.fromEntries(params),
  });
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
