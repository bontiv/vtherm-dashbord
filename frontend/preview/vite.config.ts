import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { readManifestVersion } from "../build/manifest-version.ts";

// A development page that shows the real components with a fake Home Assistant, to look at the themes and at the layouts.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  define: { __DASHBOARD_VERSION__: JSON.stringify(readManifestVersion()) },
  resolve: { alias: { "@vtherm/dashboard-sdk": fileURLToPath(new URL("../../packages/sdk/src/index.ts", import.meta.url)) } },
  server: { port: 5199, strictPort: true },
});
