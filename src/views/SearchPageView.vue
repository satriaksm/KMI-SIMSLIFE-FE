<script setup>
import {
  ref,
  computed,
  onMounted,
  watch,
  onBeforeUnmount,
  nextTick,
} from "vue";
import ProductCard from "@/components/Card/ProductCard.vue";
import ProductCardSkeleton from "@/components/Card/ProductCardSkeleton.vue"; // Tambahkan ini
import MerchantCard from "@/components/Card/MerchantCard.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import TextField from "@/components/forms/TextField.vue";
import Button from "@/components/common/Button.vue";
import { useRouter, useRoute } from "vue-router";
import { useSearch } from "@/composables/useSearch";
import { useCategories } from "@/composables/useCategories";
import { useSegmentations } from "@/composables/useSegmentations";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
const cartStore = useCartStore();

const authStore = useAuthStore();
const isLoadingMoreProducts = ref(false);
const isLoadingMoreMerchants = ref(false);
const loadMoreRef = ref(null); // elemen sentinel
const observer = ref(null);
// const loadMoreMerchantRef = ref(null);
// const merchantObserver = ref(null);

const page = ref(1);
const perPage = 20;
const hasMore = ref(false);

const merchantPage = ref(1);
const merchantPerPage = 20;
const merchantHasMore = ref(false);

const router = useRouter();
const route = useRoute();
const toast = useToast();

const myLatitude = ref(null);
const myLongitude = ref(null);

// If user is not authenticated, /api/profile/address will 401.
// Cache that fact so we don't keep hitting the endpoint.
const profileAddressUnauthorized = ref(false);

const profileCoordsLoaded = ref(false);
let profileCoordsPromise = null;

const cartItemsCount = computed(() => {
  return cartStore.totalItems || 0;
});
const hasMyCoordinates = computed(() => {
  return (
    Number.isFinite(myLatitude.value) && Number.isFinite(myLongitude.value)
  );
});

async function loadMyCoordinates() {
  return loadMyCoordinatesInternal({ allowDevice: false });
}

async function preloadProfileCoordinates() {
  if (profileCoordsLoaded.value) return true;
  if (profileCoordsPromise) return await profileCoordsPromise;

  profileCoordsPromise = (async () => {
    try {
      return await loadMyCoordinates();
    } finally {
      profileCoordsLoaded.value = true;
    }
  })();

  return await profileCoordsPromise;
}

function setMyCoordinates(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  myLatitude.value = Number.isFinite(latNum) ? latNum : null;
  myLongitude.value = Number.isFinite(lngNum) ? lngNum : null;
}

async function loadMyCoordinatesInternal(
  { allowDevice } = { allowDevice: false },
) {
  // 1) Prefer saved address (if logged in)
  if (!profileAddressUnauthorized.value) {
    try {
      const res = await api.get("api/profile/address");
      const addr = res?.data?.data;
      setMyCoordinates(addr?.latitude, addr?.longitude);
      if (hasMyCoordinates.value) return true;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        profileAddressUnauthorized.value = true;
      }
      // ignore (fallback to device if allowed)
      setMyCoordinates(null, null);
    }
  }

  // 2) Fallback: device geolocation (only when explicitly allowed)
  if (!allowDevice) return false;
  if (!navigator.geolocation) return false;

  const coords = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (typeof lat === "number" && typeof lng === "number") {
          resolve({ lat, lng });
        } else {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });

  if (!coords) return false;
  setMyCoordinates(coords.lat, coords.lng);
  return hasMyCoordinates.value;
}

async function ensureMyCoordinates({ allowDevice } = { allowDevice: true }) {
  if (hasMyCoordinates.value) return true;
  return await loadMyCoordinatesInternal({ allowDevice });
}

const {
  categoriesLevel1,
  loadingLevel1,
  fetchLevel1Categories,
  categoriesLevel2Map,
  loadingLevel2,
  fetchMultiSubCategories,
} = useCategories();
const {
  segmentations,
  loading: loadingSegmentations,
  fetchSegmentations,
} = useSegmentations();
const {
  products,
  productsMeta,
  loadingProducts,
  fetchProducts: fetchProductsApi,
  jasas,
  jasasMeta,
  merchants,
  merchantsMeta,
  loadingMerchants,
  fetchMerchants: fetchMerchantsApi,
} = useSearch();

// Prevent "empty" message flashing before the first request finishes.
const hasFetchedProductsOnce = ref(false);
const hasFetchedMerchantsOnce = ref(false);
function goBack() {
  router.back();
}
const goToProductDetail = (product) => {
  const slug = product?.slug;

  if (typeof slug !== "string" || !slug.trim()) {
    console.warn("[Search] Invalid product slug:", product);
    return;
  }

  router.push({
    name: "Product Detail",
    params: { slug },
  });
};

