import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import CommunityView from "@/views/CommunityView.vue";
import CommunityDetailView from "@/views/CommunityDetailView.vue";

const adminGuard = (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isAuthenticated) {
    toast.warning("Silakan login terlebih dahulu");
    next({ name: "Login", query: { redirect: to.fullPath } });
    return;
  }

  if (!authStore.isAdmin) {
    toast.error("Anda tidak memiliki akses ke halaman admin");
    next({ name: "Beranda" });
    return;
  }

  next();
};

const routes = [
  {
    path: "/test-api",
    name: "ApiTest",
    component: () => import("@/views/ApiTest.vue"),
    meta: { title: "API Test" },
  },

  // ===========================
  // Halaman Beranda (Public/Customer)
  // ===========================
  {
    path: "/",
    component: () => import("@/layouts/CustomerLayout.vue"),
    children: [
      {
        path: "",
        name: "Beranda",
        component: () => import("@/views/HomeView.vue"),
        meta: {
          title: "Marketplace UMKM Lokal Banyuanyar | SUMILIR",
          description:
            "Sumilir adalah marketplace UMKM lokal Banyuanyar. Temukan produk kuliner, toko, dan jasa UMKM atau mulai berinteraksi dengan komunitas UMKM lokal.",
        },
      },
      {
        path: "explore",
        name: "UMKM & Produk-Layanan Jasa",
        component: () => import("@/views/ExploreView.vue"),
        meta: {
          title: "Semua Produk & Layanan | SUMILIR",
          description:
            "Jelajahi semua produk dan layanan UMKM lokal Banyuanyar di Sumilir. Temukan kuliner, toko, dan jasa berkualitas dari pelaku UMKM setempat.",
        },
      },
      {
        path: "products/:slug",
        name: "Product Detail",
        component: () => import("@/views/ProductDetailView.vue"),
        meta: { title: "Product Detail | SUMILIR" },
      },
      {
        path: "merchant/:slug",
        name: "Merchant Detail",
        component: () => import("@/views/MerchantDetailView.vue"),
        meta: { title: "Detail Toko | SUMILIR" },
      },
      {
        path: "/map",
        name: "Peta UMKM",
        component: () => import("@/views/PetaUmkmView.vue"),
        meta: {
          title: "Peta UMKM Banyuanyar | SUMILIR",
          description:
            "Temukan lokasi UMKM lokal Banyuanyar melalui peta interaktif Sumilir. Jelajahi berbagai toko, kuliner, dan jasa UMKM di sekitar Anda.",
        },
      },
      {
        path: "jasa/:slug",
        name: "JasaDetail",
        component: () => import("@/views/customer/JasaDetail.vue"),
        meta: { title: "Detail Jasa | SUMILIR" },
        beforeEnter: async (to, from, next) => {
          const slug = String(to.params.slug || "").trim();
          if (!slug) {
            return next({ name: "Beranda" });
          }

          const api = (await import("@/libs/axios.js")).default;

          // Check if slug is numeric (old ID-based URL)
          if (/^\d+$/.test(slug)) {
            try {
              // Fetch jasa by ID to get the proper slug
              const { data } = await api.get(`/api/public/jasas/${slug}`);

              if (data?.slug) {
                // Redirect to proper slug URL
                next({
                  name: "JasaDetail",
                  params: { slug: data.slug },
                  replace: true,
                });
              } else {
                next();
              }
            } catch (e) {
              console.warn("[Router] Could not fetch jasa by ID:", slug);
              next();
            }
          } else {
            try {
              // Validate slug really belongs to a jasa to avoid hard 404 in view
              await api.get(`/api/public/jasas/${encodeURIComponent(slug)}`);
              return next();
            } catch (e) {
              try {
                // If this slug belongs to a merchant, redirect to merchant detail page
                await api.get(
                  `/api/public/merchants/${encodeURIComponent(slug)}`,
                );
                return next({
                  name: "Merchant Detail",
                  params: { slug },
                  replace: true,
                });
              } catch (_) {
                return next();
              }
            }
          }
        },
      },
      {
        path: "search:keyword?",
        name: "Search Page",
        component: () => import("@/views/SearchPageView.vue"),
        beforeEnter: (to, from, next) => {
          const paramKeyword =
            typeof to.params?.keyword === "string"
              ? to.params.keyword.trim()
              : "";

          const queryKeywordRaw =
            (typeof to.query?.keyword === "string" &&
              to.query.keyword.trim()) ||
            (typeof to.query?.q === "string" && to.query.q.trim()) ||
            "";

          const keyword = paramKeyword || queryKeywordRaw;

          // Block direct access when no keyword at all.
          if (!keyword) {
            return next({ name: "Beranda" });
          }

          // Canonicalize to query-based URL to avoid paths like `/searchayam`.
          if (paramKeyword) {
            return next({ path: "/search", query: { q: paramKeyword } });
          }

          next();
        },
        meta: { title: "Pencarian | SUMILIR" },
      },
      {
        path: "community",
        name: "community",
        component: CommunityView,
        meta: {
          title: "Komunitas UMKM Lokal Banyuanyar | SUMILIR",
          description:
            "Komunitas UMKM lokal Banyuanyar di Sumilir. Tempat berbagi informasi, diskusi, dan promosi antar pelaku UMKM dan warga.",
        },
      },
      {
        path: "community/:slug",
        name: "community-detail",
        component: CommunityDetailView,
        props: true,
        meta: { title: "Detail Komunitas | SUMILIR" },
      },
      {
        path: "profile/:id",
        name: "Public Profile",
        component: () => import("@/views/PublicProfileView.vue"),
        meta: { title: "Profil Pengguna | SUMILIR" },
      },
      {
        path: "events",
        name: "Event List",
        component: () => import("@/views/customer/events/EventIndexView.vue"),
        meta: { title: "Daftar Event | SUMILIR" },
      },
      {
        path: "events/:id",
        name: "Event Detail",
        component: () => import("@/views/customer/events/EventDetailView.vue"),
        meta: { title: "Detail Event | SUMILIR" },
      },

      // ===========================
      // Halaman Customer (butuh auth)
      // ===========================
      {
        path: "pembayaran-jasa",
        name: "Pembayaran Jasa",
        component: () => import("@/views/customer/PembayaranJasa.vue"),
        meta: { title: "Pembayaran | SUMILIR", denyRoles: ["admin"] },
      },
      {
        path: "cart",
        name: "Keranjang",
        component: () => import("@/views/customer/CartView.vue"),
        meta: {
          requiresAuth: true,
          roles: ["customer"],
          denyRoles: ["admin"],
          title: "Keranjang Saya | SUMILIR",
        },
      },
      {
        path: "orders",
        meta: {
          requiresAuth: true,
          roles: ["customer"],
          denyRoles: ["admin"],
        },
        children: [
          {
            path: "",
            name: "Pesanan Saya",
            component: () => import("@/views/customer/orders/Index.vue"),
            meta: {
              title: "Pesanan Saya | SUMILIR",
            },
          },
          {
            path: "pending-payments",
            name: "Menunggu Pembayaran",
            component: () => import("@/views/customer/orders/Pending.vue"),
            meta: {
              title: "Menunggu Pembayaran | SUMILIR",
            },
          },
          {
            path: ":orderId",
            name: "Detail Pesanan",
            component: () => import("@/views/customer/orders/Detail.vue"),
            meta: {
              title: "Detail Pesanan | SUMILIR",
            },
          },
        ],
      },

      {
        path: "product-payment",
        name: "Pembayaran Produk",
        component: () => import("@/views/customer/PembayaranProductView.vue"),
        meta: {
          requiresAuth: true,
          roles: ["customer"],
          denyRoles: ["admin"],
          title: "Pembayaran | SUMILIR",
        },
      },
      // ===========================
      // KONSULTASI CUSTOMER (UMKM JASA)
      // ===========================
      {
        path: "customer/consultations",
        name: "Customer Consultation History",
        component: () => import("@/views/customer/consultation/CustomerConsultationHistory.vue"),
        meta: {
          title: "Konsultasi Saya | SUMILIR",
          requiresAuth: true,
        },
      },
      {
        path: "customer/consultations/:consultationId",
        name: "Customer Consultation Detail",
        component: () => import("@/views/customer/consultation/CustomerConsultationDetail.vue"),
        meta: {
          title: "Detail Konsultasi | SUMILIR",
          requiresAuth: true,
        },
      },
      {
        path: "customer/consultations/:consultationId/checkout",
        name: "Customer Consultation Checkout",
        component: () => import("@/views/customer/consultation/CustomerConsultationCheckout.vue"),
        meta: {
          title: "Checkout Konsultasi | SUMILIR",
          requiresAuth: true,
        },
      },

      // Universal Review Route - for all types: service, product, food, merchant
      {
        path: "review/:reviewableType/:orderId/:reviewableId",
        name: "Universal Review",
        component: () => import("@/views/customer/UniversalReviewView.vue"),
        meta: {
          title: "Beri Review | SUMILIR",
          requiresAuth: true,
        },
      },

      // ===========================
      // Profil User
      // ===========================
      {
        path: "/profile",
        meta: { requiresAuth: true },
        children: [
          {
            path: "",
            name: "Profile",
            component: () => import("@/views/customer/profile/ProfileView.vue"),
            meta: { title: "Profil Saya | SUMILIR" }, // ← dari kodemu
          },
          {
            path: "edit",
            name: "EditProfile",
            component: () =>
              import("@/views/customer/profile/EditProfileView.vue"),
            meta: { title: "Edit Profil Saya | SUMILIR" }, // ← dari kodemu
          },
          {
            path: "address",
            name: "MyAddress",
            component: () =>
              import("@/views/customer/profile/EditAddressView.vue"),
            meta: { title: "Edit Alamat Saya | SUMILIR" }, // ← dari kodemu
          },
          {
            path: "change-password",
            name: "ChangePassword",
            component: () =>
              import("@/views/customer/profile/ChangePasswordView.vue"),
            meta: { title: "Ubah Kata Sandi | SUMILIR" }, // ← dari kodemu
          },
        ],
      },
    ],
  },

  // ===========================
  // Grup halaman Auth pakai AuthLayout
  // ===========================
  {
    path: "/",
    component: () => import("@/layouts/AuthLayout.vue"),
    meta: { guest: true },
    children: [
      {
        path: "login",
        name: "Login",
        component: () => import("@/views/auth/Login.vue"),
        meta: { title: "Login | SUMILIR" },
      },
      {
        path: "register",
        name: "Register",
        component: () => import("@/views/auth/Register.vue"),
        meta: { title: "Register | SUMILIR" },
      },
      {
        path: "forgot-password",
        name: "Forgot Password",
        component: () => import("@/views/auth/ForgotPassword.vue"),
        meta: { title: "Lupa Kata Sandi | SUMILIR" },
      },
      {
        path: "reset-password/:token?",
        name: "Reset Password",
        component: () => import("@/views/auth/ResetPassword.vue"),
        meta: { title: "Reset Kata Sandi | SUMILIR" },
      },
      {
        path: "verify-email",
        name: "Email Verification",
        component: () => import("@/views/auth/EmailVerification.vue"),
        meta: { title: "Verifikasi Email | SUMILIR" },
      },
    ],
  },

  // ===========================
  // Halaman merchant register
  // ===========================
  {
    path: "/merchant-register",
    name: "Merchant Register",
    component: () => import("@/views/auth/MerchantRegister.vue"),
    meta: {
      requiresAuth: true,
      roles: ["customer"],
      denyRoles: ["admin"],
      title: "Pendaftaran UMKM | SUMILIR",
    },
  },

  // ===========================
  // Halaman Admin
  // ===========================
  {
    path: "/admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: { requiresAuth: true, roles: ["admin"] },
    beforeEnter: adminGuard,
    children: [
      {
        path: "",
        redirect: { name: "Admin - Dashboard" },
      },
      {
        path: "dashboard",
        name: "Admin - Dashboard",
        component: () => import("@/views/admin/Dashboard.vue"),
        meta: { title: "Admin Dashboard | SUMILIR" },
      },

      // USERS
      {
        path: "users",
        component: () => import("@/views/admin/users/Index.vue"),
        children: [
          {
            path: "",
            redirect: { name: "Admin - Customers List" },
          },
          {
            path: "customers",
            name: "Admin - Customers List",
            component: () => import("@/views/admin/users/customers/Index.vue"),
            meta: { title: "Customer List | Admin SUMILIR" },
          },
          {
            path: "customers/create",
            name: "Admin - Customer Create",
            component: () => import("@/views/admin/users/customers/Create.vue"),
            meta: { title: "Tambah Customer | Admin SUMILIR" },
          },
          {
            path: "customers/:id",
            name: "Admin - Customer Detail",
            component: () => import("@/views/admin/users/customers/Detail.vue"),
            meta: { title: "Customer Detail | Admin SUMILIR" },
          },
          {
            path: "merchants",
            name: "Admin - Merchants List",
            component: () => import("@/views/admin/users/merchants/Index.vue"),
            meta: { title: "Merchant List | Admin SUMILIR" },
          },
          {
            path: "merchants/create",
            name: "Admin - Merchant Create",
            component: () => import("@/views/admin/users/merchants/Create.vue"),
            meta: { title: "Tambah Merchant | Admin SUMILIR" },
          },
          {
            path: "merchants/:id",
            name: "Admin - Merchant Detail",
            component: () => import("@/views/admin/users/merchants/Detail.vue"),
            meta: { title: "Merchant Detail | Admin SUMILIR" },
          },
          {
            path: "admin-system",
            name: "Admin - Admin System List",
            component: () => import("@/views/admin/users/admin-system/Index.vue"),
            meta: { requiresSystemAdmin: true },
          },
          {
            path: "admin-system/create",
            name: "Admin - Admin System Create",
            component: () => import("@/views/admin/users/admin-system/Create.vue"),
            meta: { requiresSystemAdmin: true },
          },
          {
            path: "admin-system/:id",
            name: "Admin - Admin System Detail",
            component: () => import("@/views/admin/users/admin-system/Detail.vue"),
            meta: { requiresSystemAdmin: true },
          },
        ],
      },

      // EVENTS
      {
        path: "events",
        component: () => import("@/views/admin/events/Index.vue"),
        children: [
          {
            path: "",
            name: "Admin - Events",
            component: () => import("@/views/admin/events/List.vue"),
            meta: { title: "Events | Admin SUMILIR" },
          },
          {
            path: "create",
            name: "Admin - Create Event",
            component: () => import("@/views/admin/events/Create.vue"),
            meta: { title: "Tambah Event | Admin SUMILIR" },
          },
          {
            path: ":id",
            name: "Admin - Event Detail",
            component: () => import("@/views/admin/events/Detail.vue"),
            meta: { title: "Detail Event | Admin SUMILIR" },
          },
          // ✅ ADD: Edit Event route
          {
            path: ":id/edit",
            name: "Admin - Edit Event",
            component: () => import("@/views/admin/events/Edit.vue"),
            meta: { title: "Edit Event | Admin SUMILIR" },
          },
        ],
      },

      // VOUCHERS
      {
        path: "vouchers",
        component: () => import("@/views/admin/vouchers/Index.vue"),
        children: [
          {
            path: "",
            name: "Admin - Vouchers",
            component: () => import("@/views/admin/vouchers/List.vue"),
            meta: { title: "Vouchers | Admin SUMILIR" },
          },
          {
            path: "create",
            name: "Admin - Create Voucher",
            component: () => import("@/views/admin/vouchers/Create.vue"),
            meta: { title: "Tambah Voucher | Admin SUMILIR" },
          },
          {
            path: ":id",
            name: "Admin - Voucher Detail",
            component: () => import("@/views/admin/vouchers/Detail.vue"),
            meta: {
              requiresAuth: true,
              requiresAdmin: true,
            },
          },
        ],
      },

      // REPORTS
      {
        path: "reports",
        name: "Admin - Reports",
        component: () => import("@/views/admin/reports/Index.vue"),
        meta: { title: "Reports | Admin SUMILIR" },
      },
      {
        path: "reports/:id",
        name: "Admin - Report Detail",
        component: () => import("@/views/admin/reports/Detail.vue"),
        meta: { title: "Report Detail | Admin SUMILIR" },
      },

      // SETTINGS
      {
        path: "settings",
        name: "Admin - Settings",
        component: () => import("@/views/admin/settings/Index.vue"),
        meta: { title: "Platform Settings | Admin SUMILIR" },
      },

      // REFUNDS
      {
        path: "refunds",
        name: "Admin - Refunds",
        component: () => import("@/views/admin/refunds/Index.vue"),
        meta: { title: "Refund Management | Admin SUMILIR" },
      },
    ],
  },

  // ===========================
  // Halaman Merchant Center (UMKM Owner)
  // ===========================
  {
    path: "/merchant-center/:merchantSlug",
    component: () => import("@/layouts/MerchantLayout.vue"),
    meta: {
      requiresAuth: true,
      roles: ["umkm-owner"],
      requiresMerchantSlug: true,
    },
    children: [
      {
        path: "",
        redirect: (to) => ({
          name: "Merchant - Dashboard",
          params: { merchantSlug: to.params.merchantSlug },
        }),
      },
      {
        path: "dashboard",
        name: "Merchant - Dashboard",
        component: () => import("@/views/merchant/dashboard/Index.vue"),
        meta: {
          title: "Dashboard UMKM | SUMILIR",
        },
      },

      // ===========================
      // PRODUK UMKM TOKO/KULINER
      // ===========================
      {
        path: "products",
        children: [
          {
            path: "",
            name: "Merchant - Product UMKM",
            component: () => import("@/views/merchant/products/Index.vue"),
            meta: { title: "Produk UMKM | SUMILIR" },
          },
          {
            path: "create",
            name: "Merchant - Buat Product",
            component: () => import("@/views/merchant/products/Create.vue"),
            meta: {
              title: "Buat Produk UMKM | SUMILIR",
            },
          },
          {
            path: ":slug",
            name: "Merchant - Product Detail",
            component: () => import("@/views/merchant/products/Detail.vue"),
            meta: {
              title: "Detail Produk UMKM | SUMILIR",
            },
          },
          {
            path: ":slug/edit",
            name: "Merchant - Product Edit",
            component: () => import("@/views/merchant/products/Edit.vue"),
            meta: {
              title: "Edit Produk UMKM | SUMILIR",
            },
          },
        ],
      },

      // ===========================
      // ✅ JASA (UMKM JASA)
      // ===========================
      {
        path: "jasas",
        name: "Merchant - Jasa Index",
        component: () => import("@/views/merchant/productsjasa/Indexjasa.vue"),
        meta: { title: "Jasa UMKM | SUMILIR" },
      },
      // Handle /jasas/index agar tidak dianggap sebagai :id = "index"
      {
        path: "jasas/index",
        redirect: (to) => ({
          name: "Merchant - Jasa Index",
          params: { merchantSlug: to.params.merchantSlug },
        }),
      },
      {
        path: "jasas/create",
        name: "Merchant - Jasa Create",
        component: () => import("@/views/merchant/productsjasa/Createjasa.vue"),
        meta: { title: "Buat Jasa UMKM | SUMILIR" },
      },
      {
        path: "jasas/createjasa",
        component: () => import("@/views/merchant/productsjasa/Createjasa.vue"),
        meta: { title: "Buat Jasa UMKM | SUMILIR" },
      },
      {
        path: "jasas/:id",
        name: "Merchant - Jasa Detail",
        component: () => import("@/views/merchant/productsjasa/Detailjasa.vue"),
        meta: { title: "Detail Jasa UMKM | SUMILIR" },
      },
      {
        path: "jasas/:id/edit",
        name: "Merchant - Jasa Edit",
        component: () => import("@/views/merchant/productsjasa/Editjasa.vue"),
        meta: { title: "Edit Jasa UMKM | SUMILIR" },
      },

      // ===========================
      // BOOKING MANAGEMENT
      // ===========================
      {
        path: "bookings",
        name: "Merchant - Booking Management",
        component: () => import("@/views/merchant/service/MerchantServiceHistory.vue"),
        meta: { title: "History Layanan Jasa | SUMILIR" },
      },

      // ===========================
      // 🆕 KONSULTASI (UMKM JASA)
      // ===========================
      {
        path: "consultations",
        name: "Merchant Konsultasi",
        component: () => import("@/views/merchant/consultation/MerchantConsultations.vue"),
        meta: { title: "Konsultasi | SUMILIR" },
      },
      {
        path: "consultations/:id",
        name: "Merchant Konsultasi Detail",
        component: () => import("@/views/merchant/consultation/MerchantConsultationDetail.vue"),
        meta: { title: "Detail Konsultasi | SUMILIR" },
      },

      // ===========================
      // BACKWARD COMPATIBILITY: productsjasa routes
      // ===========================
      {
        path: "productsjasa",
        redirect: (to) => ({
          name: "Merchant - Jasa Index",
          params: { merchantSlug: to.params.merchantSlug },
        }),
      },
      {
        path: "productsjasa/create",
        redirect: (to) => ({
          name: "Merchant - Jasa Create",
          params: { merchantSlug: to.params.merchantSlug },
        }),
      },
      {
        path: "productsjasa/createjasa",
        redirect: (to) => ({
          name: "Merchant - Jasa Create",
          params: { merchantSlug: to.params.merchantSlug },
        }),
      },
      {
        path: "productsjasa/:id",
        redirect: (to) => ({
          name: "Merchant - Jasa Detail",
          params: { merchantSlug: to.params.merchantSlug, id: to.params.id },
        }),
      },
      {
        path: "productsjasa/:id/edit",
        redirect: (to) => ({
          name: "Merchant - Jasa Edit",
          params: { merchantSlug: to.params.merchantSlug, id: to.params.id },
        }),
      },

      // ===========================
      // VOUCHERS
      // ===========================
      {
        path: "vouchers",
        children: [
          {
            path: "",
            name: "Merchant - Voucher",
            component: () => import("@/views/merchant/vouchers/Index.vue"),
            meta: {
              title: "Voucher",
            },
          },
          {
            path: "create",
            name: "Merchant - Buat Voucher",
            component: () => import("@/views/merchant/vouchers/Create.vue"),
            meta: {
              title: "Buat Voucher UMKM",
            },
          },
          {
            path: ":id/edit",
            name: "Merchant - Voucher Edit",
            component: () => import("@/views/merchant/vouchers/Edit.vue"),
            meta: {
              title: "Edit Voucher UMKM",
            },
          },
        ],
      },

      // {
      //   path: "events",
      //   name: "Merchant - Events",
      //   component: () => import("@/views/merchant/events/Index.vue"),
      //   meta: {
      //     title: "Events",
      //   },
      // },

      {
        path: "orders",
        children: [
          {
            path: "",
            name: "Merchant - Orders",
            component: () => import("@/views/merchant/orders/Index.vue"),
            meta: {
              title: "Orders",
            },
          },
          {
            path: ":orderId",
            name: "Merchant - Order Detail",
            component: () => import("@/views/merchant/orders/Detail.vue"),
            meta: {
              title: "Order Detail",
            },
          },
        ],
      },

      {
        path: "reports",
        name: "Merchant - Reports",
        component: () => import("@/views/merchant/reports/Index.vue"),
        meta: {
          title: "Laporan UMKM | SUMILIR",
        },
      },

      // ===========================
      // Profil UMKM
      // ===========================
      // ===========================
      // ✅ EVENTS (UNDANGAN & MANAJEMEN)
      // ===========================
      {
        path: "events",
        children: [
          {
            path: "",
            name: "Merchant - Event Index",
            component: () => import("@/views/merchant/events/EventIndex.vue"),
            meta: { title: "Daftar Event & Undangan | SUMILIR" },
          },
          {
            path: ":id",
            name: "Merchant - Event Detail",
            component: () => import("@/views/merchant/events/EventDetail.vue"),
            meta: { title: "Manajemen Event | SUMILIR" },
          }
        ]
      },

      {
        path: "profile",
        children: [
          {
            path: "",
            name: "Merchant - Profile",
            component: () =>
              import("@/views/merchant/profile/MerchantInfo.vue"),
            meta: {
              title: "Profil UMKM | SUMILIR",
            },
          },
          {
            path: "edit",
            name: "Merchant - Profile Edit",
            component: () =>
              import("@/views/merchant/profile/MerchantEdit.vue"),
            meta: {
              title: "Edit Profil UMKM | SUMILIR",
            },
          },
        ],
      },
    ],
  },

  // Fallback — uses beforeEnter so /backend/ paths are NOT redirected to "/".
  // The inline <head> script sets window.__BACKEND_REDIRECT and handles hard-nav.
  {
    path: "/:pathMatch(.*)*",
    beforeEnter: (to, from, next) => {
      if (window.__BACKEND_REDIRECT || to.path.startsWith("/backend/")) {
        // Abort Vue navigation — the inline script handles the redirect.
        return;
      }
      next("/");
    },
    component: { render: () => null },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,

  scrollBehavior(to, from, savedPosition) {
    // ⬅️ untuk back/forward browser
    if (savedPosition) {
      return savedPosition;
    }

    // ⬅️ default: selalu ke atas
    return {
      top: 0,
      left: 0,
      behavior: "smooth", // opsional
    };
  },

  scrollBehavior(to, from, savedPosition) {
    // ⬅️ untuk back/forward browser
    if (savedPosition) {
      return savedPosition;
    }

    // ⬅️ default: selalu ke atas
    return {
      top: 0,
      left: 0,
      behavior: "smooth", // opsional
    };
  },
});

