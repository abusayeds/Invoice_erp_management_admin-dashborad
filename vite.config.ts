import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8090,
    host: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:2002",
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts:['admin.syedbipul.me']
  },
  build: {
    outDir: "dist",
  },
});
