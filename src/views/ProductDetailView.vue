<template>
  <div class="pb-16 bg-gray-50 sm:pb-4">
    <!-- Header dengan tombol close (Hidden - replaced by floating button) -->
    <div
      class="sticky top-0 z-50 hidden bg-white border-b border-gray-200 sm:hidden"
    >
      <div class="flex items-center justify-end px-4 py-3">
        <button
          @click="goBack"
          class="p-2 transition rounded-full hover:bg-gray-100 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Sticky Header saat Scroll (Mobile only) -->
    <div
      class="sticky top-0 left-0 right-0 z-40 transition-transform duration-300 ease-out border-b border-gray-200 shadow-md sm:hidden bg-white/95 backdrop-blur-md"
      :class="showScrollHeader ? 'translate-y-0' : '-translate-y-full'"
    >
      <div class="flex items-center gap-2 px-3 py-3">
        <!-- Back -->
        <button
          @click="goBack"
          class="p-2 px-3 transition rounded-full hover:bg-gray-100 active:scale-95"
        >
          <i class="text-sm pi pi-chevron-left"></i>
        </button>

        <!-- 🔍 SEARCH BAR -->
        <form @submit.prevent="submitSearch" class="flex-1">
          <div class="relative">
            <Textfield
              v-model="searchInput"
              name="search"
              placeholder="Cari produk atau UMKM…"
              variant="primary"
            />
          </div>
        </form>
        <!-- Share Button -->
        <button
          @click="shareProduct"
          class="w-10 h-10 transition-all rounded-full backdrop-blur-sm hover:bg-gray-100 active:scale-95"
        >
          <i class="text-lg pi pi-share-alt"></i>
        </button>
        <!-- Cart -->
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

    <!-- Loading Skeleton -->
    <div v-if="loading || !product" class="mx-auto max-w-7xl sm:px-4 sm:py-4">
      <div class="overflow-hidden bg-white sm:rounded-2xl sm:shadow-lg">
        <div class="sm:grid sm:grid-cols-2 sm:gap-8 sm:p-8">
          <!-- Skeleton Gambar -->
          <div class="sm:sticky sm:top-8 sm:self-start">
            <div
              class="w-full bg-gray-200 aspect-square animate-pulse sm:rounded-xl"
            ></div>
          </div>

          <!-- Skeleton Info Produk -->
          <div class="px-4 py-4 space-y-4 sm:px-0 sm:py-0">
            <!-- Nama & Harga -->
            <div class="pb-4 space-y-3 border-b border-gray-200">
              <div class="w-3/4 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div class="w-1/2 bg-gray-200 rounded h-7 animate-pulse"></div>
              <div class="flex items-center gap-2">
                <div class="w-24 h-5 bg-gray-200 rounded animate-pulse"></div>
                <div
                  class="w-20 h-6 bg-gray-200 rounded-full animate-pulse"
                ></div>
              </div>
            </div>

            <!-- Ukuran -->
            <div class="py-4 border-b border-gray-200">
              <div
                class="w-20 h-5 mb-3 bg-gray-200 rounded animate-pulse"
              ></div>
              <div class="flex gap-2">
                <div
                  class="w-20 h-16 bg-gray-200 rounded-lg animate-pulse"
                ></div>
                <div
                  class="w-20 h-16 bg-gray-200 rounded-lg animate-pulse"
                ></div>
                <div
                  class="w-20 h-16 bg-gray-200 rounded-lg animate-pulse"
                ></div>
              </div>
            </div>

            <!-- Varian -->
            <div class="py-4 border-b border-gray-200">
              <div
                class="w-16 h-5 mb-3 bg-gray-200 rounded animate-pulse"
              ></div>
              <div class="flex gap-2">
                <div
                  class="w-24 h-16 bg-gray-200 rounded-lg animate-pulse"
                ></div>
                <div
                  class="w-24 h-16 bg-gray-200 rounded-lg animate-pulse"
                ></div>
                <div
                  class="w-24 h-16 bg-gray-200 rounded-lg animate-pulse"
                ></div>
              </div>
            </div>

            <!-- Tambahan -->
            <div class="py-4 border-b border-gray-200">
              <div class="flex justify-between mb-3">
                <div class="w-24 h-5 bg-gray-200 rounded animate-pulse"></div>
                <div class="h-5 bg-gray-200 rounded animate-pulse w-28"></div>
              </div>
              <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>

            <!-- Jumlah -->
            <div class="py-4 border-b border-gray-200">
              <div
                class="w-16 h-5 mb-3 bg-gray-200 rounded animate-pulse"
              ></div>
              <div class="flex gap-3">
                <div
                  class="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"
                ></div>
                <div
                  class="w-16 h-10 bg-gray-200 rounded-lg animate-pulse"
                ></div>
                <div
                  class="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"
                ></div>
              </div>
            </div>

            <!-- Deskripsi -->
            <div class="py-4 space-y-2 border-b border-gray-200">
              <div
                class="w-32 h-5 mb-2 bg-gray-200 rounded animate-pulse"
              ></div>
              <div class="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
              <div class="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
              <div class="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <!-- Info Toko -->
            <div class="py-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="w-12 h-12 bg-gray-200 rounded-full animate-pulse"
                  ></div>
                  <div class="space-y-2">
                    <div
                      class="w-32 h-4 bg-gray-200 rounded animate-pulse"
                    ></div>
                    <div
                      class="w-16 h-5 bg-gray-200 rounded-full animate-pulse"
                    ></div>
                  </div>
                </div>
                <div
                  class="w-20 bg-gray-200 rounded-lg h-9 animate-pulse"
                ></div>
              </div>
            </div>

            <!-- Produk Lain -->
            <div class="py-4">
              <div
                class="w-40 h-5 mb-3 bg-gray-200 rounded animate-pulse"
              ></div>
              <div class="flex gap-3">
                <div class="min-w-[120px] sm:min-w-[140px]">
                  <div
                    class="mb-2 bg-gray-200 aspect-square rounded-xl animate-pulse"
                  ></div>
                  <div
                    class="w-full h-4 mb-1 bg-gray-200 rounded animate-pulse"
                  ></div>
                  <div
                    class="w-2/3 h-3 bg-gray-200 rounded animate-pulse"
                  ></div>
                </div>
                <div class="min-w-[120px] sm:min-w-[140px]">
                  <div
                    class="mb-2 bg-gray-200 aspect-square rounded-xl animate-pulse"
                  ></div>
                  <div
                    class="w-full h-4 mb-1 bg-gray-200 rounded animate-pulse"
                  ></div>
                  <div
                    class="w-2/3 h-3 bg-gray-200 rounded animate-pulse"
                  ></div>
                </div>
                <div class="min-w-[120px] sm:min-w-[140px]">
                  <div
                    class="mb-2 bg-gray-200 aspect-square rounded-xl animate-pulse"
                  ></div>
                  <div
                    class="w-full h-4 mb-1 bg-gray-200 rounded animate-pulse"
                  ></div>
                  <div
                    class="w-2/3 h-3 bg-gray-200 rounded animate-pulse"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content (existing template) -->
    <div v-else class="mx-auto max-w-7xl sm:px-4 sm:py-4">
      <div class="overflow-hidden bg-white sm:rounded-2xl sm:shadow-lg">
        <!-- Layout Desktop: Grid 2 kolom -->
        <div class="sm:grid sm:grid-cols-2 sm:gap-8 sm:p-8">
          <!-- Kolom Kiri: Image Gallery -->
          <div class="sm:sticky sm:top-8 sm:self-start">
            <!-- Main Image Display with Swipe Support -->
            <div
              class="relative flex items-center justify-center w-full mb-4 overflow-hidden aspect-square sm:rounded-2xl group"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="handleTouchEnd"
            >
              <img
                v-if="selectedImage"
                :src="selectedImage"
                :alt="product?.name"
                class="object-contain w-full h-full transition-transform duration-300 select-none sm:rounded-2xl group-hover:scale-105"
                draggable="false"
              />
              <div v-else class="text-gray-400">No Image</div>

              <div
                v-if="getCurrentStock() === 0 || isArchived"
                class="absolute inset-0 z-10 flex flex-col items-center justify-center m-auto text-center text-white rounded-full pointer-events-none bg-black/55 backdrop-blur-sm sm:w-40 sm:h-40 w-30 h-30"
              >
                <p class="text-lg font-bold tracking-wide sm:text-2xl">
                  {{ isArchived ? "Diarsipkan" : "Habis" }}
                </p>
              </div>

              <!-- ✅ UPDATED: Navigation Arrows - DESKTOP ONLY (hidden on mobile) -->
              <button
                v-if="productImages.length > 1"
                @click.stop="prevImage"
                class="absolute items-center justify-center hidden w-12 h-12 transition-all -translate-y-1/2 rounded-full shadow-lg sm:flex left-4 top-1/2 bg-white/90 backdrop-blur-sm hover:bg-white active:scale-95"
              >
                <svg
                  class="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                v-if="productImages.length > 1"
                @click.stop="nextImage"
                class="absolute items-center justify-center hidden w-12 h-12 transition-all -translate-y-1/2 rounded-full shadow-lg sm:flex right-4 top-1/2 bg-white/90 backdrop-blur-sm hover:bg-white active:scale-95"
              >
                <svg
                  class="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <!-- ✅ Image Counter - DESKTOP ONLY (simple version without swipe hint) -->
              <div
                v-if="productImages.length > 1"
                class="hidden sm:block absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium"
              >
                {{ currentImageIndex + 1 }} / {{ productImages.length }}
              </div>
            </div>
            <!-- Dot indicators (alternative) - MOBILE ONLY -->
            <div
              v-if="productImages.length > 1 && productImages.length <= 5"
              class="flex justify-center gap-1.5 my-3"
            >
              <button
                v-for="(_, index) in productImages"
                :key="index"
                @click="selectImage(index)"
                class="transition-all rounded-full"
                :class="
                  currentImageIndex === index
                    ? 'w-6 h-2 bg-primary'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                "
              ></button>
            </div>
            <!-- Thumbnail Gallery -->
            <div v-if="productImages.length > 1" class="px-4 py-2 sm:px-2">
              <div class="thumb-strip">
                <button
                  v-for="(image, index) in productImages"
                  :key="index"
                  @click="selectImage(index)"
                  class="thumb-item"
                  :class="currentImageIndex === index ? 'active' : ''"
                >
                  <img
                    :src="image"
                    :alt="`${product?.name} - ${index + 1}`"
                    class="object-cover w-full h-full"
                  />
                </button>
              </div>
            </div>
          </div>

          <!-- Kolom Kanan: Info Produk -->
          <div class="px-4 py-4 sm:px-0 sm:py-0">
            <!-- Nama & Harga -->
            <div class="pb-4 border-b border-gray-200">
              <h1 class="mb-2 text-xl font-bold text-gray-900 sm:text-3xl">
                {{ product?.name || "Nama Produk" }}
              </h1>
              <p class="text-lg font-semibold text-gray-900 sm:text-2xl">
                Rp {{ formatIDR(getCurrentPrice()) }}
                <!-- ✅ gunakan harga kombinasi -->
              </p>

              <!-- Stok Info -->
              <div class="flex items-center gap-2 mt-3">
                <span class="text-sm text-gray-600">Stok:</span>
                <div class="flex items-center gap-1.5">
                  <span
                    class="text-sm font-semibold"
                    :class="getStockColorClass()"
                  >
                    {{ getCurrentStock() }} tersisa
                  </span>
                  <span
                    v-if="isLowStock()"
                    class="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700"
                  >
                    Stok terbatas
                  </span>
                  <span
                    v-if="getCurrentStock() === 0"
                    class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700"
                  >
                    Habis
                  </span>
                </div>
              </div>

              <!-- Banner archived -->
              <div
                v-if="isArchived"
                class="p-3 mt-3 text-sm text-yellow-800 border border-yellow-200 rounded-lg bg-yellow-50"
              >
                Produk ini telah diarsipkan dan tidak tersedia untuk dibeli.
              </div>
            </div>

            <!-- Ukuran/Varian (Option 1) -->
            <div v-if="sizes.length > 0" class="py-4 border-b border-gray-200">
              <h3 class="mb-3 text-sm font-semibold text-gray-900">
                {{ option1Label }} <span class="text-red-500">*</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="size in sizes"
                  :key="size.id"
                  @click="
                    selectedSize = size;
                    validateQuantity();
                  "
                  :disabled="!isSizeAvailable(size.name)"
                  class="px-4 py-2 text-sm font-medium transition border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="
                    selectedSize?.id === size.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  "
                >
                  <div class="flex flex-col items-center">
                    <!-- 🖼️ Image jika ada -->
                    <div
                      v-if="getOptionValueSrcUrl(1, size.id)"
                      class="flex items-center justify-center w-12 h-12 overflow-hidden bg-gray-100 rounded-md"
                    >
                      <img
                        :src="getOptionValueSrcUrl(1, size.id)"
                        :alt="size.name"
                        class="object-cover w-full h-full"
                      />
                    </div>

                    <!-- Nama Size -->
                    <span>{{ size.name }}</span>

                    <!-- Indikator stok -->
                    <span
                      class="text-xs mt-0.5"
                      :class="
                        getSizeStock(size.name) === 0
                          ? 'text-red-500'
                          : getSizeStock(size.name) <= 10
                            ? 'text-amber-600'
                            : 'text-gray-500'
                      "
                    >
                      {{ getSizeStock(size.name) === 0 ? "Habis" : "" }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Varian (Option 2) -->
            <div
              v-if="variants.length > 0"
              class="py-4 border-b border-gray-200"
            >
              <h3 class="mb-3 text-sm font-semibold text-gray-900">
                {{ option2Label }} <span class="text-red-500">*</span>
                <!-- ✅ label dinamis -->
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="variant in variants"
                  :key="variant.id"
                  @click="
                    selectedVariant = variant;
                    validateQuantity();
                  "
                  :disabled="!isVariantAvailable(variant.id)"
                  class="px-4 py-2 text-sm font-medium transition border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="
                    selectedVariant?.id === variant.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  "
                >
                  <div class="flex flex-col items-center">
                    <span
                      :class="{
                        'line-through text-gray-400': !isVariantAvailable(
                          variant.id,
                        ),
                      }"
                    >
                      {{ variant.name }}
                    </span>
                    <span
                      class="text-xs mt-0.5"
                      :class="
                        getVariantStock(variant.id) === 0
                          ? 'text-red-500'
                          : getVariantStock(variant.id) <= 10
                            ? 'text-amber-600'
                            : 'text-gray-500'
                      "
                    >
                      {{
                        getVariantStock(variant.id) === 0
                          ? "Habis"
                          : `Stok: ${getVariantStock(variant.id)}`
                      }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Addon/Tambahan - Button to open modal -->
            <div
              v-if="addonGroups.length > 0"
              class="py-4 border-b border-gray-200"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-gray-900">Tambahan</h3>
                <button
                  @click="showAddonModal = true"
                  class="text-sm font-medium cursor-pointer text-primary hover:underline"
                >
                  {{
                    selectedAddons.length > 0
                      ? "Ubah Pilihan"
                      : "Pilih Tambahan"
                  }}
                </button>
              </div>

              <!-- Selected Addons Summary -->
              <div v-if="selectedAddons.length > 0" class="space-y-2">
                <div
                  v-for="addon in selectedAddons"
                  :key="addon.id"
                  class="flex items-center justify-between p-2 text-sm rounded-lg bg-gray-50"
                >
                  <span class="text-gray-700">{{ addon.name }}</span>
                  <span class="font-semibold text-gray-900">
                    +Rp {{ formatIDR(addon.price) }}
                  </span>
                </div>
                <p class="pt-1 text-xs text-gray-600">
                  Total tambahan: Rp {{ formatIDR(calculateAddonOnlyPrice()) }}
                </p>
              </div>

              <div v-else class="text-sm text-gray-500">
                Belum ada tambahan dipilih
              </div>
            </div>

            <!-- Jumlah -->
            <div class="py-4 border-b border-gray-200">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">
                  Jumlah
                  <span
                    v-if="minPurchase > 1"
                    class="mt-1 text-sm font-normal text-muted-foreground"
                    >(Minimal beli: {{ minPurchase }} item)</span
                  >
                </h3>

                <span
                  v-if="getCurrentStock() > 0"
                  class="text-xs text-gray-500"
                >
                  Maks. {{ getCurrentStock() }} item
                </span>
              </div>
              <div
                class="flex items-center justify-center gap-3 sm:justify-end"
              >
                <button
                  @click="decreaseQuantity"
                  :disabled="quantity <= 1"
                  class="flex items-center justify-center w-10 h-10 transition border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5 12h14"
                    />
                  </svg>
                </button>
                <input
                  type="number"
                  v-model.number="quantity"
                  min="1"
                  :max="getCurrentStock()"
                  @input="validateQuantity"
                  class="w-16 py-2 text-sm font-semibold text-center border border-gray-300 rounded-lg"
                />
                <button
                  @click="increaseQuantity"
                  :disabled="quantity >= getCurrentStock()"
                  class="flex items-center justify-center w-10 h-10 transition border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Deskripsi Produk -->
            <div class="py-4 border-b border-gray-200">
              <h3 class="mb-2 text-sm font-semibold text-gray-900">
                Deskripsi Produk
              </h3>

              <p
                class="text-sm leading-relaxed text-gray-700 whitespace-pre-line"
              >
                {{ displayedDescription }}
              </p>

              <button
                v-if="isLongDescription"
                @click="showFullDescription = !showFullDescription"
                class="mt-2 text-sm font-semibold cursor-pointer text-primary focus:outline-none hover:underline"
                type="button"
              >
                {{ showFullDescription ? "Sembunyikan" : "Lihat Selengkapnya" }}
              </button>
            </div>

            <!-- Info Toko -->
            <div class="py-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center min-w-0 gap-3">
                  <div
                    class="flex-shrink-0 w-12 h-12 overflow-hidden bg-gray-200 rounded-full"
                  >
                    <img
                      v-if="product?.merchant?.logo_url"
                      :src="product.merchant.logo_url"
                      alt="UMKM logo"
                      class="object-cover w-full h-full"
                    />
                    <span v-else>
                      <svg
                        class="w-12 h-12 p-2 text-gray-300 bg-gray-100 border-4 border-white rounded-full shadow-lg"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 6H6v-6h6v6z"
                        />
                      </svg>
                    </span>
                  </div>
                  <div class="min-w-0">
                    <h4
                      class="text-sm font-semibold text-gray-900 truncate"
                      :title="product?.merchant?.name || 'Sumber Rejeki'"
                    >
                      {{ product?.merchant?.name || "Sumber Rejeki" }}
                    </h4>
                    <span
                      v-if="product?.merchant?.is_open_now"
                      class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 mt-1"
                    >
                      Buka
                    </span>
                    <span
                      v-else
                      class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mt-1"
                    >
                      Tutup</span
                    >
                  </div>
                </div>
                <router-link
                  v-if="product?.merchant"
                  :to="{
                    name: 'Merchant Detail',
                    params: {
                      slug: product.merchant.slug || product.merchant.id,
                    },
                  }"
                >
                  <Button variant="primary-outline" class="flex-shrink-0"
                    >Kunjungi</Button
                  >
                </router-link>
              </div>
            </div>

            <!-- Produk Lain dari Toko -->
            <div class="py-4">
              <h3 class="mb-3 text-sm font-semibold text-gray-900">
                Produk lain dari toko ini
              </h3>
              <div
                v-if="relatedProducts.length > 0"
                class="flex gap-3 pb-2 overflow-x-auto no-scrollbar"
              >
                <ProductCard
                  v-for="item in relatedProducts"
                  :key="item.id"
                  :product="item"
                  @click="viewProduct(item.slug)"
                  customClass="max-w-40"
                />
              </div>
              <div
                v-else
                class="px-2 py-6 text-sm italic text-center text-gray-400"
              >
                Tidak ada produk lain dari toko ini.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Action Bar (Mobile) -->
  <div
    class="fixed left-0 right-0 z-40 px-4 py-3 bg-white border-t border-gray-200 sm:hidden bottom-16"
  >
    <div v-if="loading" class="flex items-center gap-3">
      <div class="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
      <div class="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
    </div>
    <div v-else class="flex items-center gap-3">
      <!-- Tombol Keranjang -->
      <button
        v-if="!isAdmin"
        @click="addToCart"
        class="w-12 h-12 rounded-xl border-2 border-[#FFA30E] text-[#FFA30E] hover:bg-orange-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:-translate-y-0.5 active:scale-95"
        :disabled="getCurrentStock() === 0 || isArchived"
        :title="getCurrentStock() === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
          ></path>
        </svg>
      </button>

      <!-- Tombol Beli Sekarang -->
      <Button
        @click="buyNow"
        variant="primary"
        customClass="w-full"
        :disabled="getCurrentStock() === 0 || isArchived || isAdmin"
        :title="isAdmin ? 'Admin tidak dapat melakukan pembelian' : undefined"
      >
        {{ getCurrentStock() === 0 ? "Stok Habis" : "Beli Sekarang" }}
      </Button>
    </div>
  </div>

  <!-- Bottom Action Bar (Desktop) -->
  <div
    class="fixed bottom-0 left-0 right-0 z-40 hidden bg-white border-t border-gray-200 shadow-lg sm:block"
  >
    <div class="px-4 py-4 mx-auto max-w-7xl">
      <div v-if="loading" class="flex items-center justify-between">
        <div class="space-y-2">
          <div class="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div class="w-40 bg-gray-200 rounded h-7 animate-pulse"></div>
        </div>
        <div class="flex gap-3">
          <div class="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
          <div class="w-32 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
          <div class="h-12 bg-gray-200 w-36 rounded-xl animate-pulse"></div>
        </div>
      </div>
      <div v-else class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600">Total Harga ({{ quantity }} item)</p>
          <p class="text-2xl font-bold text-gray-900">
            Rp {{ formatIDR(calculateTotalPrice()) }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Tombol Share Desktop (baru) -->
          <Button
            @click="shareProduct"
            variant="muted-outline"
            title="Bagikan Produk"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
              />
            </svg>
            <span class="hidden lg:inline">Bagikan</span>
          </Button>

          <!-- Tombol Keranjang Desktop -->
          <Button
            v-if="!isAdmin"
            @click="addToCart"
            variant="primary-outline"
            :disabled="getCurrentStock() === 0 || isArchived"
            :title="
              getCurrentStock() === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            <span class="hidden lg:inline">Keranjang</span>
          </Button>

          <!-- Tombol Beli Sekarang -->
          <Button
            @click="buyNow"
            :disabled="getCurrentStock() === 0 || isArchived || isAdmin"
            variant="primary"
            :title="
              isAdmin ? 'Admin tidak dapat melakukan pembelian' : undefined
            "
          >
            {{ getCurrentStock() === 0 ? "Stok Habis" : "Beli Sekarang" }}
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Addon Modal -->
  <ResponsiveModal
    :show="showAddonModal"
    @close="showAddonModal = false"
    title="Pilih Tambahan"
    subtitle="Pilih tambahan sesuai keinginan Anda"
    :show-footer="true"
  >
    <!-- Addon Groups -->
    <div class="space-y-2">
      <div v-for="group in addonGroups" :key="group.id" class="">
        <!-- Group Header -->
        <div class="mb-3">
          <div class="flex items-center justify-between capitalize">
            <h4 class="text-sm font-semibold text-gray-900">
              {{ group.name }}
              <span v-if="group.required" class="ml-1 text-red-500">*</span>
              <span v-else class="text-xs font-normal text-muted-foreground"
                >(Opsional)</span
              >
            </h4>
            <span v-if="group.maxSelection > 1" class="text-xs text-gray-500">
              Maks. {{ group.maxSelection }} pilihan
            </span>
            <span
              v-else-if="group.maxSelection === 1"
              class="text-xs text-gray-500"
            >
              Pilih 1
            </span>
          </div>
          <p v-if="group.description" class="mt-1 text-xs text-gray-600">
            {{ group.description }}
          </p>
        </div>

        <!-- Group Items -->
        <div class="space-y-2">
          <div v-if="isSingleRequired(group)" class="space-y-2">
            <label
              v-for="addon in group.items"
              :key="addon.id"
              class="flex items-start justify-between p-3 transition border rounded-lg cursor-pointer"
              :class="
                isAddonSelected(addon)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              "
            >
              <div class="flex items-start flex-1 gap-3">
                <!-- RADIO -->
                <input
                  type="radio"
                  :name="'group-' + group.id"
                  :checked="isAddonSelected(addon)"
                  @change="selectSingleAddon(addon, group)"
                  :disabled="!addon.available"
                  class="mt-0.5 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />

                <!-- INFO -->
                <div
                  class="flex items-start justify-between w-full gap-2"
                  :class="{ 'opacity-50 cursor-not-allowed': !addon.available }"
                >
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm font-medium text-gray-900 capitalize"
                      :class="{
                        'line-through text-gray-400': !addon.available,
                      }"
                    >
                      {{ addon.name }}
                    </p>
                    <p
                      v-if="addon.description"
                      class="text-xs text-gray-600 mt-0.5"
                    >
                      {{ addon.description }}
                    </p>
                    <p
                      v-if="!addon.available"
                      class="text-xs text-red-500 mt-0.5"
                    >
                      Tidak tersedia
                    </p>
                  </div>

                  <span
                    class="text-sm font-semibold text-gray-900 whitespace-nowrap"
                  >
                    +Rp {{ formatIDR(addon.price) }}
                  </span>
                </div>
              </div>
            </label>
          </div>
          <div v-else class="space-y-2">
            <label
              v-for="addon in group.items"
              :key="addon.id"
              class="flex items-start justify-between gap-3 p-3 transition border rounded-lg cursor-pointer"
              :class="
                isAddonSelected(addon)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              "
            >
              <div class="flex items-start flex-1 gap-3">
                <!-- CHECKBOX -->
                <input
                  type="checkbox"
                  :checked="isAddonSelected(addon)"
                  @change="toggleAddon(addon, group)"
                  :disabled="!addon.available || isGroupMaxed(group, addon)"
                  class="mt-0.5 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />

                <!-- INFO -->
                <div
                  class="flex items-start justify-between w-full gap-2"
                  :class="{ 'opacity-50 cursor-not-allowed': !addon.available }"
                >
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm font-medium text-gray-900 capitalize"
                      :class="{
                        'line-through text-gray-400': !addon.available,
                      }"
                    >
                      {{ addon.name }}
                    </p>
                    <p
                      v-if="addon.description"
                      class="text-xs text-gray-600 mt-0.5"
                    >
                      {{ addon.description }}
                    </p>
                    <p
                      v-if="!addon.available"
                      class="text-xs text-red-500 mt-0.5"
                    >
                      Tidak tersedia
                    </p>
                  </div>

                  <span
                    class="text-sm font-semibold text-gray-900 whitespace-nowrap"
                  >
                    +Rp {{ formatIDR(addon.price) }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex flex-col gap-3">
        <!-- Summary -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">
            {{ tempSelectedAddons.length }} tambahan dipilih
          </span>
          <span class="font-semibold text-gray-900">
            +Rp {{ formatIDR(calculateTempAddonPrice()) }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <Button
            @click="resetAddons"
            type="button"
            variant="muted-outline"
            class="w-full"
          >
            Reset
          </Button>
          <Button
            @click="applyAddons"
            type="button"
            variant="primary"
            class="w-full"
          >
            Terapkan
          </Button>
        </div>
      </div>
    </template>
  </ResponsiveModal>

  <!-- Share Modal -->
  <ResponsiveModal
    :show="showShareModal"
    @close="showShareModal = false"
    title="Bagikan Produk"
    subtitle="Pilih platform untuk membagikan produk ini"
  >
    <div class="space-y-3">
      <!-- WhatsApp -->
      <button
        @click="shareVia('whatsapp')"
        class="flex items-center w-full gap-3 p-4 transition border border-gray-200 cursor-pointer rounded-xl hover:border-green-500 hover:bg-green-50 active:scale-95"
      >
        <div
          class="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full"
        >
          <svg
            class="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
            />
          </svg>
        </div>
        <div class="flex-1 text-left">
          <div class="font-semibold text-gray-900">WhatsApp</div>
          <div class="text-xs text-gray-600">Bagikan via WhatsApp</div>
        </div>
      </button>

      <!-- Facebook -->
      <button
        @click="shareVia('facebook')"
        class="flex items-center w-full gap-3 p-4 transition border border-gray-200 cursor-pointer rounded-xl hover:border-blue-600 hover:bg-blue-50 active:scale-95"
      >
        <div
          class="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full"
        >
          <svg
            class="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
            />
          </svg>
        </div>
        <div class="flex-1 text-left">
          <div class="font-semibold text-gray-900">Facebook</div>
          <div class="text-xs text-gray-600">Bagikan ke Facebook</div>
        </div>
      </button>

      <!-- Twitter -->
      <button
        @click="shareVia('twitter')"
        class="flex items-center w-full gap-3 p-4 transition border border-gray-200 cursor-pointer rounded-xl hover:border-blue-400 hover:bg-blue-50 active:scale-95"
      >
        <div
          class="flex items-center justify-center w-10 h-10 bg-blue-400 rounded-full"
        >
          <svg
            class="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0 .42-.015.63A9.935 9.935 0 0024 4.59z"
            />
          </svg>
        </div>
        <div class="flex-1 text-left">
          <div class="font-semibold text-gray-900">Twitter</div>
          <div class="text-xs text-gray-600">Tweet produk ini</div>
        </div>
      </button>

      <!-- Copy Link -->
      <button
        @click="copyLink"
        class="flex items-center w-full gap-3 p-4 transition border border-gray-200 cursor-pointer rounded-xl hover:border-gray-400 hover:bg-gray-50 active:scale-95"
      >
        <div
          class="flex items-center justify-center w-10 h-10 bg-gray-600 rounded-full"
        >
          <svg
            class="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
            />
          </svg>
        </div>
        <div class="flex-1 text-left">
          <div class="font-semibold text-gray-900">Salin Link</div>
          <div class="text-xs text-gray-600">Salin link produk</div>
        </div>
      </button>
    </div>

    <template #footer>
      <button
        @click="showShareModal = false"
        class="w-full px-4 py-3 font-semibold text-gray-700 transition bg-gray-100 rounded-xl hover:bg-gray-200"
      >
        Tutup
      </button>
    </template>
  </ResponsiveModal>
</template>

<script setup>
import {
  ref,
  onMounted,
  computed,
  watch,
  onUnmounted,
  onBeforeUnmount,
} from "vue";
import { setMeta, setJsonLd } from "@/router/seo";
import { useRoute, useRouter } from "vue-router";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock.js";
import Button from "@/components/common/Button.vue";
import { useCheckoutStore } from "@/stores/checkout";
import ProductCard from "@/components/Card/ProductCard.vue";
import Textfield from "@/components/forms/TextField.vue";
import { useProducts } from "@/composables/useProducts.js";
import { useToast } from "vue-toastification";
import { useCartStore } from "@/stores/cart";
import { useAuthStore } from "@/stores/auth";
import { useCart } from "@/composables/useCart";
const { addToCart: addCart, loading: loadingCart, fetchCartCount } = useCart();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const cartStore = useCartStore();
const toast = useToast();
const showFullDescription = ref(false);
const searchInput = ref("");

function submitSearch() {
  if (!searchInput.value.trim()) return;

  router.push({
    path: "/search", // pastikan route ini ada
    query: {
      q: searchInput.value.trim(),
    },
  });
}

const touchStartX = ref(0);
const touchEndX = ref(0);

const DESCRIPTION_LIMIT = 300;

const normalizedDescription = computed(() => {
  const raw = product.value?.description;
  if (raw == null) return "";
  return String(raw).trim();
});

const isLongDescription = computed(() => {
  return (normalizedDescription.value.length || 0) > DESCRIPTION_LIMIT;
});

const displayedDescription = computed(() => {
  const desc = normalizedDescription.value;
  if (!desc) return "";

  if (showFullDescription.value) return desc;

  if (desc.length <= DESCRIPTION_LIMIT) return desc;
  return desc.slice(0, DESCRIPTION_LIMIT) + "...";
});

function handleTouchStart(e) {
  if (!e.touches || e.touches.length === 0) return;
  touchStartX.value = e.touches[0].clientX;
}

function handleTouchMove(e) {
  if (!e.touches || e.touches.length === 0) return;
  touchEndX.value = e.touches[0].clientX;
}

function handleTouchEnd() {
  const deltaX = touchEndX.value - touchStartX.value;

  if (Math.abs(deltaX) < swipeThreshold) return;

  if (deltaX > 0) {
    // swipe kanan → gambar sebelumnya
    prevImage();
  } else {
    // swipe kiri → gambar berikutnya
    nextImage();
  }

  // reset
  touchStartX.value = 0;
  touchEndX.value = 0;
}

function getOptionValueSrcUrl(optionIndex, valueId) {
  // optionIndex: 1 untuk option pertama, 2 untuk kedua
  const option = product.value?.options?.[optionIndex - 1];
  if (!option || !option.values) return null;
  const value = option.values.find((v) => Number(v.id) === Number(valueId));
  return value?.src_url || null;
}

async function addToCart() {
  if (authStore.isAdmin) {
    toast.warning("Admin tidak dapat menambahkan produk ke keranjang.");
    return;
  }

  if (!authStore.isAuthenticated) {
    toast.info("Silakan login terlebih dahulu untuk menambahkan ke keranjang.");
    router.push({
      name: "Login",
      query: { redirect: route.fullPath },
    });
    return;
  }

  if (getCurrentStock() <= 0) {
    toast.error("Stok habis");
    return;
  }

  if (sizes.value.length > 0 && !selectedSize.value) {
    toast.warning(`Pilih ${option1Label.value}`);
    return;
  }

  if (variants.value.length > 0 && !selectedVariant.value) {
    toast.warning(`Pilih ${option2Label.value}`);
    return;
  }

  try {
    const sizeId = selectedSize.value?.id ?? 0;
    const variantId = selectedVariant.value?.id ?? 0;

    const matchedCombo = stockCombinations.value.find(
      (c) =>
        Number(c.sizeId) === Number(sizeId) &&
        Number(c.variantId) === Number(variantId),
    );

    if (!matchedCombo && (sizes.value.length || variants.value.length)) {
      toast.error("Varian tidak valid");
      return;
    }

    const payload = {
      product_id: product.value.id,
      quantity: quantity.value,
      variant_id: matchedCombo?.product_variant_id ?? null,
      addons: selectedAddons.value.map((a) => ({
        group_id: a.addon_group_id,
        addon_id: a.addon_id,
      })),
    };

    await addCart(payload);
    await cartStore.fetchCartCount(true); // force refresh

    toast.success("Produk ditambahkan ke keranjang");
  } catch (e) {
    toast.error(e.response?.data?.message || "Gagal menambahkan ke keranjang");
  }
}

const { fetchPublicProductDetail, fetchProductDetail } = useProducts(); // support both if available
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const product = ref(null);
const quantity = ref(1);
const showAddonModal = ref(false);
const showShareModal = ref(false);

const isMouseDown = ref(false);
const mouseStartX = ref(0);
const mouseDeltaX = ref(0);
const swipeThreshold = 50;

let abortController = null;

// image / gallery state
const productImages = ref([]);
const selectedImage = computed(
  () => productImages.value[currentImageIndex.value] || null,
);

// product options/variants state
const sizes = ref([]);
const selectedSize = ref(null);
const variants = ref([]);
const selectedVariant = ref(null);
const stockCombinations = ref([]);

// addons
const selectedAddons = ref([]);
const tempSelectedAddons = ref([]);
const addonGroups = ref([]);

// misc
const showScrollHeader = ref(true);
const lastScrollY = ref(0);
const relatedProducts = ref([]);
const cartItemsCount = computed(() => {
  return cartStore.totalItems || 0;
});

const shareUrl = computed(() => window.location.href);

const shareText = computed(() => {
  return `${product.value?.name || "Produk menarik"} - Rp ${formatIDR(
    getCurrentPrice(),
  )}`;
});
async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    toast.success("Link produk berhasil disalin ");
  } catch (e) {
    // fallback untuk browser lama
    const input = document.createElement("input");
    input.value = shareUrl.value;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);

    toast.success("Link produk berhasil disalin ");
  }
}

