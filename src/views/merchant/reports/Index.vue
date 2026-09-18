<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header - FIXED -->
    <div
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-6 bg-white sm:static sm:px-6"
    >
      <div class="flex items-center gap-3">
        <!-- Hamburger Button (Mobile) -->
        <button
          @click="emit('toggle-sidebar')"
          class="flex items-center justify-center w-10 h-10 transition bg-white rounded-full hover:bg-muted-background lg:hidden active:scale-95"
          aria-label="Toggle Sidebar"
        >
          <i class="pi pi-bars text-gray-600"></i>
        </button>

        <div>
          <!-- Desktop Breadcrumb & Title -->
          <div class="hidden sm:block">
            <Breadcrumb
              :items="breadcrumbItems"
              :merchantId="merchantSlug"
            />
            <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
              Lihat dan Unduh riwayat transaksi
            </p>
          </div>

          <!-- Mobile Title -->
          <div class="sm:hidden">
            <h1 class="text-base font-bold text-merchant-primary">
              Laporan
            </h1>
            <p class="text-xs text-muted-foreground">
              Lihat dan Unduh riwayat transaksi
            </p>
          </div>
        </div>
      </div>

      <!-- Header Action: Export Button -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Desktop Export Button -->
        <Button
          @click="showExportModal = true"
          variant="merchant-outline"
          size="sm"
          :loading="loadingExport"
          customClass="!hidden md:!inline"
        >
          <i v-if="!loadingExport" class="mr-1.5 pi pi-download text-xs"></i>
          <span class="hidden md:inline">Export</span>
        </Button>

        <!-- Mobile Export Button -->
        <Button
          @click="showExportModal = true"
          variant="merchant-outline"
          size="md"
          :loading="loadingExport"
          customClass="md:!hidden"
        >
          <i v-if="!loadingExport" class="pi pi-download text-xs"></i>
        </Button>
      </div>
    </div>

    <!-- Export Modal -->
    <ResponsiveModal
      v-model:show="showExportModal"
      title="Export Laporan Transaksi"
      footer-class="sm:hidden"
      @close="showExportModal = false"
    >
      <div class="space-y-3 pt-1">
        <!-- PDF Export Button -->
        <button
          @click="handleExport('pdf')"
          :disabled="loadingExport"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-merchant-primary active:scale-[0.99] group shadow-2xs"
          :class="loadingExport ? 'opacity-60 cursor-not-allowed' : ''"
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-xl shrink-0 bg-red-50 text-red-600 border border-red-100 group-hover:scale-105"
          >
            <i v-if="loadingExport && exportingType === 'pdf'" class="pi pi-spin pi-spinner text-xl"></i>
            <i v-else class="text-2xl pi pi-file-pdf"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-gray-900 sm:text-base">
                Export ke PDF
              </h4>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
                .pdf
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ loadingExport && exportingType === 'pdf' ? 'Sedang membuat berkas PDF...' : 'Download laporan rapi siap cetak format PDF' }}
            </p>
          </div>
        </button>

        <!-- Excel Export Button -->
        <button
          @click="handleExport('excel')"
          :disabled="loadingExport"
          class="flex items-center w-full gap-4 p-4 text-left transition border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-merchant-primary active:scale-[0.99] group shadow-2xs"
          :class="loadingExport ? 'opacity-60 cursor-not-allowed' : ''"
        >
          <div
            class="flex items-center justify-center w-12 h-12 transition-transform rounded-xl shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105"
          >
            <i v-if="loadingExport && exportingType === 'excel'" class="pi pi-spin pi-spinner text-xl"></i>
            <i v-else class="text-2xl pi pi-file-excel"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-gray-900 sm:text-base">
                Export ke Excel
              </h4>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                .xlsx
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ loadingExport && exportingType === 'excel' ? 'Sedang membuat berkas Excel...' : 'Download data spreadsheet untuk analisis lanjutan' }}
            </p>
          </div>
        </button>
      </div>

      <!-- Footer Actions -->
      <template #footer>
        <Button @click="showExportModal = false" :disabled="loadingExport" block variant="merchant">
          Tutup
        </Button>
      </template>
    </ResponsiveModal>

    <!-- Spacer untuk kompensasi fixed header mobile -->
     <div class="h-24 sm:h-0"></div>

    <div class="px-4 py-2 sm:px-6 sm:py-6 space-y-4">
      <!-- STICKY WRAPPER: FILTER, CHIPS & SUMMARY CARDS -->
      <div class="space-y-3">
        <!-- SEARCH + FILTER + REFRESH -->
        <div class="flex items-center gap-2">
          <TextField
            name="search"
            :modelValue="searchQuery"
            @update:modelValue="(v) => (searchQuery = v)"
            placeholder="Cari transaksi..."
            :hideLabel="true"
            variant="merchant"
            wrapperClass="flex-1"
            :alignWithPassword="false"
            @keyup.enter="handleSearch"
          />
          <button
            type="button"
            @click="fetchData"
            :disabled="loading"
            title="Segarkan Laporan"
            class="relative flex items-center justify-center transition bg-white border border-gray-300 w-11 h-11 rounded-xl hover:bg-gray-50 shrink-0"
          >
            <i :class="['text-gray-500 pi pi-refresh', { 'animate-spin text-merchant-primary': loading }]"></i>
          </button>
          <button
            type="button"
            @click="openFilterModal"
            class="relative flex items-center justify-center transition bg-white border border-gray-300 w-11 h-11 rounded-xl hover:bg-gray-50 shrink-0"
          >
            <i class="text-gray-500 pi pi-sliders-h"></i>
            <span
              v-if="activeFilterCount > 0"
              class="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white rounded-full bg-merchant-primary"
            >
              !
            </span>
          </button>
          <SelectField
            name="per_page"
            variant="merchant"
            size="sm"
            v-model="perPage"
            :options="perPageOptions"
            class="max-w-24 shrink-0"
            placeholder="10"
          />
        </div>

        <!-- Active Filters Display (Mirip Halaman Produk) -->
        <div v-if="activeFilterCount > 0" class="mb-4">
          <div
            class="p-4 border bg-merchant-primary/5 rounded-xl border-merchant-primary/20"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <i class="pi pi-filter text-merchant-primary"></i>
                <span class="text-sm font-semibold text-black">
                  {{ activeFilterCount }} Filter Aktif
                </span>
              </div>
              <button
                @click="resetFilter"
                class="flex items-center gap-1 text-xs font-medium text-danger-foreground hover:underline"
              >
                <i class="pi pi-times-circle"></i>
                Reset Semua
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <!-- Search Query Chip -->
              <span
                v-if="searchQuery"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
              >
                <i class="text-xs pi pi-search"></i>
                Cari: "{{ searchQuery }}"
                <button
                  @click="removeFilter('search')"
                  class="ml-1 hover:text-merchant-primary/80"
                >
                  <i class="text-xs pi pi-times"></i>
                </button>
              </span>

              <!-- Status Chip -->
              <span
                v-if="filters.status !== 'all'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
              >
                <i class="text-xs pi pi-bookmark"></i>
                Status: {{ statusLabel }}
                <button
                  @click="removeFilter('status')"
                  class="ml-1 hover:text-merchant-primary/80"
                >
                  <i class="text-xs pi pi-times"></i>
                </button>
              </span>

              <!-- Date Range Chip -->
              <span
                v-if="filters.start_date || filters.end_date"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
              >
                <i class="text-xs pi pi-calendar"></i>
                {{ dateRangeLabel }}
                <button
                  @click="removeFilter('date')"
                  class="ml-1 hover:text-merchant-primary/80"
                >
                  <i class="text-xs pi pi-times"></i>
                </button>
              </span>

              <!-- Sort Chip -->
              <span
                v-if="filters.sort_by !== 'newest'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-merchant-primary/30 text-merchant-primary rounded-lg text-xs font-medium"
              >
                <i class="text-xs pi pi-sort-alt"></i>
                Urutan: Terlama
                <button
                  @click="removeFilter('sort')"
                  class="ml-1 hover:text-merchant-primary/80"
                >
                  <i class="text-xs pi pi-times"></i>
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Summary Cards (Card Informasi Ringkasan) -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          <!-- Card 1: Total Transaksi -->
          <div class="p-3.5 sm:p-5 bg-white border border-gray-200/90 shadow-xs rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-sm hover:border-blue-200 group">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5">
                <p class="text-xs sm:text-sm font-medium text-gray-500">Total Transaksi</p>
                <div class="pt-0.5">
                  <div v-if="loading" class="h-6 sm:h-8 w-16 bg-gray-200 rounded animate-pulse my-0.5"></div>
                  <p v-else class="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                    {{ summary.total_transactions }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0 group-hover:scale-105 transition-transform">
                <i class="text-sm sm:text-lg pi pi-receipt"></i>
              </div>
            </div>
            <div class="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-400">
              <span class="truncate">Transaksi Terkonfirmasi</span>

            </div>
          </div>

          <!-- Card 2: Pendapatan Bersih -->
          <div class="p-3.5 sm:p-5 bg-white border border-gray-200/90 shadow-xs rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-sm hover:border-emerald-200 group">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5 min-w-0">
                <p class="text-xs sm:text-sm font-medium text-gray-500 truncate">Pendapatan Bersih</p>
                <div class="pt-0.5">
                  <div v-if="loading" class="h-6 sm:h-8 w-24 bg-gray-200 rounded animate-pulse my-0.5"></div>
                  <p v-else class="text-base sm:text-2xl font-bold text-merchant-primary tracking-tight truncate">
                    Rp {{ formatIDR(summary.total_revenue) }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0 group-hover:scale-105 transition-transform">
                <i class="text-sm sm:text-lg pi pi-wallet"></i>
              </div>
            </div>
            <div class="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs">
              <span class="text-gray-400 truncate">Hanya pesanan selesai</span>

            </div>
          </div>

          <!-- Card 3: Rata-rata Nilai Pesanan (AOV) -->
          <div class="col-span-2 lg:col-span-1 p-3.5 sm:p-5 bg-white border border-gray-200/90 shadow-xs rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-sm hover:border-amber-200 group">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5 min-w-0">
                <p class="text-xs sm:text-sm font-medium text-gray-500">Rata-rata Nilai Transaksi</p>
                <div class="pt-0.5">
                  <div v-if="loading" class="h-6 sm:h-8 w-24 bg-gray-200 rounded animate-pulse my-0.5"></div>
                  <p v-else class="text-base sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
                    Rp {{ formatIDR(averageOrderValue) }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0 group-hover:scale-105 transition-transform">
                <i class="text-sm sm:text-lg pi pi-chart-line"></i>
              </div>
            </div>
            <div class="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] sm:text-xs text-gray-400">
              <span>Per transaksi selesai</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="hidden sm:block">
        <MerchantTable
          :items="transactions"
          :columns="tableColumns"
          :loading="loading"
          :showCheckbox="false"
          :currentPage="currentPage"
          :totalPages="totalPages"
          :paginationInfo="paginationInfo"
          @page-change="handlePageChange"
          emptyMessage="Tidak ada transaksi ditemukan untuk filter ini."
        >
          <!-- Order Code Cell -->
          <template #cell-order_code="{ item }">
            <div class="space-y-1">
              <div class="font-mono text-sm font-bold text-gray-900">{{ item.order_code }}</div>
              <span
                class="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md shadow-2xs"
                :class="item.order_type === 'jasa' ? 'bg-primary text-white' : 'bg-merchant-primary text-white'"
              >
                {{ item.order_type === 'jasa' ? 'Layanan Jasa' : 'Produk' }}
              </span>
            </div>
          </template>

          <!-- Created At Cell -->
          <template #cell-created_at="{ item }">
            <div>
              <div class="text-sm font-medium text-gray-800">
                {{ formatDate(item.created_at) }}
              </div>
              <div class="text-xs text-gray-400">
                {{ formatTime(item.created_at) }}
              </div>
            </div> 
          </template>

          <!-- Customer Name Cell -->
          <template #cell-customer_name="{ item }">
            <div class="space-y-0.5">
              <div class="text-sm font-semibold text-gray-900">
                {{ item.customer_name }}
              </div>
              <div v-if="item.customer_phone && item.customer_phone !== '-'" class="text-xs text-gray-500 flex items-center gap-1">
                <i class="pi pi-phone text-[10px] text-emerald-600"></i>
                <span>{{ item.customer_phone }}</span>
              </div>
              <div v-if="item.first_item_name" class="text-xs text-gray-400 truncate max-w-[170px]" :title="item.first_item_name">
                <i class="pi pi-box text-[10px] mr-0.5"></i>
                <span>{{ item.first_item_name }}</span>
                <span v-if="item.item_count > 1" class="text-gray-500 font-medium"> (+{{ item.item_count - 1 }})</span>
              </div>
            </div>
          </template>

          <!-- Delivery Type Cell -->
          <template #cell-delivery_type="{ item }">
            <div>
              <span v-if="isFailedOrCancelled(item.status)" class="text-gray-400 text-sm">
                -
              </span>
              <span
                v-else-if="item.delivery_type && item.delivery_type !== '-'"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border shadow-2xs"
                :class="item.delivery_type === 'Ambil Sendiri' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'"
              >
                <i :class="item.delivery_type === 'Ambil Sendiri' ? 'pi pi-shopping-bag text-[10px]' : 'pi pi-truck text-[10px]'"></i>
                <span>{{ item.delivery_type }}</span>
              </span>
              <span v-else class="text-gray-400 text-sm">-</span>
            </div>
          </template>

          <!-- Payment Method Cell -->
          <template #cell-payment_method="{ item }">
            <span v-if="isFailedOrCancelled(item.status)" class="text-gray-400 text-sm">-</span>
            <span v-else class="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium">
              <i :class="[getPaymentBadge(item.payment_method).icon, getPaymentBadge(item.payment_method).iconClass]"></i>
              <span>{{ getPaymentBadge(item.payment_method).label }}</span>
            </span>
          </template>

          <!-- Status Cell -->
          <template #cell-status="{ item }">
            <StatusLabel v-bind="statusProps(item.status)" />
          </template>

          <!-- Gross Amount Cell -->
          <template #cell-gross_amount="{ item }">
            <div class="text-sm font-medium text-gray-700">
              Rp {{ formatIDR(item.gross_amount) }}
            </div>
          </template>

          <!-- Net Amount Cell -->
          <template #cell-net_amount="{ item }">
            <div>
              <div
                class="text-sm font-bold"
                :class="isFailedOrCancelled(item.status) ? 'text-gray-400 line-through' : 'text-merchant-primary'"
              >
                Rp {{ formatIDR(item.net_amount) }}
              </div>
              <div v-if="isFailedOrCancelled(item.status)" class="text-[10px] text-red-500 font-medium">
                Tidak Masuk Saldo
              </div>
            </div>
          </template>
        </MerchantTable>
      </div>

      <!-- Mobile Transaction Cards -->
      <div class="sm:hidden space-y-3">
        <!-- Loading State Skeleton -->
        <div v-if="loading" v-for="n in 3" :key="n" class="p-4 bg-white border border-gray-100 shadow-xs rounded-2xl animate-pulse space-y-3">
          <div class="flex justify-between items-center pb-2.5 border-b border-gray-100">
            <div class="h-4 bg-gray-200 rounded w-1/3"></div>
            <div class="h-5 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          <div class="h-3 bg-gray-200 rounded w-3/4"></div>
          <div class="flex justify-between pt-2.5 border-t border-gray-100">
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            <div class="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="transactions.length === 0" class="p-8 text-center bg-white border border-gray-200/90 shadow-xs rounded-2xl space-y-3">
          <div class="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-gray-100 text-gray-400">
            <i class="pi pi-inbox text-2xl"></i>
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-bold text-gray-800">Tidak ada transaksi ditemukan</h3>
            <p class="text-xs text-gray-500 max-w-xs mx-auto">
              Tidak ada data laporan yang cocok dengan kriteria filter saat ini.
            </p>
          </div>
          <Button v-if="activeFilterCount > 0" @click="resetFilter" variant="merchant-outline" size="sm" class="mt-2">
            <i class="pi pi-refresh mr-1.5 text-xs"></i>
            Reset Filter
          </Button>
        </div>

        <!-- Transaction Cards List -->
        <div
          v-else
          v-for="order in transactions"
          :key="order.id"
          class="p-4 bg-white border border-gray-200/90 shadow-xs rounded-2xl space-y-3 transition-all hover:border-gray-300"
        >
          <!-- Top: Order code, Type + Status -->
          <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-sm font-bold text-gray-900">{{ order.order_code }}</span>
                <span
                  class="px-1.5 py-0.5 text-[9px] font-bold rounded shadow-2xs"
                  :class="order.order_type === 'jasa' ? 'bg-primary text-white' : 'bg-merchant-primary text-white'"
                >
                  {{ order.order_type === 'jasa' ? 'Jasa' : 'Produk' }}
                </span>
              </div>
              <p class="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                <i class="pi pi-calendar text-[9px]"></i>
                <span>{{ formatDate(order.created_at) }} • {{ formatTime(order.created_at) }}</span>
              </p>
            </div>
            <StatusLabel v-bind="statusProps(order.status)" size="sm" />
          </div>

          <!-- Customer & Purchased Item Details -->
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 text-gray-800 font-semibold">
                <i class="pi pi-user text-gray-400 text-xs"></i>
                <span>{{ order.customer_name }}</span>
              </div>
              <a
                v-if="order.customer_phone && order.customer_phone !== '-'"
                :href="'tel:' + order.customer_phone"
                class="text-[11px] text-gray-500 hover:text-merchant-primary flex items-center gap-1 font-medium"
              >
                <i class="pi pi-phone text-[10px] text-emerald-600"></i>
                <span>{{ order.customer_phone }}</span>
              </a>
            </div>

            <!-- Item name preview -->
            <div v-if="order.first_item_name" class="flex items-center gap-1.5 text-[11px] text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
              <i class="pi pi-box text-gray-400 text-[10px]"></i>
              <span class="truncate font-medium">{{ order.first_item_name }}</span>
              <span v-if="order.item_count > 1" class="text-gray-400 font-normal shrink-0">
                (+{{ order.item_count - 1 }} lainnya)
              </span>
            </div>
          </div>

          <!-- Payment & Delivery Badges -->
          <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
            <template v-if="!isFailedOrCancelled(order.status)">
              <!-- Payment badge -->
              <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 rounded-md border border-gray-200/60">
                <i :class="[getPaymentBadge(order.payment_method).icon, getPaymentBadge(order.payment_method).iconClass, 'text-[10px]']"></i>
                <span>{{ getPaymentBadge(order.payment_method).label }}</span>
              </span>

              <!-- Delivery badge -->
              <span
                v-if="order.delivery_type && order.delivery_type !== '-'"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md border"
                :class="order.delivery_type === 'Ambil Sendiri' ? 'bg-amber-50 text-amber-700 border-amber-200/70' : 'bg-blue-50 text-blue-700 border-blue-200/70'"
              >
                <i :class="order.delivery_type === 'Ambil Sendiri' ? 'pi pi-shopping-bag text-[9px]' : 'pi pi-truck text-[9px]'"></i>
                <span>{{ order.delivery_type }}</span>
              </span>
            </template>
            <span v-else class="text-[10px] text-gray-400 italic">
              Pesanan dibatalkan / tidak selesai
            </span>
          </div>

          <!-- Bottom: Financial amounts -->
          <div class="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <div>
              <span class="text-[10px] text-gray-400 block font-medium">Gross (Kotor)</span>
              <span class="font-semibold text-gray-700">Rp {{ formatIDR(order.gross_amount) }}</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-gray-400 block font-medium">Pendapatan Bersih</span>
              <span
                class="text-sm font-bold"
                :class="isFailedOrCancelled(order.status) ? 'text-gray-400 line-through' : 'text-merchant-primary'"
              >
                Rp {{ formatIDR(order.net_amount) }}
              </span>
              <span v-if="isFailedOrCancelled(order.status)" class="text-[9px] text-red-500 font-semibold block">
                Tidak Masuk Saldo
              </span>
            </div>
          </div>
        </div>

        <!-- Mobile Pagination -->
        <div
          v-if="!loading && transactions.length > 0"
          class="pt-2 pb-4 sm:hidden"
        >
          <MobilePagination
            :current-page="currentPage"
            :total-pages="totalPages"
            @page-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- Filter Modal -->
    <ResponsiveModal
      v-model:show="showFilterModal"
      title="Filter & Urutkan Laporan"
      subtitle="Atur periode tanggal dan status pesanan untuk laporan"
      show-footer
      @close="showFilterModal = false"
    >
      <div class="space-y-6 pt-1">
        <!-- ===== QUICK DATE PRESETS ===== -->
        <div class="space-y-2.5">
          <label class="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <i class="pi pi-calendar text-merchant-primary"></i>
            Pilihan Cepat Periode
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in datePresets"
              :key="preset.id"
              type="button"
              @click="applyDatePreset(preset.id)"
              class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-95"
              :class="
                currentPresetId === preset.id
                  ? 'bg-merchant-primary text-white border-merchant-primary font-bold shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              "
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- ===== FILTER SECTION ===== -->
        <div class="space-y-4 pt-4 border-t border-gray-100">
          <h3
            class="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-700 uppercase"
          >
            <i class="pi pi-filter text-merchant-primary"></i>
            Rentang Tanggal Custom
          </h3>

          <div class="grid grid-cols-2 gap-3">
            <TextField
              name="start_date"
              type="date"
              label="Mulai Tanggal"
              v-model="modalFilters.start_date"
              variant="merchant"
            />
            <TextField
              name="end_date"
              type="date"
              label="Sampai Tanggal"
              v-model="modalFilters.end_date"
              variant="merchant"
            />
          </div>

          <!-- Status Pesanan Selection -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-700">Status Pesanan</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                type="button"
                @click="modalFilters.status = opt.value"
                class="px-2.5 py-2 text-xs font-medium rounded-lg border text-center transition-all active:scale-95"
                :class="
                  modalFilters.status === opt.value
                    ? 'border-merchant-primary bg-merchant-primary/10 text-merchant-primary font-bold'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                "
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- ===== SORT SECTION ===== -->
        <div class="pt-4 space-y-3 border-t border-gray-100">
          <h3
            class="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-700 uppercase"
          >
            <i class="pi pi-sort-alt text-merchant-primary"></i>
            Urutkan Transaksi
          </h3>

          <div class="grid grid-cols-2 gap-2">
            <button
              @click="modalFilters.sort_by = 'newest'"
              type="button"
              class="px-4 py-2.5 text-xs font-medium transition-all border rounded-xl flex items-center justify-center gap-2 active:scale-95"
              :class="
                modalFilters.sort_by === 'newest'
                  ? 'border-merchant-primary bg-merchant-primary/10 text-merchant-primary font-bold'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              "
            >
              <i class="pi pi-sort-amount-down-alt text-xs"></i>
              Terbaru (Default)
            </button>
            <button
              @click="modalFilters.sort_by = 'oldest'"
              type="button"
              class="px-4 py-2.5 text-xs font-medium transition-all border rounded-xl flex items-center justify-center gap-2 active:scale-95"
              :class="
                modalFilters.sort_by === 'oldest'
                  ? 'border-merchant-primary bg-merchant-primary/10 text-merchant-primary font-bold'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              "
            >
              <i class="pi pi-sort-amount-up text-xs"></i>
              Terlama
            </button>
          </div>
        </div>

      </div>

      <!-- Footer Buttons -->
      <template #footer>
        <div class="flex gap-3 w-full">
          <Button @click="resetFilter" variant="muted-outline" block>
            <i class="mr-1.5 pi pi-refresh text-xs"></i>
            Reset
          </Button>
          <Button @click="applyFilter" block variant="merchant">
            <i class="mr-1.5 pi pi-check text-xs"></i>
            Terapkan Filter
          </Button>
        </div>
      </template>
    </ResponsiveModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { getMerchantTransactionsReport, exportMerchantReportPdf, exportMerchantReportExcel } from '@/services/api/report';
import { saveBlob } from "@/libs/saveBlob.js";
import Breadcrumb from "@/components/merchant/Breadcrumb.vue";
import Button from "@/components/common/Button.vue";
import TextField from "@/components/forms/TextField.vue";
import SelectField from "@/components/forms/SelectField.vue";
import MerchantTable from "@/components/common/MerchantTable.vue";
import StatusLabel from "@/components/common/StatusLabel.vue";
import ResponsiveModal from "@/components/common/ResponsiveModal.vue";
import MobilePagination from "@/components/common/MobilePagination.vue";
import { formatTime, formatDate } from "@/libs/format.js";

const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const emit = defineEmits(["toggle-sidebar"]);

const loading = ref(true);
const loadingExport = ref(false);
const exportingType = ref(null); // 'pdf' | 'excel' | null

const transactions = ref([]);
const summary = ref({
  total_transactions: 0,
  total_revenue: 0,
});

const showFilterModal = ref(false);
const showExportModal = ref(false);

const currentPage = ref(1);
const totalPages = ref(1);
const perPageOptions = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];
const perPage = ref(Number(localStorage.getItem("reports_per_page")) || 10);
const paginationInfo = ref({
  start: 0,
  end: 0,
  total: 0,
  per_page: perPage.value
});

const searchQuery = ref('');
let searchTimeout = null;

const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  currentPage.value = 1;
  fetchData();
};

