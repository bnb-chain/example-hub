import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",

    "process.env": {},
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: ["ethers"],
    exclude: ["@walletconnect/web3-provider", "web3modal"],
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