function shareVia(platform) {
  const url = encodeURIComponent(shareUrl.value);
  const text = encodeURIComponent(shareText.value);

  let shareLink = "";

  switch (platform) {
    case "whatsapp":
      // Mobile & desktop support
      shareLink = `https://wa.me/?text=${text}%20${url}`;
      break;

    case "facebook":
      shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;

    case "twitter":
      // Twitter / X
      shareLink = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      break;

    default:
      return;
  }

  window.open(shareLink, "_blank", "noopener,noreferrer");
}

// body scroll lock for modals
const isAnyModalOpen = computed(
  () => showAddonModal.value || showShareModal.value,
);
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
useBodyScrollLock(isAnyModalOpen);
const goBack = () => {
  router.back();
};

// -------------- stock/price helpers (kept dari kode Anda, sedikit disesuaikan) --------------
function getSizeIdByName(name) {
  const found = sizes.value.find((s) => String(s.name) === String(name));
  return found?.id ?? null;
}

function getCurrentStock() {
  if (
    !Array.isArray(stockCombinations.value) ||
    stockCombinations.value.length === 0
  )
    return 0;
  const sizeKey = selectedSize.value?.id ?? selectedSize.value?.value?.id ?? 0;
  const variantKey =
    selectedVariant.value?.id ?? selectedVariant.value?.value?.id ?? 0;
  const found = stockCombinations.value.find(
    (c) =>
      Number(c.sizeId) === Number(sizeKey) &&
      Number(c.variantId) === Number(variantKey),
  );
  return Number(found?.stock ?? 0);
}
function getVariantStock(variantId) {
  if (!Array.isArray(stockCombinations.value)) return 0;
  const sizeKey = selectedSize.value?.id ?? selectedSize.value?.value?.id ?? 0;
  const found = stockCombinations.value.find(
    (c) =>
      Number(c.sizeId) === Number(sizeKey) &&
      Number(c.variantId) === Number(variantId),
  );
  return Number(found?.stock ?? 0);
}
function getSizeStock(sizeNameOrId) {
  const sizeId =
    typeof sizeNameOrId === "string"
      ? getSizeIdByName(sizeNameOrId)
      : sizeNameOrId;
  if (!Array.isArray(stockCombinations.value) || sizeId == null) return 0;
  return stockCombinations.value
    .filter((c) => Number(c.sizeId) === Number(sizeId))
    .reduce((sum, c) => sum + Number(c.stock || 0), 0);
}
function isSizeAvailable(sizeNameOrId) {
  return getSizeStock(sizeNameOrId) > 0;
}
function isVariantAvailable(variantId) {
  return getVariantStock(variantId) > 0;
}
function getCurrentPrice() {
  if (
    !Array.isArray(stockCombinations.value) ||
    stockCombinations.value.length === 0
  ) {
    return Number(product.value?.price || 0);
  }
  const sizeKey = selectedSize.value?.id ?? selectedSize.value?.value?.id ?? 0;
  const variantKey =
    selectedVariant.value?.id ?? selectedVariant.value?.value?.id ?? 0;

  let found =
    stockCombinations.value.find(
      (c) =>
        Number(c.sizeId) === Number(sizeKey) &&
        Number(c.variantId) === Number(variantKey) &&
        Number(c.stock) > 0,
    ) ||
    stockCombinations.value.find(
      (c) =>
        Number(c.sizeId) === Number(sizeKey) &&
        Number(c.variantId) === Number(variantKey),
    );

  if (!found) {
    const min = Number(product.value?.price || 0);
    return min;
  }
  return Number(found.price ?? product.value?.price ?? 0);
}

