import { defineStore } from "pinia";

export const useCheckoutStore = defineStore("checkout", {
  persist: true,
  state: () => ({
    /**
     * sumber checkout
     * - product : dari product detail (single item)
     * - cart    : dari keranjang (multi item)
     */
    from: "product",

    /* =====================================================
     * =============== SINGLE PRODUCT MODE =================
     * ===================================================== */
    productSlug: null,
    productId: null,
    productTitle: null,
    productImage: null,

    qty: 1,

    selectedSizeId: null,
    selectedSizeName: null,

    selectedVariantId: null,
    selectedVariantName: null,

    selectedAddons: [], // [{ id, name, price }]

    unitPrice: 0, // harga varian (tanpa addon)
    addonTotal: 0,

    combination: {
      sizeId: 0,
      variantId: 0,
      stock: 0,
    },

    /* =====================================================
     * =================== CART MODE ========================
     * ===================================================== */
    cartItems: [
      // {
      //   id,
      //   name,
      //   image,
      //   quantity,
      //   unitPrice,
      //   addonTotalPrice,
      //   variant,
      //   size,
      //   addons: [{ label, price }]
      // }
    ],

    /* =====================================================
     * ================= STORE / MERCHANT ===================
     * ===================================================== */
    store: {
      id: null,
      merchantId: null,
      cartId: null,
      slug: null,
      name: null,
      address: null,
      phone: null,
    },

    lastUpdatedAt: null,
  }),

  /* =====================================================
   * ===================== GETTERS ========================
   * ===================================================== */
  getters: {
    /** total checkout (auto sesuai mode) */
    totalPrice(state) {
      if (state.from === "cart") {
        return state.cartItems.reduce(
          (sum, item) =>
            sum +
            (Number(item.unitPrice) + Number(item.addonTotalPrice || 0)) *
              Number(item.quantity || 1),
          0,
        );
      }

      // product detail
      return (
        (Number(state.unitPrice) + Number(state.addonTotal)) *
        Number(state.qty || 1)
      );
    },
  },

  /* =====================================================
   * ===================== ACTIONS ========================
   * ===================================================== */
  actions: {
    _resolveImageUrl(image) {
      if (typeof image === "string") return image;
      if (image && typeof image === "object") {
        return image.src_url ?? image.url ?? "";
      }
      return "";
    },
    /* ---------- FROM PRODUCT DETAIL ---------- */
    setFromProductDetail(payload) {
      this.from = "product";

      this.productSlug = payload.slug ?? null;
      this.productId = payload.productId ?? null;
      this.productTitle = payload.title ?? null;
      this.productImage = payload.image ?? null;

      this.store = {
        id: payload.store?.id ?? null,
        merchantId: payload.store?.merchantId ?? payload.store?.id ?? null,
        cartId: payload.store?.cartId ?? null,
        slug: payload.store?.slug ?? null,
        name: payload.store?.name ?? null,
        address: payload.store?.address ?? null,
        phone: payload.store?.phone ?? null,
      };

      this.qty = Number(payload.qty || 1);

      this.selectedSizeId = payload.sizeId ?? null;
      this.selectedSizeName = payload.sizeName ?? null;

      this.selectedVariantId = payload.variantId ?? null;
      this.selectedVariantName = payload.variantName ?? null;

      this.unitPrice = Number(payload.unitPrice || 0);

      this.combination = {
        sizeId: Number(payload.sizeId ?? 0),
        variantId: Number(payload.variantId ?? 0),
        stock: Number(payload.stock ?? 0),
      };

      const addons = Array.isArray(payload.addons) ? payload.addons : [];
      this.selectedAddons = addons.map((a) => ({
        id: a.addon_id ?? a.id ?? null,
        groupId: a.addon_group_id ?? a.group_id ?? null,
        name: a.name ?? "",
        price: Number(a.price || 0),
      }));

      this.addonTotal = this.selectedAddons.reduce(
        (s, a) => s + Number(a.price || 0),
        0,
      );

      // reset cart
      this.cartItems = [];

      this.lastUpdatedAt = Date.now();
    },

    /* ---------- FROM CART ---------- */
    setFromCart(payload) {
      this.from = "cart";

      this.store = {
        id: payload.store?.merchantId ?? null,
        merchantId: payload.store?.merchantId ?? null,
        cartId: payload.store?.cartId ?? null,
        slug: payload.store?.slug ?? null,
        name: payload.store?.name ?? null,
        address: payload.store?.address ?? null,
        phone: payload.store?.phone ?? null,
      };

      this.cartItems = payload.items.map((item) => ({
        id: item.id,
        name: item.name,
        image: this._resolveImageUrl(item.image),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        addonTotalPrice: Number(item.addonTotalPrice || 0),
        variant: item.variant ?? "",
        size: item.size ?? "",
        addons: Array.isArray(item.addons)
          ? item.addons.map((a) => ({
              name: a.name ?? a.label ?? "",
              price: Number(a.price || 0),
            }))
          : [],
      }));

      // reset single product state
      this.productSlug = null;
      this.productId = null;
      this.productTitle = null;
      this.productImage = null;
      this.qty = 1;
      this.selectedSizeId = null;
      this.selectedSizeName = null;
      this.selectedVariantId = null;
      this.selectedVariantName = null;
      this.selectedAddons = [];
      this.unitPrice = 0;
      this.addonTotal = 0;
      this.combination = { sizeId: 0, variantId: 0, stock: 0 };

      this.lastUpdatedAt = Date.now();
    },

    /* ---------- UPDATE SINGLE PRODUCT SELECTION ---------- */
    updateSelection({
      sizeId,
      sizeName,
      variantId,
      variantName,
      unitPrice,
      stock,
    }) {
      if (sizeId !== undefined) {
        this.selectedSizeId = sizeId;
        this.selectedSizeName = sizeName ?? this.selectedSizeName;
        this.combination.sizeId = Number(sizeId ?? 0);
      }

      if (variantId !== undefined) {
        this.selectedVariantId = variantId;
        this.selectedVariantName = variantName ?? this.selectedVariantName;
        this.combination.variantId = Number(variantId ?? 0);
      }

      if (unitPrice !== undefined) this.unitPrice = Number(unitPrice || 0);
      if (stock !== undefined) this.combination.stock = Number(stock || 0);

      this.lastUpdatedAt = Date.now();
    },

    setAddons(addons) {
      const list = Array.isArray(addons) ? addons : [];
      this.selectedAddons = list.map((a) => ({
        id: a.id ?? a.addon_id ?? null,
        groupId: a.groupId ?? a.addon_group_id ?? a.group_id ?? null,
        name: a.name ?? a.label ?? "",
        price: Number(a.price || 0),
      }));
      this.addonTotal = this.selectedAddons.reduce(
        (s, a) => s + Number(a.price || 0),
        0,
      );
      this.lastUpdatedAt = Date.now();
    },

    setQty(q) {
      this.qty = Math.max(1, Number(q || 1));
      this.lastUpdatedAt = Date.now();
    },

    /* ---------- RESET ---------- */
    clear() {
      this.from = "product";
      this.cartItems = [];

      this.productSlug = null;
      this.productId = null;
      this.productTitle = null;
      this.productImage = null;

      this.store = {
        id: null,
        merchantId: null,
        cartId: null,
        slug: null,
        name: null,
        address: null,
        phone: null,
      };

      this.qty = 1;
      this.selectedSizeId = null;
      this.selectedSizeName = null;
      this.selectedVariantId = null;
      this.selectedVariantName = null;
      this.selectedAddons = [];
      this.unitPrice = 0;
      this.addonTotal = 0;
      this.combination = { sizeId: 0, variantId: 0, stock: 0 };

      this.lastUpdatedAt = null;
    },
  },
});
