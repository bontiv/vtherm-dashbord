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
    include: ["packages/*/test/**/*.test.ts", "frontend/test/**/*.test.ts", "scripts/**/*.test.ts", "docs/examples/**/*.test.ts", "examples/**/test/**/*.test.ts"],
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      // The sources that ship: the frontend, the SDK and the scripts. Tests, generated catalogs and build outputs are not measured.
      include: ["frontend/src/**/*.ts", "packages/sdk/src/**/*.ts", "scripts/**/*.ts"],
      exclude: ["**/*.test.ts", "**/test/**", "**/catalogs/**", "**/*.d.ts", "frontend/preview/**"],
      reporter: ["text-summary", "lcov", "html", "json-summary"],
      reportsDirectory: "coverage/typescript",
    },
  },
});
