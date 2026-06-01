<template>
  <div class="mx-auto pb-28 max-w-7xl">
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
                <div class="w-20 h-20 overflow-hidden bg-gray-100 rounded-lg">
                  <img :src="item.image" class="object-cover w-full h-full" />
                </div>
                <div class="flex-1 min-w-0 space-y-1">
                  <h3 class="text-sm font-semibold text-gray-900">
                    {{ item.name }}
                  </h3>
                  <div
                    v-if="item.variant"
                    class="text-xs capitalize text-muted-foreground"
                  >
                    Varian: {{ item.variant }}
                  </div>
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-sm font-bold text-[#FFA30E]"
                      >Rp {{ formatIDR(item.price) }}</span
                    >
                    <span class="text-xs text-gray-600"
                      >x{{ item.quantity }}</span
                    >
                  </div>
                </div>
              </div>
              <div v-if="item.addons?.length" class="space-y-1">
                <div class="text-xs font-semibold text-gray-700">Tambahan:</div>
                <div
                  v-for="addon in item.addons"
                  :key="addon.id || addon.label"
                  class="flex items-center justify-between gap-2 text-xs text-gray-700"
                >
                  <div class="flex items-center gap-1">
                    + <span>{{ addon.name || addon.label }}</span>
                  </div>
                  <span>Rp {{ formatIDR(addon.price) }}</span>
                </div>
              </div>
              <div
                class="flex items-center justify-between gap-2 text-sm font-semibold text-black"
              >
                <span>Total</span>
                <span
                  >Rp
                  {{
                    formatIDR(
                      (item.price + getAddonTotal(item)) * item.quantity,
                    )
                  }}</span
                >
              </div>
            </div>
          </div>
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
          <label
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
          </label>
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
        <h2 class="mb-3 font-semibold text-gray-800">Alamat Pengiriman</h2>
        <div
          v-if="addressesLoading"
          class="py-4 text-sm text-center text-gray-500"
        >
          Memuat alamat...
        </div>
        <div v-else-if="selectedAddress" class="space-y-3">
          <div class="flex items-start gap-2 text-sm">
            <i class="text-xl pi pi-map-marker text-primary"></i>
            <div class="flex-1">
              <div class="font-semibold text-gray-800 capitalize">
                {{ selectedAddress.label }}
              </div>
              <p class="mt-1 leading-snug text-gray-600">
                {{ selectedAddress.fullAddress }}
              </p>
            </div>
          </div>
        </div>
        <div v-else class="py-4 text-sm text-center text-gray-500">
          Belum ada alamat tersimpan. Silakan tambahkan alamat di profil Anda.
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
              {{ order.store?.address || "Alamat toko belum tersedia" }}
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
          Lihat promo lainnya <span>&rarr;</span>
        </button>
      </section>

      <!-- Ringkasan Pembayaran -->
      <section class="p-4 bg-white border border-gray-200 rounded-xl">
        <h2 class="mb-3 font-semibold text-gray-800">Ringkasan Pembayaran</h2>
        <div class="space-y-3">
          <div>
            <div class="mb-2 text-sm font-bold text-gray-800">Metode Pembayaran</div>
            <div class="space-y-4">
              <div v-for="group in groupedPaymentMethods" :key="group.type">
                <div class="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{{ group.title }}</div>
                <div class="grid gap-2 sm:grid-cols-2">
                  <label
                    v-for="method in group.items"
                    :key="method.id"
                    class="flex items-start gap-3 p-3 transition-colors border rounded-xl"
                    :class="[
                      pay.method === method.id ? 'border-[#FFA30E] bg-orange-50' : 'border-gray-200 cursor-pointer hover:bg-gray-50',
                      (method.id === 'COD' && form.metodePengiriman === 'delivery') ? 'opacity-50 cursor-not-allowed' : ''
                    ]"
                  >
                    <input
                      type="radio"
                      :value="method.id"
                      v-model="pay.method"
                      :disabled="method.id === 'COD' && form.metodePengiriman === 'delivery'"
                      class="mt-1 w-4 h-4 text-[#FFA30E] focus:ring-[#FFA30E] disabled:cursor-not-allowed"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <i :class="['pi', method.icon, 'text-gray-600']"></i>
                        {{ method.name }}
                      </div>
                      <div class="mt-1 text-[11px] text-gray-500">{{ method.description }}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <p
              v-if="form.metodePengiriman === 'delivery'"
              class="flex items-start gap-1 mt-3 text-xs text-amber-600"
            >
              <i class="mt-0.5 pi pi-info-circle"></i>
              <span>Untuk pengiriman, pembayaran wajib menggunakan non-tunai</span>
            </p>
          </div>
          <div
            class="pt-3 space-y-2 text-sm text-gray-700 border-t border-gray-200"
          >
            <div class="flex justify-between">
              <span>Subtotal Produk</span>
              <span>Rp {{ formatIDR(amounts.product) }}</span>
            </div>
            <div v-if="form.metodePengiriman === 'delivery'" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span>Biaya Pengiriman</span>
                <span v-if="shippingLoading" class="text-gray-400"
                  >Menghitung...</span
                >
                <span v-else>Rp {{ formatIDR(amounts.ongkir) }}</span>
              </div>
              <div
                v-if="shippingInfo && shippingInfo.distanceKm > 0"
                class="text-[11px] text-gray-400"
              >
                Jarak {{ shippingInfo.distanceKm }} km
              </div>
              <div
                v-if="shippingInfo && shippingInfo.note"
                class="text-[11px] text-amber-500"
              >
                {{ shippingInfo.note }}
              </div>
            </div>
            <div
              v-if="amounts.diskon > 0"
              class="flex justify-between text-green-600"
            >
              <span
                >Diskon
                <span
                  v-if="selectedPromo"
                  class="text-xs font-semibold text-amber-600"
                  >({{ selectedPromo.code }})</span
                ></span
              >
              <span>-Rp {{ formatIDR(amounts.diskon) }}</span>
            </div>
            <div
              v-if="platformFee > 0"
              class="flex justify-between text-xs"
            >
              <span>Biaya Layanan/Admin</span>
              <span>Rp {{ formatIDR(platformFee) }}</span>
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

    <!-- Bottom bar -->
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
          @click="handleCheckout"
          :disabled="!isFormValid || isSubmitting"
        >
          <span v-if="isSubmitting">Memproses...</span>
          <span v-else>Buat Pesanan</span>
        </button>
      </div>
    </footer>

    <!-- Modal Promo List -->
    <ResponsiveModal
      v-if="!isGuest"
      :show="openPromo"
      @close="openPromo = false"
      title="Pilih Promo"
      subtitle="Gunakan promo untuk mendapat potongan harga"
    >
      <div class="space-y-3">
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
import { useRouter, onBeforeRouteLeave } from "vue-router";
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
import { checkoutProductFromCart } from "@/services/api/order";
import { getMyAddress } from "@/services/api/address";
import { calculateShippingCost } from "@/services/api/shipping";
import { fetchCart as fetchCartApi, addToCart as addToCartApi } from "@/services/api/cart";

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
    .matches(/^08[0-9]{8,11}$/, "Format nomor telepon tidak valid")
    .min(10, "No. Telepon minimal 10 digit"),
  metodePengiriman: yup.string().required(),
  catatanProduk: yup.string(),
});