// Track navigation to prevent excessive calls
let lastNavigationPath = null;
let authInitialized = false;

router.beforeEach(async (to, from, next) => {
  // Backend API routes should NEVER be handled by Vue.
  // If the Service Worker served index.html for a /backend/ URL,
  // force a full-page navigation so the server handles it.
  if (to.path.startsWith("/backend/")) {
    window.location.href = to.fullPath;
    return;
  }

  const authStore = useAuthStore();
  // Basic SEO for all routes (can be overridden by page-level dynamic SEO)
  try {
    const { setMeta } = await import("@/router/seo");
    setMeta({
      title: to.meta.title || "SUMILIR",
      description: to.meta.description || "",
    });
  } catch (e) {
    document.title = to.meta.title || "SUMILIR";
  }

  if (!authInitialized) {
    authInitialized = true;
    await authStore.initAuth();
  }

  // ✅ ADD: Skip if navigating to same path
  if (to.path === lastNavigationPath) {
    next();
    return;
  }

  lastNavigationPath = to.path;

  // ✅ 1. Jika route butuh auth tapi user belum login
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    authStore.requireLoginToast();

    return next({
      path: "/login",
      query: { redirect: to.fullPath }, // optional tapi recommended
    });
  }

  // 2. Deny specific roles (even if other role checks would pass)
  const denyRoles = to.meta.denyRoles || [];
  if (denyRoles.length && authStore.isAuthenticated) {
    const userRoles = (authStore.user?.roles || [])
      .map((r) => (typeof r === "string" ? r : r.name))
      .filter(Boolean)
      .map((r) => r.toLowerCase());

    const isDenied = denyRoles.some((role) =>
      userRoles.includes(String(role).toLowerCase()),
    );

    if (isDenied) {
      return next("/");
    }
  }

  // 3. halaman guest tapi user sudah login
  // 3. halaman guest tapi user sudah login
  if (to.meta.guest && authStore.isAuthenticated) {
    const userRoles = (authStore.user?.roles || [])
      .map((r) => (typeof r === "string" ? r : r.name))
      .filter(Boolean)
      .map((r) => r.toLowerCase());

    if (userRoles.includes("admin") || userRoles.includes("umkm-owner")) {
      const merchant = authStore.activeMerchant;

      if (merchant) {
        return next(`/merchant-center/${merchant.slug}`);
      }
      return next("/");
    } else if (userRoles.includes("customer")) {
      return next("/");
    } else {
      return next("/");
    }
  }

  // 4. Role-based access control
  // 4. Role-based access control
  const requiredRoles = to.meta.roles || [];
  if (requiredRoles.length && authStore.isAuthenticated) {
    const userRoles = (authStore.user?.roles || [])
      .map((r) => (typeof r === "string" ? r : r.name))
      .filter(Boolean)
      .map((r) => r.toLowerCase());

    const hasRequiredRole = requiredRoles.some((requiredRole) =>
      userRoles.includes(requiredRole.toLowerCase()),
    );

    if (!hasRequiredRole) {
      return next("/");
    }
  }

  // Require approved merchant untuk /merchant-center
  // Require approved merchant untuk /merchant-center
  if (to.path.startsWith("/merchant-center")) {
    const merchantSlugParam = to.params.merchantSlug
      ? String(to.params.merchantSlug)
      : null;

    if (!merchantSlugParam) {
      return next("/merchant-register");
    }

    const merchant = authStore.getMerchantBySlug(merchantSlugParam);

    if (!merchant) {
      return next("/merchant-register");
    }

    if (merchant.status !== "approved") {
      return next("/merchant-register");
    }
  }

  next();
});

export default router;