// quantity helpers
function validateQuantity() {
  const stock = getCurrentStock();
  let q = Number(quantity.value || 0);
  if (stock <= 0) {
    quantity.value = 0;
    return;
  }
  const min = Math.max(1, Number(product.value?.min_purchase ?? 1));
  if (isNaN(q) || q < min) q = min;
  if (q > stock) q = stock;
  quantity.value = q;
}
function increaseQuantity() {
  const stock = getCurrentStock();
  if (stock <= 0) return;
  const next = Number(quantity.value || 0) + 1;
  quantity.value = Math.min(next, stock);
}
function decreaseQuantity() {
  const stock = getCurrentStock();
  if (stock <= 0) {
    quantity.value = 0;
    return;
  }
  const min = Math.max(1, Number(product.value?.min_purchase ?? 1));
  const next = Number(quantity.value || 0) - 1;
  quantity.value = Math.max(next, min);
}

// -------------- fetching & normalization --------------
function resetStateBeforeFetch() {
  product.value = null;
  productImages.value = [];
  sizes.value = [];
  variants.value = [];
  stockCombinations.value = [];
  selectedSize.value = null;
  selectedVariant.value = null;
  addonGroups.value = [];
  selectedAddons.value = [];
  tempSelectedAddons.value = [];
  relatedProducts.value = [];
}

