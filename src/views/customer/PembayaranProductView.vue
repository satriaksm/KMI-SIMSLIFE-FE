<template>
  <div class="mx-auto pb-12 sm:pb-30 max-w-7xl">
    <!-- Mobile Header -->
    <MobileHeader title="Checkout Pesanan" variant="primary" />

    <main class="px-4 pt-4 space-y-4">
      <!-- DATA PEMESAN (HANYA JIKA BELUM LOGIN) -->
      <section
        v-if="isGuest"
        class="p-4 bg-white border border-gray-200 rounded-xl"
      >
        <h2 class="mb-3 font-semibold text-gray-800">Data Pemesan</h2>

        <Form :validation-schema="schema">
          <div class="space-y-3">
            <TextField
              name="nama"
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              v-model="form.nama"
              required
            />

            <TextField
              name="tel"
              label="Nomor Telepon"
              placeholder="08xxxxxxxxxx"
              v-model="form.tel"
              required
            />
          </div>
        </Form>

        <p class="mt-2 text-xs text-gray-500">
          Digunakan untuk keperluan konfirmasi pesanan
        </p>
      </section>

      <!-- Detail Pesanan -->
      <section class="p-4 bg-white border border-gray-200 rounded-xl">
        <h2 class="mb-3 font-semibold text-gray-800">Detail Pesanan</h2>

        <div class="space-y-3">
          <div class="space-y-4">
            <div
              v-for="item in checkoutItems"
              :key="item.id"
              class="flex flex-col gap-3 p-4 bg-white border-b border-gray-200 last:border-none"
            >
              <div class="flex gap-3">
                <!-- IMAGE -->
                <div class="w-20 h-20 overflow-hidden bg-gray-100 rounded-lg">
                  <img :src="item.image" class="object-cover w-full h-full" />
                </div>

                <!-- INFO -->
                <div class="flex-1 min-w-0 space-y-1">
                  <h3 class="text-sm font-semibold text-gray-900">
                    {{ item.name }}
                  </h3>

                  <!-- VARIANT -->
                  <div
                    v-if="item.variant"
                    class="text-xs capitalize text-muted-foreground"
                  >
                    Varian: {{ item.variant }}
                  </div>

                  <!-- PRICE + QTY -->
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-sm font-bold text-[#FFA30E]">
                      Rp {{ formatIDR(item.price) }}
                    </span>

                    <span class="text-xs text-gray-600">
                      x{{ item.quantity }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Addons jika ada -->
              <div v-if="item.addons?.length" class="space-y-1">
                <div class="text-xs font-semibold text-gray-700">Tambahan:</div>
                <!-- ✅ Tampilkan nama + harga per add-on -->
                <div
                  v-for="addon in item.addons"
                  :key="addon.id || addon.label"
                  class="flex items-center justify-between gap-2 text-xs text-gray-700"
                >
                  <div class="flex items-center gap-1">
                    + <span>{{ addon.name || addon.label }}</span>
                  </div>
                  <span class=""> Rp {{ formatIDR(addon.price) }} </span>
                </div>
                <!-- subtotal add-on per quantity -->
                <!-- <p class="pt-1 text-xs text-gray-600">
                  Total tambahan: Rp {{ formatIDR(getAddonTotal(item)) }}
                </p> -->
              </div>
              <div
                class="flex items-center justify-between gap-2 text-sm font-semibold text-black"
              >
                <div class="flex items-center gap-1">
                  <span>Total </span>
                </div>
                <span class="">
                  Rp
                  {{
                    formatIDR(
                      (item.price + getAddonTotal(item)) * item.quantity,
                    )
                  }}
                </span>
              </div>
            </div>
          </div>

          <!-- Catatan Produk -->
          <TextField
            name="catatanProduk"
            label="Catatan untuk pesanan ini (opsional)"
            textarea
            :rows="3"
            v-model="form.catatanProduk"
            :labelBold="false"
            variant="muted"
            customClass="text-sm"
          />
        </div>
      </section>

      <!-- Promo (hanya jika sudah login) -->
      <section
        v-if="!isGuest"
        class="overflow-hidden bg-white border border-gray-200 rounded-xl"
      >
        <!-- Header Section -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
          <div class="flex items-center gap-2">
            <svg
              class="w-5 h-5 text-[#FFA30E]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h2 class="text-sm font-semibold text-gray-800">Voucher Toko</h2>
          </div>
          <button
            type="button"
            class="text-xs font-semibold text-[#FFA30E] hover:text-[#e5920d] hover:underline flex items-center gap-1 cursor-pointer transition"
            @click="openPromo = true"
          >
            {{ selectedPromo ? "Ganti Voucher" : "Pilih Voucher" }}
            <span>&rarr;</span>
          </button>
        </div>

        <!-- STATE 1: JIKA SUDAH ADA VOUCHER YANG DIPILIH -->
        <div
          v-if="selectedPromo"
          class="p-4 bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-white"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1.5 min-w-0">
              <div class="flex items-center flex-wrap gap-2">
                <!-- Kode Badge -->
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#FFA30E] text-white tracking-wide uppercase shadow-xs">
                  {{ selectedPromo.code }}
                </span>
                <!-- Diskon Badge -->
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                  :class="selectedPromo.type === 'percent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
                >
                  {{ selectedPromo.type === 'percent' ? `Diskon ${selectedPromo.value}%` : `Potongan Rp ${formatIDR(selectedPromo.value)}` }}
                </span>
              </div>

              <!-- Nama Voucher -->
              <h3 class="text-sm font-bold text-gray-900 pt-0.5">
                {{ selectedPromo.name }}
              </h3>

              <!-- Deskripsi Voucher jika ada -->
              <p v-if="selectedPromo.desc" class="text-xs text-gray-600">
                {{ selectedPromo.desc }}
              </p>

              <!-- Detail Potongan & Ketentuan -->
              <div class="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span class="text-green-700 font-semibold flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 inline text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Hemat Rp {{ formatIDR(amounts.diskon) }}
                </span>
                <span v-if="selectedPromo.min_purchase">
                  Min. Belanja: Rp {{ formatIDR(selectedPromo.min_purchase) }}
                </span>
                <span v-if="selectedPromo.type === 'percent' && selectedPromo.max_discount">
                  Maks. Potongan: Rp {{ formatIDR(selectedPromo.max_discount) }}
                </span>
              </div>
            </div>

            <!-- Tombol Batalkan / Hapus -->
            <button
              type="button"
              class="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Batalkan Voucher"
              @click="clearPromo"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- STATE 2: JIKA BELUM ADA VOUCHER YANG DIPILIH -->
        <div
          v-else
          class="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/80 transition"
          @click="openPromo = true"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-[#FFA30E] shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800">
                Gunakan Voucher Promo
              </p>
              <p class="text-xs text-gray-500">
                Makin hemat belanja dengan voucher diskon & potongan harga
              </p>
            </div>
          </div>
          <button
            type="button"
            class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FFA30E] text-white hover:bg-[#e5920d] transition shrink-0"
            @click.stop="openPromo = true"
          >
            Pilih
          </button>
        </div>
      </section>

      <!-- Ringkasan Pembayaran -->
      <section class="p-4 bg-white border border-gray-200 rounded-xl">
        <h2 class="mb-3 font-semibold text-gray-800">Ringkasan Pembayaran</h2>

        <div class="space-y-3">
          <!-- Rincian Harga -->
          <div
            class="space-y-2 text-sm text-gray-700"
          >
            <div class="flex justify-between">
              <span>Subtotal Produk </span>
              <span>Rp {{ formatIDR(amounts.product) }}</span>
            </div>

            <div
              v-if="amounts.diskon > 0"
              class="flex justify-between text-green-600"
            >
              <span>
                Diskon
                <span
                  v-if="selectedPromo"
                  class="text-xs font-semibold text-amber-600"
                >
                  ({{ selectedPromo.code }})
                </span>
              </span>
              <span>-Rp {{ formatIDR(amounts.diskon) }}</span>
            </div>

            <div class="flex justify-between text-base font-bold">
              <span>Total Pembayaran</span>
              <span class="text-[#FFA30E]">Rp {{ formatIDR(total) }}</span>
            </div>
          </div>

          <p class="pt-2 text-xs text-gray-500 border-t border-gray-100">
            *Metode pengiriman dan pembayaran akan disepakati langsung dengan penjual melalui WhatsApp.
          </p>
        </div>
      </section>
    </main>

    <!-- Bottom bar (Total + Pesan button) -->
    <footer
      class="fixed left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg bottom-0"
    >
      <div class="px-4 py-3 mx-auto space-y-2 max-w-7xl">
        <div
          class="flex items-center justify-between text-xs font-semibold text-gray-900 sm:text-sm"
        >
          <span>Total Pembayaran</span>
          <span class="text-[#FFA30E]">Rp {{ formatIDR(total) }}</span>
        </div>

        <button
          class="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold bg-[#FFA30E] hover:bg-[#e5920d] transition disabled:opacity-50 disabled:cursor-not-allowed"
          @click="openWhatsapp"
          :disabled="!isFormValid"
        >
          <svg
            class="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
            />
          </svg>
          <span>Pesan via WhatsApp</span>
        </button>
      </div>
    </footer>

    <!-- Modal Promo List (hanya jika sudah login) -->
    <ResponsiveModal
      v-if="!isGuest"
      :show="openPromo"
      @close="openPromo = false"
      title="Pilih Promo"
      subtitle="Gunakan promo untuk mendapat potongan harga"
    >
      <div class="space-y-3">
        <!-- Manual Voucher Input -->
        <div class="flex gap-2 pb-3 mb-3 border-b border-gray-200">
          <input
            v-model="voucherCodeInput"
            type="text"
            placeholder="Masukkan kode voucher"
            class="flex-1 px-3 py-2 text-sm border border-gray-300 uppercase rounded-lg focus:ring-[#FFA30E] focus:border-[#FFA30E]"
            @keydown.enter.prevent="applyManualVoucher"
          />
          <button
            type="button"
            @click="applyManualVoucher"
            :disabled="!voucherCodeInput?.trim() || validatingVoucher"
            class="px-4 py-2 text-sm font-semibold text-white transition rounded-lg bg-[#FFA30E] hover:bg-[#e5920d] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ validatingVoucher ? 'Memeriksa...' : 'Terapkan' }}
          </button>
        </div>

        <div
          v-if="voucherLoading"
          class="py-6 text-sm text-center text-gray-500"
        >
          Memuat voucher...
        </div>

        <div
          v-else-if="!promos.length"
          class="py-6 text-sm text-center text-gray-500"
        >
          Tidak ada voucher tersedia
        </div>

        <div
          v-for="p in promos"
          :key="p.code"
          class="p-4 space-y-1 border rounded-xl"
          :class="
            selectedPromo?.code === p.code
              ? 'border-[#FFA30E] bg-orange-50'
              : 'border-gray-200'
          "
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="font-semibold text-gray-900">{{ p.name }}</div>
              <div class="text-xs text-gray-600">{{ p.desc }}</div>
            </div>

            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="
                p.type === 'percent'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              "
            >
              {{
                p.type === "percent"
                  ? p.value + "%"
                  : "Rp " + formatIDR(p.value)
              }}
            </span>
          </div>

          <div class="mt-1 text-xs text-gray-500">
            Min. pembelian: Rp {{ formatIDR(p.min_purchase) }}
          </div>

          <div
            v-if="p.type === 'percent' && p.max_discount"
            class="text-xs text-gray-500"
          >
            Maks. diskon: Rp {{ formatIDR(p.max_discount) }}
          </div>

          <div v-if="p.restricted_product_ids && p.restricted_product_ids.length > 0" class="mt-1">
            <span class="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              <i class="pi pi-box mr-1 text-[9px]"></i> Khusus {{ p.restricted_product_ids.length }} produk tertentu
            </span>
          </div>

          <div class="text-xs text-gray-500">Pemakaian: {{ p.usage }}</div>

          <button
            class="w-full py-2 mt-2 text-xs font-semibold transition rounded-lg"
            :disabled="p.is_expired || !isPromoEligible(p)"
            :class="
              p.is_expired || !isPromoEligible(p)
                ? 'bg-gray-200 text-gray-400'
                : 'bg-[#FFA30E] text-white hover:bg-[#e5920d]'
            "
            @click="usePromo(p)"
          >
            {{
              p.is_expired
                ? "Tidak Berlaku"
                : !isPromoEligible(p)
                  ? getEligibleSubtotal(p) <= 0
                    ? "Produk Tidak Cocok"
                    : "Min. Belanja Belum Cukup"
                  : "Gunakan Voucher"
            }}
          </button>
        </div>
      </div>

      <template #footer>
        <button
          @click="openPromo = false"
          class="w-full px-4 py-3 font-semibold text-gray-700 transition bg-gray-100 rounded-xl hover:bg-gray-200"
        >
          Tutup
        </button>
      </template>
    </ResponsiveModal>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import TextField from "@/components/forms/TextField.vue";
import MobileHeader from "@/components/customer/MobileHeader.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { useCheckoutStore } from "@/stores/checkout";
import { useAuthStore } from "@/stores/auth";
import * as yup from "yup";
import { Form } from "vee-validate";
import { useVouchers } from "@/composables/useVouchers";
import { useToast } from "vue-toastification";
import api from "@/libs/axios.js";
const {
  fetchVouchersByMerchant,
  vouchers,
  loading: voucherLoading,
} = useVouchers();

const toast = useToast();

const schema = yup.object({
  nama: yup.string().required("Nama wajib diisi"),
  tel: yup
    .string()
    .max(13, "No. Telepon maksimal 13 digit")
    .matches(
      /^08[0-9]{8,11}$/,
      "Format nomor telepon tidak valid, harus diawali dengan 08, lebih dari 10 digit",
    )
    .min(10, "No. Telepon minimal 10 digit"),

  catatanProduk: yup.string(),
});

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const checkout = useCheckoutStore();

function resolveItemImage(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (typeof img === "object") {
    return img.src || img.thumb_url || img.src_url || img.url || img.image_url || "";
  }
  return "";
}

const checkoutItems = computed(() => {
  if (checkout.from === "cart") {
    return checkout.cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      image: resolveItemImage(item.image),
      quantity: item.quantity,
      stock: Number(item.stock || 0),
      price: item.unitPrice,
      addons: item.addons || [],
      variant: item.variant || null,
    }));
  }

  // SINGLE PRODUCT MODE
  return [
    {
      id: checkout.productSlug,
      name: checkout.productTitle,
      image: resolveItemImage(checkout.productImage),
      quantity: checkout.qty,
      stock: Number(checkout.combination?.stock || 0),
      price: checkout.unitPrice,
      addons: checkout.selectedAddons,
      variant: checkout.selectedVariantName,
    },
  ];
});
const isGuest = computed(() => !auth.isAuthenticated);
// Order view model (dari store)
const order = computed(() => {
  if (checkout.from === "cart") {
    return {
      store: checkout.store,
      items: checkout.cartItems,
    };
  }

  // single product
  return {
    slug: checkout.productSlug,
    title: checkout.productTitle,
    image: resolveItemImage(checkout.productImage),
    quantity: checkout.qty,
    stock: Number(checkout.combination?.stock || 0),
    size: checkout.selectedSizeName || "",
    variant: checkout.selectedVariantName || "",
    addons: checkout.selectedAddons.map((a) => a.name),
    store: checkout.store,
  };
});

