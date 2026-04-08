import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        // target: "http://backend:8000", // Use this when running in Docker
        target: "http://localhost:8000", // Use this when running locally
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