const goToJasaDetail = (jasa) => {
  const id = jasa?.jasa_id ?? jasa?.id;
  if (!id) {
    console.warn("[Search] Invalid jasa id:", jasa);
    return;
  }

  router.push({
    name: "JasaDetail",
    params: { id },
  });
};

const isLoadingSegments = computed(() => !!loadingSegmentations.value);
const isLoadingCategories = computed(() => !!loadingLevel1.value);
const isLoadingSubCategories = computed(() => !!loadingLevel2.value);

function toNumberOrNull(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function toTimeOrNull(v) {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

function compareNumberAsc(a, b) {
  const av = a == null ? Number.POSITIVE_INFINITY : a;
  const bv = b == null ? Number.POSITIVE_INFINITY : b;
  return av - bv;
}

function compareNumberDesc(a, b) {
  const av = a == null ? Number.NEGATIVE_INFINITY : a;
  const bv = b == null ? Number.NEGATIVE_INFINITY : b;
  return bv - av;
}

function compareTimeDesc(a, b) {
  const av = a == null ? Number.NEGATIVE_INFINITY : a;
  const bv = b == null ? Number.NEGATIVE_INFINITY : b;
  return bv - av;
}

function compareTimeAsc(a, b) {
  const av = a == null ? Number.POSITIVE_INFINITY : a;
  const bv = b == null ? Number.POSITIVE_INFINITY : b;
  return av - bv;
}

function compareBySortKey(a, b, sortKey) {
  const aMin = toNumberOrNull(a?.min_price ?? a?.minPrice);
  const bMin = toNumberOrNull(b?.min_price ?? b?.minPrice);
  const aMax = toNumberOrNull(a?.max_price ?? a?.maxPrice);
  const bMax = toNumberOrNull(b?.max_price ?? b?.maxPrice);
  const aTime = toTimeOrNull(a?.created_at ?? a?.createdAt);
  const bTime = toTimeOrNull(b?.created_at ?? b?.createdAt);
  const aDist = toNumberOrNull(a?.distance);
  const bDist = toNumberOrNull(b?.distance);

  if (sortKey === "nearest") return compareNumberAsc(aDist, bDist);
  if (sortKey === "cheapest") return compareNumberAsc(aMin, bMin);
  if (sortKey === "expensive") return compareNumberDesc(aMax, bMax);
  if (sortKey === "oldest") return compareTimeAsc(aTime, bTime);
  // default / latest
  return compareTimeDesc(aTime, bTime);
}

const combinedResults = computed(() => {
  // Merge products + jasa into one list, then sort globally so jasa doesn't
  // always appear after products.
  const list = [...(products.value ?? []), ...(jasas.value ?? [])];

  const hasNearest = activeInstantSorts.value.includes("nearest");
  const primarySort = hasNearest
    ? "nearest"
    : pickSecondarySort(undefined, [
        "latest",
        "oldest",
        "cheapest",
        "expensive",
      ]) || "latest";

  if (primarySort !== "nearest") {
    return list.sort((a, b) => compareBySortKey(a, b, primarySort));
  }

  // nearest + tie-breakers (harga dahulu, lalu tanggal)
  const { secondary, tertiary } = pickNearestTieBreakersForProducts();

  return list.sort((a, b) => {
    const byDist = compareBySortKey(a, b, "nearest");
    if (byDist !== 0) return byDist;

    if (secondary) {
      const bySecondary = compareBySortKey(a, b, secondary);
      if (bySecondary !== 0) return bySecondary;
    }

    if (tertiary) {
      const byTertiary = compareBySortKey(a, b, tertiary);
      if (byTertiary !== 0) return byTertiary;
    }

    // final fallback: latest
    return compareBySortKey(a, b, "latest");
  });
});

function handleResultClick(item) {
  const isJasa =
    item?.type === "jasa" ||
    item?.jasa_id != null ||
    (item?.slug == null && item?.id != null);

  if (isJasa) return goToJasaDetail(item);
  return goToProductDetail(item);
}
const showBackToTop = ref(false);

function handleScroll() {
  showBackToTop.value = window.scrollY > 300;
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

/* ================= BASIC ================= */
// const keyword = ref("");
const activeTab = ref("products");

/* ================= MODAL ================= */
const showFilterModal = ref(false);

/* ================= INSTANT SORT ================= */
const activeInstantSorts = ref([]);

/* ================= DETAIL FILTER ================= */
const detailFilters = ref({
  minPrice: null,
  maxPrice: null,
  categories: [],
  subCategories: [],
  segments: [],
  isOpen: false,
});

const tempDetailFilters = ref({ ...detailFilters.value, subCategories: [] });

const showProductsSkeleton = computed(() => {
  if (activeTab.value !== "products") return false;
  const hasQuery = !!route.query.q;
  const isBusy = !!loadingProducts.value || !!isLoadingMoreProducts.value;
  const isInitial = hasQuery && !hasFetchedProductsOnce.value;
  return (isBusy || isInitial) && combinedResults.value.length === 0;
});

const isEmptyProducts = computed(() => {
  if (activeTab.value !== "products") return false;
  if (!hasFetchedProductsOnce.value) return false;
  if (loadingProducts.value || isLoadingMoreProducts.value) return false;
  return combinedResults.value.length === 0;
});

const showMerchantsSkeleton = computed(() => {
  if (activeTab.value !== "merchants") return false;
  const hasQuery = !!route.query.q;
  const isBusy = !!loadingMerchants.value || !!isLoadingMoreMerchants.value;
  const isInitial = hasQuery && !hasFetchedMerchantsOnce.value;
  return (isBusy || isInitial) && merchants.value.length === 0;
});

const isEmptyMerchants = computed(() => {
  if (activeTab.value !== "merchants") return false;
  if (!hasFetchedMerchantsOnce.value) return false;
  if (loadingMerchants.value || isLoadingMoreMerchants.value) return false;
  return merchants.value.length === 0;
});

/* ================= AVAILABLE CATEGORIES ================= */
const availableCategories = computed(() =>
  categoriesLevel1.value.map((cat) => ({
    key: cat.slug, // dipakai untuk filter & API
    label: cat.name, // teks di UI
    id: cat.id,
  })),
);
const availableSubCategories = computed(() => {
  return Object.values(categoriesLevel2Map.value)
    .flat()
    .map((cat) => ({
      key: cat.slug,
      label: cat.name,
      id: cat.id,
    }));
});

/* ================= AVAILABLE SEGMENTS ================= */
const availableSegments = computed(() =>
  segmentations.value.map((seg) => ({
    key: seg.key, // dikirim ke API search
    label: seg.label, // teks UI
    id: seg.id,
  })),
);

const activeFilterCount = computed(() => {
  let count = 0;

  if (detailFilters.value.minPrice !== null) count++;
  if (detailFilters.value.maxPrice !== null) count++;
  if (detailFilters.value.categories.length) count++;
  if (detailFilters.value.segments.length) count++;
  if (detailFilters.value.subCategories.length) count++;
  if (detailFilters.value.isOpen) count++;

  return count;
});

const hasActiveFilters = computed(() => activeFilterCount.value > 0);
function safeString(v) {
  return typeof v === "string" ? v : undefined;
}

/* ================= SORT OPTIONS ================= */
const instantSortOptions = [
  { key: "latest", label: "Terbaru", conflict: ["oldest"] },
  { key: "oldest", label: "Terlama", conflict: ["latest"] },
  {
    key: "nearest",
    label: "Terdekat",
    // boleh dipilih bersamaan dengan sort lain
    conflict: [],
  },
  {
    key: "cheapest",
    label: "Termurah",
    productOnly: true,
    conflict: ["expensive"],
  },
  {
    key: "expensive",
    label: "Termahal",
    productOnly: true,
    conflict: ["cheapest"],
  },
];

function pickSecondarySort(excludeKey, allowed) {
  // pilih sort terakhir selain excludeKey (agar terasa natural)
  const allowList = Array.isArray(allowed)
    ? allowed
    : ["latest", "oldest", "cheapest", "expensive"];
  for (let i = activeInstantSorts.value.length - 1; i >= 0; i--) {
    const k = activeInstantSorts.value[i];
    if (k === excludeKey) continue;
    if (allowList.includes(k)) return k;
  }
  return undefined;
}

function pickNearestTieBreakersForProducts() {
  // Rule: jika user pilih harga + tanggal bersamaan saat nearest aktif,
  // maka harga jadi prioritas tiebreaker pertama, lalu tanggal.
  const hasCheapest = activeInstantSorts.value.includes("cheapest");
  const hasExpensive = activeInstantSorts.value.includes("expensive");
  const hasLatest = activeInstantSorts.value.includes("latest");
  const hasOldest = activeInstantSorts.value.includes("oldest");

  const priceSort = hasCheapest
    ? "cheapest"
    : hasExpensive
      ? "expensive"
      : undefined;
  const dateSort = hasLatest ? "latest" : hasOldest ? "oldest" : undefined;

  return {
    secondary: priceSort ?? dateSort,
    tertiary: priceSort && dateSort ? dateSort : undefined,
  };
}

const filteredInstantSorts = computed(() =>
  instantSortOptions.filter(
    (i) => !i.productOnly || activeTab.value === "products",
  ),
);

async function fetchMerchants(reset = false) {
  if (isLoadingMoreMerchants.value) return;

  if (reset) {
    merchantPage.value = 1;
    merchants.value = [];
    merchantHasMore.value = true;
  }

  isLoadingMoreMerchants.value = true;

  try {
    await preloadProfileCoordinates();

    if (
      activeInstantSorts.value.includes("nearest") &&
      !hasMyCoordinates.value
    ) {
      const ok = await ensureMyCoordinates({ allowDevice: true });
      if (!ok) {
        toast.error(
          "Tidak bisa mengambil lokasi. Aktifkan izin lokasi atau lengkapi alamat (koordinat).",
        );
        return;
      }
    }

    const params = {
      ...buildMerchantQuery(),
      page: merchantPage.value,
      per_page: merchantPerPage,
    };

    await fetchMerchantsApi(params, !reset);

    hasFetchedMerchantsOnce.value = true;

    const current = Number(merchantsMeta.value?.current_page ?? 1);
    const last = Number(merchantsMeta.value?.last_page ?? 1);
    merchantHasMore.value = current < last;
  } finally {
    isLoadingMoreMerchants.value = false;
  }
}

async function fetchProducts(reset = false) {
  if (isLoadingMoreProducts.value) return;

  if (reset) {
    page.value = 1;
    products.value = [];
    jasas.value = [];
    hasMore.value = true;
  }

  isLoadingMoreProducts.value = true;

  try {
    await preloadProfileCoordinates();

    if (
      activeInstantSorts.value.includes("nearest") &&
      !hasMyCoordinates.value
    ) {
      const ok = await ensureMyCoordinates({ allowDevice: true });
      if (!ok) {
        toast.error(
          "Tidak bisa mengambil lokasi. Aktifkan izin lokasi atau lengkapi alamat (koordinat).",
        );
        return;
      }
    }

    const params = {
      ...buildProductQuery(),
      page: String(page.value),
      per_page: String(perPage),
    };

    await fetchProductsApi(params, !reset);

    hasFetchedProductsOnce.value = true;

    const pCurrent = Number(productsMeta.value?.current_page ?? 1);
    const pLast = Number(productsMeta.value?.last_page ?? 1);
    const pHasMore = pCurrent < pLast;

    const jCurrent = Number(jasasMeta.value?.current_page ?? 1);
    const jLast = Number(jasasMeta.value?.last_page ?? 1);
    const jHasMore = jCurrent < jLast;

    hasMore.value = pHasMore || jHasMore;
  } finally {
    isLoadingMoreProducts.value = false;
  }
}
function setupObserver() {
  if (observer.value) observer.value.disconnect();

  observer.value = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];

      if (
        entry.isIntersecting &&
        hasMore.value &&
        !isLoadingMoreProducts.value &&
        activeTab.value === "products"
      ) {
        page.value++;
        fetchProducts();
      }
    },
    {
      root: null,
      rootMargin: "200px", // preload sebelum mentok
      threshold: 0,
    },
  );

  if (loadMoreRef.value) {
    observer.value.observe(loadMoreRef.value);
  }
}

