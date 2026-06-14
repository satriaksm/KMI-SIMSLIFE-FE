<template>
  <div class="min-h-screen pb-32 bg-gradient-to-b from-gray-50 via-white to-gray-100 sm:pb-28">
    <!-- Gambar header (mobile/tablet) -->
    <div class="relative w-full h-48 overflow-hidden bg-gray-200 sm:h-60 lg:h-72 lg:hidden">
      <img :src="jasaImage" @error="onImgError($event, 'header')" class="object-cover w-full h-full" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
      <!-- Tombol kembali -->
      <button
        type="button"
        class="absolute z-20 flex items-center justify-center text-white transition rounded-full shadow-md top-3 left-3 w-9 h-9 bg-black/35 backdrop-blur-sm hover:bg-black/50"
        @click="goBack"
        aria-label="Kembali"
      >
        <i class="text-sm pi pi-arrow-left"></i>
      </button>
    </div>

    <!-- Preview galeri di bawah cover (mobile/tablet) -->
    <section
      v-if="jasa?.images && jasa.images.length > 1"
      class="px-4 pt-3 pb-2 bg-white border-b border-gray-100 lg:hidden"
    >
      <div class="max-w-3xl mx-auto lg:max-w-5xl">
        <h2 class="mb-2 text-xs font-semibold text-gray-700">
          Galeri Layanan
        </h2>
        <div class="flex gap-2 pb-1 overflow-x-auto">
          <button
            v-for="img in jasa.images"
            :key="img.id || img.path || img.image"
            type="button"
            class="relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border text-[10px] bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#FFA30E] focus:ring-offset-1"
            :class="[
              jasa.images.indexOf(img) === selectedImageIndex.value
                ? 'border-[#FFA30E]'
                : 'border-gray-200'
            ]"
            @click="onSelectGalleryImage(img)"
          >
            <img
              :src="resolveJasaAssetSrc(img)"
              class="object-cover w-full h-full"
              @error="onImgError($event, 'gallery')"
            />
            <span
              v-if="img.is_cover"
              class="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[9px] py-0.5 text-center"
            >
              Cover
            </span>
          </button>
        </div>
      </div>
    </section>

    <!-- Info utama -->
    <div v-if="jasa" class="px-4 py-4 border-b border-gray-100 shadow-sm bg-white/95">
      <div class="max-w-3xl mx-auto lg:max-w-5xl lg:grid lg:grid-cols-12 lg:gap-6">
        <!-- Kolom kiri (desktop): gambar & galeri -->
        <div class="hidden lg:flex lg:flex-col lg:gap-3 lg:col-span-5">
          <div class="relative w-full h-64 overflow-hidden bg-gray-200 rounded-2xl">
            <img
              :src="jasaImage"
              @error="onImgError($event, 'header')"
              class="object-cover w-full h-full"
            />
            <button
              v-if="jasa?.images && jasa.images.length > 1"
              @click="prevGalleryImage"
              class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-gray-700 transition active:scale-95"
            >
              <i class="pi pi-chevron-left text-sm"></i>
            </button>
            <button
              v-if="jasa?.images && jasa.images.length > 1"
              @click="nextGalleryImage"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-gray-700 transition active:scale-95"
            >
              <i class="pi pi-chevron-right text-sm"></i>
            </button>
            <div class="absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent"></div>
          </div>
          <div
            v-if="jasa?.images && jasa.images.length > 1"
            class="flex gap-2 pb-1 overflow-x-auto no-scrollbar"
          >
            <button
              v-for="img in jasa.images"
              :key="img.id || img.path || img.image"
              type="button"
              class="relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border text-[10px] bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#FFA30E] focus:ring-offset-1"
              :class="[
                jasa.images.indexOf(img) === selectedImageIndex.value
                  ? 'border-[#FFA30E]'
                  : 'border-gray-200'
              ]"
              @click="onSelectGalleryImage(img)"
            >
              <img
                :src="resolveJasaAssetSrc(img)"
                class="object-cover w-full h-full"
                @error="onImgError($event, 'gallery')"
              />
              <span
                v-if="img.is_cover"
                class="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[9px] py-0.5 text-center"
              >
                Cover
              </span>
            </button>
          </div>
        </div>

        <!-- Kolom kanan: Info Toko & Info Jasa -->
        <div class="lg:col-span-7">
          <!-- Info Toko -->
          <div class="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
        <div class="flex items-center justify-center w-12 h-12 overflow-hidden bg-gray-100 rounded-full shrink-0">
          <img 
                v-if="jasa?.merchant?.id || jasa?.merchant?.logo_path || jasa?.merchant?.logo_url" 
            :src="getMerchantLogo(jasa.merchant.logo_path)" 
            alt="Logo Toko" 
            class="object-cover w-full h-full"
            @error="onImgError($event, 'logo')"
          />
          <i v-else class="text-xl text-gray-400 pi pi-shop"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold text-gray-900 truncate">
            {{ jasa?.merchant?.name || '-' }}
          </h2>
          <p class="text-xs text-gray-500">
            {{ jasa?.merchant?.segmentation?.name || '-' }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <router-link
            v-if="jasa?.merchant?.slug"
            :to="{ name: 'Merchant Detail', params: { slug: jasa.merchant.slug } }"
            class="px-3 py-1.5 rounded-lg bg-[#FFA30E] text-white text-xs font-semibold shrink-0 hover:bg-[#e5920d] transition"
          >
            Kunjungi
          </router-link>
          <router-link
            v-if="jasa?.merchant?.slug"
            :to="{ name: 'Merchant Detail', params: { slug: jasa.merchant.slug }, hash: '#reviews' }"
            class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold shrink-0 hover:bg-gray-100 transition"
          >
            Ulasan
          </router-link>
          <button
            v-else
            class="px-3 py-1.5 rounded-lg bg-[#FFA30E] text-white text-xs font-semibold shrink-0"
          >
            Kunjungi
          </button>
        </div>
      </div>

      <!-- Info Jasa -->
      <div class="mt-3">
        <h1 class="text-lg font-semibold leading-snug text-gray-900 sm:text-xl">
          {{ jasa?.title || '-' }}
        </h1>

        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-xl font-semibold text-merchant-primary">
            {{ priceDisplayMain }}
          </span>
          <span
            v-if="priceTypeLabel"
            class="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
            :class="priceTypeLabel === 'Harga Tetap' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'"
          >
            {{ priceTypeLabel }}
          </span>
        </div>

        <!-- badge & info -->
        <div class="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
          <span v-if="jasa?.estimated_duration" class="flex items-center gap-1.5">
            <img :src="jamIcon" alt="durasi" class="w-3.5 h-3.5" />
            <span>Perkiraan durasi {{ jasa.estimated_duration }}</span>
          </span>
        </div>

        <!-- Deskripsi Jasa -->
        <div class="mt-4">
          <h2 class="flex items-center gap-2 mb-1 text-sm font-semibold text-gray-900">
            <i class="pi pi-info-circle text-merchant-primary"></i>
            Deskripsi Jasa
          </h2>
          <p class="text-[14px] leading-relaxed text-gray-700">
            {{ jasaDesc }}
          </p>
        </div>
      </div>
        </div>
      </div>
    </div>

    <!-- Lokasi & Tipe Layanan -->
    <section
      v-if="jasa?.service_type || jasa?.location_address || merchantAddress"
      class="px-4 py-4 mt-3 bg-white/95"
    >
      <div class="max-w-3xl mx-auto lg:max-w-5xl">
        <h2
          class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5"
        >
          <i class="pi pi-map-marker text-merchant-primary"></i>
          Lokasi & Layanan
        </h2>

        <div class="space-y-2 text-sm">
          <div v-if="jasa?.service_type" class="flex items-center justify-between">
            <span class="text-gray-600 flex items-center gap-1.5">
              <i class="text-gray-500 pi pi-briefcase"></i>
              Tipe Layanan
            </span>
            <span class="font-medium text-gray-900">
              {{ serviceTypeLabel }}
            </span>
          </div>

          <div v-if="jasa?.cara_pemesanan" class="flex items-center justify-between">
            <span class="text-gray-600 flex items-center gap-1.5">
              <i class="text-gray-500 pi pi-list"></i>
              Mekanisme Pemesanan
            </span>
            <span class="font-medium text-gray-900">
              {{ serviceBookingLabel }}
            </span>
          </div>

          <!-- Display available operating times for booking mode -->
          <div v-if="isBookingMode && hasOperatingTimes" class="flex items-start justify-between">
            <span class="text-gray-600 flex items-center gap-1.5">
              <i class="text-gray-500 pi pi-clock"></i>
              Jam Layanan
            </span>
            <span class="font-medium text-gray-900 text-right text-sm">
              {{ parsedOperatingTimes.join(', ') }}
            </span>
          </div>

          <div v-if="isConsultationMode" class="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700">
            Layanan ini memerlukan konsultasi terlebih dahulu sebelum pemesanan. Setelah konsultasi selesai, penjual akan mengirim link layanan jasa atau detail pemesanan.
            Gunakan tombol <strong>Minta Konsultasi</strong> di bawah untuk langsung menghubungi penjual.
          </div>

          <!-- Lokasi UMKM (untuk service_type di_tempat_umkm) -->
          <div
            v-if="(jasa?.service_type === 'di_tempat_umkm' || jasa?.service_type === 'at_location') && merchantAddress"
            class="flex items-start gap-2"
          >
            <span class="mt-0.5">
              <i class="text-gray-500 pi pi-map-marker"></i>
            </span>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-0.5">Lokasi UMKM</p>
              <p class="text-sm leading-snug text-gray-700">
                {{ merchantAddress }}
              </p>
            </div>
          </div>

          <!-- Area Layanan untuk ke_rumah_pelanggan -->
          <!-- Fallback address (jika service_type tidak dikenal tapi ada alamat) -->
          <div
            v-if="jasa?.service_type !== 'di_tempat_umkm' && jasa?.service_type !== 'at_location' && jasa?.service_type !== 'ke_rumah_pelanggan' && jasa?.service_type !== 'on_site' && jasa?.service_type !== 'online' && jasa?.location_address"
            class="flex items-start gap-2"
          >
            <span class="mt-0.5">
              <i class="text-gray-500 pi pi-map-marker"></i>
            </span>
            <p class="text-sm leading-snug text-gray-700">
              {{ jasa.location_address || '-' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pembayaran & Kontak -->
    <section v-if="jasa" class="px-4 py-4 mt-3 bg-white/95">
      <div class="max-w-3xl mx-auto lg:max-w-5xl">
        <h2 class="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900">
          <i class="pi pi-wallet text-merchant-primary"></i>
          Metode Pembayaran
        </h2>
        <div class="space-y-2">
          <!-- COD -->
          <div v-if="hasCod" class="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
            <i class="pi pi-money-bill text-emerald-600"></i>
            <span class="text-sm font-medium text-emerald-800">COD (Bayar Tunai)</span>
            <span class="text-xs text-emerald-600">Bayar langsung saat layanan selesai</span>
          </div>

          <!-- Xendit Methods -->
          <div v-if="hasXendit" class="space-y-1.5">
            <div class="text-xs font-semibold text-gray-500 uppercase">Online (Xendit)</div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="method in xenditMethodsDisplay" :key="method" class="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                <i class="pi pi-credit-card text-blue-600 text-xs"></i>
                <span class="text-xs text-blue-800">{{ method }}</span>
              </div>
            </div>
          </div>

          <!-- Fallback if no methods found -->
          <div v-if="!hasCod && !hasXendit" class="text-sm text-gray-500">
            {{ formatPaymentMethods(jasa?.payment_methods) }}
          </div>
        </div>
      </div>
    </section>

    <section v-if="isBookingMode" class="px-4 py-4 mt-3 bg-white/95">
      <div class="max-w-3xl mx-auto lg:max-w-5xl">
        <h3 class="flex items-center gap-2 mb-3 text-sm font-semibold">
          <i class="pi pi-calendar text-merchant-primary"></i>
          Pilih Jadwal
        </h3>
        <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="(d, i) in quickDays"
          :key="i"
          @click="selectQuick(d.date, d.available)"
          class="flex flex-col items-center justify-center px-3 py-2 text-center transition-all duration-200 border w-28 h-14 rounded-xl"
          :class="[
            !d.available 
              ? 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed opacity-70'
              : isSameDay(selectedDate, d.date)
                ? 'bg-[#FFA30E] text-white border-[#FFA30E] scale-[1.03]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#FFA30E]'
          ]"
          :disabled="!d.available"
        >
          <div class="text-[11px] leading-3">{{ d.label }}</div>
          <div class="text-sm font-semibold">{{ d.day }}</div>
          <div v-if="!d.available" class="text-[9px] text-red-400">Tidak tersedia</div>
        </button>

          <button
            class="flex flex-col items-center w-20 px-3 py-2 mt-3 ml-auto text-gray-700 transition border border-gray-200 rounded-xl hover:border-merchant-primary/80 hover:bg-merchant-primary/5 sm:mt-0"
            @click="calendarOpen = true"
          >
            <span class="text-sm font-semibold">{{ monthShort }}</span>
            <i class="pi pi-calendar text-xl text-[#FFA30E]"></i>
          </button>
        </div>
      </div>
    </section>

    <section v-if="jasa && !isBookingMode" class="px-4 py-4 mt-3 bg-white/95">
      <div class="max-w-3xl mx-auto lg:max-w-5xl">
        <div class="p-4 rounded-2xl bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm">
          <p class="font-semibold">Mekanisme layanan</p>
          <p class="mt-2">
            Layanan ini diproses sebagai <strong>{{ serviceBookingLabel }}</strong>.
          </p>
          <div class="mt-2 space-y-2 text-sm">
            <p v-if="isCartMode">
              • Langsung masuk ke keranjang dan dapat dilanjutkan ke pembayaran.
            </p>
            <p v-else-if="isConsultationMode">
              • Pelanggan akan menghubungi penjual terlebih dahulu. Setelah konsultasi selesai, penjual akan mengirim link layanan atau detail pemesanan.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pilih Waktu -->
    <section v-if="hasOperatingTimes && isBookingMode" class="px-4 py-4 mt-3 mb-2 bg-white/95">
      <div class="max-w-3xl mx-auto lg:max-w-5xl">
        <h3 class="flex items-center gap-2 mb-2 text-sm font-semibold">
          <i class="pi pi-clock text-merchant-primary"></i>
          Pilih Waktu
        </h3>
        <div class="p-4 border border-gray-200 rounded-2xl bg-gray-50/60">
        <!-- Pagi -->
        <div v-if="times.morning && times.morning.length > 0" class="mb-3">
          <div class="mb-2 text-sm text-gray-700">Pagi</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(t, i) in times.morning"
              :key="'m' + i"
              @click="activeTime = t"
              class="px-4 py-2 text-sm transition-all duration-200 border rounded-lg"
              :class="
                t === activeTime
                  ? 'bg-[#FFA30E] text-white border-[#FFA30E] scale-[1.03]'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              "
            >
              {{ t }}
            </button>
          </div>
        </div>
        
        <!-- Siang -->
        <div v-if="times.afternoon && times.afternoon.length > 0" class="mb-3">
          <div class="mb-2 text-sm text-gray-700">Siang</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(t, i) in times.afternoon"
              :key="'a' + i"
              @click="activeTime = t"
              class="px-4 py-2 text-sm transition-all duration-200 border rounded-lg"
              :class="
                t === activeTime
                  ? 'bg-[#FFA30E] text-white border-[#FFA30E] scale-[1.03]'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              "
            >
              {{ t }}
            </button>
          </div>
        </div>
        
        <!-- Malam -->
        <div v-if="times.evening && times.evening.length > 0">
          <div class="mb-2 text-sm text-gray-700">Malam</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(t, i) in times.evening"
              :key="'e' + i"
              @click="activeTime = t"
              class="px-4 py-2 text-sm transition-all duration-200 border rounded-lg"
              :class="
                t === activeTime
                  ? 'bg-[#FFA30E] text-white border-[#FFA30E] scale-[1.03]'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              "
            >
              {{ t }}
            </button>
          </div>
        </div>
        </div>
      </div>
    </section>

    <!-- Bottom bar -->
    <div
      v-if="jasa"
      class="fixed left-0 right-0 bottom-16 sm:bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] px-4 py-3"
    >
      <div class="flex items-center max-w-3xl gap-4 mx-auto lg:max-w-5xl">
        <template v-if="isBookingMode">
          <router-link
            :to="{
              name: 'Pembayaran Jasa',
              query: {
                 title: jasa?.title || '-',
                image: jasaImage,
                price: jasa?.fixed_price || jasa?.base_price || 100000,
                tgl: hasOperatingDays ? selectedDate.toISOString() : '',
                waktu: hasOperatingTimes ? activeTime : '',
                payment_methods: jasa?.payment_methods || '',
                service_type: jasa?.service_type || '',
                merchant_slug: jasa?.merchant?.slug || '',
                jasa_slug: jasa?.slug || route.params.slug || '',
                // Alamat tidak diisi untuk: online, di_tempat_umkm (dari profil merchant), ke_rumah_pelanggan (dari customer)
                alamat:
                  (jasa?.service_type === 'ke_rumah_pelanggan' || jasa?.service_type === 'on_site' || jasa?.service_type === 'online')
                    ? ''
                    : jasa?.location_address || merchantAddress || '',
                price_type:
                  jasa?.fixed_price && jasa.fixed_price > 0
                    ? 'fixed'
                    : jasa?.base_price && jasa.base_price > 0
                      ? 'base'
                      : '',
                order_method: 'scheduled',
              },
            }"
            class="flex-1 py-3 rounded-full bg-gradient-to-r from-[#FFA30E] to-[#ffba3d] hover:from-[#e5920d] hover:to-[#ffb024] text-white font-semibold text-center transition shadow-md"
          >
            Booking Sekarang
          </router-link>
        </template>
        <template v-else-if="isConsultationMode">
          <div class="flex items-center gap-3 flex-1">
            <!-- Tombol Chat In-App -->
            <button
              type="button"
              @click="openConsultationChat"
              class="flex-1 py-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 text-white font-semibold text-center transition shadow-md flex items-center justify-center gap-2"
            >
              <i class="pi pi-comments"></i>
              Konsultasi Gratis
            </button>

                      </div>
        </template>
        <template v-else-if="isCartMode">
          <router-link
            :to="{
              name: 'Pembayaran Jasa',
              query: {
                title: jasa?.title || '-',
                image: jasaImage,
                price: jasa?.fixed_price || jasa?.base_price || 100000,
                tgl: '',
                waktu: '',
                payment_methods: jasa?.payment_methods || '',
                service_type: jasa?.service_type || '',
                merchant_slug: jasa?.merchant?.slug || '',
                jasa_slug: jasa?.slug || route.params.slug || '',
                // Alamat tidak diisi untuk: online, di_tempat_umkm (dari profil merchant), ke_rumah_pelanggan (dari customer)
                alamat:
                  (jasa?.service_type === 'ke_rumah_pelanggan' || jasa?.service_type === 'on_site' || jasa?.service_type === 'online')
                    ? ''
                    : jasa?.location_address || merchantAddress || '',
                price_type:
                  jasa?.fixed_price && jasa.fixed_price > 0
                    ? 'fixed'
                    : jasa?.base_price && jasa.base_price > 0
                      ? 'base'
                      : 'cart',
                order_method: 'direct',
              },
            }"
            class="flex-1 py-3 rounded-full bg-gradient-to-r from-[#FFA30E] to-[#ffba3d] hover:from-[#e5920d] hover:to-[#ffb024] text-white font-semibold text-center transition shadow-md"
          >
            Checkout Cepat
          </router-link>
        </template>
        <template v-else>
          <button
            type="button"
            disabled
            class="flex-1 py-3 rounded-full bg-gray-200 text-gray-600 font-semibold text-center"
          >
            Pilih Mekanisme Pemesanan
          </button>
        </template>
      </div>
    </div>

    <!-- Kalender -->
    <CalendarModal
      v-model="selectedDate"
      :open="calendarOpen"
      :operating-days="jasa?.operating_days || ''"
      @close="calendarOpen = false"
    />

    <!-- Kalender -->
    <CalendarModal
      v-model="selectedDate"
      :open="calendarOpen"
      :operating-days="jasa?.operating_days || ''"
      @close="calendarOpen = false"
    />

    <!-- Penilaian Layanan -->
    <div class="px-4 py-6 bg-gray-50">
      <div class="max-w-2xl mx-auto">
        <!-- Rating Summary Header -->
        <div class="mb-4">
          <h3 class="text-lg font-bold text-gray-900 mb-2">Penilaian Layanan</h3>
          <div v-if="jasa?.rating_summary && jasa.rating_summary.total_reviews > 0" class="flex items-center gap-3">
            <div class="flex items-center gap-1">
              <i
                v-for="star in 5"
                :key="star"
                :class="[
                  'text-xl',
                  star <= Math.round(jasa.rating_summary.average_rating) ? 'pi pi-star-fill text-orange-400' : 'pi pi-star text-gray-300'
                ]"
              ></i>
            </div>
            <span class="font-semibold text-gray-700">{{ jasa.rating_summary.average_rating?.toFixed(1) || '0.0' }}</span>
            <span class="text-sm text-gray-500">({{ jasa.rating_summary.total_reviews }} ulasan)</span>
          </div>
          <p v-else class="text-sm text-gray-500"></p>
        </div>

        <!-- Reviews List -->
        <ReviewSection
          v-if="jasa?.id"
          resourceType="jasa"
          :resourceId="jasa.id"
          title=""
          :showHeader="false"
        />
        <div v-else class="empty-review-state">
          <i class="pi pi-star"></i>
          <p>Belum ada ulasan untuk layanan ini.</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/libs/axios.js";
