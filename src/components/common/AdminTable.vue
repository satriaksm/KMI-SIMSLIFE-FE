<script setup>
import { computed } from "vue";

const props = defineProps({
  // Data
  items: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },

  // Columns configuration
  columns: {
    type: Array,
    required: true,
  },

  // Selection
  selectedItems: {
    type: Array,
    default: () => [],
  },
  selectAll: {
    type: Boolean,
    default: false,
  },

  // Actions
  actions: {
    type: Array,
    default: () => [],
  },

  // Pagination
  currentPage: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  paginationInfo: {
    type: Object,
    default: () => ({ start: 0, end: 0, total: 0, per_page: 0 }),
  },

  // Customization
  emptyMessage: {
    type: String,
    default: "Tidak ada data",
  },
  showCheckbox: {
    type: Boolean,
    default: true,
  },
  showPagination: {
    type: Boolean,
    default: true,
  },
  sortBy: {
    type: String,
    default: "",
  },
  sortDir: {
    type: String,
    default: "", // 'asc' | 'desc'
  },
});

const emit = defineEmits([
  "update:selectedItems",
  "update:selectAll",
  "row-click",
  "page-change",
  "next-page",
  "prev-page",
  "sort-change",
]);

// Computed
const visiblePages = computed(() => {
  const pages = [];
  const total = props.totalPages;
  const current = props.currentPage;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 3) pages.push(1, 2, 3, 4, "...", total);
    else if (current >= total - 2) pages.push(1, "...", total - 3, total - 2, total - 1, total);
    else pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }
  return pages;
});

// Methods
const toggleSelectAll = () => emit("update:selectAll", !props.selectAll);

const toggleItemSelection = (itemId) => {
  const selected = [...props.selectedItems];
  const index = selected.indexOf(itemId);
  if (index > -1) selected.splice(index, 1);
  else selected.push(itemId);
  emit("update:selectedItems", selected);
};

const isItemSelected = (itemId) => props.selectedItems.includes(itemId);

const handleRowClick = (item) => emit("row-click", item);

const goToPage = (page) => {
  if (page >= 1 && page <= props.totalPages && page !== "...") emit("page-change", page);
};

const nextPage = () => {
  if (props.currentPage < props.totalPages) emit("next-page");
};

const prevPage = () => {
  if (props.currentPage > 1) emit("prev-page");
};

const handleSort = (key) => {
  let newDir = 'desc';
  if (props.sortBy === key) {
    if (props.sortDir === 'desc') newDir = 'asc';
    else if (props.sortDir === 'asc') {
      newDir = '';
      key = '';
    }
  }
  emit('sort-change', { key, dir: newDir });
};

// Get nested value from object by key path (e.g., 'user.name')
const getNestedValue = (obj, path) => {
  if (!path) return "";
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};
</script>

