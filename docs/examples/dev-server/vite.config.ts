import { defineConfig } from "vite";

// Serve the plugin from http://localhost:5173 while you work on it. The dashboard imports the module from another origin, so the
// server must allow it with Access-Control-Allow-Origin.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    headers: { "Access-Control-Allow-Origin": "*" },
    // Home Assistant opens the module from its own page: no need to open the dev server in a browser tab.
    open: false,
  },
  build: {
    // The release build is one ES module that registers the plugin when it is imported.
    lib: { entry: "src/main.ts", formats: ["es"], fileName: "my-plugin" },
  },
});
