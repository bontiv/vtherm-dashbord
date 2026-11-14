import { defineConfig } from "vite";

// `npx vite` serves the plugin from http://localhost:5173 while you work on it. The dashboard imports the module from another
// origin, so the server must allow it with Access-Control-Allow-Origin.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    headers: { "Access-Control-Allow-Origin": "*" },
    // The dashboard is reloaded by hand. The hot update client would try to reach Home Assistant, not this server.
    hmr: false,
  },
  build: {
    // `npx vite build` writes one ES module for each plugin into the integration, which serves it.
    outDir: "../custom_components/vtherm_sample_plugin/www",
    emptyOutDir: true,
    lib: {
      entry: { "vtherm-sample": "src/main.ts", "vtherm-sample-extras": "src/extras.ts" },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    // A module that two plugins share goes to a chunk of its own.
    rollupOptions: { output: { chunkFileNames: "chunks/[name]-[hash].js" } },
  },
});
