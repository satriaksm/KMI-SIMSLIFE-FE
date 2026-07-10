import { ref, computed } from "vue";
import { compressImage } from "@/utils/imageCompressor";

export function useProductVariants({ maxVariants, maxOptions, toast }) {
  const useVariants = ref(false);
  const variants = ref([]);
  const variantNames = ref({});
  const variantUsesImages = ref({});
  const expandedVariants = ref(new Set());

  const canAddVariant = computed(() => variants.value.length < maxVariants);

  const addVariant = () => {
    if (!canAddVariant.value) return;

    const id = Date.now() + Math.random();
    variants.value.push({
      id,
      name: "",
      options: [{ id: Date.now(), name: "", images: [] }],
    });
    variantNames.value[id] = "";
    variantUsesImages.value[id] = 0;
    expandedVariants.value.add(id);
  };

  const addVariantEdit = () => {
    const clientKey = crypto.randomUUID();

    variants.value.push({
      id: null, // 🔥 WAJIB
      clientKey,
      name: "",
      options: [
        {
          id: null, // 🔥 WAJIB
          clientKey: crypto.randomUUID(),
          name: "",
          images: [],
        },
      ],
    });

    variantNames.value[clientKey] = "";
    variantUsesImages.value[clientKey] = 0;
  };

  const removeVariant = (index) => {
    const id = variants.value[index].id;
    delete variantNames.value[id];
    delete variantUsesImages.value[id];
    variants.value.splice(index, 1);
  };

  const addOption = (variantIndex) => {
    const variant = variants.value[variantIndex];
    if (!variant) return;

    variant.options.push({
      id: Date.now() + Math.random(),
      name: "",
      images: [],
    });
  };

  const addOptionEdit = (variantIndex) => {
    const variant = variants.value[variantIndex];
    if (!variant) return;

    variant.options.push({
      id: null, // 🔥 WAJIB
      clientKey: crypto.randomUUID(),
      name: "",
      images: [],
    });
  };

  const removeOption = (vIndex, oIndex) => {
    variants.value[vIndex].options.splice(oIndex, 1);
  };

  const toggleVariantImages = (variantId) => {
    variantUsesImages.value[variantId] = variantUsesImages.value[variantId]
      ? 0
      : 1;
  };

  const toggleVariantExpand = (id) => {
    expandedVariants.value.has(id)
      ? expandedVariants.value.delete(id)
      : expandedVariants.value.add(id);
  };

  const isVariantExpanded = (id) => expandedVariants.value.has(id);

  const canAddVariantOption = (variantIndex) => {
    const tempVariants = JSON.parse(JSON.stringify(variants.value));
    tempVariants[variantIndex].options.push({ name: "__temp__" });

    const total = tempVariants.reduce((t, v) => {
      const count = v.options.filter((o) => o.name?.trim()).length;
      return t === 0 ? count : t * count;
    }, 0);

    return total <= maxOptions;
  };

  const handleOptionImageUpload = async (variantIndex, optionIndex, event) => {
    const files = Array.from(event.target.files);
    const option = variants.value[variantIndex].options[optionIndex];

    if (option.images.length >= 1) {
      toast.warning("Maksimal 1 foto per opsi");
      event.target.value = "";
      return;
    }

    const file = files[0];
    if (file && file.type.startsWith("image/")) {
      try {
        const compressedFile = await compressImage(file, 1920);
        option.images = [
          {
            id: Date.now(),
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
          },
        ];
      } catch (err) {
        // Fallback
        option.images = [
          {
            id: Date.now(),
            file: file,
            preview: URL.createObjectURL(file),
          },
        ];
      }
    }
    event.target.value = "";
  };

  const removeOptionImage = (variantIndex, optionIndex, imageIndex) => {
    variants.value[variantIndex].options[optionIndex].images.splice(
      imageIndex,
      1,
    );
  };

  return {
    useVariants,
    variants,
    variantNames,
    variantUsesImages,
    canAddVariant,
    addVariant,
    addVariantEdit,
    removeVariant,
    addOption,
    addOptionEdit,
    removeOption,
    toggleVariantImages,
    toggleVariantExpand,
    isVariantExpanded,
    canAddVariantOption,
    handleOptionImageUpload,
    removeOptionImage,
  };
}
