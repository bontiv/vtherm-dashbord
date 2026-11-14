import { describe, expect, it } from "vitest";

import { VERSION_FILES, findBranchProblem, findVersionProblems, parseTag } from "./validate-release-tag.ts";
import type { VersionFile } from "./validate-release-tag.ts";

const files = (version: string, changes: Record<string, string | undefined> = {}): VersionFile[] =>
  VERSION_FILES.map((path) => ({ path, content: path in changes ? changes[path] : JSON.stringify({ name: path, version }) }));

describe("the format of the tag", () => {
  it.each(["v0.1.1", "v1.0.0", "v1.0.0-beta.2", "v0.2.0-rc.1", "v10.20.30", "v1.0.0-alpha-1", "v1.0.0-0.3.7"])("accepts %s", (tag) => {
    expect(parseTag(tag).version).toBe(tag.slice(1));
  });

  it.each(["v1.0", "0.1.1", "v01.2.3", "v1.0.0+build5", "v1.0.0-", "v1.0.0-01", "v1.2.3.4", "V1.0.0", "v1.0.0-rc.01", "", "v", "vx.y.z"])("refuses %s", (tag) => {
    expect(() => parseTag(tag)).toThrow(/not valid/);
  });

  it("tells a pre-release from a stable version", () => {
    expect(parseTag("v0.1.1").prerelease).toBe(false);
    expect(parseTag("v0.2.0-rc.1").prerelease).toBe(true);
  });
});

describe("the versions of the files", () => {
  it("accepts files that all have the version of the tag", () => {
    expect(findVersionProblems("0.1.1", files("0.1.1"))).toEqual([]);
  });

  it("accepts a pre-release that is the same everywhere", () => {
    expect(findVersionProblems("0.2.0-rc.1", files("0.2.0-rc.1"))).toEqual([]);
  });

  it("refuses a manifest with another version, and gives both", () => {
    const problems = findVersionProblems("0.1.1", files("0.1.1", { "custom_components/vtherm_dashboard/manifest.json": '{"version":"0.1.0"}' }));
    expect(problems).toEqual(["custom_components/vtherm_dashboard/manifest.json: the version is 0.1.0, the tag is 0.1.1"]);
  });

  it("refuses the package of the SDK with another version, and names the file", () => {
    const problems = findVersionProblems("0.1.1", files("0.1.1", { "packages/sdk/package.json": '{"version":"0.1.0"}' }));
    expect(problems).toEqual(["packages/sdk/package.json: the version is 0.1.0, the tag is 0.1.1"]);
  });

  it("refuses a file without a version", () => {
    expect(findVersionProblems("0.1.1", files("0.1.1", { "frontend/package.json": '{"name":"x"}' }))).toEqual(["frontend/package.json: there is no \"version\" field"]);
  });

  it("refuses a file that is not JSON, and a file that does not exist", () => {
    const problems = findVersionProblems("0.1.1", files("0.1.1", { "package.json": "{oops", "examples/vtherm_sample_plugin/ui/package.json": undefined }));
    expect(problems).toEqual(["package.json: the file is not valid JSON", "examples/vtherm_sample_plugin/ui/package.json: the file does not exist"]);
  });

  it("reports every file that differs", () => {
    const problems = findVersionProblems("0.1.1", files("0.1.0"));
    expect(problems).toHaveLength(VERSION_FILES.length);
  });

  it("checks the files that the repository really has, at the same version", async () => {
    const { readFileSync } = await import("node:fs");
    const real = VERSION_FILES.map((path) => ({ path, content: readFileSync(new URL(`../${path}`, import.meta.url), "utf8") }));
    const version = (JSON.parse(real[0]?.content ?? "{}") as { version: string }).version;
    expect(findVersionProblems(version, real)).toEqual([]);
  });
});

describe("the branch of the tag", () => {
  it("accepts a stable tag on master", () => {
    expect(findBranchProblem(parseTag("v0.1.1"), true)).toBeUndefined();
  });

  it("refuses a stable tag outside master, and names the branch", () => {
    expect(findBranchProblem(parseTag("v0.1.1"), false)).toContain("master");
  });

  it("accepts a pre-release anywhere", () => {
    expect(findBranchProblem(parseTag("v0.2.0-rc.1"), false)).toBeUndefined();
    expect(findBranchProblem(parseTag("v0.2.0-rc.1"), true)).toBeUndefined();
  });
});