watch(searchQuery, (val, oldVal) => {
  if (val === oldVal) return;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchData();
  }, 400);
});

// Primary active filters
const filters = ref({
  start_date: '',
  end_date: '',
  status: 'all',
  sort_by: 'newest'
});

// Draft filters in modal
const modalFilters = ref({
  start_date: '',
  end_date: '',
  status: 'all',
  sort_by: 'newest'
});

const statusOptions = [
  { value: "all", label: "Semua" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Gagal / Batal" },
];

const merchantSlug = route.params.merchantSlug || authStore.merchantSlug;
const breadcrumbItems = computed(() => [{ label: "Laporan" }]);
const currentMerchant = computed(() => authStore.getMerchantBySlug(merchantSlug));
const currentMerchantName = computed(() => currentMerchant.value?.name || "UMKM");

const tableColumns = [
  { key: "order_code", label: "ID Pesanan" },
  { key: "created_at", label: "Tanggal" },
  { key: "customer_name", label: "Pembeli" },
  { key: "delivery_type", label: "Pengiriman" },
  { key: "payment_method", label: "Pembayaran" },
  { key: "status", label: "Status" },
  { key: "gross_amount", label: "Gross (Kotor)", align: "right" },
  { key: "net_amount", label: "Pendapatan Bersih", align: "right" },
];

// Helper Date Formatter YYYY-MM-DD
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Date Presets Configuration
const datePresets = [
  { id: 'all', label: 'Semua Waktu' },
  { id: 'today', label: 'Hari Ini' },
  { id: '7days', label: '7 Hari Terakhir' },
  { id: 'thisMonth', label: 'Bulan Ini' },
  { id: '30days', label: '30 Hari Terakhir' },
];

const applyDatePreset = (presetId) => {
  const today = new Date();
  if (presetId === 'all') {
    modalFilters.value.start_date = '';
    modalFilters.value.end_date = '';
  } else if (presetId === 'today') {
    const todayStr = formatDateForInput(today);
    modalFilters.value.start_date = todayStr;
    modalFilters.value.end_date = todayStr;
  } else if (presetId === '7days') {
    const past = new Date(today);
    past.setDate(today.getDate() - 6);
    modalFilters.value.start_date = formatDateForInput(past);
    modalFilters.value.end_date = formatDateForInput(today);
  } else if (presetId === 'thisMonth') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    modalFilters.value.start_date = formatDateForInput(firstDay);
    modalFilters.value.end_date = formatDateForInput(today);
  } else if (presetId === '30days') {
    const past = new Date(today);
    past.setDate(today.getDate() - 29);
    modalFilters.value.start_date = formatDateForInput(past);
    modalFilters.value.end_date = formatDateForInput(today);
  }
};

