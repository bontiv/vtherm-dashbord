import { describe, expect, it } from "vitest";

import { findUnwantedFiles } from "./check-sdk-package.ts";

describe("findUnwantedFiles", () => {
  it("accepts the built files, the manifest and the readme", () => {
    expect(findUnwantedFiles(["dist/index.js", "dist/index.d.ts", "dist/validation.js", "package.json", "README.md"])).toEqual([]);
  });

  it("refuses sources, tests and configuration", () => {
    expect(findUnwantedFiles(["src/index.ts", "test/types.test.ts", "tsconfig.json", "dist/index.js.map", "dist/nested/x.js"])).toEqual([
      "src/index.ts",
      "test/types.test.ts",
      "tsconfig.json",
      "dist/index.js.map",
      "dist/nested/x.js",
    ]);
  });
});