function buildMerchantQuery() {
  const sort = activeInstantSorts.value.find((s) =>
    ["latest", "oldest", "nearest"].includes(s),
  );

  const sortKey = activeInstantSorts.value.includes("nearest")
    ? "nearest"
    : sort;

  const secondarySort =
    sortKey === "nearest"
      ? pickSecondarySort("nearest", ["latest", "oldest"])
      : undefined;

  return {
    q: route.query.q || undefined,
    segments: detailFilters.value.segments.length
      ? detailFilters.value.segments
      : undefined,

    is_open: detailFilters.value.isOpen ? 1 : undefined,

    categories: detailFilters.value.subCategories.length
      ? detailFilters.value.subCategories
      : detailFilters.value.categories.length
        ? detailFilters.value.categories
        : undefined,

    min_price: detailFilters.value.minPrice ?? undefined,
    max_price: detailFilters.value.maxPrice ?? undefined,

    sort: sortKey || undefined,
    secondary_sort: secondarySort,
    lat: hasMyCoordinates.value ? myLatitude.value : undefined,
    lng: hasMyCoordinates.value ? myLongitude.value : undefined,
    page: merchantPage.value,
    per_page: merchantPerPage,
  };
}

function buildProductQuery() {
  const sortKey = activeInstantSorts.value.includes("nearest")
    ? "nearest"
    : pickSecondarySort(undefined, [
        "latest",
        "oldest",
        "cheapest",
        "expensive",
      ]);

  const secondarySort =
    sortKey === "nearest"
      ? pickNearestTieBreakersForProducts().secondary
      : undefined;

  const tertiarySort =
    sortKey === "nearest"
      ? pickNearestTieBreakersForProducts().tertiary
      : undefined;

  return {
    q: route.query.q || undefined,
    min_price:
      typeof detailFilters.value.minPrice === "number"
        ? detailFilters.value.minPrice
        : undefined,
    max_price:
      typeof detailFilters.value.maxPrice === "number"
        ? detailFilters.value.maxPrice
        : undefined,

    categories: detailFilters.value.subCategories.length
      ? detailFilters.value.subCategories.map(String)
      : detailFilters.value.categories.length
        ? detailFilters.value.categories.map(String)
        : undefined,

    segments: detailFilters.value.segments.length
      ? detailFilters.value.segments.map(String)
      : undefined,

    sort: typeof sortKey === "string" ? sortKey : undefined,
    secondary_sort: secondarySort,
    tertiary_sort: tertiarySort,
    lat: hasMyCoordinates.value ? myLatitude.value : undefined,
    lng: hasMyCoordinates.value ? myLongitude.value : undefined,

    page: String(page.value),
    per_page: String(perPage),
  };
}

