<script setup>
import { ref, onMounted } from "vue";
import api from "@/libs/axios";

const data = ref(null);

onMounted(async () => {
  try {
    // const response = await api.get("/api/public/products/bakmi-jawa-0GYTK", {
    //   // params: {
    //   //   segments: ["UMKM Toko"],
    //   // },
    // });
    // const response = await api.get("/api/cart");
    // const response = await api.get(
    //   "/api/products/kopi-arabica-premium-8xha9",
    //   {}
    // );
    const response = await api.get(`/api/banks`, {});
    // const response = await api.get("/api/public/search-merchants", {
    //   params: {
    //     q: "a",
    //     // segment: ["UMKM Kuliner"],
    //   },
    // });
    data.value = response.data;
    console.log("API Response:", response.data);
  } catch (error) {
    data.value = error?.response?.data || error.message;
    console.error("API Error:", error);
  }
});
</script>
<template>
  <p>ini test api</p>
  <pre>{{ data }}</pre>
</template>
