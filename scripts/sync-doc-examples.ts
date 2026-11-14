/**
 * Copy the files of `docs/examples/` into the pages that show them, between the markers
 * `<!-- example: path -->` and `<!-- /example -->`.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { syncExamples } from "./docs-lib.ts";
import { ROOT, readRepository, readSource } from "./docs-files.ts";

/** Update the pages whose examples are out of date. */
function main(): number {
  let updated = 0;
  for (const [page, markdown] of readRepository().pages) {
    const synchronized = syncExamples(markdown, readSource);
    if (synchronized !== markdown) {
      writeFileSync(join(ROOT, page), synchronized);
      console.log(`Updated ${page}`);
      updated += 1;
    }
  }
  console.log(updated === 0 ? "All examples are up to date." : `${updated} page(s) updated.`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