const auth = useAuthStore();
const router = useRouter();
const checkout = useCheckoutStore();
const isSubmitting = ref(false);

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
      price: item.unitPrice,
      addons: item.addons || [],
      variant: item.variant || null,
    }));
  }
  return [
    {
      id: checkout.productSlug,
      name: checkout.productTitle,
      image: checkout.productImage,
      quantity: checkout.qty,
      price: checkout.unitPrice,
      addons: checkout.selectedAddons,
      variant: checkout.selectedVariantName,
    },
  ];
});

const isGuest = computed(() => !auth.isAuthenticated);

const order = computed(() => {
  if (checkout.from === "cart") {
    return { store: checkout.store, items: checkout.cartItems };
  }
  return {
    slug: checkout.productSlug,
    title: checkout.productTitle,
    store: checkout.store,
  };
});

const amounts = ref({ product: 0, ongkir: 0, diskon: 0 });

const paymentMethodsList = [
  { id: 'COD', name: 'Bayar di Tempat (COD)', type: 'cod', feeType: 'fixed', feeValue: 0, icon: 'pi-money-bill', description: 'Hanya untuk ambil sendiri' },
  { id: 'QRIS', name: 'QRIS (Gopay, OVO, Dana, dll)', type: 'qris', feeType: 'percent', feeValue: 0.007, icon: 'pi-qrcode', description: 'Biaya admin 0.7%' },
  { id: 'BCA', name: 'BCA Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },
  { id: 'BNI', name: 'BNI Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },
  { id: 'BRI', name: 'BRI Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },
  { id: 'MANDIRI', name: 'Mandiri Virtual Account', type: 'va', feeType: 'fixed', feeValue: 4440, icon: 'pi-building', description: 'Biaya admin Rp 4.440' },
  { id: 'SHOPEEPAY', name: 'ShopeePay', type: 'ewallet', feeType: 'percent', feeValue: 0.02, icon: 'pi-wallet', description: 'Biaya admin 2%' },
  { id: 'OVO', name: 'OVO', type: 'ewallet', feeType: 'percent', feeValue: 0.015, icon: 'pi-wallet', description: 'Biaya admin 1.5%' },
  { id: 'DANA', name: 'DANA', type: 'ewallet', feeType: 'percent', feeValue: 0.015, icon: 'pi-wallet', description: 'Biaya admin 1.5%' },
  { id: 'ALFAMART', name: 'Alfamart / Alfamidi', type: 'retail', feeType: 'fixed', feeValue: 5550, icon: 'pi-shopping-bag', description: 'Biaya admin Rp 5.550' },
];

const groupedPaymentMethods = computed(() => {
  const groups = [
    { title: 'Rekomendasi Utama', type: 'recommended', items: [] },
    { title: 'Transfer Bank (Virtual Account)', type: 'va', items: [] },
    { title: 'E-Wallet', type: 'ewallet', items: [] },
    { title: 'Gerai Retail', type: 'retail', items: [] },
    { title: 'Bayar Tunai', type: 'cod', items: [] },
  ];
  
  paymentMethodsList.forEach(m => {
    if (m.id === 'QRIS') {
      groups.find(g => g.type === 'recommended').items.push(m);
    } else if (m.type === 'va') {
      groups.find(g => g.type === 'va').items.push(m);
    } else if (m.type === 'ewallet') {
      groups.find(g => g.type === 'ewallet').items.push(m);
    } else if (m.type === 'retail') {
      groups.find(g => g.type === 'retail').items.push(m);
    } else if (m.type === 'cod') {
      groups.find(g => g.type === 'cod').items.push(m);
    }
  });
  
  return groups.filter(g => g.items.length > 0);
});

const baseGross = computed(() => {
  const product = Number(amounts.value.product || 0);
  const ongkir = Number(amounts.value.ongkir || 0);
  const diskon = Number(amounts.value.diskon || 0);
  return Math.max(0, product + ongkir - diskon);
});

const platformFee = computed(() => {
  const method = paymentMethodsList.find(m => m.id === pay.value.method);
  if (!method || method.id === 'COD') return 0;
  
  if (method.feeType === 'fixed') {
    return method.feeValue;
  } else if (method.feeType === 'percent') {
    return Math.ceil(baseGross.value * method.feeValue);
  }
  return 0;
});

const total = computed(() => {
  return baseGross.value + platformFee.value;
});

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

const form = ref({
  nama: "",
  tel: "",
  metodePengiriman: "pickup",
  catatanProduk: "",
});
const pay = ref({ method: "COD" });
const selectedPromo = ref(null);

const promos = computed(() =>
  vouchers.value.map((v) => ({
    code: v.voucher_code,
    name: v.voucher_name,
    desc: v.voucher_description,
    type: v.voucher_type,
    value: Number(v.value),
    max_discount: Number(v.max_discount_amount || 0),
    min_purchase: Number(v.min_purchase_amount || 0),
    id: v.id,
    usage: v.usage,
    is_expired: v.is_expired,
  })),
);

// Address
const openPromo = ref(false);
useBodyScrollLock(openPromo);
const selectedAddress = ref(null);
const addresses = ref([]);
const addressesLoading = ref(false);
const shippingLoading = ref(false);
const shippingInfo = ref(null);
const productModeCartId = ref(null);

function toPositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function applyCartContext(cart) {
  const cartId = toPositiveInt(cart?.cart_id ?? cart?.id);
  const merchantId = toPositiveInt(cart?.merchant?.id ?? cart?.merchant_id);
  const slug = cart?.merchant?.slug ?? cart?.slug ?? checkout.store?.slug ?? null;
  const name = cart?.merchant?.name ?? checkout.store?.name ?? null;

  if (merchantId) {
    checkout.store.id = merchantId;
    checkout.store.merchantId = merchantId;
  }
  if (cartId) {
    checkout.store.cartId = cartId;
  }
  if (slug) {
    checkout.store.slug = slug;
  }
  if (name) {
    checkout.store.name = name;
  }

  return {
    cartId,
    merchantId,
    slug,
  };
}

async function resolveCartContextFromServer() {
  try {
    const { data: res } = await fetchCartApi();
    const carts = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];

    if (!carts.length) return null;

    const currentCartId = toPositiveInt(checkout.store?.cartId);
    const currentMerchantId = toPositiveInt(
      checkout.store?.merchantId ?? checkout.store?.id,
    );
    const currentSlug = String(checkout.store?.slug ?? "").trim();

    const target = carts.find((cart) => {
      const cartId = toPositiveInt(cart?.cart_id ?? cart?.id);
      const merchantId = toPositiveInt(cart?.merchant?.id ?? cart?.merchant_id);
      const slug = String(cart?.merchant?.slug ?? cart?.slug ?? "").trim();

      if (currentCartId && cartId === currentCartId) return true;
      if (currentMerchantId && merchantId === currentMerchantId) return true;
      if (currentSlug && slug === currentSlug) return true;
      return false;
    });

    if (!target) return null;
    return applyCartContext(target);
  } catch (e) {
    console.error("Gagal sinkron cart context:", e);
    return null;
  }
}

async function ensureCartIdForCheckout() {
  const preferredCartId =
    toPositiveInt(productModeCartId.value) ??
    toPositiveInt(checkout.store?.cartId);

  if (checkout.from === "cart") {
    const resolved = await resolveCartContextFromServer();
    const cartId = toPositiveInt(resolved?.cartId);
    if (!cartId) {
      checkout.store.cartId = null;
    }
    return cartId;
  }

  if (checkout.from === "product") {
    if (preferredCartId) {
      const resolved = await resolveCartContextFromServer();
      const cartId = toPositiveInt(resolved?.cartId);
      if (cartId) {
        productModeCartId.value = cartId;
        return cartId;
      }
      checkout.store.cartId = null;
      productModeCartId.value = null;
    }

    const productId = toPositiveInt(checkout.productId);
    if (!productId) {
      toast.error("Produk checkout tidak valid. Silakan ulangi dari halaman produk.");
      return null;
    }

    const payload = {
      product_id: productId,
      quantity: Math.max(1, toPositiveInt(checkout.qty) ?? 1),
      variant_id: toPositiveInt(checkout.selectedVariantId),
      addons: (checkout.selectedAddons || [])
        .map((addon) => ({
          group_id: toPositiveInt(addon.groupId),
          addon_id: toPositiveInt(addon.id),
        }))
        .filter((addon) => addon.addon_id),
    };

    await addToCartApi(payload);

    const resolved = await resolveCartContextFromServer();
    const resolvedCartId = toPositiveInt(resolved?.cartId);

    if (!resolvedCartId) {
      toast.error("Gagal menemukan keranjang untuk checkout. Silakan coba lagi.");
      return null;
    }

    productModeCartId.value = resolvedCartId;
    return resolvedCartId;
  }

  return existingCartId;
}

async function loadAddresses() {
  if (isGuest.value) return;
  addressesLoading.value = true;
  try {
    const res = await getMyAddress();
    // API returns a single address object, not an array
    const addr = res?.data ?? res ?? null;
    if (addr && addr.id) {
      selectedAddress.value = {
        id: addr.id,
        label: addr.label || "Alamat",
        fullAddress: [
          addr.detail,
          addr.village?.name,
          addr.district?.name,
          addr.city?.name,
          addr.province?.name,
        ]
          .filter(Boolean)
          .join(", "),
      };
    } else {
      selectedAddress.value = null;
    }
  } catch (e) {
    console.error("Gagal memuat alamat:", e);
    selectedAddress.value = null;
  } finally {
    addressesLoading.value = false;
  }
}

watch(
  () => form.value.metodePengiriman,
  async (v) => {
    if (v === "pickup") {
      amounts.value.ongkir = 0;
      shippingInfo.value = null;
    } else {
      // Will be recalculated by fetchShippingCost
      await fetchShippingCost();
    }
    pay.value.method = v === "delivery" ? "QRIS" : "COD";
  },
  { immediate: true },
);

async function fetchShippingCost() {
  if (form.value.metodePengiriman !== "delivery") return;
  const merchantId = toPositiveInt(
    order.value.store?.merchantId ?? order.value.store?.id,
  );
  if (!merchantId) return;
  if (isGuest.value) return;

  shippingLoading.value = true;
  try {
    const payload = { merchant_id: merchantId };
    if (selectedAddress.value?.id) {
      payload.address_id = selectedAddress.value.id;
    }
    const { data } = await calculateShippingCost(payload);
    const result = data?.data ?? data;
    amounts.value.ongkir = Number(result?.delivery_fee ?? 0);
    shippingInfo.value = {
      distanceKm: result?.distance_km ?? 0,
      baseCost: result?.base_cost ?? 0,
      costPerKm: result?.cost_per_km ?? 0,
      note: result?.note ?? null,
    };
  } catch (e) {
    console.error("Gagal menghitung ongkir:", e);
    amounts.value.ongkir = 0;
    shippingInfo.value = null;
  } finally {
    shippingLoading.value = false;
  }
}

watch(
  () => isGuest.value,
  (guest) => {
    if (guest) {
      form.value.metodePengiriman = "pickup";
      pay.value.method = "COD";
      amounts.value.ongkir = 0;
      clearPromo();
      return;
    }
    if (order.value.store?.slug)
      fetchVouchersByMerchant(order.value.store.slug);
  },
  { immediate: true },
);

watch(
  () => amounts.value.product,
  () => {
    if (selectedPromo.value) {
      const discount = computeDiscount(selectedPromo.value);
      if (discount <= 0) clearPromo();
      else amounts.value.diskon = discount;
    }
  },
);

watch(
  () => selectedAddress.value?.id,
  async () => {
    if (form.value.metodePengiriman === "delivery") {
      await fetchShippingCost();
    }
  },
);

function isPromoEligible(promo) {
  return (
    !promo?.is_expired &&
    Number(amounts.value.product || 0) >= Number(promo?.min_purchase || 0)
  );
}

function computeDiscount(promo) {
  const subtotal = amounts.value.product;
  if (promo.is_expired || subtotal < promo.min_purchase) return 0;
  if (promo.type === "fixed") return Math.min(promo.value, subtotal);
  if (promo.type === "percent") {
    let d = Math.floor((promo.value / 100) * subtotal);
    if (promo.max_discount && d > promo.max_discount) d = promo.max_discount;
    return d;
  }
  return 0;
}

function usePromo(p) {
  if (p.is_expired) {
    toast.warning("Voucher sudah tidak berlaku");
    return;
  }
  if (amounts.value.product < p.min_purchase) {
    toast.warning(`Minimal pembelian Rp ${formatIDR(p.min_purchase)}`);
    return;
  }
  selectedPromo.value = p;
  amounts.value.diskon = computeDiscount(p);
  openPromo.value = false;
}

function clearPromo() {
  selectedPromo.value = null;
  amounts.value.diskon = 0;
}

const isFormValid = computed(() => {
  if (isGuest.value && (!form.value.nama || !form.value.tel)) return false;
  if (form.value.metodePengiriman === "delivery" && !selectedAddress.value)
    return false;
  return true;
});

// ========================
// CHECKOUT VIA API
// ========================
const handleCheckout = async () => {
  if (!isFormValid.value) {
    toast.warning(
      "Mohon lengkapi data pemesan dan pilih alamat (jika diantar)",
    );
    return;
  }
  if (isGuest.value) {
    toast.warning("Silakan login terlebih dahulu untuk membuat pesanan");
    return;
  }

  isSubmitting.value = true;
  try {
    const cartId = await ensureCartIdForCheckout();
    if (!cartId) {
      toast.error("Keranjang tidak valid. Silakan ulangi dari keranjang atau halaman produk.");
      return;
    }

    const payload = {
      cart_id: cartId,
      voucher_id: selectedPromo.value?.id || null,
      delivery_type: form.value.metodePengiriman,
      payment_method: pay.value.method,
      notes: form.value.catatanProduk,
    };
    if (
      form.value.metodePengiriman === "delivery" &&
      selectedAddress.value?.id
    ) {
      payload.address_id = selectedAddress.value.id;
    }

    const { data } = await checkoutProductFromCart(payload);
    const result = data?.data ?? data;
    const invoiceUrl = result?.xendit?.invoice_url;
    const orderId = result?.order?.id;

    toast.success("Pesanan berhasil dibuat!");
    checkout.clear();

    if (invoiceUrl && pay.value.method !== "COD") {
      // Xendit akan redirect balik ke app setelah bayar (via success_redirect_url)
      window.location.href = invoiceUrl;
    } else {
      router.push(
        orderId
          ? { name: "Detail Pesanan", params: { orderId } }
          : { name: "Pesanan Saya" },
      );
    }

  } catch (error) {
    console.error("Checkout error:", error);
    const data = error.response?.data;
    const cartError = data?.errors?.cart_id?.[0];
    const message =
      cartError ||
      data?.message ||
      "Gagal membuat pesanan. Coba lagi.";

    if (cartError) {
      checkout.store.cartId = null;
      productModeCartId.value = null;
    }

    toast.error(message);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  if (checkout.from === "cart") {
    if (checkout.cartItems.length === 0) {
      router.replace({ name: "Beranda" });
      return;
    }

    const cartId = await ensureCartIdForCheckout();
    if (!cartId) {
      router.replace({ name: "Keranjang" });
      return;
    }
  }

  if (checkout.from === "product") {
    if (!toPositiveInt(checkout.productId)) {
      router.replace({ name: "Beranda" });
      return;
    }
  }

  if (!isGuest.value) {
    await loadAddresses();
    if (order.value.store?.slug)
      await fetchVouchersByMerchant(order.value.store.slug);
  }
});

onBeforeRouteLeave(() => {
  checkout.clear();
});
</script>

<style scoped>
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
