<template>
  <ResponsiveModal
    :show="show && !showAppealModal"
    title="Produk Terkena Pelanggaran"
    :subtitle="blockInfo?.productName"
    show-footer
    @close="handleClose"
  >
    <div class="space-y-4">
      <div
        class="flex items-start gap-3 p-4 border bg-danger-background/10 border-danger-foreground/20 rounded-xl"
      >
        <i
          class="pi pi-exclamation-triangle text-danger-foreground text-xl shrink-0 mt-0.5"
        ></i>
        <div>
          <h4 class="mb-1 text-sm font-semibold text-danger-foreground">
            Publish Diblokir
          </h4>
          <p class="text-xs text-danger-foreground/80">
            {{
              blockInfo?.message ||
              "Anda tidak dapat mempublish produk ini karena terkena pelanggaran."
            }}
          </p>
        </div>
      </div>

      <div
        v-if="blockInfo?.adminNote"
        class="p-4 bg-muted-background rounded-xl border border-gray-200"
      >
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          Catatan Admin
        </p>
        <p class="text-sm text-black">{{ blockInfo.adminNote }}</p>
      </div>

      <div
        v-if="blockInfo?.hasPendingAppeal"
        class="flex items-start gap-3 p-4 border bg-warning-background/10 border-warning-foreground/20 rounded-xl"
      >
        <i class="pi pi-clock text-warning-foreground text-lg shrink-0 mt-0.5"></i>
        <p class="text-xs text-warning-foreground/90">
          Sanggahan Anda sedang ditinjau oleh tim moderasi. Produk akan dapat
          dipublish kembali setelah sanggahan diterima atau laporan ditarik
          oleh admin.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 sm:flex-row">
        <Button @click="handleClose" variant="muted-outline" block>
          Tutup
        </Button>

        <Button
          v-if="blockInfo?.reportId"
          @click="goToReportDetail"
          variant="muted-outline"
          block
        >
          <i class="mr-2 pi pi-file"></i>
          Lihat Laporan
        </Button>

        <Button
          v-if="blockInfo?.canAppeal && blockInfo?.reportId"
          @click="openAppealModal"
          variant="merchant"
          block
        >
          <i class="mr-2 pi pi-send"></i>
          Ajukan Sanggahan
        </Button>
      </div>
    </template>
  </ResponsiveModal>

  <ReportAppealModal
    v-if="showAppealModal && appealContext?.reportId"
    :report-id="appealContext.reportId"
    :target-name="appealContext.productName || ''"
    @close="handleAppealClose"
    @success="handleAppealSuccess"
  />
</template>

<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import Button from "@/components/common/Button.vue";
import ReportAppealModal from "@/components/reports/ReportAppealModal.vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  blockInfo: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close", "appeal-submitted"]);

const router = useRouter();
const showAppealModal = ref(false);
const appealContext = ref(null);

watch(
  () => props.show,
  (isOpen) => {
    if (!isOpen) {
      showAppealModal.value = false;
      appealContext.value = null;
    }
  },
);

const handleClose = () => {
  if (showAppealModal.value) return;
  emit("close");
};

const openAppealModal = () => {
  if (!props.blockInfo?.reportId) return;
  appealContext.value = { ...props.blockInfo };
  showAppealModal.value = true;
};

const handleAppealClose = () => {
  showAppealModal.value = false;
};

const goToReportDetail = () => {
  if (!props.blockInfo?.reportId) return;
  router.push(`/reports/${props.blockInfo.reportId}`);
  emit("close");
};

const handleAppealSuccess = () => {
  showAppealModal.value = false;
  appealContext.value = null;
  emit("appeal-submitted");
  emit("close");
};
</script>