import Echo from "laravel-echo";
import Pusher from "pusher-js";
import axios from "axios"; // Pastikan Anda mengimpor axios

window.Pusher = Pusher;

const reverbKey =
  import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY;
const wsHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const wsPort = Number(import.meta.env.VITE_REVERB_PORT || 8080);
const wsScheme = import.meta.env.VITE_REVERB_SCHEME || "http";

// Fungsi getCookie manual sudah TIDAK DIPERLUKAN LAGI karena Axios akan mengurusnya secara otomatis.

const echo = new Echo({
  broadcaster: "pusher",
  key: reverbKey,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1",
  wsHost,
  wsPort,
  wssPort: wsPort,
  forceTLS: wsScheme === "https",
  enabledTransports: ["ws", "wss"],

  // HAPUS konfigurasi authEndpoint, withCredentials, dan auth.headers bawaan Pusher

  // TAMBAHKAN Custom Authorizer menggunakan Axios
  authorizer: (channel, options) => {
    return {
      authorize: (socketId, callback) => {
        // Gunakan Axios agar X-XSRF-TOKEN dan laravel_session (cookie) otomatis terkirim
        axios
          .post(
            `${import.meta.env.VITE_API_BASE_URL}/broadcasting/auth`,
            {
              socket_id: socketId,
              channel_name: channel.name,
            },
            {
              withCredentials: true, // WAJIB untuk mengirim cookie session lintas port
              headers: {
                Accept: "application/json", // WAJIB agar Laravel tahu ini SPA dan tidak me-redirect
              },
            },
          )
          .then((response) => {
            // Jika sukses (status 200), izinkan websocket terkoneksi
            callback(false, response.data);
          })
          .catch((error) => {
            // Jika gagal (status 401/419/500), tolak koneksi websocket
            callback(true, error);
          });
      },
    };
  },
});

export default echo;
