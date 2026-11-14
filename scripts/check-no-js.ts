/**
 * Check that no JavaScript file is versioned in the sources.
 *
 * The files `.js`, `.mjs` and `.cjs` are refused, except the ones listed with a justification in
 * `scripts/js-exceptions.json`. Generated files are not versioned, so they are not concerned.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The extensions of the JavaScript files. */
const JAVASCRIPT_EXTENSIONS = [".js", ".mjs", ".cjs"];

/** An allowed JavaScript file and the reason why TypeScript cannot be used. */
export interface JavaScriptException {
  readonly path: string;
  readonly reason: string;
}

/**
 * Find the JavaScript files that are not allowed.
 *
 * @param files - The paths of the files of the repository.
 * @param exceptions - The allowed files, each with its justification.
 * @returns The paths of the forbidden files.
 */
export function findForbiddenJavaScript(files: readonly string[], exceptions: readonly JavaScriptException[]): string[] {
  const allowed = new Set(exceptions.filter((exception) => exception.reason.trim() !== "").map((exception) => exception.path));
  return files.filter((file) => JAVASCRIPT_EXTENSIONS.some((extension) => file.endsWith(extension)) && !allowed.has(file));
}

/** Run the check on the files known to git, ignored files excluded. */
function main(): number {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  const files = output.split("\n").filter((file) => file !== "");
  const configuration = JSON.parse(readFileSync(new URL("js-exceptions.json", import.meta.url), "utf8")) as { exceptions: JavaScriptException[] };
  const forbidden = findForbiddenJavaScript(files, configuration.exceptions);
  if (forbidden.length > 0) {
    console.error(`JavaScript files are not allowed in the sources, write them in TypeScript or justify them in scripts/js-exceptions.json:\n${forbidden.map((file) => `  ${file}`).join("\n")}`);
    return 1;
  }
  console.log("No JavaScript file in the sources.");
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
