import { ref } from "vue";
import { compressImage } from "@/utils/imageCompressor";

export function useProductImages({ maxImages, maxSizeBytes, toast }) {
  const productImages = ref([]);
  const coverImageIndex = ref(0);
  const draggedImageIndex = ref(null);
  const fileInput = ref(null);

  const triggerFileInput = () => {
    fileInput.value?.click();
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    const remainingSlots = maxImages - productImages.value.length;

    if (remainingSlots <= 0) {
      toast.warning(`Maksimal ${maxImages} foto produk`);
      event.target.value = "";
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        toast.error(`File ${file.name} bukan gambar`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`Gambar ${file.name} terlalu besar`);
        continue;
      }

      try {
        const compressedFile = await compressImage(file, 1920);
        productImages.value.push({
          id: Date.now() + Math.random(),
          file: compressedFile,
          preview: URL.createObjectURL(compressedFile),
        });
        coverImageIndex.value = 0;
      } catch (err) {
        // Fallback
        productImages.value.push({
          id: Date.now() + Math.random(),
          file: file,
          preview: URL.createObjectURL(file),
        });
        coverImageIndex.value = 0;
      }
    }

    event.target.value = "";
  };

  const removeImage = (index) => {
    productImages.value.splice(index, 1);
    coverImageIndex.value = productImages.value.length ? 0 : null;
  };

  const onDragStart = (_, index) => {
    draggedImageIndex.value = index;
  };
  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (_, index) => {
    if (draggedImageIndex.value === null) return;
    const item = productImages.value[draggedImageIndex.value];
    productImages.value.splice(draggedImageIndex.value, 1);
    productImages.value.splice(index, 0, item);
    coverImageIndex.value = 0;
    draggedImageIndex.value = null;
  };
  const onDragEnd = () => {
    draggedImageIndex.value = null;
  };

  return {
    productImages,
    coverImageIndex,
    fileInput,
    triggerFileInput,
    handleImageUpload,
    removeImage,
    onDragStart,
    onDrop,
    onDragOver,
    onDragEnd,
  };
}
