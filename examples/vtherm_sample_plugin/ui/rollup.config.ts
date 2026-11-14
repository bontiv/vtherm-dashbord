import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import type { RollupOptions } from "rollup";
import serve from "rollup-plugin-serve";

const OUTPUT = "../custom_components/vtherm_sample_plugin/www";
// Only in this repository, where tsconfig.json reads the SDK from its sources. In your project, leave `rootDir` out.
const ROOT = "../../..";

// `npx rollup -c rollup.config.ts --configPlugin typescript -w` builds the plugins again at each change and serves them from
// http://localhost:5173. The dashboard imports the modules from another origin, so the server must allow it with
// Access-Control-Allow-Origin.
const config: RollupOptions = {
  input: { "vtherm-sample": "src/main.ts", "vtherm-sample-extras": "src/extras.ts" },
  output: { dir: OUTPUT, format: "es", entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js", sourcemap: true },
  plugins: [resolve(), typescript({ noEmit: false, outDir: OUTPUT, declaration: false, rootDir: ROOT }), serve({ contentBase: OUTPUT, port: 5173, headers: { "Access-Control-Allow-Origin": "*" } })],
};

export default config;
