// @vitest-environment jsdom
/** The descriptions of the catalog are HTML. The sanitizer runs on a complete DOM, as in a browser. */
import { describe, expect, it } from "vitest";

import { plainText, sanitizeDescription } from "../src/complements/sanitize.ts";

describe("the descriptions", () => {
  it("keeps the formatting and removes scripts, events and styles", () => {
    const html = sanitizeDescription('<p onclick="x()">Hello <strong>you</strong></p><script>alert(1)</script><img src=x onerror="y()"><style>p{}</style><ul><li><code>c</code></li></ul>');
    expect(html).toBe("<p>Hello <strong>you</strong></p><ul><li><code>c</code></li></ul>");
  });

  it("opens links in a new tab without the referrer, and refuses scripts in links", () => {
    const html = sanitizeDescription('<a href="https://example.org">ok</a> <a href="javascript:alert(1)">bad</a>');
    expect(html).toContain('href="https://example.org"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("javascript");
  });

  it("removes every other tag but keeps its text", () => {
    expect(sanitizeDescription("<h1>Title</h1><iframe src=\"https://example.org\"></iframe><div>Body</div>")).toBe("TitleBody");
  });

  it("gives the text without tags for the search", () => {
    expect(plainText("<p>One <em>two</em></p><p>three</p>")).toBe("One two three");
  });
});