import { getImageUrl, getMerchantLogoUrl } from "@/libs/getImageUrl.js";
import CalendarModal from "@/components/CalendarModal.vue";
import ReviewSection from "@/components/common/ReviewSection.vue";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "vue-toastification";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const jasa = ref(null);
const selectedImagePath = ref(null);
const selectedImageIndex = ref(-1);

// Fallback images for error handling
const fallbackHeader = 'data:image/svg+xml,%3Csvg width="400" height="300" xmlns="http://www.w3.org/2000/svg"%3E%3Crect fill="%23E5E7EB" width="400" height="300"/%3E%3C/svg%3E';
const fallbackLogo = 'data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Crect fill="%23E5E7EB" width="100" height="100"/%3E%3C/svg%3E';

const goBack = () => {
  router.back();
};

const hasOperatingDays = computed(() =>
  Boolean(String(jasa.value?.operating_days || "").trim())
);

const parsedOperatingTimes = computed(() => {
  const raw = jasa.value?.operating_times;
  // Handle both array (from DB cast) and string (old data)
  if (Array.isArray(raw)) {
    return raw.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw.split(",").map(t => t.trim()).filter(Boolean);
  }
  return [];
});

const hasOperatingTimes = computed(() => parsedOperatingTimes.value.length > 0);

