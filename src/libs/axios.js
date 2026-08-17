// src/libs/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Public API without credentials (for CORS public endpoints)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  withCredentials: false,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/**
 * 🛠 Helper untuk membaca cookie browser
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    // Kita harus men-decode karena cookie dari PHP biasanya di-URL-encode (ada %3D dll)
    return decodeURIComponent(parts.pop().split(";").shift());
  }
  return null;
}

/**
 * ⚡ REQUEST INTERCEPTOR
 * Tugas: Ambil cookie XSRF-TOKEN, lalu tempel ke Header X-XSRF-TOKEN
 */
api.interceptors.request.use((config) => {
  const token = getCookie("XSRF-TOKEN");

  if (token) {
    config.headers["X-XSRF-TOKEN"] = token;
  }

  return config;
});

// Response Interceptor (Biarkan seperti kode Anda sebelumnya)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) console.warn("Unauthenticated (401)");
      if (status === 419) console.warn("CSRF token mismatch (419)");
    }
    return Promise.reject(error);
  }
);

export default api;
export { publicApi };