function submitSearch() {
  const q = route.query.q;
  if (!q) return;

  router.push({
    name: "Search Page",
    query: { q },
  });
}
const goToCart = () => {
  if (authStore.isAdmin) {
    toast.warning("Admin tidak dapat mengakses keranjang.");
    return;
  }

  if (!authStore.isAuthenticated) {
    toast.info("Silakan login terlebih dahulu untuk mengakses keranjang.");
    router.push({
      name: "Login",
      query: { redirect: route.fullPath },
    });
    return;
  } else {
    router.push({ name: "Keranjang" });
  }
};

function applyDetailFilter() {
  detailFilters.value = {
    minPrice: tempDetailFilters.value.minPrice,
    maxPrice: tempDetailFilters.value.maxPrice,
    categories: [...tempDetailFilters.value.categories],
    subCategories: [...tempDetailFilters.value.subCategories],
    segments: [...tempDetailFilters.value.segments],
    isOpen: !!tempDetailFilters.value.isOpen,
  };

  showFilterModal.value = false;
  if (activeTab.value === "products") {
    fetchProducts(true);
  }
  if (activeTab.value === "merchants") {
    fetchMerchants(true);
  }
}

watch(
  () => [...activeInstantSorts.value],
  () => {
    if (activeTab.value === "products") {
      page.value = 1;
      products.value = [];
      jasas.value = [];
      hasMore.value = true;
      hasFetchedProductsOnce.value = false;
      fetchProducts(true);
      nextTick(() => setupObserver());
      return;
    }

    if (activeTab.value === "merchants") {
      merchantPage.value = 1;
      merchants.value = [];
      merchantHasMore.value = true;
      hasFetchedMerchantsOnce.value = false;
      fetchMerchants(true);
    }
  },
);

