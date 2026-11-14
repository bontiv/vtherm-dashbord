/**
 * Check the documentation: index, links, anchors and examples.
 *
 * Exit code 1 when a problem is found, with one line per problem.
 */

import { fileURLToPath } from "node:url";

import { findBrokenLinks, findExampleProblems, findIndexProblems } from "./docs-lib.ts";
import type { DocProblem } from "./docs-lib.ts";
import { readRepository, readSource } from "./docs-files.ts";

/** Run every check on the documentation of the repository. */
function main(): number {
  const repository = readRepository();
  const problems: DocProblem[] = [
    ...findIndexProblems(repository),
    ...findBrokenLinks(repository),
    ...[...repository.pages].flatMap(([page, markdown]) => findExampleProblems(page, markdown, readSource)),
  ];
  if (problems.length > 0) {
    console.error(problems.map(({ page, line, message }) => `${page}:${line}: ${message}`).join("\n"));
    return 1;
  }
  console.log(`Documentation checked: ${repository.pages.size} pages.`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
