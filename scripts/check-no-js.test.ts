import { describe, expect, it } from "vitest";

import { findForbiddenJavaScript } from "./check-no-js.ts";

describe("findForbiddenJavaScript", () => {
  it("accepts TypeScript and other files", () => {
    expect(findForbiddenJavaScript(["src/index.ts", "README.md", "package.json"], [])).toEqual([]);
  });

  it("refuses .js, .mjs and .cjs files", () => {
    expect(findForbiddenJavaScript(["a.js", "dir/b.mjs", "c.cjs", "d.ts"], [])).toEqual(["a.js", "dir/b.mjs", "c.cjs"]);
  });

  it("allows an exception that has a justification", () => {
    const exceptions = [{ path: "tool.config.js", reason: "The tool only reads JavaScript configuration files" }];
    expect(findForbiddenJavaScript(["tool.config.js", "other.js"], exceptions)).toEqual(["other.js"]);
  });

  it("refuses an exception without justification", () => {
    expect(findForbiddenJavaScript(["tool.config.js"], [{ path: "tool.config.js", reason: "  " }])).toEqual(["tool.config.js"]);
  });
});
