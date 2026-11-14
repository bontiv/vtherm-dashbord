/**
 * Check that the documentation covers what the specification `project-documentation` asks for.
 *
 * It looks for the pages that must exist, the sections that they must have, the three audiences in the index, the changelog for plugin
 * authors, and the checklist of the pull request. The other checks (`check-docs.ts`) verify that what exists is consistent.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** What the check reads of the repository. */
export interface Source {
  /** The content of a file, or undefined when it does not exist. */
  read(path: string): string | undefined;
}

/** A page that must exist, and what it must contain. */
interface RequiredPage {
  readonly path: string;
  /** Why the page is required. */
  readonly reason: string;
  /** Texts that the page must contain. */
  readonly contains?: readonly string[];
}

/** The pages that the specification requires. */
export const REQUIRED_PAGES: readonly RequiredPage[] = [
  { path: "docs/README.md", reason: "the index of the documentation" },
  { path: "docs/plugins/python-api.md", reason: "the Python API of the plugins", contains: ["register_ui_plugin", "unregister_ui_plugin", "get_ui_plugins"] },
  { path: "docs/reference/websocket-api.md", reason: "the WebSocket API", contains: ["vtherm_dashboard/get_ui_plugins"] },
  { path: "docs/reference/sdk/index.md", reason: "the generated reference of the SDK" },
  { path: "docs/plugins/version-constraints.md", reason: "the grammar of dashboard_version", contains: ["dashboard_version"] },
  { path: "docs/plugins/hooks-and-placement.md", reason: "the hooks and the placements", contains: ["top_tab", "thermostat_config", "replace"] },
  { path: "docs/plugins/testing.md", reason: "the test harness of the SDK", contains: ["createFakeHost"] },
  { path: "docs/plugins/internationalization.md", reason: "the translations of a plugin", contains: ["defineTranslations"] },
  { path: "docs/plugins/plugin-development.md", reason: "the complete procedure to develop a plugin", contains: ["dashboard_version", "development mode", "major version"] },
  { path: "docs/plugins/dev-mode.md", reason: "the development mode and its CORS configuration", contains: ["Access-Control-Allow-Origin"] },
  { path: "docs/plugins/theming.md", reason: "the theme" },
  { path: "docs/contributing/config-flow-driver.md", reason: "the driving of the configuration and its evolution", contains: ["## Evolution planned"] },
  { path: "docs/user/dashboard.md", reason: "the use of the dashboard and the plugin status" },
  { path: "docs/contributing/architecture.md", reason: "the architecture" },
  { path: "docs/contributing/development-environment.md", reason: "the development environment and the tests" },
  { path: "docs/contributing/code-conventions.md", reason: "the conventions" },
  { path: "docs/contributing/publishing.md", reason: "the publication", contains: ["trusted publisher"] },
  { path: "docs/contributing/ci.md", reason: "the continuous integration and its settings", contains: ["Branch protection"] },
  { path: "docs/contributing/releasing.md", reason: "the release procedure", contains: ["When it fails"] },
  { path: "CHANGELOG.md", reason: "the changelog for plugin authors", contains: ["For plugin authors"] },
];

/** The audiences, as the index writes them. Each one must have a page. */
export const AUDIENCES = ["User", "Plugin author", "Contributor"] as const;

/** The checkboxes that the template of the pull request must have, as a text that each contains. */
const CHECKLIST = ["documentation in `docs/`", "English"];

/**
 * Find what the documentation lacks.
 *
 * @param source - The repository.
 * @param version - The version of the manifest, which the changelog must mention.
 * @returns One sentence for each lack. Empty when the documentation is complete.
 */
export function findMissing(source: Source, version: string): string[] {
  const problems: string[] = [];
  for (const page of REQUIRED_PAGES) {
    const content = source.read(page.path);
    if (content === undefined) {
      problems.push(`${page.path} is missing: it is ${page.reason}`);
      continue;
    }
    for (const text of page.contains ?? []) {
      if (!content.includes(text)) {
        problems.push(`${page.path} does not mention "${text}": it is ${page.reason}`);
      }
    }
  }
  const index = source.read("docs/README.md") ?? "";
  // The audience is the third cell of a row of the table: `| [Page](path) | Plugin author, Contributor | Content |`.
  const audiences = new Set(
    index
      .split("\n")
      .filter((line) => line.startsWith("| ["))
      .flatMap((line) => (line.split("|")[2] ?? "").split(",").map((audience) => audience.trim())),
  );
  for (const audience of AUDIENCES) {
    if (!audiences.has(audience)) {
      problems.push(`docs/README.md lists no page for the audience "${audience}"`);
    }
  }
  const changelog = source.read("CHANGELOG.md");
  if (changelog !== undefined && !changelog.includes(`[${version}]`)) {
    problems.push(`CHANGELOG.md has no section for the version ${version}`);
  }
  const template = source.read(".github/pull_request_template.md");
  if (template === undefined) {
    problems.push(".github/pull_request_template.md is missing: the pull requests confirm the documentation and the language");
  } else {
    for (const text of CHECKLIST) {
      if (!template.split("\n").some((line) => line.startsWith("- [ ]") && line.includes(text))) {
        problems.push(`.github/pull_request_template.md has no checkbox about "${text}"`);
      }
    }
  }
  return problems;
}

/** Read the files of the repository. */
export function diskSource(root: string): Source {
  return { read: (path) => (existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined) };
}

function main(): number {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const source = diskSource(root);
  const manifest = JSON.parse(source.read("custom_components/vtherm_dashboard/manifest.json") ?? "{}") as { version?: string };
  const problems = findMissing(source, manifest.version ?? "");
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    return 1;
  }
  console.log("The documentation is complete.");
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