// Helper untuk mendapatkan URL logo merchant
const getMerchantLogo = (logo) => {
  if (jasa.value?.merchant?.id) {
    return getMerchantLogoUrl(jasa.value.merchant);
  }
  if (!logo) return null;
  return getImageUrl(logo);
};

// ----- jadwal -----
const selectedDate = ref(new Date());
const calendarOpen = ref(false);

const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const two = (n) => String(n).padStart(2, "0");
const isSameDay = (a, b) => atMidnight(a).getTime() === atMidnight(b).getTime();
const dayName = (d) =>
  d
    .toLocaleDateString("id-ID", { weekday: "long" })
    .replace(/^\w/u, (c) => c.toUpperCase());

// Konversi hari JS (0=Minggu, 1=Senin...) ke format database (1=Senin...7=Minggu)
const jsToDbDay = (jsDay) => (jsDay === 0 ? 7 : jsDay);

// Cek apakah hari tersedia berdasarkan operating_days
const isDayAvailable = (date) => {
  if (!jasa.value?.operating_days) return true; // Jika tidak ada data, anggap semua tersedia
  const operatingDays = jasa.value.operating_days.split(',').map(d => parseInt(d.trim()));
  const dbDay = jsToDbDay(date.getDay());
  return operatingDays.includes(dbDay);
};

