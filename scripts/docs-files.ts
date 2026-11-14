/** Read the documentation of the repository from the disk. */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";

import type { Repository } from "./docs-lib.ts";

/** The root of the repository. */
export const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Pages outside `docs/` whose examples are synchronized and whose links are checked. */
const EXTRA_PAGES = ["packages/sdk/README.md"];

function listMarkdown(folder: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(ROOT, folder), { withFileTypes: true })) {
    const path = posix.join(folder, entry.name);
    if (entry.isDirectory()) {
      found.push(...listMarkdown(path));
    } else if (entry.name.endsWith(".md")) {
      found.push(path);
    }
  }
  return found.sort();
}

/** Read the Markdown pages of `docs/` and the files that they can link to. */
export function readRepository(): Repository {
  const paths = [...listMarkdown("docs"), ...EXTRA_PAGES];
  const pages = new Map(paths.map((path) => [path, readFileSync(join(ROOT, path), "utf8")] as const));
  return { pages, exists: (path) => existsSync(join(ROOT, path)) };
}

/** Return the content of a file of the repository, or undefined when it does not exist. */
export function readSource(path: string): string | undefined {
  const absolute = join(ROOT, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined;
}
