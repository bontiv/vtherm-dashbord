import typescript from "@rollup/plugin-typescript";
import type { RollupOptions } from "rollup";
import serve from "rollup-plugin-serve";

// Build the plugin in watch mode (`rollup -c -w`) and serve it from http://localhost:5173. The dashboard imports the module from
// another origin, so the server must allow it with Access-Control-Allow-Origin.
const config: RollupOptions = {
  input: "src/main.ts",
  output: { file: "dist/my-plugin.js", format: "es", sourcemap: true },
  plugins: [typescript(), serve({ contentBase: "dist", port: 5173, headers: { "Access-Control-Allow-Origin": "*" } })],
};

export default config;