watch(
  activeTab,
  (tab) => {
    resetAllFilters();

    if (tab === "products") {
      hasFetchedProductsOnce.value = false;
      fetchProducts(true);
      nextTick(() => setupObserver());
    }

    if (tab === "merchants") {
      hasFetchedMerchantsOnce.value = false;
      fetchMerchants(true);
      // nextTick(() => setupMerchantObserver());
    }
  },
  { immediate: false },
);

watch(
  () => tempDetailFilters.value.maxPrice,
  (newMax) => {
    if (
      newMax !== null &&
      newMax !== "" &&
      tempDetailFilters.value.minPrice === null
    ) {
      tempDetailFilters.value.minPrice = 0;
    }
  },
);

watch(
  () => route.query.q,
  (q) => {
    page.value = 1;
    products.value = [];
    jasas.value = [];
    hasMore.value = true;
    hasFetchedProductsOnce.value = false;

    if (!q) return;

    fetchProducts(true);
    nextTick(setupObserver);

    if (activeTab.value === "merchants") {
      hasFetchedMerchantsOnce.value = false;
      fetchMerchants(true);
    }
  },
  { immediate: false },
);

watch(
  () => [...tempDetailFilters.value.categories],
  async (newCategories, oldCategories = []) => {
    // kategori baru → fetch sub kategori
    const added = newCategories.filter((c) => !oldCategories.includes(c));

    for (const slug of added) {
      const category = categoriesLevel1.value.find((c) => c.slug === slug);
      if (category) {
        await fetchMultiSubCategories(category.id);
      }
    }

    // kategori dihapus → hapus sub kategori terkait
    const removed = oldCategories.filter((c) => !newCategories.includes(c));

    for (const slug of removed) {
      const category = categoriesLevel1.value.find((c) => c.slug === slug);
      if (category) {
        delete categoriesLevel2Map.value[category.id];

        // bersihkan sub kategori yang terpilih
        tempDetailFilters.value.subCategories =
          tempDetailFilters.value.subCategories.filter(
            (sub) =>
              !availableSubCategories.value.some(
                (s) => s.key === sub && s.id === category.id,
              ),
          );
      }
    }
  },
);

