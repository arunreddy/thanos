import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.[mode] etc. — third arg '' loads all vars (not just VITE_*)
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget =
    env.API_PROXY_TARGET ||
    process.env.API_PROXY_TARGET ||
    "http://localhost:8000";

  const proxyConfig = {
    "/api": { target: apiTarget, changeOrigin: true },
    "/auth": { target: apiTarget, changeOrigin: true },
    "/download": { target: apiTarget, changeOrigin: true },
  };

  return {
    plugins: [react(), tailwindcss()],
    base: "./",
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {},
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      allowedHosts: true,
      proxy: proxyConfig,
    },
    preview: {
      port: 3000,
      host: true,
      proxy: proxyConfig,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
