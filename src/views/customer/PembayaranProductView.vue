<template>
  <div class="mx-auto pb-28 sm:pb-30 max-w-7xl">
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

      <!-- Metode Pengiriman -->
      <section class="p-4 bg-white border border-gray-200 rounded-xl">
        <h2 class="mb-3 font-semibold text-gray-800">Metode Pengiriman</h2>
        <div class="flex items-center gap-4 text-sm">
          <!-- <label
            class="flex items-center gap-2"
            :class="
              isGuest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            "
          >
            <input
              type="radio"
              value="delivery"
              v-model="form.metodePengiriman"
              :disabled="isGuest"
              class="w-4 h-4 text-[#FFA30E] focus:ring-[#FFA30E]"
            />
            <span>Diantar</span>
          </label> -->

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="pickup"
              v-model="form.metodePengiriman"
              class="w-4 h-4 text-[#FFA30E] focus:ring-[#FFA30E]"
            />
            <span>Ambil Sendiri</span>
          </label>
        </div>
      </section>

      <!-- Detail Alamat - hanya tampil jika diantar -->
      <section
        v-if="form.metodePengiriman === 'delivery'"
        class="p-4 bg-white border border-gray-200 rounded-xl"
      >
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-gray-800">Alamat Pengiriman</h2>
          <button
            @click="showAlamatModal = true"
            class="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFA30E] text-white hover:bg-[#e5920d] transition"
          >
            {{ selectedAddress ? "Ganti Alamat" : "Pilih Alamat" }}
          </button>
        </div>

        <div v-if="selectedAddress" class="space-y-3">
          <div class="flex items-start gap-2 text-sm">
            <i class="text-xl pi pi-map-marker text-primary"></i>
            <div class="flex-1">
              <div class="font-semibold text-gray-800">
                {{ selectedAddress.label }}
              </div>
              <p class="mt-1 leading-snug text-gray-600">
                {{ selectedAddress.fullAddress }}
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {{ selectedAddress.penerima }} - {{ selectedAddress.telp }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="py-4 text-sm text-center text-gray-500">
          Belum ada alamat dipilih
        </div>
      </section>

      <!-- Alamat Toko - untuk pickup -->
      <section
        v-if="form.metodePengiriman === 'pickup'"
        class="p-4 bg-white border border-gray-200 rounded-xl"
      >
        <h2 class="mb-3 font-semibold text-gray-800">Lokasi Toko</h2>
        <div class="flex items-start gap-2 text-sm">
          <i class="text-xl pi pi-map-marker text-merchant-primary"></i>

          <div class="flex-1">
            <div class="font-semibold text-gray-800">
              {{ order.store?.name || "Toko" }}
            </div>
            <p class="mt-1 leading-snug text-gray-600">
              {{
                // ✅ Prioritas: merchant_address dari API product detail
                order.store?.address || "Alamat toko belum tersedia"
              }}
            </p>
          </div>
        </div>
      </section>

      <!-- Promo (hanya jika sudah login) -->
      <section
        v-if="!isGuest"
        class="overflow-hidden bg-white border border-gray-200 rounded-xl"
      >
        <div class="flex items-center justify-between px-4 py-3 bg-lime-50">
          <div class="text-sm font-semibold text-gray-800">
            {{
              selectedPromo ? selectedPromo.name : "Belum ada voucher dipilih"
            }}
          </div>
          <button
            v-if="!selectedPromo"
            class="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFA30E] text-white hover:bg-[#e5920d] transition"
            @click="openPromo = true"
          >
            Pilih
          </button>
          <button
            v-else
            class="px-3 py-1 text-xs font-semibold text-red-700 transition bg-red-100 rounded-full hover:bg-red-200"
            @click="clearPromo"
          >
            Batalkan
          </button>
        </div>

        <button
          class="flex items-center justify-between w-full px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
          @click="openPromo = true"
        >
          Lihat promo lainnya
          <span>→</span>
        </button>
      </section>

      <!-- Ringkasan Pembayaran -->
      <section class="p-4 bg-white border border-gray-200 rounded-xl">
        <h2 class="mb-3 font-semibold text-gray-800">Ringkasan Pembayaran</h2>

        <div class="space-y-3">
          <!-- Metode Pembayaran -->
          <div>
            <div class="mb-2 text-sm text-gray-600">Metode Pembayaran</div>
            <div class="flex items-center gap-6 text-sm">
              <label
                class="flex items-center gap-2"
                :class="
                  form.metodePengiriman === 'delivery'
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                "
              >
                <input
                  type="radio"
                  value="COD"
                  v-model="pay.method"
                  :disabled="form.metodePengiriman === 'delivery'"
                  class="w-4 h-4 text-[#FFA30E] focus:ring-[#FFA30E] disabled:cursor-not-allowed"
                />
                <span>COD (Cash)</span>
              </label>
              <!-- <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="QRIS"
                  v-model="pay.method"
                  class="w-4 h-4 text-[#FFA30E] focus:ring-[#FFA30E]"
                />
                <span>QRIS</span>
              </label> -->
            </div>

            <!-- Info message untuk delivery -->
            <p
              v-if="form.metodePengiriman === 'delivery'"
              class="flex items-start gap-1 mt-2 text-xs text-amber-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-4 h-4 shrink-0 mt-0.5"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-8 8a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Untuk pengiriman, pembayaran wajib menggunakan QRIS</span>
            </p>
          </div>

          <!-- Rincian Harga -->
          <div
            class="pt-3 space-y-2 text-sm text-gray-700 border-t border-gray-200"
          >
            <div class="flex justify-between">
              <span>Subtotal Produk </span>
              <span>Rp {{ formatIDR(amounts.product) }}</span>
            </div>

            <div
              v-if="form.metodePengiriman === 'delivery'"
              class="flex justify-between"
            >
              <span>Biaya Pengiriman</span>
              <span>Rp {{ formatIDR(amounts.ongkir) }}</span>
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

            <div class="my-2 border-t border-gray-300"></div>

            <div class="flex justify-between text-base font-bold">
              <span>Total Pembayaran</span>
              <span class="text-[#FFA30E]">Rp {{ formatIDR(total) }}</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Bottom bar (Total + Pesan button) -->
    <footer
      class="fixed left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg bottom-16 sm:bottom-0"
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

    <!-- Modal Pilih Alamat -->
    <ResponsiveModal
      :show="showAlamatModal"
      @close="showAlamatModal = false"
      title="Pilih Alamat Pengiriman"
      subtitle="Pilih alamat untuk pengiriman produk"
    >
      <div class="space-y-3">
        <button
          v-for="addr in addresses"
          :key="addr.id"
          @click="selectAddress(addr)"
          class="w-full p-4 text-left transition border rounded-lg"
          :class="
            selectedAddress?.id === addr.id
              ? 'border-[#FFA30E] bg-orange-50'
              : 'border-gray-200 hover:border-gray-300'
          "
        >
          <div class="flex items-start gap-3">
            <input
              type="radio"
              :checked="selectedAddress?.id === addr.id"
              class="mt-1 w-4 h-4 text-[#FFA30E] focus:ring-[#FFA30E]"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-gray-900">{{
                  addr.label
                }}</span>
                <span
                  v-if="addr.isDefault"
                  class="px-2 py-0.5 text-xs font-medium bg-[#FFA30E] text-white rounded"
                >
                  Utama
                </span>
              </div>
              <p class="text-sm leading-snug text-gray-600">
                {{ addr.fullAddress }}
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {{ addr.penerima }} - {{ addr.telp }}
              </p>
            </div>
          </div>
        </button>
      </div>

      <template #footer>
        <button
          @click="showAlamatModal = false"
          class="w-full px-4 py-3 font-semibold text-gray-700 transition bg-gray-100 rounded-xl hover:bg-gray-200"
        >
          Tutup
        </button>
      </template>
    </ResponsiveModal>

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
          />
          <button
            @click="applyManualVoucher"
            :disabled="!voucherCodeInput || validatingVoucher"
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
            {{ p.is_expired ? "Tidak Berlaku" : "Gunakan Voucher" }}
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

  metodePengiriman: yup.string().required(),
  catatanProduk: yup.string(),
  catatanAlamat: yup.string(),
});

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const checkout = useCheckoutStore();
const checkoutItems = computed(() => {
  if (checkout.from === "cart") {
    return checkout.cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      image:
        typeof item.image === "string"
          ? item.image
          : (item.image?.src_url ?? item.image?.url ?? ""),
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
      image: checkout.productImage,
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
    image: checkout.productImage,
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
  ongkir: 10000,
  diskon: 0,
});

// ✅ total addon per item (bukan dikali qty)
const addonUnitTotal = computed(() => Number(checkout.addonTotal || 0));
// ✅ Total akhir: harga produk + ongkir - diskon
// amounts.product disinkronkan dari checkout.totalPrice (lihat watch di bawah)
const total = computed(() => {
  const product = Number(amounts.value.product || 0);
  const ongkir = Number(amounts.value.ongkir || 0);
  const diskon = Number(amounts.value.diskon || 0);
  return Math.max(0, product + ongkir - diskon);
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

// Tambah state alamat merchant dari product detail

// Saat mounted, jika slug tersedia, fetch product untuk ambil merchant_address
onMounted(async () => {
  if (checkout.from === "cart") {
    if (!checkout.store?.id || checkout.cartItems.length === 0) {
      router.replace({ name: "Beranda" });
    }
  }

  if (!isGuest.value && order.value.store?.slug) {
    await fetchVouchersByMerchant(order.value.store.slug);
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
  })),
);

// Form & promo (tetap)
const form = ref({
  nama: "",
  tel: "",
  metodePengiriman: "pickup",
  catatanProduk: "",
  catatanAlamat: "",
});
const pay = ref({ method: "COD" });

// Promo state harus didefinisikan sebelum watcher (immediate)
const selectedPromo = ref(null);
const voucherCodeInput = ref("");
const validatingVoucher = ref(false);

async function applyManualVoucher() {
  if (!voucherCodeInput.value) return;
  validatingVoucher.value = true;
  try {
    const merchantId = checkout.store?.id || order.value.store?.id;
    if (!merchantId) {
      toast.error("Gagal mendapatkan ID toko.");
      return;
    }
    const { data } = await api.post("/api/checkout/vouchers/validate", {
      voucher_code: voucherCodeInput.value,
      order_amount: amounts.value.product,
      merchant_id: merchantId,
    });
    
    const v = data.voucher;
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
  () => form.value.metodePengiriman,
  (v) => {
    amounts.value.ongkir = v === "pickup" ? 0 : 10000;
    if (v === "delivery") {
      pay.value.method = "QRIS";
    } else if (v === "pickup") {
      pay.value.method = "COD";
    }
  },
  { immediate: true },
);
watch(
  () => isGuest.value,
  (guest) => {
    if (guest) {
      form.value.metodePengiriman = "pickup"; // 🔒 paksa pickup
      pay.value.method = "COD"; // aman (atau COD kalau mau)
      amounts.value.ongkir = 0;
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
  const subtotal = Number(amounts.value.product || 0);
  return !promo?.is_expired && subtotal >= Number(promo?.min_purchase || 0);
}

function computeDiscount(promo) {
  const subtotal = amounts.value.product;

  if (promo.is_expired) return 0;
  if (subtotal < promo.min_purchase) return 0;

  if (promo.type === "fixed") {
    return Math.min(promo.value, subtotal);
  }

  if (promo.type === "percent") {
    let discount = Math.floor((promo.value / 100) * subtotal);

    if (promo.max_discount && discount > promo.max_discount) {
      discount = promo.max_discount;
    }

    return discount;
  }

  return 0;
}

function usePromo(p) {
  const discount = computeDiscount(p);

  if (p.is_expired) {
    toast.warning("Voucher sudah tidak berlaku");
    return;
  }

  if (amounts.value.product < p.min_purchase) {
    toast.warning(
      `Minimal pembelian Rp ${formatIDR(p.min_purchase)} untuk voucher ini`,
    );
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
const showAlamatModal = ref(false);
const openPromo = ref(false);
useBodyScrollLock(showAlamatModal);
useBodyScrollLock(openPromo);
const selectedAddress = ref(null);
const addresses = ref([
  {
    id: 1,
    label: "Rumah",
    penerima: "John Doe",
    telp: "08123456789",
    fullAddress:
      "Jl. Cendrawasih No 5 Rt 1 Rw 1, Banyumanik, Semarang, Jawa Tengah 50268",
    isDefault: true,
  },
]);
if (!selectedAddress.value)
  selectedAddress.value =
    addresses.value.find((a) => a.isDefault) || addresses.value[0] || null;
const isFormValid = computed(() => {
  if (isGuest.value) {
    if (!form.value.nama || !form.value.tel) return false;
  }

  if (form.value.metodePengiriman === "delivery" && !selectedAddress.value) {
    return false;
  }

  return true;
});

// WhatsApp text: gunakan lineSubtotal untuk ringkasan harga
const openWhatsapp = async () => {
  if (!isFormValid.value) {
    alert("Mohon lengkapi data pemesan dan pilih alamat (jika diantar)");
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

  const deliveryInfo =
    form.value.metodePengiriman === "delivery"
      ? [
          "\n*PENGIRIMAN*",
          "Metode: Diantar",
          `Alamat: ${selectedAddress.value.fullAddress}`,
          `Penerima: ${selectedAddress.value.penerima} (${selectedAddress.value.telp})`,
          form.value.catatanAlamat
            ? `Catatan Alamat: ${form.value.catatanAlamat}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          "\n*PENGIRIMAN*",
          "Metode: Ambil Sendiri",
          `Lokasi Toko: ${order.value.store.address}`,
        ].join("\n");

  const text = [
    "*PESANAN BARU DARI SUMILIR*",
    "\n*DATA PEMESAN*",
    `Nama: ${customerName.value}`,
    `Telp: ${customerPhone.value}`,
    "\n*DETAIL PESANAN*",
    productDetails,
    form.value.catatanProduk ? `\nCatatan: ${form.value.catatanProduk}` : "",
    deliveryInfo,
    voucherInfo,
    "\n*PEMBAYARAN*",
    `Metode: ${pay.value.method}`,
    "\n*RINCIAN HARGA*",
    `Harga Produk: Rp ${formatIDR(amounts.value.product)}`,
    form.value.metodePengiriman === "delivery"
      ? `Ongkir: Rp ${formatIDR(amounts.value.ongkir)}`
      : "",
    amounts.value.diskon > 0
      ? `Diskon (${selectedPromo.value?.code}): -Rp ${formatIDR(
          amounts.value.diskon,
        )}`
      : "",
    `*Total: Rp ${formatIDR(total.value)}*`,
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
        shipping_method: form.value.metodePengiriman,
        payment_method: pay.value.method,
        customer_name: customerName.value,
        customer_phone: customerPhone.value,
        delivery_address:
          form.value.metodePengiriman === "delivery"
            ? selectedAddress.value?.fullAddress || ""
            : order.value.store?.address || "",
        delivery_note: form.value.catatanAlamat || "",
        product_note: form.value.catatanProduk || "",
        voucher_code: selectedPromo.value?.code || "",
        shipping_fee: Number(amounts.value.ongkir || 0),
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