// Nominal dari store
const amounts = ref({
  product: 0, // akan diisi dari lineSubtotal
  diskon: 0,
});

// ✅ total addon per item (bukan dikali qty)
const addonUnitTotal = computed(() => Number(checkout.addonTotal || 0));
// ✅ Total akhir: harga produk - diskon
const total = computed(() => {
  const product = Number(amounts.value.product || 0);
  const diskon = Number(amounts.value.diskon || 0);
  return Math.max(0, product - diskon);
});

// sinkronisasi amounts.product
watch(
  () => checkout.totalPrice,
  (v) => {
    amounts.value.product = v;
  },
  { immediate: true },
);
const getAddonTotal = (item) => {
  if (!item.addons || !item.addons.length) return 0;
  return item.addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
};

const formatIDR = (v) => Number(v || 0).toLocaleString("id-ID");

// Saat user mengubah size/variant/addon di halaman ini (gunakan handler Anda), panggil:
// checkout.updateSelection({ sizeId, sizeName, variantId, variantName, unitPrice, stock });
// checkout.setAddons(newAddonsArray);

// Merchant phone
function normalizePhone(raw) {
  if (!raw) return "";
  let p = String(raw).trim().replace(/[^\d]/g, "");

  // Handle common Indonesian formats: 08xx, 8xx, 62xx, and malformed 6208xx
  if (p.startsWith("6208")) p = "628" + p.slice(4);
  else if (p.startsWith("08")) p = "628" + p.slice(2);
  else if (p.startsWith("8")) p = "62" + p;
  else if (p.startsWith("0")) p = "62" + p.slice(1);

  // Keep only a single country-code prefix if duplicated accidentally
  p = p.replace(/^62+/, "62");
  return p;
}

