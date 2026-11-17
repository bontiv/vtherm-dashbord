/**
 * Check the npm package of the SDK as a plugin author receives it.
 *
 * The package is packed, its content is checked (only the built files), then it is installed in a temporary TypeScript
 * project that imports it, compiles with the strict mode and runs the module with Node.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SDK = join(ROOT, "packages", "sdk");

/** The files that the package is allowed to contain, besides the ones that npm always adds. */
const ALLOWED = [/^dist\/[A-Za-z0-9.-]+\.(js|d\.ts)$/, /^package\.json$/, /^README\.md$/, /^LICENSE$/, /^NOTICE$/];

interface PackedFile {
  readonly path: string;
}

/** Return the files that are not wanted in the package. */
export function findUnwantedFiles(paths: readonly string[]): string[] {
  return paths.filter((path) => !ALLOWED.some((pattern) => pattern.test(path)));
}

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function main(): number {
  const work = mkdtempSync(join(tmpdir(), "vtherm-sdk-"));
  try {
    const packed = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", work], SDK)) as { filename: string; files: PackedFile[] }[];
    const [tarball] = packed;
    if (tarball === undefined) {
      throw new Error("npm pack produced no package");
    }
    const files = tarball.files.map((file) => file.path);
    const unwanted = findUnwantedFiles(files);
    if (unwanted.length > 0 || !files.includes("dist/index.js") || !files.includes("dist/index.d.ts")) {
      console.error(`The package content is not the expected one.\nUnwanted files: ${unwanted.join(", ") || "none"}\nFiles: ${files.join(", ")}`);
      return 1;
    }

    const project = join(work, "consumer");
    run("mkdir", [project], work);
    writeFileSync(join(project, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
    writeFileSync(
      join(project, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { strict: true, module: "NodeNext", moduleResolution: "NodeNext", target: "ES2022", noEmit: true, skipLibCheck: false }, include: ["index.ts"] }),
    );
    writeFileSync(
      join(project, "index.ts"),
      [
        'import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";',
        'import type { Placement, UiPluginDefinition } from "@vtherm/dashboard-sdk";',
        'const placement: Placement = { after: "core_tpi.tab.main" };',
        'const translations = defineTranslations({ "tab.title": "Tab" });',
        'const definition: UiPluginDefinition = { id: "mine", translations, contributions: { thermostat_config: [{ id: "mine.tab.main", title: "tab.title", component: "mine-tab", placement }] } };',
        "registerUiPlugin(definition);",
        'import { createFakeHost } from "@vtherm/dashboard-sdk/testing";',
        "createFakeHost().registerPlugin(definition);",
        "",
      ].join("\n"),
    );
    run("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", join(work, tarball.filename)], project);
    run("node", [join(ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json"], project);
    const exported = run("node", ["--input-type=module", "-e", 'import * as sdk from "@vtherm/dashboard-sdk"; console.log(Object.keys(sdk).sort().join(","));'], project).trim();
    const harness = run("node", ["--input-type=module", "-e", 'import * as testing from "@vtherm/dashboard-sdk/testing"; console.log(Object.keys(testing).sort().join(","));'], project).trim();
    if (exported.includes("createFakeHost") || !harness.includes("createFakeHost")) {
      console.error(`The harness must be exported by @vtherm/dashboard-sdk/testing only.\nMain entry point: ${exported}\nTesting entry point: ${harness}`);
      return 1;
    }
    console.log(`Package OK: ${files.length} files, imports compile in strict mode.\nMain entry point: ${exported}\nTesting entry point: ${harness}`);
    return 0;
  } catch (error) {
    const output = error instanceof Error ? [(error as { stdout?: string }).stdout, (error as { stderr?: string }).stderr].filter(Boolean).join("\n") : "";
    console.error(`${error instanceof Error ? error.message : String(error)}\n${output}`.trim());
    return 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