const currentPresetId = computed(() => {
  const s = modalFilters.value.start_date;
  const e = modalFilters.value.end_date;
  if (!s && !e) return 'all';

  const today = new Date();
  const todayStr = formatDateForInput(today);
  if (s === todayStr && e === todayStr) return 'today';

  const past7 = new Date(today);
  past7.setDate(today.getDate() - 6);
  if (s === formatDateForInput(past7) && e === todayStr) return '7days';

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  if (s === formatDateForInput(firstDay) && e === todayStr) return 'thisMonth';

  const past30 = new Date(today);
  past30.setDate(today.getDate() - 29);
  if (s === formatDateForInput(past30) && e === todayStr) return '30days';

  return null;
});

// Count active non-default filters
const activeFilterCount = computed(() => {
  let count = 0;
  if (searchQuery.value && searchQuery.value.trim()) count++;
  if (filters.value.status && filters.value.status !== 'all') count++;
  if (filters.value.start_date || filters.value.end_date) count++;
  if (filters.value.sort_by && filters.value.sort_by !== 'newest') count++;
  return count;
});

// Average Order Value (AOV)
const averageOrderValue = computed(() => {
  const total = Number(summary.value.total_transactions || 0);
  const revenue = Number(summary.value.total_revenue || 0);
  if (!total || total <= 0) return 0;
  return Math.round(revenue / total);
});

