<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import Button from "@/components/common/Button.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useReports } from "@/composables/useReports";
import { getImageUrl, getCommunityImageUrl, getMerchantLogoUrl, getImageUrlJasa, getUserProfileUrl } from "@/libs/getImageUrl";

const router = useRouter();
const route = useRoute();
const toast = useToast();

const { fetchReportDetail, reviewReport, takeAction, fetchAppeals, reviewAppeal, loading, exportReportDetailPdf } = useReports();

const report = ref(null);
const appeals = ref([]);

// Modals state
const showResolveModal = ref(false);
const showDismissModal = ref(false);
const showActionModal = ref(false);
const showAppealModal = ref(false);

const adminNote = ref("");
const selectedAction = ref("");
const actionReason = ref("");
const selectedAppeal = ref(null);
const appealStatus = ref("");
const appealResponse = ref("");
const appealValidationErrors = ref({});

const breadcrumbItems = computed(() => [
  { label: "Laporan", path: { name: "Admin - Reports" } },
  { label: `Report #${route.params.id}` },
]);

const normalizeReportableType = (type) => {
  if (!type) return type;
  const raw = type.split("\\").pop();
  const lower = raw.toLowerCase();
  if (lower === "communitypost") return "post";
  if (lower === "postcomment") return "post_comment";
  if (lower === "jasa") return "service";
  return lower;
};

const getContentTypeLabel = (type) => {
  const types = {
    product: "Produk",
    service: "Jasa",
    merchant: "UMKM",
    post: "Postingan Komunitas",
    post_comment: "Komentar",
    user: "Pengguna",
  };
  return types[normalizeReportableType(type)] || type;
};

