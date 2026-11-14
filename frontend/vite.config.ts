import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { BUNDLE_NAME, OUTPUT_DIR, readManifestVersion } from "./build/manifest-version.ts";

const PLUGINS = fileURLToPath(new URL("src/native/plugins/", import.meta.url));

/** The modules of the native plugins, by the name of their file in the output: `plugins/core_tpi`. */
const nativePlugins = Object.fromEntries(
  readdirSync(PLUGINS)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => [`plugins/${file.slice(0, -".ts".length)}`, `${PLUGINS}${file}`]),
);

// The panel module and one module for each native plugin, written into the integration so that Home Assistant serves them and the
// release archive contains them. The code that they share goes in common chunks, so the SDK and its registry exist once in the page.
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
      entry: { [BUNDLE_NAME.replace(/\.js$/, "")]: fileURLToPath(new URL("src/index.ts", import.meta.url)), ...nativePlugins },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      output: { chunkFileNames: "chunks/[name]-[hash].js" },
    },
  },
});
