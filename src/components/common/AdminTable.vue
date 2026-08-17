<script setup>
import { computed, watch } from "vue";

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

const localSortBy = ref(props.sortBy);
const localSortDir = ref(props.sortDir);

watch(() => props.sortBy, val => localSortBy.value = val);
watch(() => props.sortDir, val => localSortDir.value = val);

const doLocalSort = (key) => {
  if (localSortBy.value === key) {
    if (localSortDir.value === 'desc') localSortDir.value = 'asc';
    else if (localSortDir.value === 'asc') {
      localSortDir.value = '';
      localSortBy.value = '';
    }
  } else {
    localSortBy.value = key;
    localSortDir.value = 'asc';
  }
};

// Override handleSort to just use local sort if the parent isn't using the server-side
const handleSort = (key) => {
  doLocalSort(key);
  
  // also emit for parent if needed
  let newDir = 'desc';
  if (props.sortBy === key) {
    if (props.sortDir === 'desc') newDir = 'asc';
    else if (props.sortDir === 'asc') {
      newDir = '';
    }
  }
  emit('sort-change', { key, dir: newDir });
};

// Get nested value from object by key path (e.g., 'user.name')
const getNestedValue = (obj, path) => {
  if (!path) return "";
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

// Filtering logic
import { ref, onMounted, onUnmounted } from 'vue';
const activeFilterColumn = ref(null);
const columnFilters = ref({});
const filterSearch = ref({});

const getColumnConfig = (key) => props.columns.find(c => c.key === key) || {};

const formatFilterValue = (key, val) => {
  const col = getColumnConfig(key);
  if (col.filterFormat) return col.filterFormat(val);
  return val;
};

const emitFilterChange = () => {
  emit('filter-change', columnFilters.value);
};

const toggleFilter = (key) => {
  if (activeFilterColumn.value === key) {
    activeFilterColumn.value = null;
  } else {
    activeFilterColumn.value = key;
    if (!columnFilters.value[key]) {
      columnFilters.value[key] = getUniqueValues(key);
    }
  }
};

const closeFilter = () => {
  activeFilterColumn.value = null;
};

const handleClickOutside = (e) => {
  if (!e.target.closest('.filter-dropdown-container')) {
    closeFilter();
  }
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

const getUniqueValues = (key) => {
  const vals = props.items.map(item => {
    let val = getNestedValue(item, key);
    return formatFilterValue(key, val);
  }).filter(v => v !== null && v !== undefined && v !== '');
  return [...new Set(vals)];
};

const isValueFiltered = (key, val) => {
  if (!columnFilters.value[key]) return true;
  return columnFilters.value[key].includes(val);
};

const toggleFilterValue = (key, val) => {
  if (!columnFilters.value[key]) {
    columnFilters.value[key] = getUniqueValues(key);
  }
  const idx = columnFilters.value[key].indexOf(val);
  if (idx > -1) {
    columnFilters.value[key].splice(idx, 1);
  } else {
    columnFilters.value[key].push(val);
  }
  emitFilterChange();
};

const toggleAllFilter = (key) => {
  const uniques = getUniqueValues(key);
  if (columnFilters.value[key] && columnFilters.value[key].length === uniques.length) {
    columnFilters.value[key] = [];
  } else {
    columnFilters.value[key] = uniques;
  }
  emitFilterChange();
};

const getFilteredItems = computed(() => {
  let filtered = [...props.items];
  Object.keys(columnFilters.value).forEach(key => {
    const activeFilters = columnFilters.value[key];
    if (activeFilters && activeFilters.length > 0) {
      filtered = filtered.filter(item => {
        const val = formatFilterValue(key, getNestedValue(item, key));
        return activeFilters.includes(val);
      });
    } else if (activeFilters && activeFilters.length === 0) {
      filtered = []; // If everything is unchecked, show nothing
    }
  });
  if (localSortBy.value && localSortDir.value) {
    filtered.sort((a, b) => {
      let valA = getNestedValue(a, localSortBy.value);
      let valB = getNestedValue(b, localSortBy.value);
      
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      
      if (valA < valB) return localSortDir.value === 'asc' ? -1 : 1;
      if (valA > valB) return localSortDir.value === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return filtered;
});

const resetFiltersAndSort = () => {
  columnFilters.value = {};
  localSortBy.value = '';
  localSortDir.value = '';
  activeFilterColumn.value = null;
  emitFilterChange();
  emit('sort-change', { key: '', dir: '' });
};

defineExpose({
  resetFiltersAndSort
});

</script>

<template>
  <div class="bg-white rounded-lg shadow">
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
    <div v-else class="w-full overflow-x-auto min-h-[400px]">
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
                class="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none relative"
                :class="column.class || ''"
              >
                <div class="flex items-center gap-1 filter-dropdown-container">
                  <span 
                    :class="column.sortable ? 'cursor-pointer hover:text-merchant-primary transition' : ''"
                    @click="column.sortable ? handleSort(column.key) : null"
                  >
                    {{ column.label }}
                  </span>
                  
                  <div v-if="column.sortable" @click.stop="handleSort(column.key)" class="flex flex-col items-center justify-center -space-y-[0.15rem] cursor-pointer">
                    <i class="pi pi-chevron-up text-[0.6rem]" :class="localSortBy === column.key && localSortDir === 'asc' ? 'text-merchant-primary font-bold' : 'text-gray-300'"></i>
                    <i class="pi pi-chevron-down text-[0.6rem]" :class="localSortBy === column.key && localSortDir === 'desc' ? 'text-merchant-primary font-bold' : 'text-gray-300'"></i>
                  </div>
                  
                  <!-- Filter Icon -->
                  <div v-if="column.filterable" class="ml-1 cursor-pointer" @click.stop="toggleFilter(column.key)">
                    <i class="pi pi-filter text-[0.75rem]" :class="activeFilterColumn === column.key || (columnFilters[column.key] && columnFilters[column.key].length !== getUniqueValues(column.key).length) ? 'text-merchant-primary font-bold' : 'text-gray-300 hover:text-merchant-primary'"></i>
                  </div>
                  
                  <!-- Filter Dropdown Popup -->
                  <div v-if="column.filterable && activeFilterColumn === column.key" class="absolute top-full left-0 mt-2 bg-white border border-merchant-primary/20 shadow-xl rounded-xl w-56 z-50 p-3 ring-1 ring-black/5" @click.stop>
                    <div class="flex items-center gap-2 mb-3 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                      <i class="pi pi-search text-merchant-primary text-xs"></i>
                      <input type="text" v-model="filterSearch[column.key]" placeholder="Cari filter..." class="w-full text-xs border-none bg-transparent focus:ring-0 p-0 text-black placeholder:text-gray-400" />
                    </div>
                    <div class="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      <label class="flex items-center gap-3 px-2 py-2 hover:bg-merchant-primary/5 rounded-lg cursor-pointer text-xs text-gray-700 transition font-medium">
                        <input type="checkbox" :checked="!columnFilters[column.key] || columnFilters[column.key].length === getUniqueValues(column.key).length" @change="toggleAllFilter(column.key)" class="rounded text-merchant-primary focus:ring-merchant-primary w-3.5 h-3.5 border-gray-300" />
                        Pilih Semua
                      </label>
                      <div class="h-px bg-gray-100 my-1"></div>
                      <label v-for="val in getUniqueValues(column.key).filter(v => !filterSearch[column.key] || String(v).toLowerCase().includes(filterSearch[column.key].toLowerCase()))" :key="val" class="flex items-center gap-3 px-2 py-2 hover:bg-merchant-primary/5 rounded-lg cursor-pointer text-xs text-gray-700 transition">
                        <input type="checkbox" :checked="isValueFiltered(column.key, val)" @change="toggleFilterValue(column.key, val)" class="rounded text-merchant-primary focus:ring-merchant-primary w-3.5 h-3.5 border-gray-300" />
                        {{ val }}
                      </label>
                    </div>
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
              v-for="item in getFilteredItems"
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
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

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