// Chips Display Text
const statusLabel = computed(() => {
  const opt = statusOptions.find(o => o.value === filters.value.status);
  return opt ? opt.label : filters.value.status;
});

const dateRangeLabel = computed(() => {
  if (filters.value.start_date && filters.value.end_date) {
    if (filters.value.start_date === filters.value.end_date) {
      return formatDate(filters.value.start_date);
    }
    return `${formatDate(filters.value.start_date)} - ${formatDate(filters.value.end_date)}`;
  }
  if (filters.value.start_date) {
    return `Mulai ${formatDate(filters.value.start_date)}`;
  }
  if (filters.value.end_date) {
    return `Sampai ${formatDate(filters.value.end_date)}`;
  }
  return '';
});

// Open Filter Modal with synced draft
const openFilterModal = () => {
  modalFilters.value = { ...filters.value };
  showFilterModal.value = true;
};

// Apply filters from modal
const applyFilter = () => {
  filters.value = { ...modalFilters.value };
  showFilterModal.value = false;
  currentPage.value = 1;
  fetchData();
};

// Reset all filters
const resetFilter = () => {
  searchQuery.value = '';
  filters.value = {
    start_date: '',
    end_date: '',
    status: 'all',
    sort_by: 'newest'
  };
  modalFilters.value = { ...filters.value };
  showFilterModal.value = false;
  currentPage.value = 1;
  fetchData();
};