const today = ref(atMidnight(new Date()));
const quickDays = computed(() => {
  const days = [];
  for (let i = 0; i < 3; i++) {
    const date = addDays(today.value, i);
    const available = isDayAvailable(date);
    days.push({
      label: i === 0 ? "Hari Ini" : dayName(date),
      date: date,
      day: two(date.getDate()),
      available: available
    });
  }
  return days;
});
const monthShort = computed(() =>
  selectedDate.value.toLocaleString("id-ID", { month: "short" })
);
const selectQuick = (d, available) => {
  if (!available) return; // Tidak bisa pilih hari yang tidak tersedia
  selectedDate.value = new Date(d);
};

// ----- waktu -----
// Parse operating_times dari jasa. Jika tidak diatur saat create, waktu tidak ditampilkan di customer.
const times = computed(() => {
  const operatingTimes = parsedOperatingTimes.value;

  if (operatingTimes.length === 0) {
    return { morning: [], afternoon: [], evening: [] };
  }

  // Kategorikan waktu berdasarkan periode
  const morning = operatingTimes.filter(t => {
    const hour = parseInt(t.split('.')[0]);
    return hour >= 6 && hour < 12;
  });
  
  const afternoon = operatingTimes.filter(t => {
    const hour = parseInt(t.split('.')[0]);
    return hour >= 12 && hour < 18;
  });
  
  const evening = operatingTimes.filter(t => {
    const hour = parseInt(t.split('.')[0]);
    return hour >= 18;
  });
  
  return { morning, afternoon, evening };
});

