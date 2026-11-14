import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { BUNDLE_NAME, OUTPUT_DIR, readManifestVersion } from "./build/manifest-version.ts";

// One ES module, written into the integration so that Home Assistant serves it and the release archive contains it.
export default defineConfig({
  define: {
    __DASHBOARD_VERSION__: JSON.stringify(readManifestVersion()),
  },
  resolve: {
    alias: { "@vtherm/dashboard-sdk": fileURLToPath(new URL("../packages/sdk/src/index.ts", import.meta.url)) },
  },
  build: {
    outDir: OUTPUT_DIR,
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: fileURLToPath(new URL("src/index.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => BUNDLE_NAME,
    },
  },
});