const getStatusConfig = (status) => {
  const config = {
    pending:   { label: "Menunggu",          icon: "pi pi-clock",             bg: "bg-yellow-50",   text: "text-yellow-700",  border: "border-yellow-200" },
    in_review: { label: "Dalam Peninjauan",  icon: "pi pi-search",            bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200" },
    resolved:  { label: "Terselesaikan",     icon: "pi pi-check-circle",      bg: "bg-green-50",    text: "text-green-700",   border: "border-green-200" },
    dismissed: { label: "Ditolak",           icon: "pi pi-times-circle",      bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200" },
  };
  return config[status] || { label: status, icon: "pi pi-info-circle", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
};

const normalizedType = computed(() => normalizeReportableType(report.value?.reportable_type));
const statusConfig = computed(() => getStatusConfig(report.value?.status));

// Available actions based on type
const availableActions = computed(() => {
  if (!normalizedType.value) return [];
  const genericWarning = { value: 'send_warning', label: 'Peringatan Pelanggaran', icon: 'pi pi-envelope', color: 'text-blue-600' };

  switch (normalizedType.value) {
    case 'user': return [
      genericWarning,
      { value: 'warn_user', label: 'Beri Peringatan Akun', icon: 'pi pi-exclamation-triangle', color: 'text-yellow-600' },
      { value: 'suspend_user', label: 'Suspend Akun', icon: 'pi pi-lock', color: 'text-orange-600' },
      { value: 'deactivate_user', label: 'Nonaktifkan Akun', icon: 'pi pi-times-circle', color: 'text-red-600' },
    ];
    case 'merchant': return [
      genericWarning,
      { value: 'warn_merchant', label: 'Beri Peringatan UMKM', icon: 'pi pi-exclamation-triangle', color: 'text-yellow-600' },
      { value: 'suspend_merchant', label: 'Suspend UMKM', icon: 'pi pi-lock', color: 'text-orange-600' },
      { value: 'archive_merchant', label: 'Arsipkan UMKM', icon: 'pi pi-box', color: 'text-red-600' },
    ];
    case 'product': return [
      genericWarning,
      { value: 'archive_product', label: 'Arsipkan Produk', icon: 'pi pi-eye-slash', color: 'text-red-600' },
    ];
    case 'service': return [
      genericWarning,
      { value: 'archive_service', label: 'Arsipkan Jasa', icon: 'pi pi-eye-slash', color: 'text-red-600' },
    ];
    case 'post': return [
      genericWarning,
      { value: 'delete_post', label: 'Hapus Postingan', icon: 'pi pi-trash', color: 'text-red-600' },
    ];
    case 'post_comment': return [
      genericWarning,
      { value: 'delete_comment', label: 'Hapus Komentar', icon: 'pi pi-trash', color: 'text-red-600' },
    ];
    default: return [];
  }
});

const loadReport = async () => {
  try {
    const data = await fetchReportDetail(route.params.id);
    report.value = data;
    if (data.id) {
      appeals.value = await fetchAppeals(data.id);
    }
  } catch (error) {
    console.error("Failed to load report:", error);
    router.push({ name: "Admin - Reports" });
  }
};

const confirmResolve = () => { adminNote.value = ""; showResolveModal.value = true; };
const confirmDismiss = () => { adminNote.value = ""; showDismissModal.value = true; };

const openActionModal = (actionValue) => {
  selectedAction.value = actionValue;
  
  const actionLabel = getActionLabel(actionValue);
  const contentType = getContentTypeLabel(report.value?.reportable_type);
  const reasonTitle = report.value?.reason?.reason_title || 'Melanggar ketentuan layanan';
  
  actionReason.value = `Tindakan ${actionLabel} diambil terhadap ${contentType} karena terdeteksi: ${reasonTitle}.`;
  showActionModal.value = true;
};

const openAppealModal = (appeal, status) => {
  selectedAppeal.value = appeal;
  appealStatus.value = status;
  appealValidationErrors.value = {};
  
  if (status === 'accepted') {
    appealResponse.value = "Sanggahan Anda telah kami terima dan disetujui. Tindakan moderasi akan segera disesuaikan atau dicabut.";
  } else {
    appealResponse.value = "";
  }
  showAppealModal.value = true;
};

const handleResolve = async () => {
  try {
    await reviewReport(report.value.id, {
      status: "resolved",
      admin_note: adminNote.value || "Laporan telah ditindaklanjuti",
    });
    showResolveModal.value = false;
    await loadReport();
  } catch (error) {}
};

const handleDismiss = async () => {
  if (!adminNote.value.trim()) {
    toast.warning("Catatan admin wajib diisi untuk dismiss");
    return;
  }
  try {
    await reviewReport(report.value.id, {
      status: "dismissed",
      admin_note: adminNote.value,
    });
    showDismissModal.value = false;
    await loadReport();
  } catch (error) {}
};

const handleAction = async () => {
  if (!actionReason.value.trim()) {
    toast.warning("Alasan tindakan wajib diisi");
    return;
  }
  try {
    await takeAction(report.value.id, selectedAction.value, actionReason.value);
    showActionModal.value = false;
    await loadReport();
  } catch (error) {}
};

const handleAppealReview = async () => {
  appealValidationErrors.value = {};
  
  try {
    await reviewAppeal(report.value.id, selectedAppeal.value.id, appealStatus.value, appealResponse.value);
    showAppealModal.value = false;
    await loadReport();
  } catch (error) {
    if (error.response?.status === 422 && error.response?.data?.errors) {
      appealValidationErrors.value = error.response.data.errors;
    }
  }
};

const handleInReview = async () => {
  try {
    await reviewReport(report.value.id, { status: "in_review" });
    await loadReport();
  } catch (error) {}
};

const goBack = () => router.push({ name: "Admin - Reports" });

const goToReporter = () => {
  if (report.value?.reporter?.id) {
    router.push({ name: 'Admin - Customer Detail', params: { id: report.value.reporter.id } });
  }
};

const openReportedContent = () => {
  if (!report.value?.reportable) return;
  const type = normalizedType.value;
  let routeData;
  if (type === 'product') {
    routeData = router.resolve({ name: 'Product Detail', params: { slug: report.value.reportable.slug } });
  } else if (type === 'service') {
    routeData = router.resolve({ name: 'JasaDetail', params: { slug: report.value.reportable.slug } });
  } else if (type === 'merchant') {
    routeData = router.resolve({ name: 'Merchant Detail', params: { slug: report.value.reportable.slug } });
  } else if (type === 'user') {
    routeData = router.resolve({ name: 'Admin - Customer Detail', params: { id: report.value.reportable.id } });
  } else if (type === 'post' || type === 'post_comment') {
    const slug = type === 'post' ? report.value.reportable.community?.slug : report.value.reportable.post?.community?.slug;
    if (slug) {
      routeData = router.resolve({ name: 'community-detail', params: { slug: slug } });
    }
  }
  
  if (routeData) {
    window.open(routeData.href, '_blank');
  }
};

const formatDate = (d) => d ? new Date(d).toLocaleString("id-ID", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
}) : "-";

const getActionLabel = (actionType) => {
  const map = {
    'send_warning': 'Kirim Peringatan Pelanggaran',
    'warn_user': 'Peringatan Pengguna',
    'suspend_user': 'Suspend Pengguna',
    'deactivate_user': 'Nonaktifkan Pengguna',
    'warn_merchant': 'Peringatan UMKM',
    'suspend_merchant': 'Suspend UMKM',
    'archive_merchant': 'Arsipkan UMKM',
    'archive_product': 'Arsipkan Produk',
    'archive_service': 'Arsipkan Jasa',
    'delete_post': 'Hapus Postingan',
    'delete_comment': 'Hapus Komentar',
  };
  return map[actionType] || actionType;
};

onMounted(() => { loadReport(); });
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Sticky Header -->
    <div class="fixed sm:static top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-20 px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="min-w-0">
          <Breadcrumb :items="breadcrumbItems" />
          <p class="text-xs sm:text-sm text-muted-foreground mt-1">Detail laporan konten yang masuk</p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Export -->
          <Button v-if="report" @click="exportReportDetailPdf(report.id)" variant="merchant-outline" size="sm" customClass="!hidden sm:!inline">
            <i class="pi pi-download"></i>
            <span class="ml-2">Export PDF</span>
          </Button>
          <Button v-if="report" @click="exportReportDetailPdf(report.id)" variant="merchant-outline" size="md" customClass="sm:!hidden">
            <i class="pi pi-download"></i>
          </Button>

          <!-- In Review -->
          <Button
            v-if="report?.status === 'pending'"
            @click="handleInReview"
            variant="warning"
            size="sm"
            :disabled="loading"
            customClass="!hidden sm:!inline"
          >
            <i class="pi pi-clock mr-1"></i> In Review
          </Button>

          <!-- Resolve -->
          <Button
            v-if="['pending', 'in_review'].includes(report?.status) && !report?.action_taken"
            @click="confirmResolve"
            variant="success"
            size="sm"
            customClass="!hidden sm:!inline"
          >
            <i class="pi pi-check mr-1"></i> Resolve
          </Button>

          <!-- Dismiss -->
          <Button
            v-if="['pending', 'in_review'].includes(report?.status)"
            @click="confirmDismiss"
            variant="danger"
            size="sm"
            customClass="!hidden sm:!inline"
          >
            <i class="pi pi-times mr-1"></i> Dismiss
          </Button>

          <!-- Back -->
          <Button @click="goBack" variant="secondary" size="sm">
            <i class="pi pi-arrow-left sm:mr-1"></i>
            <span class="hidden sm:inline">Kembali</span>
          </Button>
        </div>
      </div>
    </div>

    <div class="h-[92px] sm:h-0"></div>

    <!-- Loading -->
    <div v-if="loading && !report" class="flex items-center justify-center py-24">
      <div class="text-center">
        <i class="pi pi-spin pi-spinner text-5xl text-primary mb-4"></i>
        <p class="text-gray-500 text-sm">Memuat data laporan...</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="report" class="px-4 sm:px-6 py-6">
      <div class="max-w-5xl mx-auto space-y-5">

        <!-- ═══ STATUS BANNER ═══ -->
        <div :class="[statusConfig.bg, statusConfig.border, statusConfig.text, 'border rounded-xl px-5 py-4 flex items-center gap-3']">
          <i :class="[statusConfig.icon, 'text-xl']"></i>
          <div class="flex-1">
            <p class="font-semibold text-sm">Status: {{ statusConfig.label }}</p>
            <p class="text-xs opacity-75 mt-0.5">
              Laporan #{{ report.id }} · Dilaporkan {{ formatDate(report.created_at) }}
            </p>
            <p v-if="report.action_taken" class="text-xs font-bold mt-1 bg-white/50 inline-block px-2 py-0.5 rounded">
              Tindakan: {{ getActionLabel(report.action_taken) }}
            </p>
          </div>
        </div>

        <!-- ═══ MAIN GRID ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <!-- LEFT: Report Info (2/3) -->
          <div class="lg:col-span-2 space-y-5">

            <!-- Informasi Laporan -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <i class="pi pi-flag text-primary"></i>
                <h2 class="font-semibold text-gray-900">Informasi Laporan</h2>
              </div>
              <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Tipe Konten</p>
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                    <i class="pi pi-tag text-xs"></i>
                    {{ getContentTypeLabel(report.reportable_type) }}
                  </span>
                </div>
                <div>
                  <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Alasan Laporan</p>
                  <p class="text-sm font-semibold text-gray-800">{{ report.reason?.reason_title || "-" }}</p>
                  <p v-if="report.reason?.reason_description" class="text-xs text-gray-500 mt-1">
                    {{ report.reason.reason_description }}
                  </p>
                </div>
              </div>
              <div v-if="report.report_comment" class="px-6 pb-6">
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Keterangan Pelapor</p>
                <div class="bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <p class="text-sm text-gray-700 leading-relaxed">{{ report.report_comment }}</p>
                </div>
              </div>
            </div>

            <!-- Konten yang Dilaporkan -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:border-primary transition-colors group" @click="openReportedContent">
              <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="pi pi-eye text-primary"></i>
                  <h2 class="font-semibold text-gray-900 group-hover:text-primary transition-colors">Konten yang Dilaporkan</h2>
                </div>
                <i class="pi pi-external-link text-gray-400 group-hover:text-primary transition-colors text-xs"></i>
              </div>
              <div class="p-6">

                <!-- Product -->
                <div v-if="normalizedType === 'product' && report.reportable" class="flex gap-4">
                  <template v-if="getImageUrl(report.reportable.images?.[0]?.id)">
                    <img
                      :src="getImageUrl(report.reportable.images?.[0]?.id)"
                      alt="Product"
                      @error="e => e.target.style.display = 'none'"
                      class="w-20 h-20 object-cover rounded-xl flex-shrink-0 border border-gray-100"
                    />
                  </template>
                  <div v-else class="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <i class="pi pi-image text-2xl text-gray-300"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-900 text-base truncate">{{ report.reportable.name }}</h3>
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ report.reportable.description || "-" }}</p>
                    <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span><i class="pi pi-shop mr-1"></i>{{ report.reportable.merchant?.name || "-" }}</span>
                    </div>
                  </div>
                </div>

                <!-- Post -->
                <div v-else-if="normalizedType === 'post' && report.reportable">
                  <div class="flex items-center gap-3 mb-4">
                    <template v-if="report.reportable.user?.profile_picture_path">
                      <img
                        :src="getUserProfileUrl(report.reportable.user)"
                        alt="User"
                        @error="e => e.target.style.display = 'none'"
                        class="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    </template>
                    <div v-else class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                      <i class="pi pi-user text-gray-400"></i>
                    </div>
                    <div>
                      <p class="font-semibold text-sm text-gray-900">{{ report.reportable.user?.name || "-" }}</p>
                      <p class="text-xs text-gray-400">{{ formatDate(report.reportable.created_at) }}</p>
                    </div>
                  </div>
                  <p v-if="report.reportable.post_title" class="font-semibold text-gray-900 mb-2">{{ report.reportable.post_title }}</p>
                  <p class="text-sm text-gray-600 leading-relaxed line-clamp-4">{{ report.reportable.post_content }}</p>
                  <div v-if="report.reportable.images?.length" class="grid grid-cols-3 gap-2 mt-4">
                    <template v-for="(img, idx) in report.reportable.images.slice(0, 3)" :key="idx">
                      <img
                        v-if="getCommunityImageUrl(img.id)"
                        :src="getCommunityImageUrl(img.id)"
                        @error="e => e.target.style.display = 'none'"
                        alt="Post image"
                        class="w-full h-24 object-cover rounded-lg"
                      />
                      <div v-else class="w-full h-24 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-100">
                        <i class="pi pi-image text-2xl text-gray-300"></i>
                      </div>
                    </template>
                  </div>
                </div>

                <!-- Comment -->
                <div v-else-if="normalizedType === 'post_comment' && report.reportable">
                  <div class="flex items-start gap-3">
                    <template v-if="report.reportable.user?.profile_picture_path">
                      <img
                        :src="getUserProfileUrl(report.reportable.user)"
                        alt="User"
                        @error="e => e.target.style.display = 'none'"
                        class="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0 mt-0.5"
                      />
                    </template>
                    <div v-else class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0 mt-0.5">
                      <i class="pi pi-user text-sm text-gray-400"></i>
                    </div>
                    <div class="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p class="font-semibold text-sm text-gray-900">{{ report.reportable.user?.name || "-" }}</p>
                      <p class="text-xs text-gray-400 mb-2">{{ formatDate(report.reportable.created_at) }}</p>
                      <p class="text-sm text-gray-700 leading-relaxed">{{ report.reportable.comment_content }}</p>
                    </div>
                  </div>
                </div>

                <!-- Merchant -->
                <div v-else-if="normalizedType === 'merchant' && report.reportable" class="flex gap-4">
                  <template v-if="getMerchantLogoUrl(report.reportable)">
                    <img
                      :src="getMerchantLogoUrl(report.reportable)"
                      alt="Merchant"
                      @error="e => e.target.style.display = 'none'"
                      class="w-20 h-20 object-cover rounded-xl flex-shrink-0 border border-gray-100"
                    />
                  </template>
                  <div v-else class="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <i class="pi pi-shop text-2xl text-gray-300"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-900 text-base">{{ report.reportable.name }}</h3>
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ report.reportable.description }}</p>
                    <p class="text-xs text-gray-400 mt-2"><i class="pi pi-user mr-1"></i>{{ report.reportable.user?.name || "-" }}</p>
                  </div>
                </div>

                <!-- Service -->
                <div v-else-if="normalizedType === 'service' && report.reportable" class="flex gap-4">
                  <template v-if="getImageUrlJasa(report.reportable.images?.[0]?.id || report.reportable.image)">
                    <img
                      :src="getImageUrlJasa(report.reportable.images?.[0]?.id || report.reportable.image)"
                      alt="Service"
                      @error="e => e.target.style.display = 'none'"
                      class="w-20 h-20 object-cover rounded-xl flex-shrink-0 border border-gray-100"
                    />
                  </template>
                  <div v-else class="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <i class="pi pi-image text-2xl text-gray-300"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-900 text-base">{{ report.reportable.title }}</h3>
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ report.reportable.description || "-" }}</p>
                    <p v-if="report.reportable.price || report.reportable.base_price" class="text-sm font-bold text-primary mt-2">
                      Rp {{ Number(report.reportable.price || report.reportable.base_price).toLocaleString("id-ID") }}
                    </p>
                  </div>
                </div>

                <!-- Fallback -->
                <div v-else class="text-center py-10">
                  <i class="pi pi-exclamation-circle text-4xl text-gray-300 mb-3"></i>
                  <p class="text-sm text-gray-400">Konten tidak ditemukan atau telah dihapus</p>
                </div>
              </div>
            </div>

            <!-- Sanggahan / Appeals -->
            <div v-if="appeals.length > 0" class="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
              <div class="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <i class="pi pi-envelope text-blue-600"></i>
                <h2 class="font-semibold text-blue-900">Sanggahan dari Terlapor</h2>
              </div>
              <div class="p-6 space-y-4">
                <div v-for="appeal in appeals" :key="appeal.id" class="border rounded-lg p-4 bg-gray-50">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <p class="font-semibold text-sm">{{ appeal.appellant?.name }}</p>
                      <p class="text-xs text-gray-500">{{ formatDate(appeal.created_at) }}</p>
                    </div>
                    <span class="px-2 py-1 text-xs font-bold rounded-full" :class="{
                      'bg-yellow-100 text-yellow-700': appeal.status === 'pending',
                      'bg-green-100 text-green-700': appeal.status === 'accepted',
                      'bg-red-100 text-red-700': appeal.status === 'rejected',
                      'bg-blue-100 text-blue-700': appeal.status === 'reviewed',
                    }">
                      {{ appeal.status.toUpperCase() }}
                    </span>
                  </div>
                  <div class="bg-white border rounded p-3 text-sm text-gray-700 italic">
                    "{{ appeal.appeal_text }}"
                  </div>
                  
                  <div v-if="appeal.status === 'pending'" class="mt-4 flex gap-2 justify-end border-t pt-4">
                    <Button @click="openAppealModal(appeal, 'accepted')" variant="success" size="sm">
                      <i class="pi pi-check mr-1"></i> Terima Sanggahan
                    </Button>
                    <Button @click="openAppealModal(appeal, 'rejected')" variant="danger" size="sm">
                      <i class="pi pi-times mr-1"></i> Tolak Sanggahan
                    </Button>
                  </div>

                  <div v-else-if="appeal.admin_response" class="mt-4 bg-blue-50 p-3 rounded border border-blue-100">
                    <p class="text-xs font-bold text-blue-800 mb-1">Respons Admin:</p>
                    <p class="text-sm text-blue-900">{{ appeal.admin_response }}</p>
                    <p class="text-xs text-blue-500 mt-1">Oleh: {{ appeal.respondent?.name }} ({{ formatDate(appeal.responded_at) }})</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- RIGHT: Sidebar (1/3) -->
          <div class="space-y-5">
            
            <!-- Aksi Moderasi -->
            <div v-if="!report.action_taken && availableActions.length > 0 && ['pending', 'in_review'].includes(report.status)" class="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <i class="pi pi-shield text-red-600"></i>
                <h3 class="font-semibold text-red-900 text-sm">Aksi Moderasi</h3>
              </div>
              <div class="p-5 space-y-3">
                <button
                  v-for="action in availableActions"
                  :key="action.value"
                  @click="openActionModal(action.value)"
                  class="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors text-left"
                >
                  <div class="flex items-center gap-3">
                    <i :class="[action.icon, action.color]"></i>
                    <span class="text-sm font-medium text-gray-800">{{ action.label }}</span>
                  </div>
                  <i class="pi pi-chevron-right text-xs text-gray-400"></i>
                </button>
              </div>
            </div>

            <!-- Pelapor -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:border-primary transition-colors group" @click="goToReporter">
              <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="pi pi-user text-primary"></i>
                  <h3 class="font-semibold text-gray-900 text-sm group-hover:text-primary transition-colors">Data Pelapor</h3>
                </div>
                <i class="pi pi-external-link text-gray-400 group-hover:text-primary transition-colors text-xs"></i>
              </div>
              <div class="p-5 space-y-3">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Nama</p>
                  <p class="text-sm font-medium text-gray-800">{{ report.reporter?.name || "-" }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Email</p>
                  <p class="text-sm text-gray-600 break-all">{{ report.reporter?.email || "-" }}</p>
                </div>
              </div>
            </div>

            <!-- Riwayat Review -->
            <div v-if="report.reviewer || report.admin_note || report.reviewed_at" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <i class="pi pi-history text-primary"></i>
                <h3 class="font-semibold text-gray-900 text-sm">Riwayat Peninjauan</h3>
              </div>
              <div class="p-5 space-y-3">
                <div v-if="report.reviewer">
                  <p class="text-xs text-gray-400 mb-0.5">Direview oleh</p>
                  <p class="text-sm font-medium text-gray-800">{{ report.reviewer.name }}</p>
                </div>
                <div v-if="report.reviewed_at">
                  <p class="text-xs text-gray-400 mb-0.5">Tanggal Review</p>
                  <p class="text-sm text-gray-600">{{ formatDate(report.reviewed_at) }}</p>
                </div>
                <div v-if="report.admin_note">
                  <p class="text-xs text-gray-400 mb-1">Catatan Admin</p>
                  <div class="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p class="text-sm text-blue-700 leading-relaxed">{{ report.admin_note }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Metadata -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <i class="pi pi-info-circle text-primary"></i>
                <h3 class="font-semibold text-gray-900 text-sm">Metadata</h3>
              </div>
              <div class="p-5 space-y-3">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">ID Laporan</p>
                  <p class="text-sm font-mono text-gray-700">#{{ report.id }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Dilaporkan</p>
                  <p class="text-sm text-gray-600">{{ formatDate(report.created_at) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Terakhir Diperbarui</p>
                  <p class="text-sm text-gray-600">{{ formatDate(report.updated_at) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Take Action Modal -->
    <ResponsiveModal :show="showActionModal" @close="showActionModal = false" title="Tindakan Moderasi">
      <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
        <i class="pi pi-exclamation-triangle text-red-600 text-xl"></i>
        <div>
          <p class="text-sm font-bold text-red-800">Tindakan: {{ getActionLabel(selectedAction) }}</p>
          <p class="text-xs text-red-600">Aksi ini akan memberi notifikasi ke terlapor dan mengubah status laporan menjadi "Terselesaikan".</p>
        </div>
      </div>
      <div class="mb-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Alasan & Catatan Tindakan <span class="text-red-500">*</span></label>
        <textarea
          v-model="actionReason"
          rows="3"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
          placeholder="Berikan alasan mengapa tindakan ini diambil..."
        />
      </div>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showActionModal = false" variant="secondary">Batal</Button>
          <Button @click="handleAction" variant="danger" :disabled="loading || !actionReason.trim()">
            <i class="pi pi-check mr-2"></i>
            {{ loading ? "Memproses..." : "Konfirmasi Tindakan" }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Review Appeal Modal -->
    <ResponsiveModal :show="showAppealModal" @close="showAppealModal = false" :title="appealStatus === 'accepted' ? 'Terima Sanggahan' : 'Tolak Sanggahan'">
      <p class="text-sm text-gray-600 mb-4">
        Berikan tanggapan kepada pengguna mengenai keputusan sanggahan ini.
      </p>
      <div class="mb-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Tanggapan Admin <span class="text-red-500">*</span></label>
        <textarea
          v-model="appealResponse"
          rows="4"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary text-sm"
          :class="appealValidationErrors?.admin_response ? 'border-red-500' : 'border-gray-300'"
          placeholder="Tuliskan respons untuk pengguna..."
        />
        <p v-if="appealValidationErrors?.admin_response" class="text-red-500 text-xs mt-1 font-medium">
          {{ appealValidationErrors.admin_response[0] === 'The admin response field is required.' ? 'Kolom tanggapan wajib diisi.' : appealValidationErrors.admin_response[0] }}
        </p>
      </div>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showAppealModal = false" variant="secondary">Batal</Button>
          <Button @click="handleAppealReview" :variant="appealStatus === 'accepted' ? 'success' : 'danger'" :disabled="loading">
            <i class="pi pi-send mr-2"></i>
            {{ loading ? "Memproses..." : "Kirim Tanggapan" }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Resolve Modal -->
    <ResponsiveModal :show="showResolveModal" @close="showResolveModal = false" title="Selesaikan Laporan (Tanpa Tindakan)">
      <p class="text-sm text-gray-600 mb-4">
        Apakah Anda yakin ingin menandai laporan ini sebagai <strong class="text-green-700">Terselesaikan</strong> tanpa mengambil tindakan moderasi apa pun pada konten/pengguna?
      </p>
      <div class="mb-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Catatan Admin <span class="text-gray-400">(Opsional)</span></label>
        <textarea
          v-model="adminNote"
          rows="3"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
          placeholder="Tulis catatan..."
        />
      </div>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showResolveModal = false" variant="secondary">Batal</Button>
          <Button @click="handleResolve" variant="success" :disabled="loading">
            <i class="pi pi-check mr-2"></i>
            {{ loading ? "Memproses..." : "Selesaikan" }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Dismiss Modal -->
    <ResponsiveModal :show="showDismissModal" @close="showDismissModal = false" title="Tolak Laporan">
      <p class="text-sm text-gray-600 mb-4">
        Mengapa Anda menolak laporan ini? <span class="text-red-600 font-medium">Catatan wajib diisi.</span>
      </p>
      <textarea
        v-model="adminNote"
        rows="4"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
        placeholder="Jelaskan alasan penolakan laporan (wajib)..."
      />
      <template #footer>
        <div class="flex gap-3 justify-end">
          <Button @click="showDismissModal = false" variant="secondary">Batal</Button>
          <Button @click="handleDismiss" variant="danger" :disabled="loading || !adminNote.trim()">
            <i class="pi pi-times mr-2"></i>
            {{ loading ? "Memproses..." : "Tolak Laporan" }}
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>
