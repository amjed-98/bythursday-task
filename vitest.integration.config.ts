import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