function pickPhoneCandidate(source) {
  const s = source || {};
  return (
    s.phone ||
    s.phone_number ||
    s.phoneNumber ||
    s.whatsapp ||
    s.whatsapp_number ||
    s.whatsappNumber ||
    s.mobile ||
    s.mobile_phone ||
    s.mobilePhone ||
    s.no_hp ||
    s.noHp ||
    s.telp ||
    s.telepon ||
    s.user?.phone ||
    s.user?.phone_number ||
    ""
  );
}

function resolveMerchantPhoneRaw() {
  const s1 = checkout.store || {};
  const s2 = order.value?.store || {};

  return pickPhoneCandidate(s1) || pickPhoneCandidate(s2) || "";
}

const merchantPhoneNormalized = computed(() =>
  normalizePhone(resolveMerchantPhoneRaw()),
);

function isValidWhatsAppPhone(phone) {
  const digitsOnly = String(phone || "").replace(/\D/g, "");
  if (!digitsOnly) return false;
  // WhatsApp generally expects E.164 digits without '+', typically up to 15 digits
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;
  // Indonesia store numbers should be normalized to start with 62
  if (!digitsOnly.startsWith("62")) return false;
  return true;
}

async function fetchMerchantPhoneBySlug() {
  const slugFromStore = checkout.store?.slug || order.value?.store?.slug || "";
  const slugFromQuery = String(route.query?.storeSlug || "").trim();
  const merchantSlug = String(slugFromStore || slugFromQuery || "").trim();

  if (!merchantSlug) return "";

  try {
    const { data } = await api.get(`/api/public/merchants/${merchantSlug}`);
    const merchant = data?.data || data || {};
    return pickPhoneCandidate(merchant);
  } catch (e) {
    return "";
  }
}

