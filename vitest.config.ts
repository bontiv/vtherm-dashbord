import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@vtherm/dashboard-sdk": fileURLToPath(new URL("packages/sdk/src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts", "frontend/test/**/*.test.ts", "scripts/**/*.test.ts", "docs/examples/**/*.test.ts"],
    passWithNoTests: false,
  },
});
