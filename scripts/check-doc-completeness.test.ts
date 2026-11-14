import { describe, expect, it } from "vitest";

import { REQUIRED_PAGES, diskSource, findMissing } from "./check-doc-completeness.ts";
import type { Source } from "./check-doc-completeness.ts";

const ROOT = new URL("..", import.meta.url).pathname;

/** A repository made of the real files, with some removed or changed. */
function repository(changes: Record<string, string | undefined> = {}): Source {
  const disk = diskSource(ROOT);
  return { read: (path) => (path in changes ? changes[path] : disk.read(path)) };
}

describe("the completeness of the documentation", () => {
  it("passes on the repository", () => {
    expect(findMissing(repository(), "0.1.0")).toEqual([]);
  });

  it.each(REQUIRED_PAGES.map((page) => page.path))("fails and names the page when %s is removed", (path) => {
    const problems = findMissing(repository({ [path]: undefined }), "0.1.0");
    expect(problems.some((problem) => problem.startsWith(`${path} is missing`))).toBe(true);
  });

  it("fails when a page lacks what it must describe", () => {
    const problems = findMissing(repository({ "docs/plugins/python-api.md": "# Python API\n" }), "0.1.0");
    expect(problems).toContain('docs/plugins/python-api.md does not mention "register_ui_plugin": it is the Python API of the plugins');
  });

  it("fails when an audience has no page in the index", () => {
    const index = (repository().read("docs/README.md") ?? "")
      .split("\n")
      .map((line) => (line.startsWith("| [") ? line.replace("Contributor", "Reader") : line))
      .join("\n");
    expect(findMissing(repository({ "docs/README.md": index }), "0.1.0")).toContain('docs/README.md lists no page for the audience "Contributor"');
  });

  it("fails when the changelog does not have the version", () => {
    expect(findMissing(repository(), "9.9.9")).toContain("CHANGELOG.md has no section for the version 9.9.9");
  });

  it("fails when the template of the pull request loses a checkbox", () => {
    const template = "## Description\n- [ ] The tests pass.\n";
    const problems = findMissing(repository({ ".github/pull_request_template.md": template }), "0.1.0");
    expect(problems.filter((problem) => problem.includes("checkbox"))).toHaveLength(2);
  });
});