// Active time - pilih pertama yang tersedia
const activeTime = ref("");

// Set active time ketika times berubah
const initActiveTime = () => {
  const allTimes = [...times.value.morning, ...times.value.afternoon, ...(times.value.evening || [])];
  if (allTimes.length > 0 && !activeTime.value) {
    activeTime.value = allTimes[0];
    return;
  }

  if (allTimes.length === 0) {
    activeTime.value = "";
  }
};

// ----- gambar jasa -----
const resolveJasaAssetSrc = (img) => {
  if (!img) return "";
  // Priority: API URL first (sama seperti produk)
  if (img.src_url) return getImageUrl(img.src_url);
  if (img.url) return getImageUrl(img.url);
  if (img.image_url) return getImageUrl(img.image_url);
  if (img.image_path) return getImageUrl(img.image_path);
  if (img.path) return getImageUrl(img.path);
  if (img.id) return getImageUrl(img.id);
  return "";
};

const jasaImage = computed(() => {
  if (!jasa.value) return "";

  // Prioritas 1: gambar yang dipilih via thumbnail / next/prev
  if (selectedImageIndex.value >= 0) {
    const images = jasa.value.images || [];
    const img = images[selectedImageIndex.value];
    if (img) {
      const src = resolveJasaAssetSrc(img);
      if (src) return src;
    }
  }

  // Prioritas 2: cover_img dari API
  if (jasa.value.cover_img?.src_url) {
    return getImageUrl(jasa.value.cover_img.src_url);
  }
  if (jasa.value.cover_img?.url) {
    return getImageUrl(jasa.value.cover_img.url);
  }
  if (jasa.value.cover_img?.id) {
    return getImageUrl(jasa.value.cover_img.id);
  }
  if (jasa.value.image_url) {
    return jasa.value.image_url;
  }

  // Fallback ke array images (cover image)
  if (jasa.value.images && jasa.value.images.length > 0) {
    const coverImg =
      jasa.value.images.find((img) => img.is_cover) || jasa.value.images[0];
    const resolved = resolveJasaAssetSrc(coverImg);
    if (resolved) return resolved;
  }

  return "";
});