/* ================= INSTANT SORT HANDLER ================= */
async function toggleInstantSort(key) {
  const option = instantSortOptions.find((o) => o.key === key);
  if (!option) return;

  if (key === "nearest" && !hasMyCoordinates.value) {
    const ok = await ensureMyCoordinates({ allowDevice: true });
    if (!ok) {
      toast.error(
        "Tidak bisa mengambil lokasi. Aktifkan izin lokasi atau lengkapi alamat (koordinat).",
      );
      return;
    }
  }

  if (option.conflict) {
    activeInstantSorts.value = activeInstantSorts.value.filter(
      (k) => !option.conflict.includes(k),
    );
  }

  if (activeInstantSorts.value.includes(key)) {
    activeInstantSorts.value = activeInstantSorts.value.filter(
      (k) => k !== key,
    );
  } else {
    activeInstantSorts.value.push(key);
  }
}
function toggleSegment(key) {
  const index = tempDetailFilters.value.segments.indexOf(key);
  if (index > -1) {
    tempDetailFilters.value.segments.splice(index, 1);
  } else {
    tempDetailFilters.value.segments.push(key);
  }
}

/* ================= DETAIL FILTER HANDLER ================= */
function toggleCategory(key) {
  const index = tempDetailFilters.value.categories.indexOf(key);
  if (index > -1) {
    tempDetailFilters.value.categories.splice(index, 1);
  } else {
    tempDetailFilters.value.categories.push(key);
  }
}
function toggleSubCategory(key) {
  const index = tempDetailFilters.value.subCategories.indexOf(key);
  if (index > -1) {
    tempDetailFilters.value.subCategories.splice(index, 1);
  } else {
    tempDetailFilters.value.subCategories.push(key);
  }
}

function resetAllFilters() {
  // reset filter aktif
  detailFilters.value = {
    minPrice: null,
    maxPrice: null,
    categories: [],
    subCategories: [],
    segments: [],
    isOpen: false,
  };

  // reset filter modal
  tempDetailFilters.value = {
    minPrice: null,
    maxPrice: null,
    categories: [],
    subCategories: [],
    segments: [],
    isOpen: false,
  };

  // reset sub category cache
  categoriesLevel2Map.value = {};
}

