import { fileURLToPath } from "node:url";

import { build } from "vite";
import type { Rollup } from "vite";
import { describe, expect, it } from "vitest";

/** Bundle an entry file like a plugin author does, and return the code. */
async function bundle(entry: string): Promise<string> {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    build: { write: false, minify: false, lib: { entry: fileURLToPath(new URL(entry, import.meta.url)), formats: ["es"], fileName: "bundle" } },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
  return outputs.flatMap((output) => output.output).map((chunk) => ("code" in chunk ? chunk.code : "")).join("\n");
}

describe("the harness is not part of the bundle of a plugin", () => {
  it("is absent when only the main entry point is imported", async () => {
    const code = await bundle("fixtures/main-only.ts");
    expect(code).toContain("registerUiPlugin");
    for (const name of ["createFakeHost", "setWebSocketHandler", "assertCompleteTranslations", "The translations are not complete"]) {
      expect(code, name).not.toContain(name);
    }
  }, 60000);

  it("is present when the harness is imported, which proves that the check can see it", async () => {
    const code = await bundle("fixtures/with-testing.ts");
    expect(code).toContain("createFakeHost");
    expect(code).toContain("setWebSocketHandler");
  }, 60000);
});