const onSelectGalleryImage = (img) => {
  if (!img) return;
  const images = jasa.value?.images || [];
  const index = images.findIndex(
    (i) => i.id === img.id || i.path === img.path || i.image === img.image
  );
  if (index >= 0) {
    selectedImageIndex.value = index;
    selectedImagePath.value = resolveJasaAssetSrc(img);
  }
};

const nextGalleryImage = () => {
  const images = jasa.value?.images || [];
  if (!images.length) return;
  const next = (selectedImageIndex.value + 1) % images.length;
  selectedImageIndex.value = next;
  selectedImagePath.value = resolveJasaAssetSrc(images[next]);
};

const prevGalleryImage = () => {
  const images = jasa.value?.images || [];
  if (!images.length) return;
  const prev =
    (selectedImageIndex.value - 1 + images.length) % images.length;
  selectedImageIndex.value = prev;
  selectedImagePath.value = resolveJasaAssetSrc(images[prev]);
};

// ----- deskripsi -----
const jasaDesc = computed(
  () => jasa.value?.description || "Belum ada deskripsi jasa."
);

// ----- mekanisme pemesanan (keranjang / booking / konsultasi) -----
// Primary: cara_pemesanan (DB format: langsung_pesan | booking | memerlukan_konsultasi)
// Fallback: order_method (for old records)
const serviceBookingLabel = computed(() => {
  const raw = jasa.value?.cara_pemesanan || jasa.value?.order_method;
  if (!raw) return "Tidak tersedia";

  const t = String(raw).toLowerCase();

  // DB cara_pemesanan values → FE display
  if (t === 'langsung_pesan') return "Keranjang (Tanpa Jadwal)";
  if (t === 'booking') return "Booking (Pilih Tanggal & Jam)";
  if (t === 'memerlukan_konsultasi') return "Konsultasi (Hubungi Penjual)";

  // order_method FE format (for old records)
  if (t === 'keranjang') return "Keranjang (Tanpa Jadwal)";
  if (t === 'konsultasi') return "Konsultasi (Hubungi Penjual)";

  return String(raw);
});

const isBookingMode = computed(() => {
  const raw = jasa.value?.cara_pemesanan || jasa.value?.order_method;
  const t = String(raw || '').toLowerCase();
  return t === 'booking';
});

const isConsultationMode = computed(() => {
  const raw = jasa.value?.cara_pemesanan || jasa.value?.order_method;
  const t = String(raw || '').toLowerCase();
  return t === 'memerlukan_konsultasi' || t === 'konsultasi';
});

const isCartMode = computed(() => {
  const raw = jasa.value?.cara_pemesanan || jasa.value?.order_method;
  const t = String(raw || '').toLowerCase();
  // langsung_pesan = cart mode (langsung checkout tanpa jadwal)
  // keranjang = cart mode (FE format)
  // empty/null = default to cart mode
  return t === 'langsung_pesan' || t === 'keranjang' || (!raw);
});

function buildConsultationMessage() {
  const jasaTitle = jasa.value?.title || "Layanan Jasa";
  const serviceType = serviceTypeLabel.value || "-";
  const lines = [
    "Halo, saya ingin konsultasi layanan Sumilir.",
    "",
    "Layanan yang ingin dikonsultasikan:",
    `- ${jasaTitle}`,
    `- Tipe layanan: ${serviceType}`,
    `- Mekanisme: ${serviceBookingLabel.value}`,
    "",
    "Mohon bantuannya untuk menjelaskan detail, harga, dan jadwal layanan.",
  ];
  return lines.join("\n");
}

