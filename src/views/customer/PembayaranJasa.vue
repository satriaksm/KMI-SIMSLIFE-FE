<template>
  <div
    class="min-h-screen pb-32 bg-gradient-to-b from-gray-50 via-white to-gray-100 sm:pb-28"
  >
    <!-- AppBar -->
    <header
      class="sticky top-0 z-20 px-4 py-3 text-white shadow-md bg-gradient-to-r from-merchant-primary to-merchant-primary/90"
    >
      <div class="flex items-center max-w-screen-sm gap-3 mx-auto">
        <button
          type="button"
          class="flex items-center justify-center text-white transition rounded-full shadow-sm w-9 h-9 bg-white/15 hover:bg-white/25 backdrop-blur-sm"
          @click="goBack"
          aria-label="Kembali"
        >
          <i class="text-sm pi pi-arrow-left"></i>
        </button>
        <div class="flex flex-col">
          <h1 class="text-sm font-semibold sm:text-base">Ringkasan Pesanan</h1>
          <p class="text-[11px] sm:text-xs text-white/80">
            Cek kembali data sebelum mengirim ke chat penjual
          </p>
        </div>
      </div>
    </header>

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

        <!-- Detail Alamat -->
        <section
          class="p-4 border border-gray-100 shadow-sm bg-white/95 rounded-2xl sm:p-5"
        >
          <div class="flex items-center justify-between mb-2">
            <div>
              <h2
                class="flex items-center gap-2 text-sm font-semibold text-gray-900 sm:text-base"
              >
                <i class="pi pi-map-marker text-merchant-primary"></i>
                Alamat Layanan Jasa
              </h2>
              <p
                v-if="isOnlineService"
                class="mt-0.5 text-[11px] text-gray-500"
              >
                Layanan ini dilakukan sepenuhnya secara online, jadi alamat
                tidak wajib diisi.
              </p>
            </div>
          </div>
          <div
            class="flex items-start justify-between gap-2 mt-1 text-sm text-gray-800"
          >
            <div class="flex items-start flex-1 gap-2">
              <span class="mt-0.5">
                <i class="text-gray-500 pi pi-map-marker"></i>
              </span>
              <p class="leading-snug break-words">{{ form.alamat }}</p>
            </div>
            <button
              v-if="serviceType === 'on_site'"
              type="button"
              class="ml-3 text-[11px] px-3 py-1 rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 whitespace-nowrap"
              :disabled="locatingDevice"
              @click="requestDeviceLocation"
            >
              {{ locatingDevice ? 'Mengambil lokasi...' : 'Pakai lokasi device' }}
            </button>
          </div>
          <p
            v-if="serviceType === 'on_site' && deviceCoordinates"
            class="mt-2 text-[11px] text-gray-500"
          >
            Koordinat terdeteksi: {{ deviceCoordinates.latitude.toFixed(6) }}, {{ deviceCoordinates.longitude.toFixed(6) }}
          </p>
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

    <!-- Bubble Notifikasi dengan tombol OK -->
    <transition name="fade">
      <div
        v-if="errorMessage || successMessage"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm sm:backdrop-blur"
      >
        <!-- backdrop untuk blok semua interaksi di belakang -->
        <div class="absolute inset-0"></div>

        <div
          class="relative max-w-sm w-[90%] sm:w-auto rounded-2xl shadow-lg px-4 py-3 flex flex-col gap-2 text-xs sm:text-sm border bg-opacity-95"
          :class="
            errorMessage
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          "
        >
          <p class="leading-snug">
            {{ errorMessage || successMessage }}
          </p>
          <button
            type="button"
            class="self-end mt-1 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold"
            :class="
              errorMessage
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            "
            @click="clearNotification"
          >
            Oke
          </button>
        </div>
      </div>
    </transition>

    <!-- Bottom bar (Total + Chat button) -->
    <div
      class="fixed left-0 right-0 bottom-16 sm:bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] px-4 py-3"
    >
      <div class="max-w-screen-sm mx-auto space-y-1.5">
        <div
          class="flex items-center justify-between text-xs font-semibold text-gray-900 sm:text-sm"
        >
          <span>Total Pembayaran</span>
          <span>Rp {{ formatIDR(total) }}</span>
        </div>
        <p class="text-[11px] text-gray-500">
          Pesanan akan dikirim ke chat penjual.
        </p>

        <button
          class="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-[#FFA30E] to-[#ffba3d] hover:from-[#e5920d] hover:to-[#ffb024] text-white font-semibold text-center transition shadow-md"
          @click="sendToChat"
        >
          <i class="text-sm pi pi-send"></i>
          <span>Pesan Sekarang</span>
        </button>
      </div>
    </div>

    <!-- Bottom Sheet Promo List -->
    <transition name="fade">
      <div v-if="openPromo" class="fixed inset-0 z-40">
        <div
          class="absolute inset-0 bg-black/40"
          @click="openPromo = false"
        ></div>
        <div
          class="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto"
        >
          <div class="w-12 h-1 mx-auto mb-3 bg-gray-300 rounded-full"></div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-semibold text-gray-900">Pilih Promo</h3>
            <button class="text-gray-500" @click="openPromo = false">✕</button>
          </div>

          <div class="space-y-3">
            <div
              v-for="p in promos"
              :key="p.code"
              class="overflow-hidden border border-gray-200 rounded-xl"
            >
              <div
                class="flex items-center justify-between px-4 py-3 bg-gray-50"
              >
                <div>
                  <div class="text-sm font-semibold text-gray-800">
                    {{ p.title }}
                  </div>
                  <div class="text-xs text-gray-600">{{ p.desc }}</div>
                </div>
                <button
                  class="px-3 py-1 text-xs font-semibold rounded-full"
                  :class="
                    selectedPromo && selectedPromo.code === p.code
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 text-amber-900'
                  "
                  @click="usePromo(p)"
                >
                  {{
                    selectedPromo && selectedPromo.code === p.code
                      ? "Dipakai"
                      : "Gunakan"
                  }}
                </button>
              </div>

              <div class="px-4 py-3 text-xs text-gray-600">
                Kode:
                <span class="font-mono font-semibold">{{ p.code }}</span>
              </div>
            </div>
          </div>

          <div class="flex justify-end mt-4">
            <button
              class="px-4 py-2 border border-gray-200 rounded-lg"
              @click="openPromo = false"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Bottom Sheet Pilih Alamat -->
    <transition name="fade">
      <div v-if="openAlamatOptions" class="fixed inset-0 z-40">
        <div
          class="absolute inset-0 bg-black/40"
          @click="openAlamatOptions = false"
        ></div>
        <div
          class="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto"
        >
          <div class="w-12 h-1 mx-auto mb-3 bg-gray-300 rounded-full"></div>
          <div class="mb-3">
            <h3 class="text-base font-semibold text-gray-900">
              Pilih Sumber Alamat
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Kamu bisa gunakan alamat profil atau lokasi perangkat.
            </p>
          </div>

          <div class="space-y-3 text-sm">
            <button
              type="button"
              class="flex items-center w-full gap-3 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
              @click="useProfileAddress"
            >
              <span
                class="flex items-center justify-center w-8 h-8 text-lg rounded-full bg-emerald-100 text-emerald-600"
              >
                <i class="pi pi-user"></i>
              </span>
              <div class="flex-1 text-left">
                <p class="font-semibold text-gray-800">Alamat Profil</p>
                <p class="text-xs text-gray-500">
                  Gunakan alamat yang tersimpan di profil kamu jika tersedia.
                </p>
              </div>
            </button>

            <!-- Tombol ambil lokasi dari device dihapus, alamat hanya dari jasa/UMKM -->
          </div>

          <div class="flex justify-end mt-4">
            <button
              class="px-4 py-2 text-sm border border-gray-200 rounded-lg"
              @click="openAlamatOptions = false"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Overlay Ringkasan Pemesanan (Card) -->
    <transition name="fade">
      <div
        v-if="showChat"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm sm:backdrop-blur-md"
      >
        <div
          class="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col max-h-[80vh] sm:max-h-[85vh]"
        >
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-gray-200"
          >
            <h2 class="text-sm font-semibold text-gray-900">
              Ringkasan Pemesanan
            </h2>
            <button
              class="text-sm text-gray-500 hover:text-gray-700"
              @click="showChat = false"
            >
              ✕
            </button>
          </div>
          <div class="flex flex-col flex-1 gap-4 p-4 bg-gray-50">
            <!-- Card ringkasan utama -->
            <div
              class="px-4 py-3 text-white transition cursor-pointer rounded-2xl bg-merchant-primary hover:bg-merchant-primary/90"
              @click="showDetails = !showDetails"
            >
              <p class="mb-1 text-xs opacity-90">Layanan Jasa</p>
              <p class="text-sm font-semibold truncate">
                {{ order.title }}
              </p>
              <p class="mt-1 text-sm font-medium">
                Rp {{ formatIDR(order.price) }}
              </p>
              <p
                class="text-[11px] mt-2 opacity-90 flex items-center justify-between"
              >
                <span>{{ form.tanggalLabel }} • {{ form.waktu }}</span>
                <span class="underline">
                  {{ showDetails ? "Sembunyikan detail" : "Lihat detail" }}
                </span>
              </p>
            </div>

            <!-- Detail pemesanan lengkap -->
            <div
              v-if="showDetails"
              class="px-4 py-3 text-xs text-gray-700 whitespace-pre-line bg-white border border-gray-200 rounded-2xl sm:text-sm"
            >
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
  title: route.query.title || "Nama Jasa",
  image: route.query.image || "",
  price: Number(route.query.price || 0),
  tglISO: route.query.tgl || "",
  waktu: route.query.waktu || "",
  priceType: route.query.price_type || "",
  paymentMethods: (route.query.payment_methods || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
};