const shareProduct = async () => {
  const title = product.value?.name || "Produk Menarik";
  const text = `${title} - Rp ${formatIDR(getCurrentPrice())}`;
  const url = window.location.href;

  // ✅ Native Share API (Mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return;
    } catch (err) {
      // user cancel share → tidak perlu error
      console.debug("Share dibatalkan", err);
      return;
    }
  }

  // ❌ Fallback → buka modal custom (Desktop / browser lama)
  showShareModal.value = true;
};

function initDefaultRequiredAddons() {
  const defaults = [];

  addonGroups.value.forEach((group) => {
    if (isSingleRequired(group) && Array.isArray(group.items)) {
      const first = group.items[0];
      if (first?.addon_id) {
        defaults.push({
          addon_group_id: group.id,
          addon_id: first.addon_id,
          name: first.name,
          price: Number(first.price || 0),
        });
      }
    }
  });

  selectedAddons.value = defaults;
  tempSelectedAddons.value = [...defaults];
}

async function doFetchProduct(slug) {
  if (!slug) return;

  if (abortController) {
    try {
      abortController.abort();
    } catch (e) {}
  }
  abortController = new AbortController();

  loading.value = true;
  resetStateBeforeFetch();

  // small helpers (local)
  function normalizeProductImages(images) {
    // images bisa berupa: string URL, object { id, image_path, image_url }, atau hasil buildImageUrl sebelumnya
    return images
      .map((img) => {
        if (!img) return null;
        if (typeof img === "string") return img;
        if (typeof img === "object") {
          // jika sudah berupa absolute url
          if (img.image_url) return img.image_url;
          // jika id tersedia — gunakan getImageUrl helper (yang kamu import)
          if (img.src_url) return img.src_url;
          // jika image_path tersedia, coba resolve
          if (img.image_path) {
            return typeof absoluteImagePath === "function"
              ? absoluteImagePath(img.image_path)
              : _absoluteImagePath
                ? _absoluteImagePath(img.image_path)
                : `${
                    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
                  }/storage/${img.image_path}`;
          }
        }
        return null;
      })
      .filter(Boolean);
  }

  function resolveImageUrlFromSource(src) {
    if (!src) return null;
    if (typeof src === "string") return src;
    if (typeof src === "object") {
      if (src.image_url) return src.image_url;
      if (src.src_url) return src.src_url;
    }
    return null;
  }

  try {
    const fetcher =
      typeof fetchPublicProductDetail === "function"
        ? fetchPublicProductDetail
        : fetchProductDetail;
    const mapped = await fetcher(slug, { signal: abortController.signal });

    // fallback: jika endpoint mengembalikan raw product tanpa mapping
    if (!mapped || !mapped.product) {
      const maybeProduct = mapped?.product ?? mapped;
      if (!maybeProduct) {
        router.replace({ name: "Beranda" });
        return;
      }

      const fallbackMapped = {
        product: maybeProduct,
        productImages: (maybeProduct.images || []).map((img) => img?.src_url),
        sizes: (maybeProduct.options?.[0]?.values || []).map((v) => ({
          id: v.id,
          name: v.option_value ?? v.name,
          image: v.image_url || v.image_path || null,
        })),
        variants: (maybeProduct.options?.[1]?.values || []).map((v) => ({
          id: v.id,
          name: v.option_value ?? v.name,
          image: v.image_url || v.image_path || null,
        })),
        stockCombinations: (mapped?.combinations || []).map((c) => ({
          ...c,
          sizeId: Number(c.sizeId || 0),
          variantId: Number(c.variantId || 0),
          stock: Number(c.stock || 0),
          price: Number(c.price || 0),
        })),
        addonGroups:
          maybeProduct.addon_groups || maybeProduct.addonGroups || [],
        selectedSize: null,
        selectedVariant: null,
        related_products: mapped.related_products || [],
        min_purchase: maybeProduct.min_purchase ?? 1,
        optionDefinitions: (maybeProduct.options || []).map((o) => ({
          id: o.id,
          option_name: o.option_name || o.name,
          uses_image: !!o.uses_image,
          values: (o.values || []).map((v) => ({
            id: v.id,
            dbId: v.id,
            product_option_id: v.product_option_id,
            option_value: v.option_value,
            image_url: v.image_url || null,
            image_path: v.image_path || null,
            preview:
              v.image_url ||
              (v.image_path
                ? typeof absoluteImagePath === "function"
                  ? absoluteImagePath(v.image_path)
                  : `${
                      import.meta.env.VITE_API_BASE_URL ||
                      "http://localhost:8000"
                    }/storage/${v.image_path}`
                : null) ||
              null,
          })),
        })),
      };

      Object.assign(mapped, fallbackMapped);
    }

    // assign core product info
    product.value = {
      ...mapped.product,
      price: Number(mapped.price_range?.min ?? mapped.product?.price ?? 0),
      min_purchase: Number(
        mapped.min_purchase ?? mapped.product?.min_purchase ?? 1,
      ),
      merchant_address:
        mapped.product &&
        mapped.product.merchant &&
        mapped.product.merchant.address
          ? mapped.product.merchant.address
          : (mapped.merchant_address ?? null),
    };
    // IMAGES: normalisasi dari berbagai sumber
    if (Array.isArray(mapped.productImages) && mapped.productImages.length) {
      productImages.value = normalizeProductImages(mapped.productImages);
    } else if (
      Array.isArray(mapped.product?.images) &&
      mapped.product.images.length
    ) {
      productImages.value = normalizeProductImages(mapped.product.images);
    } else if (mapped.product?.cover_image) {
      const u = resolveImageUrlFromSource(mapped.product.cover_image);
      if (u) productImages.value.push(u);
    }

    // optionDefinitions adalah sumber kebenaran (normalisasi dari composable)
    const optionDefs =
      mapped.optionDefinitions ?? mapped.product?.options ?? [];
    // buat juga convenience arrays option1Values / option2Values di state kompatibel
    const option1Vals = Array.isArray(optionDefs[0]?.values)
      ? optionDefs[0].values
      : [];
    const option2Vals = Array.isArray(optionDefs[1]?.values)
      ? optionDefs[1].values
      : [];

    // sizes & variants untuk kompatibilitas komponen lama (tetap isi tapi jangan pakai sebagai sumber label)
    sizes.value = option1Vals.map((v) => ({
      id: v.id,
      name: v.option_value ?? v.name,
      image: v.image_url || null,
    }));
    variants.value = option2Vals.map((v) => ({
      id: v.id,
      name: v.option_value ?? v.name,
      image: v.image_url || null,
    }));

    // stockCombinations (pastikan format konsisten)
    stockCombinations.value = Array.isArray(mapped.stockCombinations)
      ? mapped.stockCombinations.map((c) => ({
          product_variant_id: c.product_variant_id ?? c.id ?? null,
          sizeId: Number(c.sizeId ?? c.size_id ?? 0),
          variantId: Number(c.variantId ?? c.variant_id ?? 0),
          price: Number(c.price ?? mapped.product?.price ?? 0),
          stock: Number(c.stock ?? 0),
          sku: c.sku ?? null,
        }))
      : [];

    // optionDefinitions kept for template direct access
    // assign to product.value so template / other computed dapat mengakses product.optionDefinitions
    product.value.optionDefinitions = optionDefs;

    // addon groups / related products
    addonGroups.value = Array.isArray(mapped.addonGroups)
      ? mapped.addonGroups
      : (mapped.product?.addon_groups ?? []);

    relatedProducts.value = Array.isArray(mapped.related_products)
      ? mapped.related_products
      : (mapped.relatedProducts ?? []);
    // defaults selected (mapped may already provide selectedSize/selectedVariant with id/name)
    selectedSize.value =
      mapped.selectedSize ?? (sizes.value.length ? sizes.value[0] : null);
    selectedVariant.value =
      mapped.selectedVariant ??
      (variants.value.length ? variants.value[0] : null);
    selectedAddons.value = [];
    tempSelectedAddons.value = [];

    // lalu init addon wajib
    initDefaultRequiredAddons();
    // fallback: kalau tidak ada productImages tapi variant memiliki display_image gunakan itu
    if (
      (!productImages.value || productImages.value.length === 0) &&
      Array.isArray(variants.value) &&
      variants.value.length
    ) {
      const imgFromVariant =
        variants.value.find((v) => v.display_image || v.image)?.display_image ??
        variants.value.find((v) => v.image)?.image;
      if (imgFromVariant) productImages.value.push(imgFromVariant);
    }
  } catch (e) {
    if (e?.name === "AbortError") return;
    if (e?.response?.status === 404) {
      router.replace({ name: "Beranda" });
      return;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  window.addEventListener("scroll", handleScroll);
  if (authStore.isAuthenticated) {
    await cartStore.fetchCartCount(true);
  }
});
watch(product, (p) => {
  if (!p) return;

  const merchantName =
    p?.merchant?.name || p?.store?.name || p?.merchant_name || "SUMILIR";

  const descRaw =
    typeof p?.description === "string"
      ? p.description
      : String(p?.description || "");
  const description = descRaw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 170);

  const ogImage = selectedImage.value || productImages.value?.[0] || undefined;

  let ogImageAbs = ogImage;
  try {
    ogImageAbs = ogImage
      ? new URL(ogImage, window.location.origin).href
      : ogImage;
  } catch (e) {
    // keep as-is
  }

  const canonicalUrl = `${window.location.origin}/products/${p?.slug || ""}`;

  setMeta({
    title: `${p.name} | ${merchantName} – SUMILIR`,
    description,
    image: ogImage,
    url: canonicalUrl,
    type: "product",
  });

  // Basic Product JSON-LD (helps SEO + share previews where supported)
  const price = Number(getCurrentPrice() || p?.price || 0);
  const stock = Number(getCurrentStock() || 0);
  const images = [ogImageAbs].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p?.name || "Produk",
    description,
    image: images.length ? images : undefined,
    brand: merchantName ? { "@type": "Brand", name: merchantName } : undefined,
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "IDR",
      price: Number.isFinite(price) ? String(price) : undefined,
      availability:
        !isArchived.value && stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  // Remove undefined keys so JSON-LD is clean
  for (const k of Object.keys(jsonLd)) {
    if (jsonLd[k] === undefined) delete jsonLd[k];
  }
  for (const k of Object.keys(jsonLd.offers || {})) {
    if (jsonLd.offers[k] === undefined) delete jsonLd.offers[k];
  }

  setJsonLd("jsonld-product", jsonLd);
});
watch(
  () => authStore.authReady,
  (ready) => {
    if (!ready) return;

    if (authStore.isAuthenticated) {
      cartStore.fetchCartCount(true);
    } else {
      cartStore.reset();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (abortController) {
    try {
      abortController.abort();
    } catch (e) {}
    abortController = null;
  }
  window.removeEventListener("scroll", handleScroll);
});
onUnmounted(() => window.removeEventListener("scroll", handleScroll));
const currentImageIndex = ref(0);
// simple scroll handler (as in your original)
function handleScroll() {
  const currentY = window.scrollY || document.documentElement.scrollTop || 0;

  const delta = currentY - lastScrollY.value;

  // threshold agar tidak flicker
  const THRESHOLD = 10;

  if (Math.abs(delta) < THRESHOLD) return;

  if (delta > 0 && currentY > 80) {
    // 🔽 scroll ke bawah → sembunyikan navbar
    showScrollHeader.value = false;
  } else {
    // 🔼 scroll ke atas → tampilkan navbar
    showScrollHeader.value = true;
  }

  lastScrollY.value = currentY;
}

// buyNow: keep your existing behavior, but use safe fields
function buyNow() {
  if (authStore.isAdmin) {
    toast.warning("Admin tidak dapat melakukan pembelian.");
    return;
  }

  const qty = Number(quantity.value || 1);
  const unitPrice =
    Number(getCurrentPrice()) || Number(product.value?.price || 0);

  const sizeId = selectedSize.value?.id ?? null;
  const sizeName = selectedSize.value?.name ?? "";

  const optionVariantId = selectedVariant.value?.id ?? 0;
  const variantName = [sizeName, selectedVariant.value?.name]
    .filter(Boolean)
    .join(" - ");

  const stock = getCurrentStock();
  const store = product.value?.merchant || product.value?.store || {};
  const merchantAddress =
    product.value?.merchant_address ?? store.address ?? "";
  const checkout = useCheckoutStore();

  // ✅ HITUNG matchedCombo DULU
  const matchedCombo = stockCombinations.value.find(
    (c) =>
      Number(c.sizeId) === Number(sizeId) &&
      Number(c.variantId) === Number(optionVariantId),
  );

  if (!matchedCombo) {
    toast.error("Varian tidak valid");
    return;
  }

  // ✅ BARU PAKAI
  const productVariantId = matchedCombo.product_variant_id;

  checkout.setFromProductDetail({
    slug: product.value?.slug,
    title: product.value?.name,
    image: selectedImage.value || productImages.value?.[0] || "",
    store: {
      id: store.id ?? null,
      slug: store.slug ?? null,
      name: store.name ?? "",
      address: merchantAddress,
      phone: store.phone ?? "",
    },
    qty,
    sizeId,
    sizeName,
    variantId: productVariantId, // ✅ BENAR
    variantName,
    unitPrice,
    stock,
    addons: selectedAddons.value,
  });

  router.push({
    path: "/product-payment",
    query: {
      slug: product.value?.slug || "",
      storeId: store.id ? String(store.id) : "",
      storeSlug: store.slug || "",
    },
  });
}

function isAddonSelected(addon) {
  return tempSelectedAddons.value.some(
    (a) => Number(a.addon_id) === Number(addon.addon_id),
  );
}

// Toggle untuk group multiple (checkbox)
function toggleAddon(addon, group) {
  const addonId = addon.addon_id ?? addon.id;
  if (!addonId) return;

  const idx = tempSelectedAddons.value.findIndex(
    (a) => Number(a.addon_id) === Number(addonId),
  );

  if (idx >= 0) {
    tempSelectedAddons.value.splice(idx, 1);
  } else {
    tempSelectedAddons.value.push({
      addon_group_id: group.id,
      addon_id: addonId,
      name: addon.name,
      price: Number(addon.price || 0),
    });
  }
}

// Pilih single untuk group maxSelection === 1 (radio)
function selectSingleAddon(addon, group) {
  if (!addon || !addon.addon_id) {
    console.warn("Invalid addon object", addon);
    return;
  }

  tempSelectedAddons.value = tempSelectedAddons.value.filter(
    (a) => Number(a.addon_group_id) !== Number(group.id),
  );

  tempSelectedAddons.value.push({
    addon_group_id: group.id,
    addon_id: addon.addon_id,
    name: addon.name,
    price: Number(addon.price || 0),
  });
}

// Cek apakah group sudah mencapai batas pilihan (dipakai di template disable checkbox)
function isGroupMaxed(group, addon) {
  const count = tempSelectedAddons.value.filter((a) =>
    group.items.some((gi) => Number(gi.addon?.id) === Number(a.addon_id)),
  ).length;
  const maxSel = Number(group.maxSelection || 1);
  // jika addon belum dipilih dan count sudah max, maka group maxed
  const alreadySelected = isAddonSelected(addon);
  return !alreadySelected && count >= maxSel;
}

// Harga total sementara di modal
function calculateTempAddonPrice() {
  return tempSelectedAddons.value.reduce(
    (sum, a) => sum + Number(a.price || 0),
    0,
  );
}

// Reset pilihan di modal (kosongkan semua atau kembalikan default wajib)
function resetAddons() {
  tempSelectedAddons.value = [];

  addonGroups.value.forEach((group) => {
    const minSel = Number(group.min_selection ?? (group.required ? 1 : 0));
    const maxSel = Number(group.maxSelection ?? group.max_selection ?? 1);

    if (minSel > 0 && maxSel === 1 && Array.isArray(group.items)) {
      const first = group.items[0];
      if (first?.addon_id) {
        tempSelectedAddons.value.push({
          addon_group_id: group.id,
          addon_id: first.addon_id,
          name: first.name,
          price: Number(first.price || 0),
        });
      }
    }
  });
}
function isSingleRequired(group) {
  const min = Number(group.min_selection ?? (group.required ? 1 : 0));
  const max = Number(group.maxSelection ?? group.max_selection ?? 1);

  return min === 1 && max === 1;
}

// Terapkan pilihan modal ke pilihan final
function applyAddons() {
  selectedAddons.value = [...tempSelectedAddons.value];
  showAddonModal.value = false;
}

function handleMouseDown(e) {
  // hanya tombol kiri mouse
  if (e.button !== 0) return;
  isMouseDown.value = true;
  mouseStartX.value = e.clientX;
  mouseDeltaX.value = 0;
}

function handleMouseMove(e) {
  if (!isMouseDown.value) return;
  mouseDeltaX.value = e.clientX - mouseStartX.value;
}

function handleMouseUp() {
  if (!isMouseDown.value) return;
  // Tentukan arah berdasarkan deltaX
  if (mouseDeltaX.value > swipeThreshold) {
    prevImage();
  } else if (mouseDeltaX.value < -swipeThreshold) {
    nextImage();
  }
  // reset
  isMouseDown.value = false;
  mouseStartX.value = 0;
  mouseDeltaX.value = 0;
}

function handleMouseLeave() {
  // Jika keluar area saat drag, anggap mouse up
  if (!isMouseDown.value) return;
  handleMouseUp();
}

function selectImage(index) {
  if (!Array.isArray(productImages.value) || productImages.value.length === 0)
    return;
  const max = productImages.value.length - 1;
  currentImageIndex.value = Math.min(Math.max(Number(index) || 0, 0), max);
}

function prevImage() {
  if (!Array.isArray(productImages.value) || productImages.value.length === 0)
    return;
  currentImageIndex.value =
    (currentImageIndex.value - 1 + productImages.value.length) %
    productImages.value.length;
}

function nextImage() {
  if (!Array.isArray(productImages.value) || productImages.value.length === 0)
    return;
  currentImageIndex.value =
    (currentImageIndex.value + 1) % productImages.value.length;
}

// ✅ ADDED: Use body scroll lock for modals
useBodyScrollLock(isAnyModalOpen);

// Helper: format currency
const formatIDR = (v) => Number(v || 0).toLocaleString("id-ID");

// ✅ Reset qty saat pilihan size/variant berubah agar tidak melebihi stok baru
watch(
  [selectedSize, selectedVariant, stockCombinations],
  () => {
    // Jika stok baru < qty, sesuaikan
    validateQuantity();
  },
  { immediate: true },
);

// ✅ Restore: total price calculator (base + addons) × quantity
const calculateAddonOnlyPrice = () =>
  selectedAddons.value.reduce((sum, a) => sum + Number(a.price), 0);

const calculateTotalPrice = () => {
  const base = getCurrentPrice();
  const addons = calculateAddonOnlyPrice();
  return Math.max(0, (base + addons) * Number(quantity.value || 1));
};

// ✅ Restore: archived flag (used by banner)
const isArchived = computed(() => product.value?.status === "archived");

// ✅ Low stock helper (threshold 10 seperti UI)
function isLowStock() {
  const s = getCurrentStock();
  return s > 0 && s <= 10;
}

// ✅ Color class untuk stok saat ini (dipakai di template)
function getStockColorClass() {
  const s = getCurrentStock();
  if (s === 0) return "text-red-600";
  if (s <= 10) return "text-amber-700";
  return "text-gray-900";
}

// ✅ Helper: ambil slug dari route
function getProductSlug() {
  return route.params.slug;
}

// watch route.params.slug supaya ketika Vue Router reuse komponen dan params berubah kita refetch
watch(
  () => route?.params?.slug,
  (newSlug, oldSlug) => {
    if (!newSlug || newSlug === oldSlug) return;
    doFetchProduct(String(newSlug));
  },
  { immediate: true },
);

// bersihkan saat unmount: cancel request & remove event listener
onBeforeUnmount(() => {
  if (abortController) {
    try {
      abortController.abort();
    } catch (e) {}
    abortController = null;
  }
  window.removeEventListener("scroll", handleScroll);
});

// Cleanup scroll listener
onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});

