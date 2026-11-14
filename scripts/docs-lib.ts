/**
 * Checks of the documentation in `docs/`: links, anchors, index and examples.
 *
 * The functions are pure so that they can be tested. The scripts `check-docs.ts` and `sync-doc-examples.ts`
 * read the files and call them.
 */

import { posix } from "node:path";

/** A problem found in a page. */
export interface DocProblem {
  readonly page: string;
  readonly line: number;
  readonly message: string;
}

/** The people that a page is written for, as written in the index. */
export const AUDIENCES = ["User", "Plugin author", "Contributor"] as const;

const FENCE = /^\s*(```+|~~~+)/;
const START_MARKER = /^<!--\s*example:\s*(\S+)\s*-->\s*$/;
const END_MARKER = /^<!--\s*\/example\s*-->\s*$/;

/**
 * Compute the anchor that GitHub gives to a heading.
 *
 * @param heading - The text of the heading.
 * @returns The anchor, without the `#`.
 */
export function slugify(heading: string): string {
  return heading
    .replace(/`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

/** Return the lines of a page that are not inside a fenced code block, with their line number (starting at 1). */
function proseLines(markdown: string): { number: number; text: string }[] {
  const lines: { number: number; text: string }[] = [];
  let fence: string | undefined;
  markdown.split("\n").forEach((text, index) => {
    const match = FENCE.exec(text);
    if (match?.[1] !== undefined) {
      const marker = match[1].charAt(0);
      if (fence === undefined) {
        fence = marker;
      } else if (fence === marker) {
        fence = undefined;
      }
      return;
    }
    if (fence === undefined) {
      lines.push({ number: index + 1, text });
    }
  });
  return lines;
}

/**
 * List the anchors of the headings of a page. A heading that repeats gets the suffix `-1`, `-2`, as on GitHub.
 *
 * @param markdown - The content of the page.
 */
export function collectAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  const counts = new Map<string, number>();
  for (const { text } of proseLines(markdown)) {
    const match = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(text);
    if (match?.[1] === undefined) {
      continue;
    }
    const slug = slugify(match[1]);
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return anchors;
}

/** A link of a page. */
export interface DocLink {
  readonly line: number;
  readonly target: string;
}

/**
 * List the inline links of a page, outside code blocks and code spans.
 *
 * @param markdown - The content of the page.
 */
export function extractLinks(markdown: string): DocLink[] {
  const links: DocLink[] = [];
  for (const { number, text } of proseLines(markdown)) {
    const withoutCode = text.replace(/`[^`]*`/g, "");
    for (const match of withoutCode.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (match[1] !== undefined) {
        links.push({ line: number, target: match[1] });
      }
    }
  }
  return links;
}

/** The content of the files of the repository, and a way to know if a file exists. */
export interface Repository {
  /** The Markdown pages, by path from the root (for example `docs/README.md`). */
  readonly pages: ReadonlyMap<string, string>;
  /** Return whether a file or a folder exists at this path from the root. */
  readonly exists: (path: string) => boolean;
}

function isExternal(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//");
}

/**
 * Find the links that do not lead to an existing file or an existing heading.
 *
 * @param repository - The pages and the files of the repository.
 */
export function findBrokenLinks(repository: Repository): DocProblem[] {
  const problems: DocProblem[] = [];
  const anchorsOf = new Map<string, Set<string>>();
  const anchors = (path: string): Set<string> => {
    let found = anchorsOf.get(path);
    if (found === undefined) {
      found = collectAnchors(repository.pages.get(path) ?? "");
      anchorsOf.set(path, found);
    }
    return found;
  };
  for (const [page, markdown] of repository.pages) {
    for (const { line, target } of extractLinks(markdown)) {
      if (isExternal(target)) {
        continue;
      }
      const [file = "", fragment] = target.split("#", 2);
      const resolved = file === "" ? page : posix.normalize(posix.join(posix.dirname(page), decodeURIComponent(file)));
      if (!repository.exists(resolved)) {
        problems.push({ page, line, message: `The link '${target}' leads to a file that does not exist (${resolved})` });
      } else if (fragment !== undefined && fragment !== "" && repository.pages.has(resolved) && !anchors(resolved).has(fragment.toLowerCase())) {
        problems.push({ page, line, message: `The link '${target}' leads to a heading that does not exist in ${resolved}` });
      }
    }
  }
  return problems;
}

/**
 * Find the pages of `docs/` that the index does not list, or that it lists without the audience.
 *
 * @param repository - The pages of the repository.
 * @param indexPath - The path of the index page.
 */
export function findIndexProblems(repository: Repository, indexPath = "docs/README.md"): DocProblem[] {
  const index = repository.pages.get(indexPath);
  if (index === undefined) {
    return [{ page: indexPath, line: 1, message: "The documentation index does not exist" }];
  }
  const indexed = new Map<string, { line: number; text: string }>();
  index.split("\n").forEach((text, position) => {
    for (const { target } of extractLinks(text)) {
      if (!isExternal(target)) {
        const file = target.split("#", 1)[0] ?? "";
        indexed.set(posix.normalize(posix.join(posix.dirname(indexPath), file)), { line: position + 1, text });
      }
    }
  });
  const problems: DocProblem[] = [];
  for (const page of repository.pages.keys()) {
    if (!page.startsWith("docs/") || page === indexPath || page.startsWith("docs/reference/sdk/")) {
      continue;
    }
    const entry = indexed.get(page);
    if (entry === undefined) {
      problems.push({ page, line: 1, message: `The page is not listed in ${indexPath}` });
    } else if (!AUDIENCES.some((audience) => entry.text.includes(audience))) {
      problems.push({ page: indexPath, line: entry.line, message: `The entry of ${page} does not say its audience (${AUDIENCES.join(", ")})` });
    }
  }
  return problems;
}

/** A block of a page that shows a file of `docs/examples/`. */
interface ExampleBlock {
  readonly source: string;
  /** The line of the opening marker, starting at 1. */
  readonly line: number;
  /** The index in the lines of the first line of the code, after the opening fence. */
  readonly codeStart: number;
  /** The index in the lines of the closing fence. */
  readonly codeEnd: number;
}

function findExampleBlocks(lines: readonly string[]): { blocks: ExampleBlock[]; problems: { line: number; message: string }[] } {
  const blocks: ExampleBlock[] = [];
  const problems: { line: number; message: string }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const start = START_MARKER.exec(lines[index] ?? "");
    if (start?.[1] === undefined) {
      continue;
    }
    const opening = index + 1;
    const closing = lines.findIndex((text, position) => position > opening && FENCE.test(text));
    const end = closing === -1 ? -1 : lines.findIndex((text, position) => position > closing && END_MARKER.test(text));
    if (!FENCE.test(lines[opening] ?? "") || closing === -1 || end === -1) {
      problems.push({ line: index + 1, message: `The example marker for ${start[1]} must be followed by a code block and closed by <!-- /example -->` });
      continue;
    }
    blocks.push({ source: start[1], line: index + 1, codeStart: opening + 1, codeEnd: closing });
  }
  return { blocks, problems };
}

