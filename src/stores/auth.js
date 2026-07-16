import { defineStore, getActivePinia } from "pinia";
import { ref, computed } from "vue";
import api from "@/libs/axios";
import { useToast } from "vue-toastification";

export const useAuthStore = defineStore("auth", () => {
  const toast = useToast();
  const user = ref(null);
  const authReady = ref(false);
  const selectedMerchantSlug = ref(null);

  // =========================
  // COMPUTED
  // =========================
  const isAuthenticated = computed(() => !!user.value);

  const userRoles = computed(
    () =>
      user.value?.roles?.map((r) => (typeof r === "string" ? r : r.name)) || [],
  );

  const isAdmin = computed(() => userRoles.value.includes("admin"));
  const isMerchant = computed(() => userRoles.value.includes("umkm-owner"));
  const isCustomer = computed(() => userRoles.value.includes("customer"));

  const allMerchants = computed(() => user.value?.merchants || []);
  const merchantsCount = computed(() => allMerchants.value.length);

  const activeMerchant = computed(() => {
    if (!allMerchants.value.length) return null;

    if (selectedMerchantSlug.value) {
      const found = allMerchants.value.find(
        (m) => m.slug === selectedMerchantSlug.value,
      );
      if (found) return found;
    }

    return (
      allMerchants.value.find((m) => m.status === "approved") ||
      allMerchants.value[0]
    );
  });

  const merchantSlug = computed(() => activeMerchant.value?.slug || null);
  const merchantName = computed(
    () => activeMerchant.value?.name || user.value?.name || "User",
  );

  // =========================
  // HELPERS
  // =========================
  function requireLoginToast() {
    toast.info("Silakan login terlebih dahulu untuk melanjutkan", {
      timeout: 2500,
    });
  }

  function persistUser(data) {
    if (!data || typeof data !== "object") return;

    const minimal = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      profile_picture:
        typeof data?.profile_picture === "string" ? data.profile_picture : null,
      profile_picture_urls: data?.profile_picture_urls || null,
      roles: data.roles,
      merchants: data.merchants || [],
      // ✅ Robust boolean conversion for super admin
      is_super_admin: !!(data.is_super_admin === true || data.is_super_admin === 1 || data.is_super_admin === "1"),
      // Optionally add is_system_admin if needed
      is_system_admin: !!(data.is_system_admin === true || data.is_system_admin === 1 || data.is_system_admin === "1"),
    };

    user.value = minimal;
    localStorage.setItem("user", JSON.stringify(minimal));
  }

  function updateLocalUser(partial) {
    if (!partial || typeof partial !== "object") return;

    const current =
      user.value && typeof user.value === "object" ? user.value : {};
    const next = { ...current, ...partial };
    user.value = next;
    localStorage.setItem("user", JSON.stringify(next));
  }

  function clearUser() {
    user.value = null;
    selectedMerchantSlug.value = null;
    localStorage.removeItem("user");
    localStorage.removeItem("selected_merchant_slug");
  }

  function resetOtherStores() {
    const pinia = getActivePinia();
    if (!pinia || !pinia._s) return;

    // Reset all stores except auth. Prefer $reset (option stores), fall back to reset/clear actions.
    pinia._s.forEach((store) => {
      if (!store || store.$id === "auth") return;

      if (typeof store.$reset === "function") {
        store.$reset();
        return;
      }

      if (typeof store.reset === "function") {
        store.reset();
        return;
      }

      if (typeof store.clear === "function") {
        store.clear();
      }
    });
  }

  function loadSelectedMerchant() {
    const saved = localStorage.getItem("selected_merchant_slug");
    if (saved) selectedMerchantSlug.value = String(saved);
  }

  function setSelectedMerchantSlug(slug) {
    if (!slug) {
      selectedMerchantSlug.value = null;
      localStorage.removeItem("selected_merchant_slug");
      return;
    }

    selectedMerchantSlug.value = String(slug);
    localStorage.setItem("selected_merchant_slug", selectedMerchantSlug.value);
  }

  function getMerchantById(id) {
    if (id === null || id === undefined) return null;
    return allMerchants.value.find((m) => Number(m.id) === Number(id)) || null;
  }

  function getMerchantBySlug(slug) {
    if (!slug) return null;
    const slugString = String(slug);
    return (
      allMerchants.value.find((m) => String(m.slug) === slugString) || null
    );
  }

  // =========================
  // ACTIONS
  // =========================
  async function login(credentials) {
    try {
      try {
        await api.get("/sanctum/csrf-cookie");
      } catch {
        console.warn("Gagal mendapatkan CSRF cookie");
      }

      // 🔐 Login
      await api.post("/login", credentials);

      // 👤 Ambil user
      const { data } = await api.get("/api/me");

      persistUser(data);
      loadSelectedMerchant();

      toast.success("Login berhasil!", { timeout: 2500 });
      return data;
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        toast.error("Email atau password salah");
      } else if (status === 403) {
        toast.warning(error.response?.data?.message || "Akses ditolak");
      } else {
        toast.error("Login gagal");
      }

      throw error;
    }
  }

  async function logout(options = {}) {
    const { silent = false, skipRequest = false } =
      options && typeof options === "object" ? options : {};

    try {
      if (!skipRequest) {
        await api.post("/logout");
      }
      if (!silent) {
        toast.success("Berhasil logout!", { timeout: 2000 });
      }
    } catch {
      if (!silent) {
        toast.warning("Logout gagal, sesi dibersihkan");
      }
    } finally {
      resetOtherStores();
      clearUser();
    }
  }

  async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    toast.success("Registrasi berhasil, silakan login");
    return data;
  }

  async function initAuth() {
    authReady.value = false;

    // Load dari localStorage dulu (optimistic)
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        user.value = JSON.parse(saved);
        loadSelectedMerchant();
      } catch {
        clearUser();
      }
    }

    // Validasi ke server
    try {
      const { data } = await api.get("/api/me");
      persistUser(data);
    } catch {
      clearUser();
    } finally {
      authReady.value = true;
    }
  }

  // =========================
  // EXPORT
  // =========================
  return {
    // state
    user,
    authReady,
    isAuthenticated,

    // roles
    userRoles,
    isAdmin,
    isMerchant,
    isCustomer,

    // helpers
    updateLocalUser,

    // merchant
    allMerchants,
    merchantsCount,
    activeMerchant,
    merchantSlug,
    merchantName,
    setSelectedMerchantSlug,
    getMerchantById,
    getMerchantBySlug,

    // actions
    requireLoginToast,
    login,
    logout,
    register,
    initAuth,
    clearUser,
  };
});