/* ================= FILTER ENGINE ================= */
function applyFilters(list) {
  let filtered = [...list];

  if (detailFilters.value.minPrice !== null) {
    filtered = filtered.filter(
      (i) => i.min_price >= detailFilters.value.minPrice,
    );
  }

  if (detailFilters.value.maxPrice !== null) {
    filtered = filtered.filter(
      (i) => i.max_price <= detailFilters.value.maxPrice,
    );
  }

  if (detailFilters.value.categories.length) {
    filtered = filtered.filter((i) =>
      detailFilters.value.categories.includes(i.category),
    );
  }
  if (detailFilters.value.segments.length) {
    filtered = filtered.filter((item) => {
      let segmentName = "";
      if (activeTab.value === "products") {
        segmentName = item.merchant?.segmentation?.name;
      } else {
        segmentName = item.segmentation?.name;
      }
      return detailFilters.value.segments.includes(segmentName);
    });
  }

  if (activeInstantSorts.value.includes("latest")) {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  if (activeInstantSorts.value.includes("oldest")) {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  if (activeInstantSorts.value.includes("cheapest")) {
    filtered.sort((a, b) => a.min_price - b.min_price);
  }
  if (activeInstantSorts.value.includes("expensive")) {
    filtered.sort((a, b) => b.max_price - a.max_price);
  }
  if (activeInstantSorts.value.includes("nearest")) {
    filtered.sort((a, b) => a.distance - b.distance);
  }

  return filtered;
}

function handleMerchantInfiniteScroll() {
  if (
    activeTab.value !== "merchants" ||
    !merchantHasMore.value ||
    isLoadingMoreMerchants.value ||
    loadingMerchants.value
  )
    return;

  const scrollBottom =
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 200;

  if (scrollBottom) {
    merchantPage.value++;
    fetchMerchants();
  }
}

onMounted(async () => {
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("scroll", handleMerchantInfiniteScroll);

  // Only preload profile coordinates (no geolocation prompt).
  // Do not await here, so initial skeleton can render immediately.
  preloadProfileCoordinates();

  fetchLevel1Categories();
  fetchSegmentations();

  // Initial fetch: after coordinates preload, so lat/lng can be included if available.
  const q = route.query.q;
  if (!q) return;

  if (activeTab.value === "products") {
    hasFetchedProductsOnce.value = false;
    fetchProducts(true);
    nextTick(() => setupObserver());
  }

  if (activeTab.value === "merchants") {
    hasFetchedMerchantsOnce.value = false;
    fetchMerchants(true);
  }
  if (authStore.isAuthenticated) {
    await cartStore.fetchCartCount(true);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("scroll", handleMerchantInfiniteScroll);
  if (observer.value) observer.value.disconnect();
  // if (merchantObserver.value) merchantObserver.value.disconnect();
});
</script>

<template>
  <div class="min-h-screen pb-24 bg-gray-50">
    <!-- ================= MOBILE STICKY SEARCH HEADER ================= -->
    <div class="sticky top-0 z-40 bg-white border-b border-gray-200 sm:hidden">
      <div class="flex items-center gap-2 px-3 py-3">
        <!-- BACK -->
        <button
          @click="goBack"
          class="p-2 px-3 transition rounded-full hover:bg-gray-100"
        >
          <i class="text-sm pi pi-chevron-left"></i>
        </button>

        <!-- SEARCH INPUT -->
        <form @submit.prevent="submitSearch" class="flex-1">
          <div class="relative">
            <TextField
              :modelValue="route.query.q || ''"
              @update:modelValue="(v) => router.replace({ query: { q: v } })"
              name="search"
              placeholder="Cari produk atau UMKM…"
              variant="primary"
            />
          </div>
        </form>
        <button
          v-if="!isAdmin"
          @click="goToCart"
          class="relative w-10 h-10 transition rounded-full hover:bg-gray-100 active:scale-95"
        >
          <i class="text-lg pi pi-shopping-cart"></i>

          <span
            v-if="cartItemsCount > 0"
            class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {{ cartItemsCount > 9 ? "9+" : cartItemsCount }}
          </span>
        </button>
      </div>
    </div>
    <div class="px-4 py-4 mx-auto space-y-5 max-w-7xl">
      <div>
        <h1 class="text-lg font-semibold text-gray-900 sm:text-xl">
          Hasil pencarian untuk
          <span class="text-primary">"{{ route.query.q }}"</span>
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Menampilkan produk dan UMKM terkait
        </p>
      </div>

      <!-- TAB -->
      <div class="flex group">
        <button
          @click="activeTab = 'products'"
          class="w-full px-3 py-2 text-sm font-medium transition border-b-2 cursor-pointer group-hover:text-primary group-hover:border-primary"
          :class="
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-muted-foreground text-muted-foreground '
          "
        >
          Produk & Jasa
        </button>
        <button
          @click="activeTab = 'merchants'"
          class="w-full px-3 py-2 text-sm font-medium transition border-b-2 cursor-pointer group-hover:text-primary group-hover:border-primary"
          :class="
            activeTab === 'merchants'
              ? 'border-primary text-primary'
              : 'border-muted-foreground text-muted-foreground '
          "
        >
          UMKM
        </button>
      </div>

      <!-- FILTER BAR -->
      <div class="flex items-start gap-3">
        <div
          class="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <div class="flex gap-2 py-0.5">
            <button
              v-for="item in filteredInstantSorts"
              :key="item.key"
              @click="toggleInstantSort(item.key)"
              class="px-3 py-1.5 text-xs rounded-full border whitespace-nowrap cursor-pointer transition duration-200"
              :class="
                activeInstantSorts.includes(item.key)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
              "
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <Button
          @click="
            tempDetailFilters = { ...detailFilters };
            showFilterModal = true;
          "
          variant="muted-outline"
          size="sm"
          custom-class="relative flex items-center gap-2 whitespace-nowrap !rounded-xl !py-2"
        >
          <i class="pi pi-filter"></i>
          <span>Filter</span>

          <!-- BADGE -->
          <span
            v-if="hasActiveFilters"
            class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-semibold"
          >
            {{ activeFilterCount }}
          </span>
        </Button>
      </div>

      <!-- PRODUCTS -->
      <section v-if="activeTab === 'products'">
        <div
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <template v-if="showProductsSkeleton">
            <ProductCardSkeleton v-for="i in 12" :key="'init-skel-' + i" />
          </template>

          <template v-else>
            <ProductCard
              v-for="item in combinedResults"
              :key="
                (item?.type === 'jasa' ? 'jasa-' : 'product-') +
                (item.jasa_id ?? item.id)
              "
              :product="item"
              @click="handleResultClick(item)"
            />

            <!-- SKELETON APPEND -->
            <template v-if="isLoadingMoreProducts">
              <ProductCardSkeleton v-for="i in 6" :key="'loading-more-' + i" />
            </template>
          </template>
        </div>
      </section>

      <!-- SENTINEL -->
      <div
        ref="loadMoreRef"
        v-if="hasMore && activeTab === 'products'"
        class="h-1"
      ></div>

      <!-- EMPTY PRODUCTS -->
      <div
        v-if="isEmptyProducts"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <p class="text-sm text-primary">Produk / jasa tidak ditemukan</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Coba ubah kata kunci atau filter pencarian
        </p>
      </div>

      <!-- MERCHANTS -->
      <section
        v-if="activeTab === 'merchants'"
        class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <template v-if="showMerchantsSkeleton">
          <ProductCardSkeleton
            v-for="i in 12"
            :key="'merchant-init-skel-' + i"
          />
        </template>

        <template v-else>
          <MerchantCard
            v-for="merchant in merchants"
            :key="merchant.id"
            :merchant="merchant"
          />

          <!-- skeleton append -->
          <template v-if="isLoadingMoreMerchants">
            <ProductCardSkeleton
              v-for="i in 6"
              :key="'merchant-loading-' + i"
            />
          </template>
        </template>
      </section>

      <!-- SENTINEL UMKM -->
      <!-- <div
        ref="loadMoreMerchantRef"
        v-if="merchantHasMore && activeTab === 'merchants'"
        class="h-1"
      ></div> -->

      <!-- EMPTY MERCHANTS -->
      <div
        v-if="isEmptyMerchants && !isLoadingMoreMerchants"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <p class="text-sm text-primary">UMKM tidak ditemukan</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Coba gunakan filter atau kata kunci lain
        </p>
      </div>
    </div>

    <!-- FILTER MODAL -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter"
      subtitle="Atur lebih spesifik"
      :showFooter="true"
    >
      <div class="space-y-4">
        <!-- ===================== PRODUCTS FILTER ===================== -->
        <template v-if="activeTab === 'products'">
          <!-- PRICE -->
          <div>
            <label class="text-sm font-medium">Rentang Harga</label>
            <div class="flex items-center gap-2 mt-2">
              <TextField
                type="number"
                v-model="tempDetailFilters.minPrice"
                placeholder="Min"
                prefix="Rp"
                class="w-full"
              />
              -
              <TextField
                type="number"
                v-model="tempDetailFilters.maxPrice"
                placeholder="Max"
                prefix="Rp"
                class="w-full"
              />
            </div>
          </div>

          <!-- SEGMENTASI -->
          <div>
            <label class="text-sm font-medium">
              <span v-if="isLoadingSegments">Memuat Jenis Produk...</span>
              <span v-else>Jenis Produk</span>
            </label>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button
                v-for="seg in availableSegments"
                :key="seg.key"
                @click="toggleSegment(seg.key)"
                class="px-3 py-2 text-xs border rounded-xl"
                :class="
                  tempDetailFilters.segments.includes(seg.key)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300'
                "
              >
                {{ seg.label }}
              </button>
            </div>
          </div>

          <!-- CATEGORY -->
          <div>
            <label class="text-sm font-medium">
              <span v-if="isLoadingCategories">Memuat Kategori...</span>
              <span v-else>Kategori</span>
            </label>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <button
                v-for="cat in availableCategories"
                :key="cat.key"
                @click="toggleCategory(cat.key)"
                class="px-3 py-2 text-xs border rounded-xl"
                :class="
                  tempDetailFilters.categories.includes(cat.key)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300'
                "
              >
                {{ cat.label }}
              </button>
            </div>
          </div>

          <!-- SUB CATEGORY -->
          <div v-if="availableSubCategories.length">
            <label class="text-sm font-medium">
              <span v-if="isLoadingSubCategories">Memuat Sub Kategori...</span>
              <span v-else>Sub Kategori</span>
            </label>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <button
                v-for="sub in availableSubCategories"
                :key="sub.key"
                @click="toggleSubCategory(sub.key)"
                class="px-3 py-2 text-xs border rounded-xl"
                :class="
                  tempDetailFilters.subCategories.includes(sub.key)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300'
                "
              >
                {{ sub.label }}
              </button>
            </div>
          </div>
        </template>

        <!-- ===================== MERCHANT FILTER ===================== -->
        <template v-else-if="activeTab === 'merchants'">
          <div>
            <label class="text-sm font-medium">
              <span v-if="isLoadingSegments">Memuat Segmentasi UMKM...</span>
              <span v-else>Segmentasi UMKM</span>
            </label>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <button
                v-for="seg in availableSegments"
                :key="seg.key"
                @click="toggleSegment(seg.key)"
                class="px-3 py-2 text-xs border rounded-xl"
                :class="
                  tempDetailFilters.segments.includes(seg.key)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300'
                "
              >
                {{ seg.label }}
              </button>
            </div>
          </div>

          <div class="mt-4">
            <label class="text-sm font-medium">Status</label>
            <div class="mt-2">
              <button
                type="button"
                @click="tempDetailFilters.isOpen = !tempDetailFilters.isOpen"
                class="px-3 py-2 text-xs border rounded-xl"
                :class="
                  tempDetailFilters.isOpen
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300'
                "
              >
                Buka
              </button>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="flex gap-2">
          <Button
            variant="muted-outline"
            class="w-full"
            @click="resetAllFilters"
          >
            Reset
          </Button>
          <Button variant="primary" class="w-full" @click="applyDetailFilter">
            Terapkan
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- BACK TO TOP BUTTON -->
    <button
      v-show="showBackToTop"
      @click="scrollToTop"
      class="fixed z-50 flex items-center justify-center transition duration-200 bg-white border-2 rounded-full shadow-sm cursor-pointer border-muted-foreground/20 hover:shadow-lg bottom-24 right-8 w-11 h-11 active:scale-90 hover:-translate-y-1"
      aria-label="Kembali ke atas"
    >
      <i class="text-xl pi pi-arrow-up text-secondary"></i>
    </button>
  </div>
</template>