// Saat mounted, jika slug tersedia, fetch product untuk ambil merchant_address
onMounted(async () => {
  if (checkout.from === "cart") {
    if ((!checkout.store?.id && !checkout.store?.merchantId) || checkout.cartItems.length === 0) {
      router.replace({ name: "Keranjang" });
      return;
    }
  } else {
    if (!checkout.productSlug && !checkout.productTitle) {
      router.replace({ name: "Beranda" });
      return;
    }
  }

  const storeSlug = order.value?.store?.slug || checkout.store?.slug;
  if (!isGuest.value && storeSlug) {
    await fetchVouchersByMerchant(storeSlug);
  }
});
const promos = computed(() =>
  vouchers.value.map((v) => ({
    code: v.voucher_code,
    name: v.voucher_name,
    desc: v.voucher_description,
    type: v.voucher_type, // percent | fixed
    value: Number(v.value),
    max_discount: Number(v.max_discount_amount || 0),
    min_purchase: Number(v.min_purchase_amount || 0),
    usage: v.usage,
    usage_limit: v.usage_limit === null || v.usage_limit === undefined ? null : Number(v.usage_limit),
    usages_count: Number(v.usages_count || 0),
    usage_limit_per_user: v.usage_limit_per_user === null || v.usage_limit_per_user === undefined ? null : Number(v.usage_limit_per_user),
    user_usages_count: Number(v.user_usages_count || 0),
    is_expired: v.is_expired,
    restricted_product_ids: v.restricted_product_ids || [],
  })),
);

