import { describe, expect, it } from "vitest";

import { compareTrees } from "./check-sdk-reference.ts";

describe("compareTrees", () => {
  it("finds no difference between identical trees", () => {
    const tree = new Map([["a.md", "A"]]);
    expect(compareTrees(tree, new Map(tree))).toEqual({ missing: [], unexpected: [], changed: [] });
  });

  it("reports missing, unexpected and changed files", () => {
    const expected = new Map([["new.md", "N"], ["same.md", "S"], ["edited.md", "new text"]]);
    const actual = new Map([["old.md", "O"], ["same.md", "S"], ["edited.md", "old text"]]);
    expect(compareTrees(expected, actual)).toEqual({ missing: ["new.md"], unexpected: ["old.md"], changed: ["edited.md"] });
  });
});
