import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../.github/", import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, ROOT), "utf8");
const workflows = readdirSync(new URL("workflows/", ROOT)).filter((file) => file.endsWith(".yml"));

describe("the workflows", () => {
  it("exist: CI, CodeQL and release", () => {
    expect(workflows.sort()).toEqual(["ci.yml", "codeql.yml", "release.yml"]);
  });

  it.each(workflows)("pin every action of %s by the commit that a version points to, with the version in a comment", (file) => {
    const uses = [...read(`workflows/${file}`).matchAll(/^\s*-?\s*uses:\s*(\S+)(.*)$/gm)];
    expect(uses.length).toBeGreaterThan(0);
    for (const [, action, rest] of uses) {
      if (action?.startsWith("./")) {
        continue;
      }
      expect(action, `${file}: ${action}`).toMatch(/@[0-9a-f]{40}$/);
      expect(rest, `${file}: ${action}`).toMatch(/#\s*\S+/);
    }
  });

  it.each(workflows)("do not keep the credentials of the checkout in %s", (file) => {
    const text = read(`workflows/${file}`);
    const checkouts = (text.match(/actions\/checkout@/g) ?? []).length;
    expect((text.match(/persist-credentials: false/g) ?? []).length).toBe(checkouts);
  });

  it.each(workflows)("start %s with a read-only token", (file) => {
    expect(read(`workflows/${file}`)).toMatch(/^permissions:\n {2}contents: read$/m);
  });

  it("gives the right to write on the content to the publication job only", () => {
    const sources = workflows.map((file) => [file, read(`workflows/${file}`)] as const);
    const writers = sources.flatMap(([file, text]) => [...text.matchAll(/^\s+contents: write$/gm)].map(() => file));
    expect(writers).toEqual(["release.yml"]);
    const release = read("workflows/release.yml");
    const publish = release.slice(release.indexOf("  publish:\n"), release.indexOf("  publish-npm:\n"));
    expect(publish).toContain("contents: write");
    expect(release.slice(release.indexOf("  publish-npm:\n"))).not.toContain("contents: write");
  });

  it("uses no secret of npm: the publication is trusted by OpenID Connect", () => {
    const release = read("workflows/release.yml");
    expect(release).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|secrets\.(?!GITHUB_TOKEN)/);
    expect(release).toMatch(/publish-npm:[\s\S]*id-token: write/);
  });

  it("runs the CI on every push and pull request, and when another workflow calls it", () => {
    const ci = read("workflows/ci.yml");
    expect(ci).toMatch(/push:\n\s+branches: \["\*\*"\]/);
    expect(ci).toContain("pull_request:");
    expect(ci).toContain("workflow_call:");
    expect(ci).not.toContain("pull_request_target");
    expect(ci).toMatch(/cancel-in-progress:/);
  });

  it("has the jobs that the specification names", () => {
    const ci = read("workflows/ci.yml");
    for (const job of ["python", "frontend", "checks", "hassfest", "hacs"]) {
      expect(ci, job).toMatch(new RegExp(`^ {2}${job}:$`, "m"));
    }
    expect(ci).toContain("npm run check");
    expect(ci).toContain("category: integration");
  });

  it("ignores only the check of the brands in the HACS action, and says why", () => {
    const ci = read("workflows/ci.yml");
    expect(ci).toMatch(/^\s+ignore: brands$/m);
    expect(ci).toContain("home-assistant/brands");
  });

  it("starts the release on a tag of version only, and runs the CI before the archive", () => {
    const release = read("workflows/release.yml");
    expect(release).toMatch(/on:\n\s+push:\n\s+tags: \["v\*"\]/);
    expect(release).toContain("uses: ./.github/workflows/ci.yml");
    expect(release).toMatch(/package:\n\s+name: package\n\s+needs: \[validate, ci\]/);
    expect(release).toMatch(/publish:\n\s+name: publish\n\s+needs: \[validate, package\]/);
    expect(release).toMatch(/publish-npm:\n\s+name: publish-npm\n\s+needs: \[validate, publish\]/);
  });

  it("passes the tag to the scripts by the environment, never in the text of a command", () => {
    const release = read("workflows/release.yml");
    const uses = release.split("\n").filter((line) => /\$\{\{\s*github\.ref(_name)?\s*\}\}/.test(line));
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line.trim(), line).toMatch(/^RELEASE_TAG: /);
    }
  });

  it("publishes a pre-release with the tag next, and only tries when it is outside master", () => {
    const release = read("workflows/release.yml");
    expect(release).toContain("--tag next");
    expect(release).toContain("--dry-run");
    expect(release).toContain("--prerelease");
    expect(release).toContain("--clobber");
  });

  it("updates the actions every week", () => {
    const dependabot = read("dependabot.yml");
    expect(dependabot).toContain("package-ecosystem: github-actions");
    expect(dependabot).toContain("interval: weekly");
  });

  it("analyzes Python and TypeScript with CodeQL on push, pull request and every week", () => {
    const codeql = read("workflows/codeql.yml");
    expect(codeql).toContain("language: [python, javascript-typescript]");
    expect(codeql).toContain("fail-fast: false");
    expect(codeql).toContain("security-events: write");
    expect(codeql).toMatch(/schedule:\n\s+# .*\n\s+- cron:/);
    expect(codeql).toContain("pull_request:");
  });
});
