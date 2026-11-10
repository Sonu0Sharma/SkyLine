// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy:
 * - /api  -> existing alias (rewritten)
 * - /mock-v2, /mock-v3, /profile, /resume, /ai -> proxied 1:1 to backend
 *
 * Keep changeOrigin:true so backend sees expected host (useful for some server setups).
 * No rewrite for mock/profile/resume so the full path is forwarded to FastAPI.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },

      // Mock interview v2/v3 endpoints
      "/mock-v2": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/mock-v3": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },

      // Profile / Resume endpoints used by the frontend
      "/profile": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/resume": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },

      // AI routes (if frontend calls these directly)
      "/ai": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      }
    },
  },
});
