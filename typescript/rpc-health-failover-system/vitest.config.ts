import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    env: { VITEST: "true" },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
