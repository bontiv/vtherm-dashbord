import { describe, expect, it } from "vitest";

import { collectAnchors, extractLinks, findBrokenLinks, findExampleProblems, findIndexProblems, slugify, syncExamples } from "./docs-lib.ts";
import type { Repository } from "./docs-lib.ts";

function repository(pages: Record<string, string>, files: string[] = []): Repository {
  const known = new Set([...Object.keys(pages), ...files]);
  return { pages: new Map(Object.entries(pages)), exists: (path) => known.has(path) };
}

describe("slugify", () => {
  it("follows the anchors of GitHub", () => {
    expect(slugify("Python API for UI plugins")).toBe("python-api-for-ui-plugins");
    expect(slugify("`register_ui_plugin`")).toBe("register_ui_plugin");
    expect(slugify("What the dashboard checks later")).toBe("what-the-dashboard-checks-later");
    expect(slugify("Errors & states (v2)")).toBe("errors--states-v2");
  });
});

describe("collectAnchors", () => {
  it("lists the headings and numbers the repeated ones", () => {
    const anchors = collectAnchors("# Title\n\n## Errors\n\n## Errors\n\n```\n# not a heading\n```\n");
    expect([...anchors]).toEqual(["title", "errors", "errors-1"]);
  });
});

describe("extractLinks", () => {
  it("ignores code blocks and code spans", () => {
    const markdown = "See [a](a.md) and `[x](nope.md)`.\n\n```\n[y](nope.md)\n```\n[b](b.md#top \"title\")\n";
    expect(extractLinks(markdown)).toEqual([
      { line: 1, target: "a.md" },
      { line: 6, target: "b.md#top" },
    ]);
  });
});

describe("findBrokenLinks", () => {
  it("accepts links to existing pages, anchors, files and external addresses", () => {
    const repo = repository(
      { "docs/a.md": "[b](b.md#second) [self](#first) [ex](../examples/x.py) [web](https://example.com/missing)\n# First\n", "docs/b.md": "# One\n## Second\n" },
      ["examples/x.py"],
    );
    expect(findBrokenLinks(repo)).toEqual([]);
  });

  it("reports a link to a missing file", () => {
    const problems = findBrokenLinks(repository({ "docs/a.md": "[gone](gone.md)\n" }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ page: "docs/a.md", line: 1 });
    expect(problems[0]?.message).toContain("gone.md");
  });

  it("reports a link to a missing anchor", () => {
    const problems = findBrokenLinks(repository({ "docs/a.md": "[b](b.md#nope)\n", "docs/b.md": "# One\n" }));
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain("heading");
  });
});

describe("findIndexProblems", () => {
  const index = "| [A](a.md) | Plugin author | text |\n| [B](sub/b.md) | Contributor | text |\n";

  it("accepts an index that lists every page with its audience", () => {
    const repo = repository({ "docs/README.md": index, "docs/a.md": "", "docs/sub/b.md": "" });
    expect(findIndexProblems(repo)).toEqual([]);
  });

  it("reports a page that is not listed", () => {
    const repo = repository({ "docs/README.md": index, "docs/a.md": "", "docs/sub/b.md": "", "docs/c.md": "" });
    const problems = findIndexProblems(repo);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ page: "docs/c.md" });
  });

  it("reports an entry without audience", () => {
    const repo = repository({ "docs/README.md": "| [A](a.md) | text |\n", "docs/a.md": "" });
    expect(findIndexProblems(repo)[0]?.message).toContain("audience");
  });

  it("reports a missing index", () => {
    expect(findIndexProblems(repository({ "docs/a.md": "" }))[0]?.message).toContain("index");
  });

  it("does not require the generated SDK reference to be listed one by one", () => {
    const repo = repository({ "docs/README.md": index, "docs/a.md": "", "docs/sub/b.md": "", "docs/reference/sdk/Foo.md": "" });
    expect(findIndexProblems(repo)).toEqual([]);
  });
});

describe("examples", () => {
  const source = "print('hello')\n";
  const page = "Intro\n\n<!-- example: docs/examples/python/hello.py -->\n```python\nprint('hello')\n```\n<!-- /example -->\n\nEnd\n";
  const read = (path: string): string | undefined => (path === "docs/examples/python/hello.py" ? source : undefined);

  it("accepts a page that equals its example", () => {
    expect(findExampleProblems("docs/a.md", page, read)).toEqual([]);
  });

  it("reports a page that differs from its example, and synchronizes it", () => {
    const stale = page.replace("print('hello')\n```", "print('bye')\n```");
    const problems = findExampleProblems("docs/a.md", stale, read);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ line: 3 });
    expect(syncExamples(stale, read)).toBe(page);
    expect(findExampleProblems("docs/a.md", syncExamples(stale, read), read)).toEqual([]);
  });

  it("reports an example file that does not exist", () => {
    const missing = page.replace("hello.py", "missing.py");
    expect(findExampleProblems("docs/a.md", missing, read)[0]?.message).toContain("does not exist");
  });

  it("reports a marker without code block or closing marker", () => {
    expect(findExampleProblems("docs/a.md", "<!-- example: docs/examples/python/hello.py -->\ntext\n", read)).toHaveLength(1);
  });

  it("keeps the page unchanged when there is no marker", () => {
    expect(syncExamples("# Title\n\n```python\nx = 1\n```\n", read)).toBe("# Title\n\n```python\nx = 1\n```\n");
  });
});
