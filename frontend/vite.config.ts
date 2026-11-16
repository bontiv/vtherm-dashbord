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

/** The port of the development server. 5173 is the one of the sample plugin, 5199 the one of the preview. */
export const DEV_SERVER_PORT = 5198;

// The panel module and one module for each native plugin, written into the integration so that Home Assistant serves them and the
// release archive contains them. The code that they share goes in common chunks, so the SDK and its registry exist once in the page.
//
// `npm run dev` serves the same modules from their TypeScript sources instead, for a Home Assistant started with
// VTHERM_DASHBOARD_DEV_SERVER (see docs/contributing/development-environment.md). The panel and the native plugins are then imported
// from this server: Vite sees a single graph of modules, so `lit` and the SDK still exist once in the page.
export default defineConfig({
  define: {
    __DASHBOARD_VERSION__: JSON.stringify(readManifestVersion()),
  },
  resolve: {
    alias: { "@vtherm/dashboard-sdk": fileURLToPath(new URL("../packages/sdk/src/index.ts", import.meta.url)) },
  },
  server: {
    port: DEV_SERVER_PORT,
    // Home Assistant is told this port: another one would make it load nothing.
    strictPort: true,
    // In the dev container, `localhost` is `::1` only, and the port forwarding of VS Code connects to 127.0.0.1: listen there.
    host: "127.0.0.1",
    // The page is the one of Home Assistant, on another origin (port 8123): the browser must be allowed to import the modules.
    cors: true,
    // The address of this server as the browser sees it, for the absolute URLs that Vite writes. It is the value given to Home
    // Assistant when it is set, for example the forwarded address of a Codespace.
    origin: (process.env["VTHERM_DASHBOARD_DEV_SERVER"] || `http://localhost:${DEV_SERVER_PORT}`).replace(/\/+$/, ""),
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