// ✅ Gunakan label opsi dari product.options agar tidak hardcode
const option1Label = computed(
  () => product.value?.options?.[0]?.option_name || "Opsi 1",
);
const option2Label = computed(
  () => product.value?.options?.[1]?.option_name || "Opsi 2",
);

// ✅ Min pembelian (dipakai di template)
const minPurchase = computed(() => Number(product.value?.min_purchase ?? 1));

// Helper stok & harga (tetap, sudah pakai ID)
// getCurrentStock(), getSizeStock(), getVariantStock(), getCurrentPrice() tetap bekerja,
// karena stockCombinations kini berasal dari payload.combinations dan variantId bisa 0 untuk produk 1 opsi.

// Navigasi ke detail produk lain
function viewProduct(slug) {
  if (!slug) return;
  router.push({ name: "Product Detail", params: { slug } });
}
</script>

<style scoped>
/* Smooth transitions for image changes */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.group img {
  animation: fadeIn 0.3s ease-out;
}

/* ✅ Strip horizontal scroll */
.thumb-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  padding-top: 4px;
  padding-left: 4px;
  -webkit-overflow-scrolling: touch; /* smooth on iOS */
  scroll-behavior: smooth;
}

/* Hide scrollbar (Chrome/Edge) */
.thumb-strip::-webkit-scrollbar {
  height: 0;
}

/* Hide scrollbar (Firefox) */
.thumb-strip {
  scrollbar-width: none;
}

/* Item gaya konsisten */
.thumb-item {
  flex: 0 0 auto;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #e5e7eb; /* gray-200 */
  transition: all 0.2s ease;
}
.thumb-item:hover {
  transform: scale(1.05);
  border-color: #d1d5db; /* gray-300 */
}
.thumb-item.active {
  border-color: var(--color-primary, #ffa30e);
  box-shadow: 0 0 0 4px rgba(255, 163, 14, 0.15);
  transform: scale(1.05);
}
</style>
