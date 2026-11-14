import { describe, expect, it } from "vitest";

import rollupConfig from "../rollup.config";
import viteConfig from "../vite.config";

describe("the development servers", () => {
  it("send the header that lets the dashboard import a module from another origin, with Vite", () => {
    const config = viteConfig as { server?: { headers?: Record<string, string>; port?: number } };
    expect(config.server?.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    expect(config.server?.port).toBe(5173);
  });

  it("send it with Rollup too, and serve the folder that Rollup writes", () => {
    const options = rollupConfig as { output: { dir: string }; plugins: { name: string }[] };
    expect(options.plugins.map((plugin) => plugin.name)).toContain("serve");
    expect(options.output.dir).toBe("../custom_components/vtherm_sample_plugin/www");
  });
});
