// The package ships its types, but its `exports` map has no `types` condition, so TypeScript does not find them.
declare module "rollup-plugin-serve" {
  import type { Plugin } from "rollup";

  /** The options of the plugin that the guide uses. */
  export interface RollupServeOptions {
    /** The folder to serve. */
    contentBase?: string | string[];
    /** The port to listen on. */
    port?: number;
    /** The headers of every response. */
    headers?: Record<string, string>;
  }

  /** Serve a folder while Rollup runs. */
  export default function serve(options?: RollupServeOptions): Plugin;
}
