import eslint from "@eslint/js";
import { isAbsolute, relative, resolve as resolvePath, sep } from "node:path";
import tseslint from "typescript-eslint";
import { LOCATIONS, ROOT, locate, type ProjectName } from "./scripts/external-paths";

/**
 * Globs that exclude the External_Projects from linting: `external/**` always, plus `<relative-path>/**` for each Location_Variable
 * whose folder lies inside the project root and outside `external/`. A folder outside the root adds nothing.
 */
export function externalIgnores(env: Readonly<Record<string, string | undefined>> = process.env, root: string = ROOT): string[] {
  const globs = ["external/**"];
  const external = resolvePath(root, "external");
  for (const name of Object.keys(LOCATIONS) as ProjectName[]) {
    const folder = locate(name, env, root);
    const rel = relative(root, folder);
    const insideRoot = rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
    const relExternal = relative(external, folder);
    const insideExternal = relExternal === "" || (relExternal !== ".." && !relExternal.startsWith(`..${sep}`) && !isAbsolute(relExternal));
    if (!insideRoot || insideExternal) continue;
    const glob = `${rel.split(sep).join("/")}/**`;
    if (!globs.includes(glob)) globs.push(glob);
  }
  return globs;
}

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "custom_components/**/www/**", "examples/**/www/**", ...externalIgnores(), "config/**", ".venv/**", "docs/reference/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      // Explicit any is refused. A justified exception needs a commented eslint-disable on the line.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