// Form state
const form = ref({
  nama: "",
  tel: "",
  catatanProduk: "",
});

// Promo state harus didefinisikan sebelum watcher (immediate)
const selectedPromo = ref(null);
const voucherCodeInput = ref("");
const validatingVoucher = ref(false);

function getEligibleSubtotal(promo) {
  if (!promo) return 0;
  const restrictedIds = promo.restricted_product_ids || [];

  // Jika tidak ada pembatasan produk, seluruh subtotal produk dihitung
  if (!Array.isArray(restrictedIds) || restrictedIds.length === 0) {
    return Number(amounts.value.product || 0);
  }

  let eligibleSum = 0;

  if (checkout.from === "cart") {
    (checkout.cartItems || []).forEach((it) => {
      const pid = it.productId ?? it.id;
      if (pid && restrictedIds.map(Number).includes(Number(pid))) {
        const itemUnitPrice = Number(it.unitPrice || 0);
        const itemAddonTotal = (it.addons || []).reduce((s, a) => s + Number(a.price || 0), 0);
        const itemQty = Number(it.quantity || 1);
        eligibleSum += (itemUnitPrice + itemAddonTotal) * itemQty;
      }
    });
  } else {
    // Single product mode
    const pid = checkout.productId;
    if (pid && restrictedIds.map(Number).includes(Number(pid))) {
      eligibleSum = Number(amounts.value.product || 0);
    }
  }

  return eligibleSum;
}