// Remove single filter chip
const removeFilter = (key) => {
  if (key === 'search') {
    searchQuery.value = '';
  } else if (key === 'status') {
    filters.value.status = 'all';
    modalFilters.value.status = 'all';
  } else if (key === 'date') {
    filters.value.start_date = '';
    filters.value.end_date = '';
    modalFilters.value.start_date = '';
    modalFilters.value.end_date = '';
  } else if (key === 'sort') {
    filters.value.sort_by = 'newest';
    modalFilters.value.sort_by = 'newest';
  }
  currentPage.value = 1;
  fetchData();
};

// Status and payment helpers
function mapApiStatus(beStatus, o) {
  switch (beStatus) {
    case "paid":
      return "waiting_review";
    case "pending":
      if (o.payment_method === 'COD') return "waiting_review";
      return beStatus;
    case "responsed":
    case "accepted":
      return "processing";
    case "delivered":
      return o.delivery_type === "pickup" ? "ready" : "shipped";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "rejected":
      return "rejected";
    case "undelivered":
      return "undelivered";
    case "unpicked":
      return "unpicked";
    default:
      return beStatus;
  }
}

function statusProps(beStatus) {
  const status = mapApiStatus(beStatus, { payment_method: 'Transfer', delivery_type: 'delivery' }); 
  switch (status) {
    case "pending":
      return { status: "pending", variant: "order" };
    case "waiting_review":
      return { status: "paid", variant: "order" };
    case "processing":
      return { status: "processed", variant: "order", label: "Diproses" };
    case "ready":
      return { status: "ready", variant: "order", label: "Siap Diambil" };
    case "shipped":
      return { status: "shipped", variant: "order", label: "Dikirim" };
    case "completed":
      return { status: "completed", variant: "order", label: "Selesai" };
    case "cancelled":
      return { status: "cancelled", variant: "order", label: "Gagal/Batal" };
    default:
      return { status: "pending", variant: "order", label: status };
  }
}

