import { describe, expect, it } from "vitest";

import rollupConfig from "./rollup.config.ts";
import viteConfig from "./vite.config.ts";

describe("the development servers of the guide", () => {
  it("send the header that lets the dashboard import the module from another origin, with Vite", () => {
    const config = viteConfig as { server?: { headers?: Record<string, string>; port?: number } };
    expect(config.server?.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    expect(config.server?.port).toBe(5173);
  });

  it("send it with Rollup, and serve the module that Rollup writes", () => {
    const options = rollupConfig as { output: { file: string }; plugins: { name: string }[] };
    expect(options.plugins.map((plugin) => plugin.name)).toContain("serve");
    expect(options.output.file).toBe("dist/my-plugin.js");
  });
});
