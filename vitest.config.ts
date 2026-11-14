import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { readManifestVersion } from "./frontend/build/manifest-version.ts";

export default defineConfig({
  define: { __DASHBOARD_VERSION__: JSON.stringify(readManifestVersion()) },
  resolve: {
    alias: [
      { find: "@vtherm/dashboard-sdk/testing", replacement: fileURLToPath(new URL("packages/sdk/src/testing.ts", import.meta.url)) },
      { find: "@vtherm/dashboard-sdk", replacement: fileURLToPath(new URL("packages/sdk/src/index.ts", import.meta.url)) },
    ],
  },
  test: {
    include: ["packages/*/test/**/*.test.ts", "frontend/test/**/*.test.ts", "scripts/**/*.test.ts", "docs/examples/**/*.test.ts"],
    passWithNoTests: false,
  },
});