/**
 * Check that the code blocks between example markers equal the files they show.
 *
 * @param page - The path of the page.
 * @param markdown - The content of the page.
 * @param readSource - Return the content of a file of the repository, or undefined when it does not exist.
 */
export function findExampleProblems(page: string, markdown: string, readSource: (path: string) => string | undefined): DocProblem[] {
  const lines = markdown.split("\n");
  const { blocks, problems } = findExampleBlocks(lines);
  const found: DocProblem[] = problems.map(({ line, message }) => ({ page, line, message }));
  for (const block of blocks) {
    const source = readSource(block.source);
    if (source === undefined) {
      found.push({ page, line: block.line, message: `The example file ${block.source} does not exist` });
    } else if (lines.slice(block.codeStart, block.codeEnd).join("\n") !== source.replace(/\n$/, "")) {
      found.push({ page, line: block.line, message: `The code of the page differs from ${block.source}, run 'npm run docs:sync'` });
    }
  }
  return found;
}

/**
 * Rewrite the code blocks between example markers from the files they show.
 *
 * @param markdown - The content of the page.
 * @param readSource - Return the content of a file of the repository, or undefined when it does not exist.
 * @returns The updated content of the page.
 */
export function syncExamples(markdown: string, readSource: (path: string) => string | undefined): string {
  const lines = markdown.split("\n");
  const { blocks } = findExampleBlocks(lines);
  for (const block of [...blocks].reverse()) {
    const source = readSource(block.source);
    if (source !== undefined) {
      lines.splice(block.codeStart, block.codeEnd - block.codeStart, ...source.replace(/\n$/, "").split("\n"));
    }
  }
  return lines.join("\n");
}
