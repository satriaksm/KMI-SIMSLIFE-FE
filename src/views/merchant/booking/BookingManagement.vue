<script setup>
import { ref } from "vue";
import { useToast } from "vue-toastification";
import api from "@/libs/axios";

const toast = useToast();
const bookings = ref([]);
const loading = ref(false);

const fetchBookings = async () => {
  loading.value = true;
  try {
    const { data } = await api.get("/api/bookings");
    bookings.value = data?.data || data || [];
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    toast.error("Gagal memuat data booking");
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (id, status) => {
  try {
    await api.patch(`/api/bookings/${id}/status`, { status });
    toast.success("Status berhasil diperbarui");
    fetchBookings();
  } catch (error) {
    toast.error("Gagal memperbarui status");
  }
};

const getStatusColor = (status) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

fetchBookings();
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Status Layanan Jasa</h1>
      <p class="text-gray-500 mt-1">Kelola pemesanan booking dari pelanggan</p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
    </div>

    <div v-else-if="bookings.length === 0" class="text-center py-12 bg-white rounded-xl">
      <i class="pi pi-calendar text-4xl text-gray-300 mb-3"></i>
      <p class="text-gray-500">Belum ada booking</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="booking in bookings"
        :key="booking.id"
        class="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <div class="flex justify-between items-start">
          <div>
            <p class="font-semibold text-gray-800">{{ booking.service_title }}</p>
            <p class="text-sm text-gray-500">{{ booking.customer_name }}</p>
            <p class="text-sm text-gray-500">{{ booking.merchant_name }}</p>
          </div>
          <span :class="['px-3 py-1 rounded-full text-xs font-medium', getStatusColor(booking.status)]">
            {{ booking.status }}
          </span>
        </div>
        <div class="mt-3 flex justify-between items-center">
          <div class="text-sm text-gray-500">
            <i class="pi pi-calendar mr-1"></i>
            {{ formatDate(booking.date) }}
            <span v-if="booking.time"> • {{ booking.time }}</span>
          </div>
          <div class="flex gap-2">
            <button
              v-if="booking.status === 'pending'"
              @click="updateStatus(booking.id, 'confirmed')"
              class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
            >
              Konfirmasi
            </button>
            <button
              v-if="booking.status === 'confirmed'"
              @click="updateStatus(booking.id, 'completed')"
              class="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>