async function applyManualVoucher() {
  const code = voucherCodeInput.value?.trim();
  if (!code || validatingVoucher.value) return;

  validatingVoucher.value = true;
  try {
    const merchantId = checkout.store?.id || order.value.store?.id;
    if (!merchantId) {
      toast.error("Gagal mendapatkan ID toko.");
      return;
    }

    const payloadItems = checkout.from === 'cart'
      ? (checkout.cartItems || []).map(it => ({
          product_id: it.productId ?? it.id,
          price: Number(it.unitPrice || 0),
          quantity: Number(it.quantity || 1),
          subtotal: (Number(it.unitPrice || 0) + (it.addons || []).reduce((s, a) => s + Number(a.price || 0), 0)) * Number(it.quantity || 1)
        }))
      : [{
          product_id: checkout.productId,
          price: Number(amounts.value.product || 0),
          quantity: 1,
          subtotal: Number(amounts.value.product || 0)
        }];

    const { data } = await api.post("/api/checkout/vouchers/validate", {
      voucher_code: code.toUpperCase(),
      order_amount: amounts.value.product,
      merchant_id: merchantId,
      items: payloadItems,
      product_id: checkout.productId || undefined,
    });
    
    const v = data.voucher;
    const restrictedProds = v.restricted_products || v.restrictedProducts || [];
    const p = {
      code: v.voucher_code,
      name: v.voucher_name,
      desc: v.voucher_description,
      type: v.voucher_type, // percent | fixed
      value: Number(v.value),
      max_discount: Number(v.max_discount_amount || 0),
      min_purchase: Number(v.min_purchase_amount || 0),
      usage: "0 / " + (v.usage_limit || "∞"),
      usage_limit: v.usage_limit === null ? null : Number(v.usage_limit),
      usages_count: Number(v.usages_count || 0),
      is_expired: false,
      restricted_product_ids: restrictedProds.map((x) => x.id),
    };
    
    usePromo(p);
    voucherCodeInput.value = "";
    toast.success("Voucher berhasil diterapkan");
  } catch (error) {
    const message = error.response?.data?.message || "Voucher tidak valid";
    toast.error(message);
  } finally {
    validatingVoucher.value = false;
  }
}

watch(
  () => isGuest.value,
  (guest) => {
    if (guest) {
      clearPromo();
      return;
    }

    if (order.value.store?.slug) {
      fetchVouchersByMerchant(order.value.store.slug);
    }
  },
  { immediate: true },
);

watch(
  () => amounts.value.product,
  () => {
    if (selectedPromo.value) {
      const discount = computeDiscount(selectedPromo.value);
      if (discount <= 0) {
        clearPromo();
      } else {
        amounts.value.diskon = discount;
      }
    }
  },
);