function isFailedOrCancelled(status) {
  const s = String(status || '').toLowerCase();
  return ['cancelled', 'rejected', 'undelivered', 'unpicked', 'batal', 'gagal'].includes(s);
}

function getPaymentBadge(method) {
  const m = String(method || "").trim();
  const lower = m.toLowerCase();

  if (lower === "qris") {
    return {
      label: "QRIS",
      icon: "pi pi-qrcode",
      iconClass: "text-merchant-primary",
    };
  }

  if (lower.includes("transfer")) {
    return {
      label: m || "Transfer Bank",
      icon: "pi pi-credit-card",
      iconClass: "text-blue-600",
    };
  }

  if (lower === "cod" || lower === "tunai" || lower === "cash") {
    return {
      label: m || "COD",
      icon: "pi pi-wallet",
      iconClass: "text-emerald-600",
    };
  }

  if (lower === "whatsapp" || lower === "belum ditetapkan" || !m) {
    return {
      label: "Belum Ditetapkan",
      icon: "pi pi-wallet",
      iconClass: "text-gray-400",
    };
  }

  return {
    label: m,
    icon: "pi pi-wallet",
    iconClass: "text-gray-500",
  };
}

// Debounce for per_page change
let perPageDebounceTimer = null;
const debouncedLoadReportsByPerPage = () => {
  if (perPageDebounceTimer) {
    clearTimeout(perPageDebounceTimer);
  }

  perPageDebounceTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchData();
  }, 400);
};