function openConsultationContact() {
  if (!whatsappLink.value) {
    window.alert(
      "Kontak WhatsApp penjual belum tersedia. Silakan hubungi penjual secara manual."
    );
    return;
  }

  const encoded = encodeURIComponent(buildConsultationMessage());
  let url = whatsappLink.value.trim();
  if (url.startsWith("http")) {
    url += url.includes("?") ? `&text=${encoded}` : `?text=${encoded}`;
  } else {
    const phone = url.replace(/[^0-9]/g, "");
    url = `https://wa.me/${phone}?text=${encoded}`;
  }

  window.open(url, "_blank");
}

const goToCart = () => {
  router.push({ name: "Keranjang" });
};

// ⭐ Konsultasi functions
async function openConsultationChat() {
  if (!authStore.isAuthenticated) {
    toast.warning("Silakan login terlebih dahulu");
    router.push({ name: "Login", query: { redirect: route.fullPath } });
    return;
  }

  if (!jasa.value?.id) {
    toast.error("Data layanan tidak ditemukan");
    return;
  }

  try {
    // Create consultation via API
    const response = await api.post('/api/service-consultations', {
      jasa_id: jasa.value.id,
      customer_description: `Halo, saya ingin konsultasi layanan "${jasa.value.title}".`
    });

    const consultationId = response.data?.data?.id;

    if (consultationId) {
      toast.success("Konsultasi berhasil diajukan. Menunggu tanggapan merchant.");
      router.push(`/customer/consultations/${consultationId}`);
    } else {
      throw new Error("Konsultasi ID tidak ditemukan");
    }
  } catch (err) {
    console.error("[JasaDetail] Failed to start consultation:", err);
    toast.error(err.response?.data?.message || "Gagal mengajukan konsultasi. Silakan coba lagi.");
  }
}

// ----- tipe layanan (online / di tempat / ke alamat pelanggan) -----
const serviceTypeLabel = computed(() => {
  const t = jasa.value?.service_type;
  if (!t) return "-";
  // Normalize from old values
  if (t === 'at_location' || t === 'ditempat_saya') return "Di Tempat UMKM";
  if (t === 'on_site' || t === 'kerumah_pelanggan') return "Ke Rumah Pelanggan";
  if (t === 'online') return "Online";
  if (t === 'di_tempat_umkm') return "Di Tempat UMKM";
  if (t === 'ke_rumah_pelanggan') return "Ke Rumah Pelanggan";
  return t;
});

// ----- alamat merchant untuk service_type at_location -----
const merchantAddress = computed(() => {
  const merchant = jasa.value?.merchant;
  if (!merchant) return '';

  const primaryAddress = merchant.primary_address;
  if (!primaryAddress) {
    // Fallback ke field address atau alamat lama
    return merchant.address || merchant.alamat || '';
  }

  // Format alamat lengkap dari primary_address
  const parts = [
    primaryAddress.detail,
    primaryAddress.village,
    primaryAddress.district,
    primaryAddress.city,
    primaryAddress.province,
  ].filter(Boolean);

  return parts.join(', ') || '';
});

// ----- harga display -----
const priceTypeLabel = computed(() => {
  if (!jasa.value) return "";
  if (jasa.value.fixed_price && jasa.value.fixed_price > 0) return "Harga Tetap";
  if (jasa.value.base_price && jasa.value.base_price > 0) return "Mulai dari";
  return "";
});

const priceDisplayMain = computed(() => {
  if (!jasa.value) return "Rp 0";

  if (jasa.value.fixed_price && jasa.value.fixed_price > 0) {
    return `Rp ${formatIDR(jasa.value.fixed_price)}`;
  }

  if (jasa.value.base_price && jasa.value.base_price > 0) {
    return `Rp ${formatIDR(jasa.value.base_price)}`;
  }

  return "Rp 0";
});

const formatIDR = (v) => Number(v || 0).toLocaleString("id-ID");

// Get human-readable payment method label
const getPaymentMethodLabel = (method) => {
  const labels = {
    cod: "COD (Bayar Tunai)",
    qris: "QRIS",
    bca: "BCA Virtual Account",
    bni: "BNI Virtual Account",
    bri: "BRI Virtual Account",
    mandiri: "Mandiri Virtual Account",
    ovo: "OVO",
    dana: "DANA",
    shopeepay: "ShopeePay",
    alfamart: "Alfamart",
  };
  return labels[method.toLowerCase()] || method;
};

// Format payment methods array/string to readable labels
const formatPaymentMethods = (methods) => {
  if (!methods) return "COD (Bayar Tunai)";

  let methodsArray = [];
  if (typeof methods === 'string') {
    methodsArray = methods.split(",").map(m => m.trim()).filter(Boolean);
  } else if (Array.isArray(methods)) {
    methodsArray = methods;
  }

  if (methodsArray.length === 0) return "COD (Bayar Tunai)";

  // Check if it's COD only
  const isCodOnly = methodsArray.some(m => m.toLowerCase() === 'cod') &&
                     methodsArray.every(m => m.toLowerCase() === 'cod' || m.toLowerCase() === 'online_xendit' || m.toLowerCase() === 'xendit');

  // If only COD
  if (methodsArray.length === 1 && methodsArray[0].toLowerCase() === 'cod') {
    return "COD (Bayar Tunai)";
  }

  // If ONLINE_XENDIT only or includes ONLINE_XENDIT with other Xendit methods
  if (methodsArray.some(m => m.toLowerCase() === 'online_xendit' || m.toLowerCase() === 'xendit')) {
    const result = [];
    if (methodsArray.some(m => m.toLowerCase() === 'cod')) {
      result.push("COD (Bayar Tunai)");
    }
    // Add all Xendit methods
    result.push("QRIS, Virtual Account, E-Wallet, Alfamart");
    return result.join(", ");
  }

  return methodsArray.map(m => getPaymentMethodLabel(m)).join(", ");
};