function isPromoEligible(promo) {
  if (!promo || promo.is_expired) return false;
  const eligibleSubtotal = getEligibleSubtotal(promo);
  if (eligibleSubtotal <= 0) return false;
  return eligibleSubtotal >= Number(promo?.min_purchase || 0);
}

function computeDiscount(promo) {
  if (!promo || promo.is_expired) return 0;
  const eligibleSubtotal = getEligibleSubtotal(promo);
  if (eligibleSubtotal <= 0) return 0;
  if (eligibleSubtotal < promo.min_purchase) return 0;

  if (promo.type === "fixed") {
    return Math.min(promo.value, eligibleSubtotal);
  }

  if (promo.type === "percent") {
    let discount = Math.floor((promo.value / 100) * eligibleSubtotal);

    if (promo.max_discount && discount > promo.max_discount) {
      discount = promo.max_discount;
    }

    return discount;
  }

  return 0;
}

function usePromo(p) {
  if (p.is_expired) {
    toast.warning("Voucher sudah tidak berlaku");
    return;
  }

  const eligibleSubtotal = getEligibleSubtotal(p);
  if (eligibleSubtotal <= 0) {
    toast.warning("Voucher ini tidak berlaku untuk produk dalam pesanan Anda");
    return;
  }

  if (eligibleSubtotal < p.min_purchase) {
    toast.warning(
      `Minimal pembelian produk yang memenuhi syarat adalah Rp ${formatIDR(p.min_purchase)}`,
    );
    return;
  }

  const discount = computeDiscount(p);
  selectedPromo.value = p;
  amounts.value.diskon = discount;
  openPromo.value = false;
}

function clearPromo() {
  selectedPromo.value = null;
  amounts.value.diskon = 0;
}

function getItemStockSummary(item) {
  const stock = Number(item?.stock || 0);
  const quantity = Number(item?.quantity || 0);
  const shortage = Math.max(0, quantity - stock);

  return {
    stock,
    shortage,
  };
}

function getPromoStockSummary(promo) {
  if (!promo) return null;

  const totalRemaining =
    promo.usage_limit === null
      ? null
      : Math.max(0, Number(promo.usage_limit || 0) - Number(promo.usages_count || 0));

  const userRemaining =
    promo.usage_limit_per_user === null
      ? null
      : Math.max(
          0,
          Number(promo.usage_limit_per_user || 0) -
            Number(promo.user_usages_count || 0),
        );

  return {
    totalRemaining,
    userRemaining,
  };
}

// Nama/telp dari auth
const customerName = computed(() => auth.user?.name || form.value.nama || "");
const customerPhone = computed(() =>
  normalizePhone(auth.user?.phone || form.value.tel || ""),
);

// Validasi
const openPromo = ref(false);
useBodyScrollLock(openPromo);

const isFormValid = computed(() => {
  if (isGuest.value) {
    if (!form.value.nama || !form.value.tel) return false;
  }
  return true;
});