<template>
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="w-12 h-12 border-4 border-muted-foreground border-t-merchant-primary rounded-full animate-spin"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!items || items.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <i class="pi pi-inbox text-6xl text-gray-300 mb-4"></i>
      <p class="text-gray-500 text-lg font-medium">{{ emptyMessage }}</p>
    </div>

    <!-- Table Content -->
    <div v-else class="w-full overflow-x-auto">
      <div class="min-w-[1000px]">
        <table class="w-full">
          <thead>
            <tr class="border-b border-muted-background bg-muted-background">
              <!-- Checkbox Column -->
              <th v-if="showCheckbox" class="px-6 py-4 text-left w-12">
                <label class="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    :checked="selectAll"
                    @change="toggleSelectAll"
                    class="appearance-none w-5 h-5 border-2 border-muted-foreground rounded-md bg-transparent cursor-pointer transition-all duration-200 checked:bg-merchant-primary checked:border-merchant-primary focus:outline-none focus:ring-2 focus:ring-merchant-primary focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
                  />
                </label>
              </th>

              <!-- Data Columns -->
              <th
                v-for="column in columns"
                :key="column.key"
                class="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none"
                :class="column.sortable ? 'cursor-pointer hover:bg-muted-background/60 transition' : ''"
                @click="column.sortable ? handleSort(column.key) : null"
              >
                <div class="flex items-center gap-1">
                  <span>{{ column.label }}</span>
                  <div v-if="column.sortable" class="flex flex-col items-center justify-center -space-y-[0.15rem]">
                    <i class="pi pi-chevron-up text-[0.6rem]" :class="sortBy === column.key && sortDir === 'asc' ? 'text-merchant-primary' : 'text-gray-300'"></i>
                    <i class="pi pi-chevron-down text-[0.6rem]" :class="sortBy === column.key && sortDir === 'desc' ? 'text-merchant-primary' : 'text-gray-300'"></i>
                  </div>
                </div>
              </th>

              <!-- Actions Column -->
              <th
                v-if="actions && actions.length"
                class="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32"
              >
                Aksi
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-muted-background">
            <tr
              v-for="item in items"
              :key="item.id"
              @click="handleRowClick(item)"
              class="hover:bg-muted-background transition"
            >
              <!-- Checkbox Cell -->
              <td v-if="showCheckbox" class="px-6 py-4" @click.stop>
                <label class="cursor-pointer inline-block">
                  <input
                    type="checkbox"
                    :checked="isItemSelected(item.id)"
                    @change="toggleItemSelection(item.id)"
                    class="appearance-none w-5 h-5 border-2 border-muted-foreground rounded-md bg-transparent cursor-pointer transition-all duration-200 checked:bg-merchant-primary checked:border-merchant-primary focus:outline-none focus:ring-2 focus:ring-merchant-primary focus:ring-offset-2 relative before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOSIgdmlld0JveD0iMCAwIDEyIDkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDQuNUw0LjUgOEwxMSAxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] before:bg-center before:bg-no-repeat before:opacity-0 checked:before:opacity-100"
                  />
                </label>
              </td>

              <!-- Data Cells -->
              <td
                v-for="column in columns"
                :key="column.key"
                class="px-6 py-4"
              >
                <slot
                  :name="`cell-${column.key}`"
                  :item="item"
                  :value="getNestedValue(item, column.key)"
                  :column="column"
                >
                  <span class="text-sm text-black">
                    {{ getNestedValue(item, column.key) ?? "-" }}
                  </span>
                </slot>
              </td>

              <!-- Actions Cell -->
              <td v-if="actions && actions.length" class="px-6 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-for="(action, idx) in actions"
                    :key="idx"
                    type="button"
                    :title="action.label"
                    class="p-2 rounded-lg transition"
                    :class="action.class || 'hover:bg-muted-foreground/20 text-muted-foreground'"
                    @click.stop="action.handler?.(item)"
                  >
                    <i :class="`pi ${action.icon} text-sm`"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading" class="border-t border-muted-background px-6 py-4">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Pagination Info -->
          <div class="text-sm text-muted-foreground">
            Menampilkan
            <span class="font-semibold text-black">
              {{ paginationInfo.per_page }}
            </span>
            items/halaman
          </div>

          <!-- Pagination Controls -->
          <div class="flex items-center gap-2">
            <!-- Previous Button -->
            <Button
              @click="prevPage"
              :disabled="currentPage === 1"
              variant="merchant"
              size="sm"
            >
              <i class="pi pi-chevron-left text-xs"></i>
              <span>Prev</span>
            </Button>

            <!-- Page Numbers -->
            <template v-for="(page, index) in visiblePages" :key="index">
              <!-- Ellipsis -->
              <span
                v-if="page === '...'"
                class="px-3 py-2 text-muted-foreground text-sm"
              >
                ...
              </span>

              <!-- Page Button -->
              <button
                v-else
                @click="goToPage(page)"
                class="px-3 py-1.5 rounded-lg border transition min-w-10 text-sm"
                :class="
                  currentPage === page
                    ? 'bg-merchant-primary text-white border-merchant-primary font-semibold'
                    : 'border-muted-background hover:bg-muted-background text-muted-foreground'
                "
              >
                {{ page }}
              </button>
            </template>

            <!-- Next Button -->
            <Button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              variant="merchant"
              size="sm"
            >
              <span>Next</span>
              <i class="pi pi-chevron-right text-xs"></i>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