const goBack = () => {
  router.back();
};

// Jenis layanan jasa (online / di lokasi penyedia / ke lokasi pelanggan)
const serviceType = ref(route.query.service_type || null);

// ===== Form =====
const form = ref({
  nama: "",
  tel: "",
  alamat: route.query.alamat || "",
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
    errorMessage.value =
      "Perangkat/browser tidak mendukung GPS. Silakan isi alamat manual.";
    return;
  }

  locatingDevice.value = true;
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
      successMessage.value = "Lokasi device berhasil digunakan.";
    } else {
      form.value.alamat = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      successMessage.value =
        "Koordinat ditemukan, tetapi alamat detail tidak tersedia.";
    }
  } catch (error) {
    console.error("[PembayaranJasa] Gagal mengambil lokasi device", error);
    errorMessage.value =
      "Izin lokasi ditolak atau gagal mengambil GPS. Aktifkan lokasi lalu coba lagi.";
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

// Ambil info jasa (WhatsApp link, merchant info, service type) saat halaman dibuka
onMounted(async () => {
  if (order.merchantSlug) {
    await loadVouchersForJasa(order.merchantSlug);
  }

  if (!order.jasaSlug) return;

  try {
    const { data } = await api.get(`/api/public/jasas/${encodeURIComponent(order.jasaSlug)}`);
    const payload = data?.data ?? data;

    // Prioritas sumber nomor WhatsApp penjual:
    // 1) Link khusus di jasa (whatsapp_link)
    // 2) Nomor WhatsApp/telepon di profil UMKM (merchant.whatsapp atau merchant.phone)
    // 3) Fallback: kosong (tampilkan error di sendToChat)
    const rawWhatsapp =
      payload?.whatsapp_link ||
      payload?.merchant?.whatsapp ||
      payload?.merchant?.phone ||
      "";
    jasaWhatsappLink.value = rawWhatsapp;

    // Otomatis isi alamat berdasarkan service_type
    // - at_location: gunakan alamat UMKM (prioritas location_address, lalu profil merchant)
    // - on_site: alamat diisi customer (kosongkan default)
    // - online: tidak perlu alamat
    if (payload?.service_type === 'at_location') {
      form.value.alamat = resolveMerchantAddress(
        payload?.merchant,
        payload?.location_address,
      );
    } else if (payload?.service_type === 'on_site') {
      // Untuk layanan ke lokasi customer, alamat berasal dari device customer
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

  if (serviceType.value === "on_site" && !form.value.alamat) {
    errorMessage.value =
      "Untuk layanan ke alamat pelanggan, izinkan lokasi device atau isi alamat terlebih dahulu.";
    return;
  }

  // Notif awal: pastikan form sudah terisi benar
  if (!isFormValid.value) {
    errorMessage.value =
      "Mohon lengkapi data pemesan dan jadwal terlebih dahulu.";
    return;
  }

  const message = buildWhatsappMessage();
  if (!message) return;

  if (!jasaWhatsappLink.value) {
    errorMessage.value =
      "Nomor atau link WhatsApp penjual belum tersedia. Silakan hubungi penjual secara manual.";
    return;
  }

  // Susun URL WhatsApp
  const encoded = encodeURIComponent(message);
  let url = jasaWhatsappLink.value.trim();
  if (url.startsWith("http")) {
    url += url.includes("?") ? `&text=${encoded}` : `?text=${encoded}`;
  } else {
    // Anggap sebagai nomor telepon (tanpa +), gunakan wa.me
    const phone = url.replace(/[^0-9]/g, "");
    url = `https://wa.me/${phone}?text=${encoded}`;
  }
  // Redirect ke WhatsApp (tab baru jika memungkinkan)
  window.open(url, "_blank");
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
