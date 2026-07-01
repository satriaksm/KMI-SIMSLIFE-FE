<script setup>
import { computed } from "vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import Button from "@/components/common/Button.vue";
import MerchantList from "@/components/common/MerchantList.vue";
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "toggle-select",
  "view-detail",
  "edit",
  "delete",
  "toggle-visibility",
]);

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "jt";
  if (num >= 1000) return (num / 1000).toFixed(1) + "rb";
  return num.toString();
};

const formatPrice = (min, max) => {
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const formatCompact = (num) => {
    if (num >= 1000000000) return "Rp " + (num / 1000000000).toFixed(1) + "M";
    if (num >= 1000000) return "Rp " + (num / 1000000).toFixed(1) + "jt";
    return formatter.format(num);
  };

  if (min === max) return formatCompact(min);
  return `${formatCompact(min)} - ${formatCompact(max)}`;
};

const imageSrc = computed(() => {
  return props.product?.cover_image?.thumb_url || 
         (props.product?.cover_image?.id ? props.product.cover_image.src_url : "");
});

const imageAlt = computed(() => props.product?.name || "");
</script>

<template>
  <MerchantList
    :item="product"
    :selected="selected"
    :checkbox-value="product.id"
    :title="product.name"
    :subtitle="product.sku"
    :image-src="imageSrc"
    :image-alt="imageAlt"
    @toggle-select="emit('toggle-select', $event)"
    @view-detail="emit('view-detail', product)"
  >
    <template #badges>
      <div class="flex items-center gap-2 mt-2">
        <span
          class="inline-flex items-center px-2 py-1 bg-merchant-primary/10 text-merchant-primary rounded-md text-xs font-medium"
        >
          <i class="pi pi-box mr-1"></i>
          Stok: {{ formatNumber(product.total_stock) }}
        </span>
      </div>
    </template>

    <template #details>
      <div class="space-y-3">
        <div class="flex justify-between items-center text-xs">
          <span class="text-muted-foreground flex-shrink-0">Kategori</span>
          <span
            class="font-medium text-right truncate ml-2"
            :title="product.categories?.[0]?.category_name"
          >
            {{ product.categories?.[0]?.name || "-" }}
          </span>
        </div>

        <div class="flex justify-between items-center text-xs">
          <span class="text-muted-foreground flex-shrink-0">Harga</span>
          <span
            class="text-merchant-primary font-semibold text-right truncate ml-2"
            :title="formatPrice(product.min_price, product.max_price)"
          >
            {{ formatPrice(product.min_price, product.max_price) }}
          </span>
        </div>

        <div class="flex flex-row justify-between items-center gap-2">
          <span class="text-xs text-muted-foreground flex-shrink-0">
            Status Produk
          </span>
          <div class="flex flex-col items-end gap-1">
            <StatusLabel :status="product.status" variant="product" size="sm" />
            <StatusLabel
              v-if="product.variant_count > 0"
              status="out_of_stock"
              variant="product"
              size="xs"
              :label="`${product.variant_count} varian habis`"
            />
          </div>
        </div>
      </div>
    </template>

    <template #actions>
      <div class="flex items-center justify-between gap-2">
        <Button
          @click="emit('delete', product)"
          class="!w-4 border-none"
          title="Hapus Produk"
          variant="danger-outline"
        >
          <i class="pi pi-trash"></i>
        </Button>

        <div class="flex gap-2">
          <Button
            @click="emit('view-detail', product)"
            class="!w-4 border-none"
            title="Lihat Detail"
            variant="muted-outline"
          >
            <i class="pi pi-eye"></i>
          </Button>

          <Button
            @click="emit('edit', product)"
            class="!w-4 border-none"
            title="Edit Produk"
            variant="merchant-outline"
          >
            <i class="pi pi-pencil"></i>
          </Button>

          <Button
            @click="emit('toggle-visibility', product)"
            class="!w-4 border-none"
            title="Ubah Status"
            variant="primary-outline"
          >
            <i class="pi pi-cog"></i>
          </Button>
        </div>
      </div>
    </template>
  </MerchantList>
</template>
