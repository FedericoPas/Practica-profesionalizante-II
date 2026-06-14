import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: ".vite",
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
    proxy: {
      "/backend": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, "/api"),
      },
    },
  },
});