// Get payment methods array for display
const paymentMethodsArray = computed(() => {
  const methods = jasa.value?.payment_methods;
  if (!methods) return ["cod"];

  if (typeof methods === 'string') {
    return methods.split(",").map(m => m.trim().toLowerCase()).filter(Boolean);
  }
  if (Array.isArray(methods)) {
    return methods.map(m => m.toLowerCase());
  }
  return [];
});

// Check if COD is available
const hasCod = computed(() => paymentMethodsArray.value.includes('cod'));

// Check if Xendit methods are available
const hasXendit = computed(() =>
  paymentMethodsArray.value.some(m => m === 'online_xendit' || m === 'xendit')
);

// Get individual Xendit method labels for display
const xenditMethodsDisplay = computed(() => {
  if (!hasXendit.value) return [];
  return [
    "QRIS (Gopay, OVO, Dana, dll)",
    "BCA Virtual Account",
    "BNI Virtual Account",
    "BRI Virtual Account",
    "Mandiri Virtual Account",
    "OVO",
    "DANA",
    "ShopeePay",
    "Alfamart / Alfamidi",
  ];
});

const whatsappLink = computed(() => {
  const raw =
    jasa.value?.whatsapp_link ||
    jasa.value?.merchant?.whatsapp ||
    jasa.value?.merchant?.phone ||
    "";

  const cleaned = String(raw).trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("http")) return cleaned;
  const digits = cleaned.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}`;
});

onMounted(async () => {
  const slugParam = String(route.params.slug || "").trim();
  if (!slugParam) {
    console.error("[JasaDetail] Missing slug param");
    jasa.value = null;
    return;
  }

  try {
    console.log("[JasaDetail] Fetching jasa slug:", slugParam);
    const encoded = encodeURIComponent(slugParam);
    let response;

    try {
      response = await api.get(`/api/public/jasas/${encoded}`);
    } catch (firstError) {
      // fallback retry once with raw value (beberapa backend lama tidak cocok dengan encoded tertentu)
      response = await api.get(`/api/public/jasas/${slugParam}`);
    }

    const { data } = response;
    const rawPayload = data?.data ?? data;
    console.log("[JasaDetail] Jasa data:", rawPayload);

    // Normalize image URLs so getImageUrl resolves them correctly
    const payload = normalizeJasaImagePayload(rawPayload);
    jasa.value = payload;

    // Set selectedDate ke hari pertama yang tersedia
    if (payload?.operating_days) {
      const operatingDays = payload.operating_days.split(',').map(d => parseInt(d.trim()));
      // Cari hari tersedia dalam 7 hari ke depan
      for (let i = 0; i < 7; i++) {
        const checkDate = addDays(today.value, i);
        const dbDay = jsToDbDay(checkDate.getDay());
        if (operatingDays.includes(dbDay)) {
          selectedDate.value = checkDate;
          break;
        }
      }
    }

    // Set active time ke waktu pertama yang tersedia
    initActiveTime();
  } catch (e) {
    console.error("[JasaDetail] Error fetching jasa:", e);
    // Biarkan jasa kosong jika tidak ditemukan / 404 supaya tidak menampilkan data dummy
    jasa.value = null;
  }
});

/**
 * Normalize jasa image payload — ensures cover_img and images have full URLs.
 * Backend already provides public URLs; this ensures getImageUrl resolves correctly.
 */
function normalizeJasaImagePayload(jasaData) {
  if (!jasaData || typeof jasaData !== "object") return jasaData;
  const normalized = { ...jasaData };

  if (normalized.cover_img && typeof normalized.cover_img === "object") {
    const srcUrl = normalized.cover_img.src_url || normalized.cover_img.url || normalized.cover_img.id
      ? getImageUrl(normalized.cover_img.src_url || normalized.cover_img.url || String(normalized.cover_img.id))
      : "";
    normalized.cover_img = {
      id: normalized.cover_img.id ?? null,
      url: srcUrl,
      src_url: srcUrl,
    };
  }

  if (Array.isArray(normalized.images)) {
    normalized.images = normalized.images.map((img) => {
      if (!img || typeof img !== "object") return img;
      const srcUrl = img.src_url || img.url || img.image_path || img.id
        ? getImageUrl(img.src_url || img.url || img.image_path || String(img.id))
        : "";
      return { id: img.id ?? null, url: srcUrl, src_url: srcUrl, is_cover: img.is_cover ?? false };
    });
  }

  if (normalized.image) {
    normalized.image = getImageUrl(normalized.image);
  }

  return normalized;
}


function onImgError(e, type) {
  switch (type) {
    case 'header': e.target.src = fallbackHeader; break;
    case 'logo': e.target.src = fallbackLogo; break;
    case 'gallery': e.target.src = fallbackHeader; break;
  }
}
</script>

<style>
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.empty-review-state {
  padding: 32px;
  text-align: center;
  color: #6b7280;
}

.empty-review-state i {
  font-size: 32px;
  margin-bottom: 12px;
  color: #d1d5db;
}

.empty-review-state p {
  margin: 0;
  font-size: 14px;
}
</style>