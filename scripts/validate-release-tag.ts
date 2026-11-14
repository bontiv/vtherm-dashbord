/**
 * Validate the tag of a release before anything is built or published.
 *
 * The tag is the decision to publish, and the files of the repository stay the source of the versions. So the script checks that the
 * tag is a version that Home Assistant and npm both accept, that it equals the `version` of the manifest and of every `package.json` of
 * the workspace, and that a stable tag is on the history of `master`. It never changes a file.
 *
 * The tag comes from the environment variable `RELEASE_TAG`, never from the command line, so that it is not interpolated in a shell.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The semantic version of semver.org, without the build metadata (`+...`), with the prefix `v`. npm ignores the metadata, and Home
 * Assistant validates it badly, so the same text must not mean a version for one and another for the other.
 */
export const TAG_PATTERN = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;

/** The files whose `version` must equal the tag. */
export const VERSION_FILES = [
  "custom_components/vtherm_dashboard/manifest.json",
  "package.json",
  "packages/sdk/package.json",
  "frontend/package.json",
  "examples/vtherm_sample_plugin/ui/package.json",
] as const;

/** The branch that a stable tag must belong to. */
export const RELEASE_BRANCH = "master";

/** What the validation found out about a valid tag. */
export interface TagInfo {
  /** The version, which is the tag without `v`. */
  readonly version: string;
  /** Whether the tag has a suffix of pre-release. */
  readonly prerelease: boolean;
}

/**
 * Check the format of a tag.
 *
 * @param tag - The tag, for example `v0.1.1`.
 * @returns The version and whether it is a pre-release.
 * @throws Error - The tag is not `v` and a semantic version without build metadata.
 */
export function parseTag(tag: string): TagInfo {
  if (!TAG_PATTERN.test(tag)) {
    throw new Error(`The tag ${JSON.stringify(tag)} is not valid. Use v<major>.<minor>.<patch> with an optional pre-release suffix, without build metadata, for example v0.1.1 or v1.0.0-rc.1.`);
  }
  const version = tag.slice(1);
  return { version, prerelease: version.includes("-") };
}

/** A file of versions, as read from the repository. */
export interface VersionFile {
  readonly path: string;
  /** The content, or undefined when the file does not exist. */
  readonly content: string | undefined;
}

/**
 * Compare the version of each file to the version of the tag.
 *
 * @param version - The version of the tag.
 * @param files - The files to compare.
 * @returns One sentence for each file that is missing, unreadable, without version, or with another version. Empty when all agree.
 */
export function findVersionProblems(version: string, files: readonly VersionFile[]): string[] {
  const problems: string[] = [];
  for (const file of files) {
    if (file.content === undefined) {
      problems.push(`${file.path}: the file does not exist`);
      continue;
    }
    let found: unknown;
    try {
      found = (JSON.parse(file.content) as { version?: unknown }).version;
    } catch {
      problems.push(`${file.path}: the file is not valid JSON`);
      continue;
    }
    if (typeof found !== "string" || found === "") {
      problems.push(`${file.path}: there is no "version" field`);
    } else if (found !== version) {
      problems.push(`${file.path}: the version is ${found}, the tag is ${version}`);
    }
  }
  return problems;
}

/**
 * Check where a tag is.
 *
 * @param info - The tag.
 * @param onMaster - Whether the commit of the tag is in the history of `master`.
 * @returns A problem, or undefined. A pre-release can be anywhere, which allows a release to be tried from a branch.
 */
export function findBranchProblem(info: TagInfo, onMaster: boolean): string | undefined {
  if (!info.prerelease && !onMaster) {
    return `The tag v${info.version} is stable, so its commit must be in the history of ${RELEASE_BRANCH}, and it is not. Merge the commit into ${RELEASE_BRANCH}, or use a pre-release tag such as v${info.version}-rc.1.`;
  }
  return undefined;
}

/** Tell whether the commit that is checked out is in the history of `origin/master`. */
function isOnMaster(root: string): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", "HEAD", `origin/${RELEASE_BRANCH}`], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Write a value for the next steps of the workflow. */
function output(name: string, value: string): void {
  const file = process.env["GITHUB_OUTPUT"];
  if (file !== undefined && file !== "") {
    appendFileSync(file, `${name}=${value}\n`);
  }
}

function main(): number {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const tag = process.env["RELEASE_TAG"] ?? "";
  let info: TagInfo;
  try {
    info = parseTag(tag);
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
  const files = VERSION_FILES.map((path) => ({ path, content: existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined }));
  const problems = findVersionProblems(info.version, files);
  const onMaster = isOnMaster(root);
  const branchProblem = findBranchProblem(info, onMaster);
  if (branchProblem !== undefined) {
    problems.push(branchProblem);
  }
  if (problems.length > 0) {
    console.error(`The release ${tag} is refused:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    return 1;
  }
  output("version", info.version);
  output("prerelease", String(info.prerelease));
  output("on_master", String(onMaster));
  console.log(`The release ${tag} is valid (${info.prerelease ? "pre-release" : "stable"}, ${onMaster ? "in" : "not in"} the history of ${RELEASE_BRANCH}).`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
