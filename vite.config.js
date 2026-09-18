import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import VueDevTools from "vite-plugin-vue-devtools";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL || "/api";

  return {
    base: "/",
    plugins: [
      vue(),
      VueDevTools(),
      tailwindcss(),
      VitePWA({
        // Normal PWA behavior enabled.
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.js",
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        },
        includeAssets: ["icon192.png", "icon512.png"],
        manifest: {
          name: "Sumilir",
          short_name: "Sumilir",
          description: "UMKM App",
          theme_color: "#ff9800",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/icon192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icon512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
      minify: "terser",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-vue": ["vue", "vue-router", "pinia"],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
        "/sanctum": {
          target: env.VITE_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});