watch(perPage, (val, oldVal) => {
  if (val === oldVal) return;
  localStorage.setItem("reports_per_page", val);
  debouncedLoadReportsByPerPage();
});

// Fetch reports data from backend API
const fetchData = async () => {
  if (!merchantSlug) return;
  
  loading.value = true;
  try {
    const params = {
      q: searchQuery.value?.trim() || undefined,
      start_date: filters.value.start_date || undefined,
      end_date: filters.value.end_date || undefined,
      status: filters.value.status !== 'all' ? filters.value.status : undefined,
      sort_by: filters.value.sort_by,
      page: currentPage.value,
      per_page: perPage.value
    };
    
    const { data: res } = await getMerchantTransactionsReport(merchantSlug, params);
    
    transactions.value = res.data?.transactions || res.transactions || [];
    summary.value = res.data?.summary || res.summary || summary.value;
    
    const meta = res.meta?.pagination || res.data?.pagination || {};
    totalPages.value = meta.last_page || 1;
    currentPage.value = meta.current_page || 1;
    const currentPerPage = Number(perPage.value) || meta.per_page || 10;
    
    paginationInfo.value = {
      start: (currentPage.value - 1) * currentPerPage + (transactions.value.length ? 1 : 0),
      end: (currentPage.value - 1) * currentPerPage + transactions.value.length,
      total: meta.total ?? transactions.value.length,
      per_page: currentPerPage
    };

  } catch (error) {
    console.error('Fetch error:', error);
    toast.error('Gagal memuat laporan transaksi');
    transactions.value = [];
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchData();
};

// Export handler (PDF / Excel)
const handleExport = async (type) => {
  if (!merchantSlug || loadingExport.value) return;
  
  loadingExport.value = true;
  exportingType.value = type;
  
  try {
    const params = {
      q: searchQuery.value?.trim() || undefined,
      start_date: filters.value.start_date || undefined,
      end_date: filters.value.end_date || undefined,
      status: filters.value.status !== 'all' ? filters.value.status : undefined,
      sort_by: filters.value.sort_by,
    };
    
    if (type === 'pdf') {
      const res = await exportMerchantReportPdf(merchantSlug, params);
      saveBlob(res.data, `Laporan_Transaksi_${merchantSlug}_${formatDateForInput(new Date())}.pdf`);
    } else {
      const res = await exportMerchantReportExcel(merchantSlug, params);
      saveBlob(res.data, `Laporan_Transaksi_${merchantSlug}_${formatDateForInput(new Date())}.xlsx`);
    }
    
    toast.success(`Laporan ${type.toUpperCase()} berhasil diunduh`);
    showExportModal.value = false;
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Gagal mengunduh laporan. Silakan coba lagi.');
  } finally {
    loadingExport.value = false;
    exportingType.value = null;
  }
};

const formatIDR = (value) => {
  return Number(value || 0).toLocaleString('id-ID');
};

onMounted(() => {
  fetchData();
});
</script>