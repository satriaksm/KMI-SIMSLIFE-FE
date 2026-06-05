import { ref, computed } from "vue";
import * as cartService from "@/services/api/cart";
import { useToast } from "vue-toastification";

export function useCart() {
  const toast = useToast();

  const toNumberOrNull = (v) => {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const normalizeSelectedAddons = (selected) => {
    if (!Array.isArray(selected)) return [];
    return selected
      .map((a) => ({
        addon_group_id: toNumberOrNull(a?.addon_group_id),
        addon_id: toNumberOrNull(a?.addon_id),
      }))
      .filter((a) => a.addon_id !== null);
  };

  const resolveLiveSelectedAddons = (productDetails, selectedAddons) => {
    const groups = productDetails?.addon_groups ?? [];
    if (!Array.isArray(groups) || groups.length === 0) return [];

    const result = [];

    selectedAddons.forEach((sel) => {
      const preferredGroup = groups.find(
        (g) => toNumberOrNull(g?.id) === toNumberOrNull(sel?.addon_group_id),
      );

      const findInGroup = (g) =>
        g?.options?.find(
          (o) => toNumberOrNull(o?.addon_id) === toNumberOrNull(sel?.addon_id),
        );

      const opt =
        findInGroup(preferredGroup) ??
        groups.map((g) => findInGroup(g)).find((maybe) => maybe !== undefined);

      if (!opt) return;

      const groupId = toNumberOrNull(opt?.addon_group_id ?? preferredGroup?.id);
      const addonId = toNumberOrNull(opt?.addon_id);
      const label = opt?.addon?.addon_name ?? opt?.name ?? "";
      const price = Number(opt?.addon_price ?? opt?.price ?? 0);

      if (addonId === null) return;

      result.push({
        addon_group_id: groupId,
        addon_id: addonId,
        label,
        price,
      });
    });

    return result;
  };

  // =====================
  // STATE
  // =====================
  const cartStores = ref([]);
  const loading = ref(false);

  // =====================
  // COMPUTED
  // =====================
  const isEmpty = computed(() => cartStores.value.length === 0);

  const totalItems = computed(() =>
    cartStores.value.reduce(
      (sum, store) =>
        sum + store.items.reduce((s, item) => s + item.quantity, 0),
      0,
    ),
  );

  // =====================
  // ACTIONS
  // =====================
  async function fetchCart() {
    loading.value = true;
    try {
      const { data } = await cartService.fetchCart();

      cartStores.value = (data.data || []).map((cart) => ({
        id: cart.cart_id,
        cartId: cart.cart_id,
        merchantId: cart.merchant?.id ?? null,
        name: cart.merchant.name,
        slug: cart.merchant.slug,
        phone: cart.merchant.phone,
        address: cart.merchant.address,

        items: (cart.items || []).map((item) => ({
          id: item.cart_item_id,
          quantity: item.quantity,
          stock: item.live.max_stock,

          slug: item.product_details?.slug,
          name: item.snapshot.name,

          image:
            item.product_details?.cover_image?.src_url ||
            item.snapshot.image?.src_url ||
            item.snapshot.image ||
            "",

          unitPrice: item.changes?.price_changed
            ? Number(item.live.unit_price)
            : Number(item.snapshot.unit_price),

          selectedVariantId: item.selected_configuration.variant_id,
          selectedAddons: normalizeSelectedAddons(
            item.selected_configuration?.addon_ids,
          ),

          // Prefer live addon prices from product details; fallback to snapshot.
          addons: (() => {
            const live = resolveLiveSelectedAddons(
              item.product_details,
              normalizeSelectedAddons(item.selected_configuration?.addon_ids),
            );
            if (live.length > 0) {
              return live.map((a) => ({
                addon_id: a.addon_id,
                label: a.label,
                price: a.price,
              }));
            }
            return item.snapshot.addons || [];
          })(),
          addonTotalPrice: (() => {
            const live = resolveLiveSelectedAddons(
              item.product_details,
              normalizeSelectedAddons(item.selected_configuration?.addon_ids),
            );
            if (live.length > 0) {
              return live.reduce((sum, a) => sum + Number(a.price || 0), 0);
            }
            return Number(item.snapshot.addon_total_price || 0);
          })(),

          isOverStock: item.changes?.is_over_stock ?? false,
          isUnavailable:
            item.product_details?.status !== "published" ||
            item.live.max_stock === 0,

          productDetails: item.product_details,
        })),
      }));
    } catch (e) {
      toast.error("Gagal memuat keranjang");
      cartStores.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchCartCount() {
    try {
      const res = await cartService.fetchCartCount();
      const count = res.data?.data?.count ?? 0;
      return Number(count);
    } catch (e) {
      console.warn("Gagal fetch cart count");
      return 0;
    }
  }

  async function addToCart(payload) {
    await cartService.addToCart(payload);
  }

  async function updateItemQuantity(id, payload) {
    await cartService.updateCartItemQuantity(id, payload);
  }

  async function updateItemVariant(id, payload) {
    await cartService.updateCartItemVariant(id, payload);
  }

  async function removeItem(id) {
    await cartService.removeCartItem(id);

    // optimistic update
    cartStores.value.forEach((store) => {
      store.items = store.items.filter((i) => i.id !== id);
    });
    cartStores.value = cartStores.value.filter(
      (store) => store.items.length > 0,
    );
  }

  async function clearCartByStore(cartId) {
    await cartService.clearCart(cartId);
    cartStores.value = cartStores.value.filter((s) => s.id !== cartId);
  }

  return {
    cartStores,
    loading,
    isEmpty,
    totalItems,

    fetchCart,
    fetchCartCount,
    addToCart,
    updateItemQuantity,
    updateItemVariant,
    removeItem,
    clearCartByStore,
  };
}