// WhatsApp text
const openWhatsapp = async () => {
  if (!isFormValid.value) {
    alert("Mohon lengkapi data pemesan");
    return;
  }

  let productDetails = "";

  if (checkout.from === "cart") {
    productDetails = checkout.cartItems
      .map(
        (i, idx) =>
          (() => {
            const stockInfo = getItemStockSummary(i);
            return (
              `${idx + 1}. ${i.name}\n` +
              (i.variant ? `Varian: ${i.variant}\n` : "") +
              (i.size ? `Ukuran: ${i.size}\n` : "") +
              `Jumlah: ${i.quantity}x\n` +
              `Stok tersedia: ${stockInfo.stock}\n` +
              (stockInfo.shortage > 0
                ? `Kurang stok: ${stockInfo.shortage}\n`
                : "") +
              `Harga: Rp ${formatIDR(
                (i.unitPrice + i.addonTotalPrice) * i.quantity,
              )}`
            );
          })(),
      )
      .join("\n\n");
  } else {
    const stockInfo = getItemStockSummary({
      quantity: checkout.qty,
      stock: checkout.combination?.stock || 0,
    });

    productDetails = [
      `Produk: ${order.value.title}`,
      order.value.size ? `Ukuran: ${order.value.size}` : "",
      order.value.variant ? `Varian: ${order.value.variant}` : "",
      checkout.selectedAddons.length
        ? `Tambahan: ${checkout.selectedAddons.map((a) => a.name).join(", ")}`
        : "",
      `Jumlah: ${checkout.qty}x`,
      `Stok tersedia: ${stockInfo.stock}`,
      stockInfo.shortage > 0 ? `Kurang stok: ${stockInfo.shortage}` : "",
      `Subtotal: Rp ${formatIDR(total.value)}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const promoStockInfo = getPromoStockSummary(selectedPromo.value);
  const voucherInfo = selectedPromo.value
    ? [
        "\n*VOUCHER*",
        `Voucher: ${selectedPromo.value.name} (${selectedPromo.value.code})`,
        promoStockInfo?.totalRemaining === null
          ? "Sisa voucher: unlimited"
          : `Sisa voucher: ${promoStockInfo.totalRemaining}`,
        promoStockInfo?.userRemaining === null
          ? null
          : `Sisa voucher per user: ${promoStockInfo.userRemaining}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const text = [
    "*PESANAN BARU DARI SUMILIR*",
    "\n*DATA PEMESAN*",
    `Nama: ${customerName.value}`,
    `Telp: ${customerPhone.value}`,
    "\n*DETAIL PESANAN*",
    productDetails,
    form.value.catatanProduk ? `\nCatatan: ${form.value.catatanProduk}` : "",
    voucherInfo,
    "\n*RINCIAN HARGA*",
    `Harga Produk: Rp ${formatIDR(amounts.value.product)}`,
    amounts.value.diskon > 0
      ? `Diskon (${selectedPromo.value?.code}): -Rp ${formatIDR(
          amounts.value.diskon,
        )}`
      : "",
    `*Total: Rp ${formatIDR(total.value)}*`,
    "\n_Metode pengiriman dan pembayaran akan disepakati melalui chat ini._",
  ]
    .filter(Boolean)
    .join("\n");

  let phone = merchantPhoneNormalized.value;

  if (!isValidWhatsAppPhone(phone)) {
    const fetchedRawPhone = await fetchMerchantPhoneBySlug();
    const fetchedPhone = normalizePhone(fetchedRawPhone);

    if (isValidWhatsAppPhone(fetchedPhone)) {
      phone = fetchedPhone;
      checkout.store = {
        ...checkout.store,
        phone: fetchedRawPhone || fetchedPhone,
      };
    }
  }

  if (!isValidWhatsAppPhone(phone)) {
    toast.error(
      "Nomor WhatsApp penjual belum tersedia atau tidak valid. Silakan hubungi admin / cek data toko.",
    );
    return;
  }

  if (auth.isAuthenticated) {
    try {
      const checkoutPayload = {
        merchant_slug: checkout.store?.slug || order.value.store?.slug || "",
        mode: checkout.from,
        shipping_method: "WhatsApp",
        payment_method: "WhatsApp",
        customer_name: customerName.value,
        customer_phone: customerPhone.value,
        delivery_address: "",
        delivery_note: "",
        product_note: form.value.catatanProduk || "",
        voucher_code: selectedPromo.value?.code || "",
        shipping_fee: 0,
      };

      if (checkout.from === "cart") {
        checkoutPayload.cart_item_ids = checkout.cartItems.map((item) => item.id);
      } else {
        checkoutPayload.product_slug = checkout.productSlug;
        checkoutPayload.product_variant_id =
          checkout.selectedVariantId || checkout.combination?.variantId || null;
        checkoutPayload.quantity = checkout.qty;
        checkoutPayload.addons = (checkout.selectedAddons || []).map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
        }));
      }

      const checkoutResponse = await api.post(
        "/api/checkout/whatsapp",
        checkoutPayload,
      );

      if (checkoutResponse.data?.success === false) {
        toast.error(checkoutResponse.data?.message || "Checkout gagal diproses");
        return;
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Checkout gagal diproses";
      toast.error(message);
      return;
    }
  }

  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(
    text,
  )}`;
  window.open(url, "_blank");
  checkout.clear();
  router.back();
};

onBeforeRouteLeave(() => {
  checkout.clear();
});
</script>

<style scoped>
/* Custom scrollbar untuk modal */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
